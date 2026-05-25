from datetime import datetime, timezone
from zoneinfo import ZoneInfo

APP_TIMEZONE = ZoneInfo("America/Sao_Paulo")


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def to_app_timezone(value: datetime) -> datetime:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)

    return value.astimezone(APP_TIMEZONE)


def format_datetime_br(value: datetime) -> str:
    local_datetime = to_app_timezone(value)

    return local_datetime.strftime("%d/%m/%Y às %H:%M")


def format_date_br(value: datetime) -> str:
    local_datetime = to_app_timezone(value)

    return local_datetime.strftime("%d/%m/%Y")