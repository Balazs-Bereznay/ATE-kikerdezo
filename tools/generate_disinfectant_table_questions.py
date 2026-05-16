from __future__ import annotations

import json
import random
from pathlib import Path


ROWS = [
    "Prions",
    "Protozoal oocysts",
    "Bacterial endospores",
    "Mycobacteria",
    "Non-enveloped viruses",
    "Fungal spores",
    "Gram negative bacteria",
    "Enveloped viruses",
    "Gram positive bacteria",
    "Mycoplasmas",
]

COLS = [
    "Acids",
    "Alkalis",
    "Alcohols",
    "Aldehydes",
    "Biguanides",
    "QACs",
    "Halogens",
    "Peroxides",
    "Phenols",
]

# Strictly follows the table transcribed in chat.
TABLE = {
    "Prions": ["-", "-", "-", "-", "-", "-", "-", "-", "-"],
    "Protozoal oocysts": ["-", "+", "-", "-", "-", "-", "-", "-", "+/-"],
    "Bacterial endospores": ["±", "±", "-", "+", "-", "-", "+", "+", "-"],
    "Mycobacteria": ["-", "+", "+", "+", "-", "-", "+", "±", "±"],
    "Non-enveloped viruses": ["-", "±", "-", "+", "-", "-", "+/-", "±", "-"],
    "Fungal spores": ["±", "+", "±", "+", "±", "±", "+", "±", "+"],
    "Gram negative bacteria": ["+", "+", "++", "++", "++", "+", "+", "+", "++"],
    "Enveloped viruses": ["+", "+", "+", "++", "±", "±", "+", "+", "±"],
    "Gram positive bacteria": ["+", "+", "++", "++", "++", "+", "+", "+", "++"],
    "Mycoplasmas": ["+", "++", "++", "++", "++", "+", "++", "++", "++"],
}

VALUE_LABEL = {
    "++": "általában nagyon aktív",
    "+": "általában aktív",
    "±": "korlátozott aktivitás",
    "+/-": "egyes vegyületek aktívak",
    "-": "nincs aktivitás",
}


def build_options_from_columns(row_name: str, correct_col: str, value: str, rng: random.Random) -> list[str] | None:
    row_values = TABLE[row_name]
    candidates = []
    for idx, col in enumerate(COLS):
        if col == correct_col:
            continue
        if row_values[idx] != value:
            candidates.append(col)
    if len(candidates) < 3:
        return None
    picks = rng.sample(candidates, 3)
    options = [correct_col, *picks]
    rng.shuffle(options)
    return options


def build_options_from_rows(col_name: str, correct_row: str, value: str, rng: random.Random) -> list[str] | None:
    col_idx = COLS.index(col_name)
    candidates = []
    for row in ROWS:
        if row == correct_row:
            continue
        if TABLE[row][col_idx] != value:
            candidates.append(row)
    if len(candidates) < 3:
        return None
    picks = rng.sample(candidates, 3)
    options = [correct_row, *picks]
    rng.shuffle(options)
    return options


def generate_questions() -> list[dict]:
    questions: list[dict] = []
    qid = 1

    for r_idx, row in enumerate(ROWS):
        for c_idx, col in enumerate(COLS):
            value = TABLE[row][c_idx]
            label = VALUE_LABEL[value]
            rng = random.Random((r_idx + 1) * 1000 + (c_idx + 1) * 17)

            col_options = build_options_from_columns(row, col, value, rng)
            if col_options is not None:
                options = [{"id": i + 1, "text": name} for i, name in enumerate(col_options)]
                correct_id = next(opt["id"] for opt in options if opt["text"] == col)
                prompt = (
                    f'A táblázat alapján a(z) "{row}" sorban melyik fertőtlenítőszer-osztályra igaz, hogy '
                    f'"{label}"?'
                )
                tags = [f"row:{row}", f"cell:{row}|{col}", "ask:column"]
            else:
                row_options = build_options_from_rows(col, row, value, rng)
                if row_options is None:
                    raise RuntimeError(f"Nem tudtam egyértelmű opciókat képezni ehhez a cellához: {row} / {col}")
                options = [{"id": i + 1, "text": name} for i, name in enumerate(row_options)]
                correct_id = next(opt["id"] for opt in options if opt["text"] == row)
                prompt = (
                    f'A táblázat alapján a(z) "{col}" oszlopban melyik mikroorganizmus-csoportra igaz, hogy '
                    f'"{label}"?'
                )
                tags = [f"col:{col}", f"cell:{row}|{col}", "ask:row"]

            questions.append(
                {
                    "id": f"disc-cell-{qid:03d}",
                    "topic": "all-cells",
                    "prompt": prompt,
                    "type": "single",
                    "difficulty": "medium",
                    "options": options,
                    "answers": [correct_id],
                    "tags": tags,
                }
            )
            qid += 1

    return questions


def main() -> None:
    out = Path("data/disinfectant-table-topic.js")
    questions = generate_questions()

    pack = {
        "id": "disinfectant-spectrum-pack",
        "title": "Disinfectant Spectrum (Table 6.1)",
        "course": "Microbiology",
        "version": "1.0.0",
        "topics": [{"id": "all", "label": "Minden kérdés"}, {"id": "all-cells", "label": "Minden cella"}],
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
