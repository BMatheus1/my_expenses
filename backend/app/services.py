import unicodedata
from datetime import date, datetime, timezone
from uuid import uuid4

from fastapi import HTTPException, status

from app.schemas import (
    CreditCardCreate,
    CreditCardRecord,
    CreditCardResponse,
    CreditCardSummaryResponse,
    CreditCardUpdate,
    ExpenseCategoryCreate,
    ExpenseCategoryRecord,
    ExpenseCategoryResponse,
    ExpenseCategoryUpdate,
    ExpenseCreate,
    ExpenseRecord,
    ExpenseResponse,
    ExpenseUpdate,
    IncomeCreate,
    IncomeRecord,
    IncomeResponse,
    IncomeUpdate,
)
from app.storage import (
    count_expenses_by_category,
    count_expenses_by_credit_card,
    create_credit_card_record,
    create_expense_category_record,
    create_expense_record,
    create_income_record,
    delete_credit_card_record,
    delete_expense_category_record,
    delete_expense_record,
    delete_income_record,
    get_credit_card_record_by_id,
    get_expense_category_record_by_id,
    get_expense_category_record_by_normalized_name,
    get_expense_record_by_id,
    get_income_record_by_id,
    list_credit_card_records,
    list_custom_expense_category_records,
    list_expense_records,
    list_income_records,
    list_used_expense_category_names,
    update_credit_card_record,
    update_expense_category_record,
    update_expense_record,
    update_expenses_category_name,
    update_income_record,
)

DEFAULT_EXPENSE_CATEGORIES = [
    "Alimentação",
    "Transporte",
    "Moradia",
    "Saúde",
    "Lazer",
    "Educação",
    "Outros",
]

RESERVED_CATEGORY_NAMES = {"todas"}

PAYMENT_METHODS = {
    "cash",
    "pix",
    "debit_card",
    "credit_card",
    "bank_transfer",
    "other",
}

CARD_COLORS = {
    "slate",
    "purple",
    "blue",
    "emerald",
    "rose",
    "amber",
    "black",
}


def get_app_status() -> dict:
    return {
        "status": "ok",
        "message": "API funcionando",
    }


def list_expense_categories(user_id: str) -> list[ExpenseCategoryResponse]:
    custom_categories = list_custom_expense_category_records(user_id)
    used_category_names = list_used_expense_category_names(user_id)

    categories: list[ExpenseCategoryResponse] = []
    existing_keys: set[str] = set()

    for default_category in DEFAULT_EXPENSE_CATEGORIES:
        category_key = normalize_category_key(default_category)
        is_used = count_expenses_by_category(user_id, default_category) > 0

        categories.append(
            ExpenseCategoryResponse(
                id=None,
                name=default_category,
                is_default=True,
                is_custom=False,
                is_used=is_used,
                can_edit=False,
                can_delete=False,
            )
        )
        existing_keys.add(category_key)

    for custom_category in custom_categories:
        category_key = normalize_category_key(custom_category.name)

        if category_key in existing_keys:
            continue

        is_used = count_expenses_by_category(user_id, custom_category.name) > 0

        categories.append(
            ExpenseCategoryResponse(
                id=custom_category.id,
                name=custom_category.name,
                is_default=False,
                is_custom=True,
                is_used=is_used,
                can_edit=True,
                can_delete=not is_used,
            )
        )
        existing_keys.add(category_key)

    for used_category_name in used_category_names:
        category_key = normalize_category_key(used_category_name)

        if category_key in existing_keys:
            continue

        categories.append(
            ExpenseCategoryResponse(
                id=None,
                name=used_category_name,
                is_default=False,
                is_custom=False,
                is_used=True,
                can_edit=False,
                can_delete=False,
            )
        )
        existing_keys.add(category_key)

    return categories


def create_expense_category(
    category_data: ExpenseCategoryCreate,
    user_id: str,
) -> ExpenseCategoryResponse:
    category_name = normalize_category_name(category_data.name)
    name_normalized = normalize_category_key(category_name)

    validate_category_name(category_name)
    ensure_category_name_is_available(name_normalized, user_id)

    category = ExpenseCategoryRecord(
        id=str(uuid4()),
        user_id=user_id,
        name=category_name,
        name_normalized=name_normalized,
        created_at=datetime.now(timezone.utc),
    )

    created_category = create_expense_category_record(category)

    return ExpenseCategoryResponse(
        id=created_category.id,
        name=created_category.name,
        is_default=False,
        is_custom=True,
        is_used=False,
        can_edit=True,
        can_delete=True,
    )


def update_expense_category(
    category_id: str,
    category_data: ExpenseCategoryUpdate,
    user_id: str,
) -> ExpenseCategoryResponse:
    current_category = get_expense_category_record_by_id(category_id, user_id)

    if current_category is None:
        raise_not_found_error("Categoria não encontrada.")

    new_category_name = normalize_category_name(category_data.name)
    new_name_normalized = normalize_category_key(new_category_name)

    validate_category_name(new_category_name)
    ensure_category_name_is_available(
        name_normalized=new_name_normalized,
        user_id=user_id,
        ignored_category_id=category_id,
    )

    updated_category = update_expense_category_record(
        category_id=category_id,
        user_id=user_id,
        name=new_category_name,
        name_normalized=new_name_normalized,
    )

    if updated_category is None:
        raise_not_found_error("Categoria não encontrada.")

    update_expenses_category_name(
        user_id=user_id,
        old_category_name=current_category.name,
        new_category_name=updated_category.name,
    )

    is_used = count_expenses_by_category(user_id, updated_category.name) > 0

    return ExpenseCategoryResponse(
        id=updated_category.id,
        name=updated_category.name,
        is_default=False,
        is_custom=True,
        is_used=is_used,
        can_edit=True,
        can_delete=not is_used,
    )


def delete_expense_category(category_id: str, user_id: str) -> None:
    category = get_expense_category_record_by_id(category_id, user_id)

    if category is None:
        raise_not_found_error("Categoria não encontrada.")

    is_used = count_expenses_by_category(user_id, category.name) > 0

    if is_used:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não é possível excluir uma categoria que já possui gastos.",
        )

    deleted = delete_expense_category_record(category_id, user_id)

    if not deleted:
        raise_not_found_error("Categoria não encontrada.")


def list_credit_cards(user_id: str) -> list[CreditCardResponse]:
    cards = list_credit_card_records(user_id)

    return [to_credit_card_response(card) for card in cards]


def create_credit_card(
    card_data: CreditCardCreate,
    user_id: str,
) -> CreditCardResponse:
    card = CreditCardRecord(
        id=str(uuid4()),
        user_id=user_id,
        name=normalize_card_text(card_data.name),
        brand=normalize_card_text(card_data.brand),
        last_four_digits=card_data.last_four_digits,
        closing_day=card_data.closing_day,
        due_day=card_data.due_day,
        limit_amount=round(float(card_data.limit_amount), 2)
        if card_data.limit_amount is not None
        else None,
        color=normalize_card_color(card_data.color),
        created_at=datetime.now(timezone.utc),
    )

    created_card = create_credit_card_record(card)

    return to_credit_card_response(created_card)


def update_credit_card(
    card_id: str,
    card_data: CreditCardUpdate,
    user_id: str,
) -> CreditCardResponse:
    current_card = get_credit_card_record_by_id(card_id, user_id)

    if current_card is None:
        raise_not_found_error("Cartão não encontrado.")

    updated_card = CreditCardRecord(
        id=current_card.id,
        user_id=current_card.user_id,
        name=normalize_card_text(card_data.name),
        brand=normalize_card_text(card_data.brand),
        last_four_digits=card_data.last_four_digits,
        closing_day=card_data.closing_day,
        due_day=card_data.due_day,
        limit_amount=round(float(card_data.limit_amount), 2)
        if card_data.limit_amount is not None
        else None,
        color=normalize_card_color(card_data.color),
        created_at=current_card.created_at,
    )

    saved_card = update_credit_card_record(updated_card)

    return to_credit_card_response(saved_card)


def delete_credit_card(card_id: str, user_id: str) -> None:
    card = get_credit_card_record_by_id(card_id, user_id)

    if card is None:
        raise_not_found_error("Cartão não encontrado.")

    linked_expenses = count_expenses_by_credit_card(user_id, card_id)

    if linked_expenses > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Este cartão possui gastos vinculados. "
                "Edite ou remova esses gastos antes de excluir o cartão."
            ),
        )

    deleted = delete_credit_card_record(card_id, user_id)

    if not deleted:
        raise_not_found_error("Cartão não encontrado.")


def list_expenses(user_id: str) -> list[ExpenseResponse]:
    records = list_expense_records(user_id)

    return [to_expense_response(record) for record in records]


def create_expense(
    expense_data: ExpenseCreate,
    user_id: str,
) -> ExpenseResponse:
    category_name = ensure_expense_category_registered(
        expense_data.category,
        user_id,
    )
    payment_method = normalize_payment_method(expense_data.payment_method)
    credit_card = get_expense_credit_card(
        payment_method=payment_method,
        credit_card_id=expense_data.credit_card_id,
        user_id=user_id,
    )

    installments_count = expense_data.installments_count
    installment_group_id = str(uuid4()) if installments_count > 1 else None
    installment_amounts = split_installment_amounts(
        total_amount=float(expense_data.amount),
        installments_count=installments_count,
    )
    created_at = datetime.now(timezone.utc)
    created_expenses: list[ExpenseRecord] = []

    for installment_index, installment_amount in enumerate(
        installment_amounts,
        start=1,
    ):
        installment_date = add_months(expense_data.date, installment_index - 1)
        installment_description = format_installment_description(
            description=expense_data.description,
            installment_number=installment_index,
            installments_count=installments_count,
        )

        new_expense = ExpenseRecord(
            id=str(uuid4()),
            user_id=user_id,
            description=installment_description,
            amount=installment_amount,
            category=category_name,
            date=installment_date,
            created_at=created_at,
            payment_method=payment_method,
            credit_card_id=credit_card.id if credit_card is not None else None,
            installments_count=installments_count,
            installment_number=installment_index,
            installment_group_id=installment_group_id,
            invoice_month=calculate_invoice_month(
                expense_date=installment_date,
                closing_day=credit_card.closing_day if credit_card is not None else None,
            ),
            credit_card_name=credit_card.name if credit_card is not None else None,
            credit_card_brand=credit_card.brand if credit_card is not None else None,
            credit_card_last_four_digits=(
                credit_card.last_four_digits if credit_card is not None else None
            ),
            credit_card_color=credit_card.color if credit_card is not None else None,
            credit_card_due_day=credit_card.due_day if credit_card is not None else None,
        )

        created_expenses.append(create_expense_record(new_expense))

    return to_expense_response(created_expenses[0])


def update_expense(
    expense_id: str,
    expense_data: ExpenseUpdate,
    user_id: str,
) -> ExpenseResponse:
    current_expense = get_expense_record_by_id(expense_id, user_id)

    if current_expense is None:
        raise_not_found_error("Gasto não encontrado.")

    category_name = ensure_expense_category_registered(
        expense_data.category,
        user_id,
    )
    payment_method = normalize_payment_method(expense_data.payment_method)
    credit_card = get_expense_credit_card(
        payment_method=payment_method,
        credit_card_id=expense_data.credit_card_id,
        user_id=user_id,
    )

    updated_expense = ExpenseRecord(
        id=current_expense.id,
        user_id=current_expense.user_id,
        description=expense_data.description,
        amount=round(float(expense_data.amount), 2),
        category=category_name,
        date=expense_data.date,
        created_at=current_expense.created_at,
        payment_method=payment_method,
        credit_card_id=credit_card.id if credit_card is not None else None,
        installments_count=current_expense.installments_count,
        installment_number=current_expense.installment_number,
        installment_group_id=current_expense.installment_group_id,
        invoice_month=calculate_invoice_month(
            expense_date=expense_data.date,
            closing_day=credit_card.closing_day if credit_card is not None else None,
        ),
        credit_card_name=credit_card.name if credit_card is not None else None,
        credit_card_brand=credit_card.brand if credit_card is not None else None,
        credit_card_last_four_digits=(
            credit_card.last_four_digits if credit_card is not None else None
        ),
        credit_card_color=credit_card.color if credit_card is not None else None,
        credit_card_due_day=credit_card.due_day if credit_card is not None else None,
    )

    saved_expense = update_expense_record(updated_expense)

    return to_expense_response(saved_expense)


def delete_expense(expense_id: str, user_id: str) -> None:
    deleted = delete_expense_record(expense_id, user_id)

    if not deleted:
        raise_not_found_error("Gasto não encontrado.")


def list_incomes(user_id: str) -> list[IncomeResponse]:
    records = list_income_records(user_id)

    return [to_income_response(record) for record in records]


def create_income(
    income_data: IncomeCreate,
    user_id: str,
) -> IncomeResponse:
    new_income = IncomeRecord(
        id=str(uuid4()),
        user_id=user_id,
        description=income_data.description,
        amount=round(float(income_data.amount), 2),
        source=income_data.source,
        date=income_data.date,
        created_at=datetime.now(timezone.utc),
    )

    created_income = create_income_record(new_income)

    return to_income_response(created_income)


def update_income(
    income_id: str,
    income_data: IncomeUpdate,
    user_id: str,
) -> IncomeResponse:
    current_income = get_income_record_by_id(income_id, user_id)

    if current_income is None:
        raise_not_found_error("Ganho não encontrado.")

    updated_income = IncomeRecord(
        id=current_income.id,
        user_id=current_income.user_id,
        description=income_data.description,
        amount=round(float(income_data.amount), 2),
        source=income_data.source,
        date=income_data.date,
        created_at=current_income.created_at,
    )

    saved_income = update_income_record(updated_income)

    return to_income_response(saved_income)


def delete_income(income_id: str, user_id: str) -> None:
    deleted = delete_income_record(income_id, user_id)

    if not deleted:
        raise_not_found_error("Ganho não encontrado.")


def normalize_payment_method(payment_method: str) -> str:
    normalized_payment_method = payment_method.strip().casefold()

    if normalized_payment_method not in PAYMENT_METHODS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Forma de pagamento inválida.",
        )

    return normalized_payment_method


def get_expense_credit_card(
    payment_method: str,
    credit_card_id: str | None,
    user_id: str,
) -> CreditCardRecord | None:
    if payment_method != "credit_card":
        return None

    if not credit_card_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selecione o cartão usado neste gasto.",
        )

    credit_card = get_credit_card_record_by_id(credit_card_id, user_id)

    if credit_card is None:
        raise_not_found_error("Cartão não encontrado.")

    return credit_card


def split_installment_amounts(
    total_amount: float,
    installments_count: int,
) -> list[float]:
    if installments_count <= 1:
        return [round(total_amount, 2)]

    base_amount = round(total_amount / installments_count, 2)
    amounts = [base_amount for _ in range(installments_count)]
    difference = round(total_amount - sum(amounts), 2)
    amounts[-1] = round(amounts[-1] + difference, 2)

    return amounts


def format_installment_description(
    description: str,
    installment_number: int,
    installments_count: int,
) -> str:
    normalized_description = description.strip()

    if installments_count <= 1:
        return normalized_description

    return f"{normalized_description} ({installment_number}/{installments_count})"


def add_months(original_date: date, months_to_add: int) -> date:
    target_month = original_date.month - 1 + months_to_add
    target_year = original_date.year + target_month // 12
    target_month = target_month % 12 + 1

    last_day = get_last_day_of_month(target_year, target_month)
    target_day = min(original_date.day, last_day)

    return date(target_year, target_month, target_day)


def get_last_day_of_month(year: int, month: int) -> int:
    if month == 12:
        next_month = date(year + 1, 1, 1)
    else:
        next_month = date(year, month + 1, 1)

    return (next_month - date.resolution).day


def calculate_invoice_month(
    expense_date: date,
    closing_day: int | None,
) -> str | None:
    if closing_day is None:
        return None

    effective_closing_day = min(
        closing_day,
        get_last_day_of_month(expense_date.year, expense_date.month),
    )

    if expense_date.day > effective_closing_day:
        invoice_date = add_months(expense_date, 1)
    else:
        invoice_date = expense_date

    return f"{invoice_date.year:04d}-{invoice_date.month:02d}"


def normalize_card_text(value: str) -> str:
    normalized_value = " ".join(value.strip().split())

    if not normalized_value:
        return ""

    return normalized_value[:1].upper() + normalized_value[1:]


def normalize_card_color(value: str) -> str:
    normalized_value = value.strip().casefold()

    if normalized_value not in CARD_COLORS:
        return "slate"

    return normalized_value


def ensure_expense_category_registered(
    category_name: str,
    user_id: str,
) -> str:
    normalized_name = normalize_category_name(category_name)
    name_normalized = normalize_category_key(normalized_name)

    validate_category_name(normalized_name)

    existing_category = get_expense_category_record_by_normalized_name(
        user_id=user_id,
        name_normalized=name_normalized,
    )

    if existing_category is not None:
        return existing_category.name

    if is_default_category(normalized_name):
        return find_default_category_name(normalized_name)

    category = ExpenseCategoryRecord(
        id=str(uuid4()),
        user_id=user_id,
        name=normalized_name,
        name_normalized=name_normalized,
        created_at=datetime.now(timezone.utc),
    )

    created_category = create_expense_category_record(category)

    return created_category.name


def ensure_category_name_is_available(
    name_normalized: str,
    user_id: str,
    ignored_category_id: str | None = None,
) -> None:
    if is_default_category_key(name_normalized):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Essa categoria já existe.",
        )

    existing_category = get_expense_category_record_by_normalized_name(
        user_id=user_id,
        name_normalized=name_normalized,
    )

    if existing_category is None:
        return

    if ignored_category_id and existing_category.id == ignored_category_id:
        return

    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Essa categoria já existe.",
    )


def validate_category_name(category_name: str) -> None:
    if normalize_category_key(category_name) in RESERVED_CATEGORY_NAMES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esse nome de categoria é reservado.",
        )


def is_default_category(category_name: str) -> bool:
    return is_default_category_key(normalize_category_key(category_name))


def is_default_category_key(category_key: str) -> bool:
    return any(
        normalize_category_key(default_category) == category_key
        for default_category in DEFAULT_EXPENSE_CATEGORIES
    )


def find_default_category_name(category_name: str) -> str:
    category_key = normalize_category_key(category_name)

    for default_category in DEFAULT_EXPENSE_CATEGORIES:
        if normalize_category_key(default_category) == category_key:
            return default_category

    return category_name


def normalize_category_name(category_name: str) -> str:
    normalized_name = " ".join(category_name.strip().split())

    if not normalized_name:
        return ""

    return normalized_name[:1].upper() + normalized_name[1:]


def normalize_category_key(category_name: str) -> str:
    without_accents = "".join(
        character
        for character in unicodedata.normalize("NFKD", category_name)
        if not unicodedata.combining(character)
    )

    return " ".join(without_accents.strip().split()).casefold()


def to_credit_card_response(card: CreditCardRecord) -> CreditCardResponse:
    return CreditCardResponse.model_validate(card.model_dump())


def to_expense_response(expense: ExpenseRecord) -> ExpenseResponse:
    credit_card = None

    if expense.credit_card_id and expense.credit_card_name:
        credit_card = CreditCardSummaryResponse(
            id=expense.credit_card_id,
            name=expense.credit_card_name,
            brand=expense.credit_card_brand or "Cartão",
            last_four_digits=expense.credit_card_last_four_digits or "0000",
            color=expense.credit_card_color or "slate",
            due_day=expense.credit_card_due_day or 1,
        )

    return ExpenseResponse(
        id=expense.id,
        description=expense.description,
        amount=float(expense.amount),
        category=expense.category,
        date=expense.date,
        created_at=expense.created_at,
        payment_method=expense.payment_method,
        credit_card_id=expense.credit_card_id,
        credit_card=credit_card,
        installments_count=expense.installments_count,
        installment_number=expense.installment_number,
        installment_group_id=expense.installment_group_id,
        invoice_month=expense.invoice_month,
    )


def to_income_response(income: IncomeRecord) -> IncomeResponse:
    return IncomeResponse.model_validate(income.model_dump())


def raise_not_found_error(message: str) -> None:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=message,
    )