/** Invoice and payment amounts are integer cents in the database. */

export function dollarsToCents(dollars: number) {
  return Math.round(dollars * 100)
}

export function centsToDollars(cents: number) {
  return cents / 100
}
