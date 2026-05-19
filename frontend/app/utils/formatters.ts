export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

export function getCurrentDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getCurrentMonth() {
  return getCurrentDate().slice(0, 7);
}

export function sanitizeMoneyInput(value: string) {
  const onlyNumbersAndSeparators = value.replace(/[^\d,.]/g, "");
  const normalizedValue = onlyNumbersAndSeparators.replace(/\./g, ",");

  const [integerPart, ...decimalParts] = normalizedValue.split(",");

  if (decimalParts.length === 0) {
    return integerPart;
  }

  const decimalPart = decimalParts.join("").slice(0, 2);

  return `${integerPart},${decimalPart}`;
}

export function parseMoneyToNumber(value: string) {
  const normalizedValue = value.replace(",", ".");
  return Number(normalizedValue);
}