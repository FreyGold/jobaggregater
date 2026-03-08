import { RemotiveScraper } from './src/scrapers/RemotiveScraper.js';

async function run() {
  const scraper = new RemotiveScraper();
  const jobs = await scraper.scrape();
  console.log(`Scraped ${jobs.length} jobs`);
  if (jobs.length > 0) {
    console.log('Sample job:', jobs[0]);
  }
}
run().catch(console.error);
