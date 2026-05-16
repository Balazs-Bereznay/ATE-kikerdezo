from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path

import fitz


def normalize_spaces(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").replace("\u00ad", "")).strip()


def normalize_cell(text: str) -> str:
    return normalize_spaces((text or "").replace("\n", " "))


def has_header_row(row: list[str]) -> bool:
    merged = " ".join(normalize_cell(cell) for cell in row if cell)
    return "Mit vizsgálunk?" in merged and "Az ép szerv leírása" in merged


def column_stats(rows: list[list[str]]) -> list[dict]:
    col_count = max(len(r) for r in rows) if rows else 0
    stats: list[dict] = []
    for ci in range(col_count):
        non_empty = 0
        total_len = 0
        punct = 0
        for row in rows:
            cell = normalize_cell(row[ci]) if ci < len(row) else ""
            if not cell:
                continue
            non_empty += 1
            total_len += len(cell)
            punct += sum(cell.count(ch) for ch in [",", ";", ":", "(", ")"])
        stats.append(
            {
                "index": ci,
                "non_empty": non_empty,
                "total_len": total_len,
                "punct": punct,
            }
        )
    return stats


def detect_inspection_col(stats: list[dict]) -> int:
    candidates = [s for s in stats if s["non_empty"] > 0]
    if not candidates:
        return 0
    best = max(candidates, key=lambda s: (s["punct"], s["total_len"], s["non_empty"], -s["index"]))
    return int(best["index"])


def detect_normal_col(stats: list[dict], inspection_col: int) -> int | None:
    right_candidates = [
        s
        for s in stats
        if s["index"] > inspection_col and s["non_empty"] >= 2 and (s["punct"] > 0 or s["total_len"] > 80)
    ]
    if not right_candidates:
        return None
    best = max(right_candidates, key=lambda s: (s["total_len"], s["punct"], s["non_empty"], s["index"]))
    return int(best["index"])


def parse_table_rows(page_no: int, rows: list[list[str]], record_start_id: int) -> list[dict]:
    data_rows = rows[1:] if rows and has_header_row(rows[0]) else rows
    stats = column_stats(data_rows)
    inspection_col = detect_inspection_col(stats)
    normal_col = detect_normal_col(stats, inspection_col)

    records: list[dict] = []
    record_id = record_start_id
    for row in data_rows:
        cells = [normalize_cell(c) for c in row]
        if not any(cells):
            continue

        before = [cells[i] for i in range(min(len(cells), inspection_col)) if cells[i]]
        organ_name = before[-1] if before else ""

        inspection_end = normal_col if normal_col is not None else len(cells)
        inspection = normalize_spaces(" ".join(cells[i] for i in range(inspection_col, min(inspection_end, len(cells))) if cells[i]))
        normal = ""
        if normal_col is not None and normal_col < len(cells):
            normal = normalize_spaces(" ".join(cells[i] for i in range(normal_col, len(cells)) if cells[i]))

        if not organ_name:
            continue
        if not (inspection or normal):
            continue

        records.append(
            {
                "record_id": record_id,
                "source_page": page_no,
                "source_y": 0.0,
                "organ_name": organ_name,
                "inspection_text": inspection,
                "normal_description": normal,
            }
        )
        record_id += 1

    return records


def extract_records_from_pdf(pdf_path: Path) -> list[dict]:
    doc = fitz.open(pdf_path)
    all_records: list[dict] = []
    next_id = 1
    for page_idx, page in enumerate(doc, start=1):
        finder = page.find_tables()
        for table in finder.tables:
            rows = table.extract()
            parsed = parse_table_rows(page_idx, rows, next_id)
            if parsed:
                all_records.extend(parsed)
                next_id = parsed[-1]["record_id"] + 1
    return all_records


def run_sanity_checks(records: list[dict]) -> list[str]:
    issues: list[str] = []

    def by_organ(name: str) -> dict | None:
        for r in records:
            if normalize_spaces(r["organ_name"]).lower() == name.lower():
                return r
        return None

    fogak = by_organ("fogak")
    if not fogak or "korhatározás" not in fogak.get("inspection_text", ""):
        issues.append("fogak: hiányzik a 'korhatározás' rész.")

    bor = by_organ("Bőr, szőrzet")
    if bor and "ektoparaziták jelenléte" not in bor.get("inspection_text", ""):
        issues.append("Bőr, szőrzet: hiányzik az 'ektoparaziták jelenléte'.")

    return issues


def write_outputs(records: list[dict], output_dir: Path) -> tuple[Path, Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    json_path = output_dir / "normalszervleiras_import.json"
    csv_path = output_dir / "normalszervleiras_import.csv"

    with json_path.open("w", encoding="utf-8") as f:
        json.dump(
            {
                "source": "normalszervleiras.pdf",
                "encoding": "utf-8",
                "record_count": len(records),
                "columns": ["record_id", "source_page", "source_y", "organ_name", "inspection_text", "normal_description"],
                "records": records,
            },
            f,
            ensure_ascii=False,
            indent=2,
        )

    with csv_path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["record_id", "source_page", "source_y", "organ_name", "inspection_text", "normal_description"],
        )
        writer.writeheader()
        writer.writerows(records)

    return json_path, csv_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Normálszervleírás táblázat import PDF-ből (UTF-8).")
    parser.add_argument("--input", default="normalszervleiras.pdf", help="Bemeneti PDF fájl.")
    parser.add_argument("--outdir", default="data/imported", help="Kimeneti mappa.")
    args = parser.parse_args()

    pdf_path = Path(args.input)
    if not pdf_path.exists():
        raise FileNotFoundError(f"Nem található a bemeneti fájl: {pdf_path}")

    records = extract_records_from_pdf(pdf_path)
    json_path, csv_path = write_outputs(records, Path(args.outdir))
    issues = run_sanity_checks(records)

    print(f"Import kész. Rekordok: {len(records)}")
    print(f"JSON: {json_path}")
    print(f"CSV:  {csv_path}")
    if issues:
        print("Figyelmeztetések:")
        for issue in issues:
            print(f" - {issue}")
    else:
        print("Sanity check: rendben.")


if __name__ == "__main__":
    main()
