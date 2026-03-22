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

  protected isBlockedResponse(html: string): boolean {
    const body = html.toLowerCase();
    return (
      body.includes('<title>just a moment') ||
      body.includes('<title>access denied') ||
      body.includes('<h1>access denied') ||
      body.includes('<title>attention required') ||
      body.includes('cf-chl') ||
      body.includes('cf-browser-verification') ||
      body.includes('why do i have to complete a captcha') ||
      body.includes('verify you are human') ||
      body.includes('/cdn-cgi/challenge-platform')
    );
  }

  protected async fetchHtml(
    url: string,
    opts?: { headers?: Record<string, string>; render?: boolean; sourceName?: string },
  ): Promise<string | null> {
    const sourceName = opts?.sourceName ?? this.name;
    const headers = opts?.headers ?? {};
    const proxyUrl = process.env.PROXY_URL;

    try {
      let directStatus = 0;
      let directHtml = '';

      if (proxyUrl) {
        const directRes = await this.client.get(url, {
          headers,
          responseType: 'text',
          throwHttpErrors: false,
        });
        directStatus = directRes.statusCode;
        directHtml = String(directRes.body ?? '');
      } else {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        try {
          const directRes = await fetch(url, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept-Language': 'en-US,en;q=0.9',
              ...headers,
            },
            signal: controller.signal,
          });
          directStatus = directRes.status;
          directHtml = await directRes.text();
        } finally {
          clearTimeout(timeout);
        }
      }

      const directBlocked = this.isBlockedResponse(directHtml);
      if (directStatus >= 200 && directStatus < 300 && !directBlocked) {
        return directHtml;
      }

      const scraperApiKey = process.env.SCRAPER_API_KEY;
      if (!scraperApiKey) {
        console.warn(
          `[Scraper: ${sourceName}] Blocked or non-2xx response (${directStatus}) and SCRAPER_API_KEY is not set for fallback.`,
        );
        return null;
      }

      const scraperApiUrl =
        `https://api.scraperapi.com?api_key=${scraperApiKey}` +
        `&url=${encodeURIComponent(url)}` +
        `&keep_headers=true` +
        `${opts?.render ? '&render=true' : ''}`;

      const proxyRes = await this.client.get(scraperApiUrl, {
        headers,
        responseType: 'text',
        throwHttpErrors: false,
      });

      const proxyHtml = String(proxyRes.body ?? '');
      if (proxyRes.statusCode >= 200 && proxyRes.statusCode < 300 && !this.isBlockedResponse(proxyHtml)) {
        return proxyHtml;
      }

      console.warn(
        `[Scraper: ${sourceName}] Fallback failed with status ${proxyRes.statusCode}.`,
      );
      return null;
    } catch (error) {
      console.warn(
        `[Scraper: ${sourceName}] Fetch failed for ${url}:`,
        error instanceof Error ? error.message : error,
      );
      return null;
    }
  }

  /**
   * Optional: health check for the source.
   */
  async healthCheck(): Promise<boolean> {
    return true;
  }
}
