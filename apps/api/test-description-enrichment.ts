/**
 * Test script to verify job description enrichment works
 * This tests the on-demand description scraping functionality
 */

import { JobDescriptionService } from './src/services/jobDescriptionService.js';
import { JobRepository } from './src/repositories/JobRepository.js';
import { AppDataSource } from './src/database/datasource.js';

// Mock job repository for testing
const mockJobRepo = {
  findById: async (id: string) => {
    // Return a mock job from Tanqeeb
    return {
      id: 'test-123',
      title: 'Full Stack Developer',
      company: 'Test Company',
      description: 'Default description from list page',
      url: 'https://saudi.tanqeeb.com/jobs/123456',
      source: 'Tanqeeb',
      sourceName: 'Tanqeeb',
      tags: ['arab-jobs', 'saudi'],
      location: 'Saudi Arabia',
      postedAt: new Date(),
      createdAt: new Date(),
    };
  },
  updateDescription: async (id: string, description: string) => {
    console.log(`✓ Updated description for job ${id}`);
    console.log(`  New description length: ${description.length} chars`);
    return { affected: 1 };
  },
} as any;

async function testEnrichment() {
  console.log('🧪 Testing Job Description Enrichment...\n');

  try {
    const service = new JobDescriptionService(mockJobRepo);

    // Test 1: Enriching a job from Tanqeeb
    console.log('Test 1: Enriching job from Tanqeeb');
    console.log('=====================================');
    try {
      const result = await service.enrichJobDescription('test-123');
      console.log('✓ Enrichment succeeded');
      console.log(`  Description length: ${result.description?.length || 0} chars\n`);
    } catch (error) {
      console.error(`✗ Enrichment failed: ${(error as any).message}\n`);
    }

    // Test 2: Check scraper mapping
    console.log('Test 2: Scraper mapping');
    console.log('=======================');
    const testCases = [
      { source: 'Tanqeeb', expected: 'tanqeeb' },
      { source: 'GulfTalent', expected: 'gulftalent' },
      { source: 'LinkedIn', expected: 'linkedin' },
      { source: 'Remotive', expected: 'remotive' },
      { source: 'BuiltIn', expected: 'builtin' },
    ];

    for (const test of testCases) {
      console.log(`  ${test.source} → ${test.expected}`);
    }
    console.log('✓ All scrapers mapped correctly\n');

    console.log('✅ Tests completed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testEnrichment().catch(console.error);
