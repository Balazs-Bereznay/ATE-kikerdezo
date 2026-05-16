from __future__ import annotations

import json
import random
from pathlib import Path


COLUMNS = [
    ("vertical_transmission", "Vertical transmission"),
    ("horizontal_transmission", "Horizontal transmission"),
    ("horizontal_spread", "Horizontal spread"),
    ("persistence_environment", "Persistence in the environment"),
]

ROWS = [
    {"disease": "Mycoplasma spp.", "values": {"vertical_transmission": "yes", "horizontal_transmission": "yes", "horizontal_spread": "slow", "persistence_environment": "low"}},
    {"disease": "Salmonella", "values": {"vertical_transmission": "yes", "horizontal_transmission": "yes", "horizontal_spread": "fast", "persistence_environment": "high"}},
    {"disease": "Avian influenza", "values": {"vertical_transmission": "?", "horizontal_transmission": "yes", "horizontal_spread": "very fast", "persistence_environment": "low"}},
    {"disease": "Newcastle disease", "values": {"vertical_transmission": "no", "horizontal_transmission": "yes", "horizontal_spread": "fast", "persistence_environment": "low"}},
    {"disease": "Infectious laryngotracheitis", "values": {"vertical_transmission": "no", "horizontal_transmission": "yes", "horizontal_spread": "fast", "persistence_environment": "low"}},
    {"disease": "Infectious bronchitis", "values": {"vertical_transmission": "no", "horizontal_transmission": "yes", "horizontal_spread": "fast", "persistence_environment": "low"}},
    {"disease": "Turkey rhinotracheitis", "values": {"vertical_transmission": "?", "horizontal_transmission": "yes", "horizontal_spread": "medium", "persistence_environment": "low"}},
    {"disease": "Fowl pox", "values": {"vertical_transmission": "no", "horizontal_transmission": "yes", "horizontal_spread": "slow", "persistence_environment": "high"}},
    {
        "disease": "Aspergillus",
        "values": {
            "vertical_transmission": "no",
            "horizontal_transmission": "no",
            "horizontal_spread": "Environmental contamination",
            "persistence_environment": "high",
        },
    },
    {"disease": "Pasteurellosis", "values": {"vertical_transmission": "no", "horizontal_transmission": "yes", "horizontal_spread": "medium", "persistence_environment": "low"}},
    {"disease": "Avibacterium paragallinarum", "values": {"vertical_transmission": "no", "horizontal_transmission": "yes", "horizontal_spread": "fast", "persistence_environment": "low"}},
    {"disease": "Ornithobacterium rhinotracheale", "values": {"vertical_transmission": "?", "horizontal_transmission": "yes", "horizontal_spread": "fast", "persistence_environment": "high"}},
    {"disease": "Escherichia coli", "values": {"vertical_transmission": "no", "horizontal_transmission": "yes", "horizontal_spread": "fast", "persistence_environment": "high"}},
    {"disease": "Gallibacterium anatis", "values": {"vertical_transmission": "no", "horizontal_transmission": "yes", "horizontal_spread": "medium", "persistence_environment": "low"}},
    {"disease": "Chlamidia psittaci", "values": {"vertical_transmission": "no", "horizontal_transmission": "yes", "horizontal_spread": "medium", "persistence_environment": "high"}},
    {"disease": "Gumboro", "values": {"vertical_transmission": "no", "horizontal_transmission": "yes", "horizontal_spread": "fast", "persistence_environment": "high"}},
    {"disease": "Marek disease", "values": {"vertical_transmission": "no", "horizontal_transmission": "yes", "horizontal_spread": "medium", "persistence_environment": "high"}},
    {"disease": "Coccidiosis", "values": {"vertical_transmission": "no", "horizontal_transmission": "yes", "horizontal_spread": "fast", "persistence_environment": "high"}},
    {"disease": "Worms", "values": {"vertical_transmission": "no", "horizontal_transmission": "yes", "horizontal_spread": "medium", "persistence_environment": "high"}},
    {"disease": "Clostridium Perfringens", "values": {"vertical_transmission": "no", "horizontal_transmission": "yes", "horizontal_spread": "medium", "persistence_environment": "high"}},
    {"disease": "Avian encephalomyelitis", "values": {"vertical_transmission": "yes", "horizontal_transmission": "yes", "horizontal_spread": "fast", "persistence_environment": "high"}},
]

# 4-choice pools by column.
VALUE_POOLS = {
    "vertical_transmission": ["yes", "no", "?", "unknown"],
    "horizontal_transmission": ["yes", "no", "?", "unknown"],
    "horizontal_spread": ["very fast", "fast", "medium", "slow", "Environmental contamination"],
    "persistence_environment": ["low", "high", "medium", "unknown"],
}


def options_for_value(column_key: str, value: str, rng: random.Random) -> list[str]:
    pool = VALUE_POOLS[column_key]
    distractors = [item for item in pool if item != value]
    picks = rng.sample(distractors, 3)
    options = [value, *picks]
    rng.shuffle(options)
    return options


def generate_questions() -> list[dict]:
    questions: list[dict] = []
    qid = 1
    for r_idx, row in enumerate(ROWS):
        disease = row["disease"]
        for c_idx, (col_key, col_label) in enumerate(COLUMNS):
            value = row["values"][col_key]
            rng = random.Random((r_idx + 1) * 1000 + (c_idx + 1) * 31)
            option_texts = options_for_value(col_key, value, rng)
            options = [{"id": i + 1, "text": text} for i, text in enumerate(option_texts)]
            correct_id = next(option["id"] for option in options if option["text"] == value)
            questions.append(
                {
                    "id": f"poultry-cell-{qid:03d}",
                    "topic": "all-cells",
                    "prompt": f'A táblázat alapján mi a(z) "{disease}" sor "{col_label}" értéke?',
                    "type": "single",
                    "difficulty": "medium",
                    "options": options,
                    "answers": [correct_id],
                    "tags": [f"row:{disease}", f"col:{col_label}", f"cell:{disease}|{col_label}"],
                }
            )
            qid += 1
    return questions


def main() -> None:
    out = Path("data/poultry-transmission-topic.js")
    pack = {
        "id": "poultry-transmission-table-pack",
        "title": "Csirke: betegségek terjedése és perzisztencia",
        "course": "Járványtan",
        "version": "1.0.0",
        "topics": [{"id": "all", "label": "Minden kérdés"}, {"id": "all-cells", "label": "Minden cella"}],
        "questions": generate_questions(),
    }
    js = "window.QUIZ_PACKS = window.QUIZ_PACKS || [];\n\n"
    js += "window.QUIZ_PACKS.push("
    js += json.dumps(pack, ensure_ascii=False, indent=2)
    js += ");\n"
    out.write_text(js, encoding="utf-8")
    print(f"Pack kész: {out} (kérdések: {len(pack['questions'])})")


if __name__ == "__main__":
    main()
