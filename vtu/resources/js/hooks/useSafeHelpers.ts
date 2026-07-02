export function useSafeHelpers() {
  const safeNumber = (value: unknown): number => {
    const num = Number(value)
    return isNaN(num) ? 0 : num
  }

  const safeCurrency = (value: number): string =>
    new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 0,
    }).format(value)

  return { safeNumber, safeCurrency }
}
