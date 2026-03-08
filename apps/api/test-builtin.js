import * as cheerio from 'cheerio';
import * as fs from 'fs';

async function testBuiltIn() {
  const res = await fetch('https://builtin.com/jobs/remote');
  const html = await res.text();
  const $ = cheerio.load(html);

  const jobs = [];
  $('[data-id="job-card"]').each((_, el) => {
    const title = $(el).find('a[data-id="job-card-title"]').text().trim() || $(el).find('.job-title').text().trim();
    const company = $(el).find('[data-id="company-title"]').text().trim() || $(el).find('.company-title').text().trim();
    const location = $(el).find('[data-id="job-location"]').text().trim() || 'Remote';
    const link = $(el).find('a[data-id="job-card-title"]').attr('href') || $(el).find('a.job-row').attr('href') || '';

    if (title && link) {
      jobs.push({ title, company, location, link: link.startsWith('/') ? `https://builtin.com${link}` : link });
    }
  });

  console.log(`Found ${jobs.length} jobs directly on BuiltIn list. trying generic a links`);
  if (jobs.length === 0) {
      // try other selectors
      console.log('Total a links:', $('a').length);
      const examples = [];
      $('a').each((i, el) => {
          const href = $(el).attr('href');
          if (href && href.includes('/job/')) {
              examples.push(href);
          }
      });
      console.log('Job links found:', examples.length);
  } else {
     console.log(jobs[0]);
  }
}

testBuiltIn();
