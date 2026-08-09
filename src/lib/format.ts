const dateFormatter = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** Milhares separados por ponto, como na identidade da marca: 20.000. */
export function formatNumber(value: number): string {
  const [integer, decimals] = Math.abs(value).toFixed(0).split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const sign = value < 0 ? "-" : "";
  return decimals ? `${sign}${grouped},${decimals}` : `${sign}${grouped}`;
}

/** Recebe cêntimos. Omite os decimais quando o valor é redondo: 399 €. */
export function formatPrice(cents: number): string {
  const euros = Math.trunc(cents / 100);
  const remainder = Math.abs(cents % 100);
  const amount =
    remainder === 0
      ? formatNumber(euros)
      : `${formatNumber(euros)},${String(remainder).padStart(2, "0")}`;
  return `${amount} €`;
}

export function formatDate(date: Date): string {
  return dateFormatter.format(date);
}
