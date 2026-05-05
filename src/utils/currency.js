export const CURRENCIES = [
  { code: "ILS", symbol: "₪", name: "شيكل إسرائيلي" },
  { code: "JOD", symbol: "د.أ", name: "دينار أردني" },
  { code: "EUR", symbol: "€", name: "يورو" },
  { code: "SAR", symbol: "ر.س", name: "ريال سعودي" },
];

export function getCurrency() {
  const saved = localStorage.getItem("currency");
  return CURRENCIES.find(c => c.code === saved) || CURRENCIES[0];
}

export function setCurrencyCode(code) {
  localStorage.setItem("currency", code);
}