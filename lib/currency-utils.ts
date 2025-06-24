/**
 * Formats a number as Thai Baht currency
 * @param amount The amount to format
 * @param options Formatting options
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  options: {
    decimals?: number
    showSymbol?: boolean
    showDecimals?: boolean
  } = {},
): string {
  const { decimals = 2, showSymbol = true, showDecimals = true } = options

  // Format the number with the specified number of decimal places
  const formattedAmount = showDecimals ? amount.toFixed(decimals) : Math.floor(amount).toString()

  // Add the currency symbol if requested
  return showSymbol ? `฿${formattedAmount}` : formattedAmount
}

/**
 * Parses a currency string into a number
 * @param currencyString The currency string to parse
 * @returns The parsed number
 */
export function parseCurrency(currencyString: string): number {
  // Remove currency symbol and any non-numeric characters except decimal point
  const cleanedString = currencyString.replace(/[^\d.-]/g, "")
  return Number.parseFloat(cleanedString)
}
