import json
from pathlib import Path

from app.config import settings
from app.schemas import ExpenseResponse


def get_storage_path() -> Path:
    return settings.data_file_path


def ensure_storage_file() -> None:
    storage_path = get_storage_path()
    storage_path.parent.mkdir(parents=True, exist_ok=True)

    if not storage_path.exists():
        storage_path.write_text("[]", encoding="utf-8")


def read_expenses() -> list[ExpenseResponse]:
    ensure_storage_file()

    storage_path = get_storage_path()
    raw_content = storage_path.read_text(encoding="utf-8").strip()

    if not raw_content:
        return []

    data = json.loads(raw_content)

    return [ExpenseResponse.model_validate(item) for item in data]


def write_expenses(expenses: list[ExpenseResponse]) -> None:
    ensure_storage_file()

    storage_path = get_storage_path()
    data = [expense.model_dump(mode="json") for expense in expenses]

    storage_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )