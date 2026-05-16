from __future__ import annotations

import csv
import json
import re
from pathlib import Path


def normalize_text(value: str) -> str:
    text = (value or "").replace("\u00ad", "")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def stable_hash(value: str) -> int:
    acc = 2166136261
    for ch in value:
        acc ^= ord(ch)
        acc = (acc * 16777619) & 0xFFFFFFFF
    return acc


def deterministic_shuffle(items: list[str], seed: int) -> list[str]:
    arr = list(items)
    if len(arr) < 2:
        return arr
    x = seed & 0x7FFFFFFF
    for i in range(len(arr) - 1, 0, -1):
        x = (1103515245 * x + 12345) & 0x7FFFFFFF
        j = x % (i + 1)
        arr[i], arr[j] = arr[j], arr[i]
    return arr


def page_topic(page: int) -> tuple[str, str]:
    start = ((page - 1) // 10) * 10 + 1
    end = start + 9
    return (f"oldal-{start:03d}-{end:03d}", f"Oldalak {start}-{end}")


def main() -> None:
    src = Path("data/imported/korszovet_kepek/korszovet_kepek_import.csv")
    out = Path("data/korszovet-kepfelismeres-topic.js")

    with src.open("r", encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))

    questions = []
    topics = {"all": "Minden téma"}
    all_labels = sorted({normalize_text(row.get("topic_guess", "")) or "Ismeretlen" for row in rows})

    for row in rows:
        record_id = int((row.get("record_id", "") or "0").strip() or "0")
        page = int((row.get("source_page", "") or "0").strip() or "0")
        topic_guess = normalize_text(row.get("topic_guess", "")) or "Ismeretlen"
        image_path = normalize_text(row.get("image_path", ""))

        topic_id, topic_label = page_topic(page)
        topics[topic_id] = topic_label

        distractor_pool = [label for label in all_labels if label != topic_guess]
        shuffled_pool = deterministic_shuffle(distractor_pool, stable_hash(f"{record_id}-{topic_guess}"))
        picked = shuffled_pool[:3]
        option_labels = deterministic_shuffle([topic_guess, *picked], stable_hash(f"opt-{record_id}"))
        options = [{"id": idx + 1, "text": label} for idx, label in enumerate(option_labels)]
        correct_id = next(option["id"] for option in options if option["text"] == topic_guess)

        questions.append(
            {
                "id": f"ksz-img-{record_id:04d}",
                "topic": topic_id,
                "prompt": "Melyik kórkép vagy szövettani elváltozás látható a képen?",
                "type": "single",
                "difficulty": "medium",
                "options": options,
                "answers": [correct_id],
                "media": {
                    "src": image_path,
                    "alt": f"Kórszövet kép, oldal {page}",
                    "caption": f"{page}. oldal",
                },
                "tags": ["importalt", "kepfelismeres", "korszovet", f"oldal-{page}"],
            }
        )

    pack = {
        "id": "korszovet-kepfelismeres-pack",
        "title": "Kórszövet képfelismerés",
        "course": "Kórbonctan",
        "version": "1.1.0",
        "topics": [{"id": key, "label": value} for key, value in sorted(topics.items(), key=lambda x: x[0])],
        "questions": questions,
    }

    js = "window.QUIZ_PACKS = window.QUIZ_PACKS || [];\n\n"
    js += "window.QUIZ_PACKS.push("
    js += json.dumps(pack, ensure_ascii=False, indent=2)
    js += ");\n"
    out.write_text(js, encoding="utf-8")
    print(f"Pack kész: {out} (kérdések: {len(questions)})")


if __name__ == "__main__":
    main()
