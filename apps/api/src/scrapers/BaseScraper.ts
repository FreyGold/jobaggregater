// ─── Base Scraper ────────────────────────────────────────────────
// Abstract class all scrapers must extend.

import type { JobCreateInput } from '@jobagg/shared';
// @ts-ignore: Got types workaround
import got from 'got';
// @ts-ignore: Got types workaround
import type { Got, OptionsInit } from 'got';
import { HttpsProxyAgent } from 'hpagent';

export interface IScraper {
  readonly name: string;
  readonly key: string;
  scrape(options?: any): Promise<JobCreateInput[]>;
}

export abstract class BaseScraper implements IScraper {
  abstract readonly key: string;
  abstract readonly name: string;

  protected client: Got;

  constructor() {
    const proxyUrl = process.env.PROXY_URL;
    const clientOptions: OptionsInit = {
      timeout: {
        request: 30000,
      },
      retry: {
        limit: 3,
        methods: ['GET', 'POST'],
        statusCodes: [408, 413, 429, 500, 502, 503, 504],
      },
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    };

    if (proxyUrl) {
      clientOptions.agent = {
        https: new HttpsProxyAgent({
          proxy: proxyUrl,
        }),
      };
    }

    this.client = got.extend(clientOptions);
  }

  abstract scrape(options?: any): Promise<JobCreateInput[]>;

  /**
   * Optional: health check for the source.
   */
  async healthCheck(): Promise<boolean> {
    return true;
  }
}
