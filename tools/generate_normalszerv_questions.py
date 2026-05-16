from __future__ import annotations

import csv
import json
import re
from pathlib import Path


def normalize_text(value: str) -> str:
    text = (value or "").replace("\u00ad", "")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def split_into_reveal_items(value: str) -> list[str]:
    text = normalize_text(value)
    if not text:
        return []
    parts = [part.strip() for part in text.split(",")]
    items: list[str] = []
    for part in parts:
        cleaned = part.strip(" ,;")
        if cleaned:
            items.append(cleaned)
    return items


def main() -> None:
    src = Path("data/imported/normalszervleiras_import.csv")
    out = Path("data/normalszervleiras-topic.js")

    with src.open("r", encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))

    questions = []
    pages = set()
    for row in rows:
        organ = normalize_text(row.get("organ_name", ""))
        if not organ:
            continue

        source_page = int((row.get("source_page", "") or "0").strip() or "0")
        pages.add(source_page)

        inspection_items = split_into_reveal_items(row.get("inspection_text", ""))
        normal_items = split_into_reveal_items(row.get("normal_description", ""))

        questions.append(
            {
                "id": f"nsz-{int(row.get('record_id', '0') or '0'):03d}",
                "topic": f"oldal-{source_page}",
                "prompt": organ,
                "type": "self-list",
                "difficulty": "medium",
                "answerLabel": "Sajat leirasod",
                "placeholder": "Ird le emlekezetbol, majd fedd fel kulon a ket forrasmezot.",
                "revealBoxes": [
                    {
                        "id": "inspection",
                        "title": "Mit vizsgalunk?",
                        "items": inspection_items,
                    },
                    {
                        "id": "normal",
                        "title": "Az ep szerv leirasa",
                        "items": normal_items,
                    },
                ],
                "tags": ["importalt", "normal-szervleiras", f"oldal-{source_page}"],
            }
        )

    pack = {
        "id": "normalszervleiras-pack",
        "title": "Normalszervleiras kikerdezo",
        "course": "Korbonctan",
        "version": "1.1.0",
        "topics": [{"id": "all", "label": "Minden oldal"}]
        + [{"id": f"oldal-{i}", "label": f"{i}. oldal"} for i in sorted(pages)],
        "questions": questions,
    }

    js = "window.QUIZ_PACKS = window.QUIZ_PACKS || [];\n\n"
    js += "window.QUIZ_PACKS.push("
    js += json.dumps(pack, ensure_ascii=False, indent=2)
    js += ");\n"
    out.write_text(js, encoding="utf-8")
    print(f"Pack kesz: {out} (kerdesek: {len(questions)})")


if __name__ == "__main__":
    main()
