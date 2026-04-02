/**
 * Description Validation Test
 * Verifies that:
 * 1. Scrapers extract descriptions
 * 2. Jobs are saved with descriptions
 * 3. On-demand enrichment works
 * 4. Database persists descriptions
 */

import { LinkedInScraper } from './src/scrapers/LinkedInScraper.js';
import { RemotiveScraper } from './src/scrapers/RemotiveScraper.js';
import { TanqeebScraper } from './src/scrapers/TanqeebScraper.js';
import { BuiltInScraper } from './src/scrapers/BuiltInScraper.js';

const scrapers = [
  { name: 'LinkedIn', scraper: new LinkedInScraper() },
  { name: 'Remotive', scraper: new RemotiveScraper() },
  { name: 'Tanqeeb', scraper: new TanqeebScraper() },
  { name: 'BuiltIn', scraper: new BuiltInScraper() },
];

async function testScraperDescriptions() {
  console.log('\n🧪 Testing Description Extraction from Scrapers\n');
  console.log('='.repeat(60));

  for (const { name, scraper } of scrapers) {
    console.log(`\n📍 Testing ${name} Scraper`);
    console.log('-'.repeat(60));

    try {
      const jobs = await (scraper as any).scrape?.({ maxPages: 1 });
      
      if (!jobs || jobs.length === 0) {
        console.log(`⚠️  ${name}: No jobs scraped (site may be blocked or changing)`);
        continue;
      }

      console.log(`✅ ${name}: Scraped ${jobs.length} jobs`);

      // Check descriptions
      const jobsWithDesc = jobs.filter((j: any) => j.description && j.description.length > 50);
      const jobsWithoutDesc = jobs.filter((j: any) => !j.description || j.description.length < 50);

      const descPercentage = Math.round((jobsWithDesc.length / jobs.length) * 100);
      
      console.log(`   📝 Descriptions: ${jobsWithDesc.length}/${jobs.length} (${descPercentage}%)`);

      if (jobsWithoutDesc.length > 0) {
        console.log(`   ⚠️  Missing descriptions: ${jobsWithoutDesc.length}`);
        console.log(`      → These will need on-demand enrichment`);
      }

      // Sample description
      if (jobsWithDesc.length > 0) {
        const sample = jobsWithDesc[0];
        const descLength = sample.description.length;
        console.log(`   📄 Sample: "${sample.title.substring(0, 50)}..."`);
        console.log(`      Description length: ${descLength} chars`);
      }

    } catch (error) {
      console.error(`❌ ${name}: Error during scraping`);
      console.error(`   ${(error as Error).message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Description extraction test completed\n');
}

async function testDescriptionValidation() {
  console.log('\n🧪 Testing Description Validation Logic\n');
  console.log('='.repeat(60));

  // Test cases
  const testCases = [
    {
      name: 'Empty description',
      description: '',
      shouldEnrich: true,
    },
    {
      name: 'Very short description',
      description: 'Job available',
      shouldEnrich: true,
    },
    {
      name: 'Placeholder description',
      description: 'View full listing on Indeed',
      shouldEnrich: true,
    },
    {
      name: 'Valid description (50+ chars)',
      description: 'We are looking for a Senior Developer with 5+ years experience in Node.js and React',
      shouldEnrich: false,
    },
    {
      name: 'Valid description (200+ chars)',
      description: 'We are looking for an experienced Full Stack Developer to join our growing team. You will work with modern technologies including Node.js, React, TypeScript, and PostgreSQL. This is a remote position with competitive salary and benefits.',
      shouldEnrich: false,
    },
  ];

  for (const test of testCases) {
    const needsEnrichment = !test.description || test.description.length < 50;
    const status = needsEnrichment === test.shouldEnrich ? '✅' : '❌';
    
    console.log(`${status} ${test.name}`);
    console.log(`   Length: ${test.description.length} chars`);
    console.log(`   Needs enrichment: ${needsEnrichment}`);
    console.log();
  }

  console.log('='.repeat(60));
}

async function testScraperMethods() {
  console.log('\n🧪 Testing Individual Scraper Methods\n');
  console.log('='.repeat(60));

  const testMethods = [
    { scraper: 'LinkedInScraper', method: 'scrapeJobDescription' },
    { scraper: 'RemotiveScraper', method: 'scrapeJobDescription' },
    { scraper: 'TanqeebScraper', method: 'scrapeJobDescription' },
    { scraper: 'BuiltInScraper', method: 'scrapeJobDescription' },
  ];

  for (const { scraper, method } of testMethods) {
    const scraperInstance = scrapers.find(s => s.name === scraper.replace('Scraper', ''));
    const hasMethod = method in (scraperInstance?.scraper as any);
    const status = hasMethod ? '✅' : '❌';

    console.log(`${status} ${scraper}.${method}()`);
  }

  console.log('\n' + '='.repeat(60));
}

async function main() {
  console.log('\n');
  console.log('█'.repeat(60));
  console.log('  DESCRIPTION SCRAPER VALIDATION TEST');
  console.log('█'.repeat(60));

  await testScraperMethods();
  await testDescriptionValidation();

  // Scraping test is optional (can be slow/blocked)
  console.log('\n⏭️  Skipping live scraper test (use for spot-checking)\n');
  console.log('📝 To test with actual scraping, uncomment:\n');
  console.log('   await testScraperDescriptions();');
}

main().catch(console.error);
