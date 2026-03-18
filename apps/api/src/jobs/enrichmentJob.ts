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
    // Check if the description is located within the structured ld+json schema map.
    const scripts = $('script[type="application/ld+json"]').toArray();
    for (const script of scripts) {
      const content = $(script).html();
      if (content) {
        try {
          const parsed = JSON.parse(content);
          if (parsed && typeof parsed === 'object') {
            const graph = parsed['@graph'] || (Array.isArray(parsed) ? parsed : [parsed]);
            for (const item of graph) {
              if (item['@type'] === 'JobPosting' && item.description) {
                return item.description;
              }
            }
            if (parsed.description && typeof parsed.description === 'string') {
              return parsed.description;
            }
          }
        } catch (e) {
          // JSON parse failed, ignore this script tag
          continue;
        }
      }
    }

    // BuiltIn Job page selectors (often in a script tag or specific div)
    return $('.job-description, .job-info__description, .description').html();
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
