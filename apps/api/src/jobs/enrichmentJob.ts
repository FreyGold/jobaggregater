import { jobRepository } from '../repositories/JobRepository.js';
import { decode } from 'html-entities';
import * as cheerio from 'cheerio';

// Helper to fetch through ScraperAPI (if key provided), else fallback to direct fetch
async function fetchWithProxy(url: string): Promise<string> {
  const apiKey = process.env.SCRAPER_API_KEY;
  const targetUrl = apiKey
    ? `https://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(url)}&render=true`
    : url;

  const res = await fetch(targetUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  if (!res.ok) throw new Error(`Proxy fetch failed: ${res.status}`);
  return await res.text();
}

/**
 * Enrichment logic for specific sources
 */
function extractDescription(html: string, source: string): string | null {
  const $ = cheerio.load(html);

  if (source.toLowerCase().includes('linkedin')) {
    // LinkedIn Public Job page selectors
    return $('.description__text, .show-more-less-html__markup, .job-description').html();
  }

  if (source.toLowerCase().includes('builtin')) {
    // 1) Preferred: JSON-LD (BuiltIn usually includes JobPosting description)
    const scripts = $('script[type="application/ld+json"]').toArray();
    for (const script of scripts) {
      const raw = $(script).contents().text();
      const content = raw?.trim();
      if (!content) continue;

      // Some sites HTML-encode the JSON or include multiple JSON blobs.
      const candidates: string[] = [content];
      const decoded = decode(content);
      if (decoded !== content) candidates.push(decoded);

      for (const c of candidates) {
        try {
          const parsed = JSON.parse(c);
          const nodes = Array.isArray(parsed)
            ? parsed
            : parsed && typeof parsed === 'object' && Array.isArray((parsed as any)['@graph'])
              ? (parsed as any)['@graph']
              : [parsed];

          for (const item of nodes) {
            if (!item || typeof item !== 'object') continue;
            const type = (item as any)['@type'];
            const desc = (item as any).description;
            if (
              (type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'))) &&
              typeof desc === 'string'
            ) {
              return desc;
            }
          }

          if (
            parsed &&
            typeof parsed === 'object' &&
            typeof (parsed as any).description === 'string'
          ) {
            return (parsed as any).description;
          }
        } catch {
          // ignore
        }
      }
    }

    // 2) Fallback: DOM-based extraction for BuiltIn job detail pages
    // BuiltIn frequently renders the description inside an element with id="job-post-body-<id>"
    const idBody = $('[id^="job-post-body-"]').first();
    if (idBody.length) {
      const bodyHtml = idBody.html();
      if (bodyHtml) return bodyHtml;
    }

    // Other common containers / app shells
    const domHtml =
      $('[data-id="job-description"]').first().html() ||
      $('section[aria-label="Job Description"]').first().html() ||
      $('.job-description').first().html() ||
      $('.job-info__description').first().html() ||
      $('.description').first().html();

    return domHtml || null;
  }

  if (source.toLowerCase().includes('indeed')) {
    return $('#jobDescriptionText').html();
  }

  // Fallback: try to find common large text blocks if not source-specific
  return $('.description, .job-content, .post-content').html();
}

export async function runJobEnrichment() {
  console.log('👷 enrichment-worker: Starting cycle...');

  try {
    const rawJobs = await jobRepository.findQueuedForEnrichment(10);

    if (rawJobs.length === 0) {
      console.log('👷 enrichment-worker: No jobs need enrichment right now.');
      return;
    }

    console.log(`👷 enrichment-worker: Found ${rawJobs.length} jobs to enrich.`);

    for (const job of rawJobs) {
      try {
        console.log(`👷 enrichment-worker: Fetching full details for: ${job.title} (${job.url})`);
        const html = await fetchWithProxy(job.url);
        const fullDescription = extractDescription(html, job.source);

        if (fullDescription && fullDescription.length > 50) {
          const decoded = decode(fullDescription);
          await jobRepository.updateDescription(job.id, decoded);
          console.log(`✅ enrichment-worker: Successfully enriched job ${job.id}`);
        } else {
          console.warn(`⚠️ enrichment-worker: Could not extract description for job ${job.id}`);
        }

        // Delay between enrichments to be polite even if using proxy
        await new Promise((r) => setTimeout(r, 2000));
      } catch (err: any) {
        console.error(`❌ enrichment-worker: Failed to enrich job ${job.id}:`, err.message);
      }
    }
  } catch (error) {
    console.error('❌ Enrichment cycle failed:', error);
  }
}
