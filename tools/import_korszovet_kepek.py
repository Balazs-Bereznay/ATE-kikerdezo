from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path

import fitz


HUN_UPPER = "A-ZÁÉÍÓÖŐÚÜŰ"
HUN_LOWER = "a-záéíóöőúüű"


def normalize_spaces(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").replace("\u00ad", "")).strip()


def normalize_lines(text: str) -> list[str]:
    raw = (text or "").splitlines()
    return [normalize_spaces(line) for line in raw if normalize_spaces(line)]


def looks_like_heading(line: str) -> bool:
    letters = [ch for ch in line if ch.isalpha()]
    if len(letters) < 6 or len(line) > 120:
        return False
    upper_ratio = sum(1 for ch in letters if ch.isupper()) / max(len(letters), 1)
    return upper_ratio >= 0.65


def detect_heading(lines: list[str], current_heading: str) -> str:
    if not lines:
        return current_heading

    first_span = lines[:5]
    prefix_pattern = re.compile(rf"^\s*([{HUN_UPPER}0-9][{HUN_UPPER}0-9\s/,.()]+?)\s*[-:]\s*")
    for line in first_span:
        match = prefix_pattern.match(line)
        if match:
            candidate = normalize_spaces(match.group(1))
            if len(candidate) >= 4:
                return candidate

    leading_caps_pattern = re.compile(
        rf"^\s*([{HUN_UPPER}0-9]{{4,}}(?:\s+[{HUN_UPPER}0-9]{{2,}}){{0,4}})[,.:;\s]"
    )
    for line in first_span:
        match = leading_caps_pattern.match(line + " ")
        if match:
            candidate = normalize_spaces(match.group(1))
            if len(candidate) >= 4:
                return candidate

    for line in first_span:
        if looks_like_heading(line):
            return line

    return current_heading


def page_text_summary(lines: list[str], max_len: int = 1000) -> str:
    text = normalize_spaces(" ".join(lines))
    if len(text) <= max_len:
        return text
    return text[: max_len - 1].rstrip() + "…"


def export_images_for_page(doc: fitz.Document, page: fitz.Page, out_dir: Path, page_no: int) -> list[dict]:
    exported: list[dict] = []
    image_infos = page.get_images(full=True)
    index = 0

    for info in image_infos:
        xref = info[0]
        rects = page.get_image_rects(xref)
        if not rects:
            continue
        rect = rects[0]
        if rect.get_area() < 30000:
            continue

        extracted = doc.extract_image(xref)
        img_bytes = extracted["image"]
        ext = extracted.get("ext", "png").lower()
        if ext == "jpeg":
            ext = "jpg"

        index += 1
        filename = f"page_{page_no:03d}_img_{index:02d}.{ext}"
        target = out_dir / filename
        target.write_bytes(img_bytes)

        exported.append(
            {
                "image_index": index,
                "image_xref": xref,
                "image_filename": filename,
                "image_path": str(target.as_posix()),
                "image_width": int(info[2]),
                "image_height": int(info[3]),
                "image_rect": f"{rect.x0:.1f},{rect.y0:.1f},{rect.x1:.1f},{rect.y1:.1f}",
                "image_area": round(float(rect.get_area()), 1),
            }
        )

    return exported


def run_import(pdf_path: Path, out_root: Path) -> list[dict]:
    out_images = out_root / "images"
    out_images.mkdir(parents=True, exist_ok=True)

    doc = fitz.open(pdf_path)
    records: list[dict] = []
    current_heading = ""
    record_id = 1

    for page_no, page in enumerate(doc, start=1):
        lines = normalize_lines(page.get_text("text"))
        current_heading = detect_heading(lines, current_heading)
        summary = page_text_summary(lines)
        images = export_images_for_page(doc, page, out_images, page_no)

        for img in images:
            records.append(
                {
                    "record_id": record_id,
                    "source_pdf": pdf_path.name,
                    "source_page": page_no,
                    "topic_guess": current_heading,
                    "image_index": img["image_index"],
                    "image_xref": img["image_xref"],
                    "image_filename": img["image_filename"],
                    "image_path": img["image_path"],
                    "image_width": img["image_width"],
                    "image_height": img["image_height"],
                    "image_rect": img["image_rect"],
                    "image_area": img["image_area"],
                    "page_text": summary,
                    "question_prompt": "Nezd meg a kepet, majd azonositsd a korkepet vagy jellegzetes szovettani elvaltozast.",
                }
            )
            record_id += 1

    return records


def write_outputs(records: list[dict], out_root: Path) -> tuple[Path, Path]:
    out_root.mkdir(parents=True, exist_ok=True)
    csv_path = out_root / "korszovet_kepek_import.csv"
    json_path = out_root / "korszovet_kepek_import.json"

    fields = [
        "record_id",
        "source_pdf",
        "source_page",
        "topic_guess",
        "image_index",
        "image_xref",
        "image_filename",
        "image_path",
        "image_width",
        "image_height",
        "image_rect",
        "image_area",
        "page_text",
        "question_prompt",
    ]

    with csv_path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(records)

    with json_path.open("w", encoding="utf-8") as f:
        json.dump(
            {
                "source": records[0]["source_pdf"] if records else "",
                "record_count": len(records),
                "encoding": "utf-8",
                "columns": fields,
                "records": records,
            },
            f,
            ensure_ascii=False,
            indent=2,
        )

    return csv_path, json_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Kórszövet képek PDF import (wizard-alapú oszlopolás).")
    parser.add_argument("--input", default="korszovet_kepek.pdf", help="Bemeneti PDF.")
    parser.add_argument("--outdir", default="data/imported/korszovet_kepek", help="Kimeneti mappa.")
    args = parser.parse_args()

    pdf_path = Path(args.input)
    if not pdf_path.exists():
        raise FileNotFoundError(f"Nem található a bemeneti PDF: {pdf_path}")

    out_root = Path(args.outdir)
    records = run_import(pdf_path, out_root)
    csv_path, json_path = write_outputs(records, out_root)

    page_count = len({r["source_page"] for r in records})
    topic_count = len({normalize_spaces(r["topic_guess"]) for r in records if normalize_spaces(r["topic_guess"])})
    print(f"Import kész: {len(records)} kép rekord")
    print(f"Érintett oldalak: {page_count}")
    print(f"Felismerett témacímkék: {topic_count}")
    print(f"CSV:  {csv_path}")
    print(f"JSON: {json_path}")


if __name__ == "__main__":
    main()
