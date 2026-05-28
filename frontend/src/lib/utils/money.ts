import type { PriceType } from '../../types'

// Format integer grosze as PLN string. 123456 -> "1 234,56 zł"
export function formatPln(grosze: number): string {
  const zl = (grosze / 100).toLocaleString('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${zl} zł`
}

// Format with netto/brutto suffix. 123456, "NETTO" -> "1 234,56 zł netto"
export function formatPlnWithType(grosze: number, type: PriceType): string {
  return `${formatPln(grosze)} ${type === 'BRUTTO' ? 'brutto' : 'netto'}`
}

// Parse user input ("1234,56", "1 234.56", "5") to grosze integer.
// Throws Error for invalid input (non-numeric, negative).
export function parsePlnToGrosze(input: string): number {
  const normalized = input.trim().replace(/\s/g, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error('Nieprawidłowa kwota')
  }
  return Math.round(parseFloat(normalized) * 100)
}

// Format grosze as plain string (for input fields). 123456 -> "1234.56"
export function groszeToInputString(grosze: number): string {
  return (grosze / 100).toFixed(2)
}
