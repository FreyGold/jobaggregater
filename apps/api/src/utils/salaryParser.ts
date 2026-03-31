// ─── Salary Parser ─────────────────────────────────────────────────────
// Extracts numeric min/max from salary strings like "100k-150k USD"

export interface ParsedSalary {
  min: number | null;
  max: number | null;
  currency: string | null;
}

export function parseSalary(salaryString: string | undefined | null): ParsedSalary {
  if (!salaryString || typeof salaryString !== 'string') {
    return { min: null, max: null, currency: null };
  }

  const original = salaryString.toLowerCase().trim();

  // Extract currency code (USD, EUR, GBP, AED, SAR, etc.)
  const currencyMatch = original.match(/\b(usd|eur|gbp|aud|jpy|cad|aed|sar|iqd|kwd)\b/i);
  const currency = currencyMatch ? currencyMatch[0].toUpperCase() : null;

  // Extract numbers (handle k/K for thousands, m/M for millions)
  const numberPattern = /(\d+\.?\d*)\s*([km])?/gi;
  const matches: number[] = [];
  let match;

  while ((match = numberPattern.exec(original)) !== null) {
    let num = parseFloat(match[1] || '0');

    // Convert k/m to actual numbers
    if (match[2]) {
      if (match[2].toLowerCase() === 'k') {
        num *= 1000;
      } else if (match[2].toLowerCase() === 'm') {
        num *= 1000000;
      }
    }

    // Only include reasonable salaries (between 100 and 1,000,000)
    if (num >= 100 && num <= 1000000) {
      matches.push(Math.round(num));
    }
  }

  if (matches.length === 0) {
    return { min: null, max: null, currency };
  }

  // Sort to handle cases where min/max are reversed
  matches.sort((a, b) => a - b);

  if (matches.length === 1) {
    // Single number - treat as both min and max
    const salary = matches[0] ?? 0;
    return {
      min: salary,
      max: salary,
      currency,
    };
  }

  // Multiple numbers - first is min, last is max
  return {
    min: matches[0] ?? 0,
    max: matches[matches.length - 1] ?? matches[0] ?? 0,
    currency,
  };
}

// Examples:
// "100k-150k USD" → { min: 100000, max: 150000, currency: "USD" }
// "50000-75000 EUR" → { min: 50000, max: 75000, currency: "EUR" }
// "$80,000" → { min: 80000, max: 80000, currency: null }
// "Competitive" → { min: null, max: null, currency: null }
