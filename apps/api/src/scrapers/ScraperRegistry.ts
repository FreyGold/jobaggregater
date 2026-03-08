// ─── Scraper Registry ────────────────────────────────────────────
// Factory + runner for all registered scrapers.

import type { BaseScraper } from './BaseScraper.js';
import { RemotiveScraper } from './RemotiveScraper.js';
import { RemoteOKScraper } from './RemoteOKScraper.js';
import { HackerNewsScraper } from './HackerNewsScraper.js';
import { LinkedInScraper } from './LinkedInScraper.js';
import { BuiltInScraper } from './BuiltInScraper.js';
import { WeWorkRemotelyScraper } from './WeWorkRemotelyScraper.js';
import { GreenhouseScraper } from './GreenhouseScraper.js';
import { LeverScraper } from './LeverScraper.js';
import { AshbyScraper } from './AshbyScraper.js';

// New Arab / Regional Scrapers
import { IndeedScraper } from './IndeedScraper.js';
import { WuzzufScraper } from './WuzzufScraper.js';
import { BaytScraper } from './BaytScraper.js';
import { GulfTalentScraper } from './GulfTalentScraper.js';
import { TanqeebScraper } from './TanqeebScraper.js';

class ScraperRegistry {
  private readonly scrapers: Map<string, BaseScraper> = new Map();

  constructor() {
    // Register all scrapers here
    this.register(new RemotiveScraper());
    this.register(new RemoteOKScraper());
    this.register(new HackerNewsScraper());
    this.register(new LinkedInScraper());
    this.register(new BuiltInScraper());
    this.register(new WeWorkRemotelyScraper());
    this.register(new GreenhouseScraper());
    this.register(new LeverScraper());
    this.register(new AshbyScraper());

    this.register(new IndeedScraper());
    this.register(new WuzzufScraper());
    this.register(new BaytScraper());
    this.register(new GulfTalentScraper());
    this.register(new TanqeebScraper());
  }

  register(scraper: BaseScraper): void {
    this.scrapers.set(scraper.key, scraper);
  }

  get(key: string): BaseScraper | undefined {
    return this.scrapers.get(key);
  }

  getAll(): BaseScraper[] {
    return Array.from(this.scrapers.values());
  }

  keys(): string[] {
    return Array.from(this.scrapers.keys());
  }
}

export const scraperRegistry = new ScraperRegistry();
