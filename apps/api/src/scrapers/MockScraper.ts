// ─── Mock Scraper ────────────────────────────────────────────────
// Example scraper that returns mock data. Replace with real implementations.

import type { JobCreateInput } from '@jobagg/shared';
import { BaseScraper } from './BaseScraper.js';

export class MockScraper extends BaseScraper {
  readonly key = 'mock';
  readonly name = 'Mock Job Board';

  async scrape(): Promise<JobCreateInput[]> {
    // Simulate scraping delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    return [
      {
        title: 'Senior React Developer',
        company: 'TechCorp',
        location: 'San Francisco, CA',
        isRemote: true,
        salaryMin: 150000,
        salaryMax: 200000,
        salaryCurrency: 'USD',
        url: 'https://mock-board.example.com/jobs/1',
        sourceId: '', // will be set by service
        sourceName: 'Mock Job Board',
        description:
          'We are looking for a Senior React Developer to join our team. You will be building next-generation web applications using React, TypeScript, and Node.js.',
        shortDescription: 'Senior React Developer position at TechCorp',
        employmentType: 'full-time',
        experienceLevel: 'senior',
        tags: ['react', 'typescript', 'node.js', 'frontend'],
        postedAt: new Date().toISOString(),
      },
      {
        title: 'Backend Engineer',
        company: 'StartupXYZ',
        location: 'New York, NY',
        isRemote: false,
        salaryMin: 120000,
        salaryMax: 160000,
        salaryCurrency: 'USD',
        url: 'https://mock-board.example.com/jobs/2',
        sourceId: '',
        sourceName: 'Mock Job Board',
        description:
          'Join our backend team to build scalable APIs and microservices using Node.js, PostgreSQL, and Redis.',
        shortDescription: 'Backend Engineer at StartupXYZ',
        employmentType: 'full-time',
        experienceLevel: 'mid',
        tags: ['node.js', 'postgresql', 'redis', 'backend'],
        postedAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        title: 'Full Stack Developer Intern',
        company: 'LearnTech',
        location: 'Remote',
        isRemote: true,
        salaryMin: 30000,
        salaryMax: 45000,
        salaryCurrency: 'USD',
        url: 'https://mock-board.example.com/jobs/3',
        sourceId: '',
        sourceName: 'Mock Job Board',
        description:
          'Exciting internship opportunity to learn full-stack development with React and Express.js.',
        shortDescription: 'Full Stack Developer Intern at LearnTech',
        employmentType: 'internship',
        experienceLevel: 'entry',
        tags: ['react', 'express', 'fullstack', 'internship'],
        postedAt: new Date(Date.now() - 172800000).toISOString(),
      },
    ];
  }
}
