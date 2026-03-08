// ─── Base Scraper ────────────────────────────────────────────────
// Abstract class all scrapers must extend.

import type { JobCreateInput } from '@jobagg/shared';

export interface IScraper {
  readonly name: string;
  readonly key: string;
  scrape(options?: any): Promise<JobCreateInput[]>;
}

export abstract class BaseScraper implements IScraper {
  abstract readonly key: string;
  abstract readonly name: string;

  abstract scrape(options?: any): Promise<JobCreateInput[]>;

  /**
   * Optional: health check for the source.
   */
  async healthCheck(): Promise<boolean> {
    return true;
  }
}
