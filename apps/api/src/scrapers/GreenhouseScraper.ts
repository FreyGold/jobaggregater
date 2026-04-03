import { decode } from 'html-entities';
import { BaseScraper } from './BaseScraper.js';
import { type JobCreateInput, EmploymentType, ExperienceLevel } from '@jobagg/shared';

export class GreenhouseScraper extends BaseScraper {
  readonly key = 'greenhouse';
  readonly name = 'Greenhouse ATS';

  // Verified Greenhouse ATS slugs — tested against boards-api.greenhouse.io
  private readonly companySlugs = [
    // Fintech / Payments (confirmed working)
    'stripe', 'robinhood', 'affirm', 'chime',
    'brex', 'coinbase', 'kraken', 'gusto', 'rippling',
    'checkr', 'marqeta', 'nerdwallet', 'dave', 'melio',
    // SaaS / Productivity
    'dropbox', 'figma', 'airtable', 'asana',
    'hubspot', 'intercom', 'zendesk', 'freshworks', 'calendly', 'docusign',
    'pandadoc', 'lattice', 'workday', 'coupa',
    // Infrastructure / Developer Tools
    'hashicorp', 'pagerduty',
    'fastly', 'newrelic', 'splunk', 'elastic', 'mongodb', 'sentry',
    'snyk', 'lacework', 'sumo-logic',
    'teleport', 'chronosphere',
    // Cloud / AI
    'scaleai', 'weights-biases', 'cohere',
    'replit', 'codeium', 'tabnine',
    // Social / Consumer
    'discord', 'airbnb', 'lyft', 'duolingo', 'bumble',
    'reddit', 'pinterest',
    // Gaming / Media
    'roblox', 'scopely', 'kabam', 'highspot',
    // Commerce / Marketplaces
    'etsy', 'poshmark', 'opendoor',
    'zillow', 'redfin', 'lemonade',
    // Healthcare / BioTech
    'modernhealth', 'headspace', 'calm',
    'benchling', 'veeva', 'doximity',
    // Enterprise Software
    'okta', 'braze', 'amplitude', 'mixpanel',
    'thoughtspot', 'alation', 'collibra',
    // Security
    'crowdstrike', 'sailpoint', 'cyberark', 'darktrace',
    'abnormalsecurity', 'illumio', 'vectra',
    // Logistics / Operations
    'flexport', 'samsara', 'motive', 'rappi',
    // Education
    'coursera', 'masterclass', 'outschool', 'chegg',
    // Other Verified
    'monzo', 'wise', 'revolut', 'payoneer', 'block',
    'datadog', 'cloudflare', 'twilio', 'sendgrid', 'braze-inc',
    'expensify', 'faire', 'whatnot', 'canva', 'atlassian',
    'klaviyo', 'hubspot', 'segment', 'amplitude',
  ];


  // Batch size for concurrent requests
  private readonly BATCH_SIZE = 10;

  async scrape(): Promise<JobCreateInput[]> {
    const allJobs: JobCreateInput[] = [];
    // Deduplicate slugs
    const slugs = [...new Set(this.companySlugs)];

    console.log(`[Scraper: ${this.name}] Scraping ${slugs.length} companies in batches of ${this.BATCH_SIZE}...`);

    for (let i = 0; i < slugs.length; i += this.BATCH_SIZE) {
      const batch = slugs.slice(i, i + this.BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((slug) => this.fetchCompanyJobs(slug))
      );

      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          allJobs.push(...result.value);
        } else {
          console.error(`[Scraper: ${this.name}] Failed batch item ${batch[idx]}:`, result.reason?.message ?? result.reason);
        }
      });

      // Polite delay between batches
      if (i + this.BATCH_SIZE < slugs.length) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    console.log(`[Scraper: ${this.name}] Successfully scraped total ${allJobs.length} jobs.`);
    return allJobs;
  }

  private async fetchCompanyJobs(slug: string): Promise<JobCreateInput[]> {
    const response = await this.client.get(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`, {
      responseType: 'json',
      throwHttpErrors: false,
    });

    if (response.statusCode < 200 || response.statusCode >= 300) {
      // 404 means the slug doesn't exist / company not on Greenhouse — ignore silently
      if (response.statusCode !== 404) {
        console.error(`[Scraper: ${this.name}] Failed to fetch ${slug}: ${response.statusCode}`);
      }
      return [];
    }

    const data = response.body as any;
    const rawJobs: any[] = data.jobs || [];

    const displayName = slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const jobs: JobCreateInput[] = rawJobs.map((job) => {
      // API provides HTML entities for content (e.g. &lt;), but it's simpler to decode during render if needed
      // Most times react-native-render-html or dangerouslySetInnerHTML will handle raw tags.
      let content = job.content;
      if (content && typeof content === 'string') {
        content = decode(content);
      }
      
      return {
        title: job.title,
        company: displayName,
        location: job.location?.name || 'Remote/Unknown',
        url: job.absolute_url,
        sourceId: `gh-${job.id}`,
        sourceName: this.name,
        description: content || `${job.title} at ${displayName}. Department: ${job.departments?.[0]?.name || 'Unknown'}.`,
        postedAt: job.updated_at || new Date().toISOString(),
        tags: ['tech', slug],
        employmentType: 'full-time' as EmploymentType,
        experienceLevel: this.inferExperienceLevel(job.title),
        isRemote: job.location?.name?.toLowerCase().includes('remote') || false,
      };
    });

    if (jobs.length > 0) {
      console.log(`[Scraper: ${this.name}] ${displayName}: ${jobs.length} jobs`);
    }
    return jobs;
  }

  private inferExperienceLevel(title: string): ExperienceLevel {
    const lower = title.toLowerCase();
    if (lower.includes('senior') || lower.includes('staff') || lower.includes('principal') || lower.includes('sr')) {
      return 'senior';
    }
    if (lower.includes('lead') || lower.includes('director') || lower.includes('head') || lower.includes('manager')) {
      return 'lead';
    }
    if (lower.includes('junior') || lower.includes('jr') || lower.includes('entry') || lower.includes('grad')) {
      return 'entry';
    }
    if (lower.includes('vp') || lower.includes('chief') || lower.includes('executive')) {
      return 'executive';
    }
    return 'mid';
  }

  /**
   * Scrape full job description from Greenhouse job page.
   * Note: Greenhouse API already provides excellent descriptions,
   * so this method is primarily for fallback.
   */
  async scrapeJobDescription(jobUrl: string): Promise<string> {
    try {
      const html = await this.fetchHtml(jobUrl);
      if (!html) {
        console.warn(`[Scraper: ${this.name}] Could not fetch HTML for ${jobUrl}`);
        return '';
      }

      const cheerio = await import('cheerio');
      const $ = cheerio.load(html);

      // Remove noise elements
      $('script,style,svg,noscript,nav,header,footer').remove();

      // Greenhouse job pages use these selectors
      const descriptionSelectors = [
        '#content',
        '.job-post',
        '[class*="job-description"]',
        '[class*="description"]',
        'article',
        'main',
      ];

      for (const selector of descriptionSelectors) {
        const element = $(selector).first();
        if (element.length > 0) {
          element.find('script,style,nav,button,header,footer').remove();
          const descHtml = element.html()?.trim();
          if (descHtml && descHtml.length > 200) {
            return descHtml;
          }
        }
      }

      // Last resort: find largest text block
      let largestBlock = '';
      $('div, section').each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > largestBlock.length && text.length > 300) {
          largestBlock = text;
        }
      });

      if (largestBlock.length > 300) {
        return largestBlock.substring(0, 5000);
      }

      return '';
    } catch (error) {
      console.warn(`[Scraper: ${this.name}] Failed to fetch description from ${jobUrl}:`, error);
      return '';
    }
  }
}
