// ─── Description Quality Detection Utilities ────────────────────

/**
 * Placeholder text patterns that indicate a missing or incomplete description
 */
const PLACEHOLDER_PATTERNS = [
  'view the full listing',
  'see full description',
  'visit the original post',
  'apply on',
  'scraped from',
  'found on',
  'view full job',
  'click to apply',
  'category:',
  'country:',
];

/**
 * Minimum length for a valid job description (in characters)
 * Job descriptions should be substantial - 500 chars is roughly 80-100 words
 * which is the minimum for a meaningful job posting.
 */
const MIN_DESCRIPTION_LENGTH = 500;

/**
 * Check if a description is empty or null
 */
export function isEmptyDescription(description: string | null | undefined): boolean {
  return !description || description.trim().length === 0;
}

/**
 * Check if a description is too short to be useful
 */
export function isTooShort(description: string): boolean {
  return description.trim().length < MIN_DESCRIPTION_LENGTH;
}

/**
 * Check if a description contains placeholder text
 */
export function isPlaceholder(description: string): boolean {
  const lower = description.toLowerCase();
  return PLACEHOLDER_PATTERNS.some((pattern) => lower.includes(pattern));
}

/**
 * Check if a description is missing, incomplete, or placeholder
 * Returns true if the description should be enriched
 */
export function needsEnrichment(description: string | null | undefined): boolean {
  if (isEmptyDescription(description)) return true;
  if (isTooShort(description!)) return true;
  if (isPlaceholder(description!)) return true;
  return false;
}

/**
 * Extract text content from HTML description (for quality checks)
 */
export function extractTextFromHtml(html: string): string {
  // Simple regex-based text extraction (no DOM parsing)
  return html
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate description quality score (0-100)
 * Higher score = better quality
 */
export function calculateQualityScore(description: string): number {
  let score = 0;

  // Base score from length
  const textLength = extractTextFromHtml(description).length;
  if (textLength > 1000) score += 40;
  else if (textLength > 500) score += 30;
  else if (textLength > 200) score += 20;
  else if (textLength > 100) score += 10;

  // Bonus for HTML formatting (indicates structured content)
  if (description.includes('<ul>') || description.includes('<ol>')) score += 15;
  if (description.includes('<h1>') || description.includes('<h2>') || description.includes('<h3>')) score += 10;
  if (description.includes('<p>')) score += 10;

  // Penalty for placeholder patterns
  if (isPlaceholder(description)) score -= 30;

  // Bonus for common job description sections
  const hasResponsibilities = /responsibilit(y|ies)|duties|role|what you('ll| will) do/i.test(description);
  const hasRequirements = /requirement(s)?|qualification(s)?|skills|experience|what (we're|you) looking for/i.test(description);
  const hasBenefits = /benefit(s)?|perks|offer|compensation|why (join|work)/i.test(description);
  
  if (hasResponsibilities) score += 10;
  if (hasRequirements) score += 10;
  if (hasBenefits) score += 5;

  return Math.max(0, Math.min(100, score));
}
