import * as fs from 'fs';
import * as cheerio from 'cheerio';
const html = fs.readFileSync('/tmp/linkedin.html', 'utf-8');
const $ = cheerio.load(html);
const jobs = [];
$('div.base-search-card').each((i, el) => {
  const title = $(el).find('.base-search-card__title').text().trim();
  const company = $(el).find('.base-search-card__subtitle').text().trim();
  const location = $(el).find('.job-search-card__location').text().trim();
  const url = $(el).find('.base-card__full-link').attr('href') || $(el).find('a').attr('href') || '';
  const dateStr = $(el).find('time').attr('datetime');
  
  // sometimes elements are different
  if (title && url) {
    jobs.push({ title, company, location, url, dateStr });
  }
});
console.log(`Found ${jobs.length} jobs`);
console.log(JSON.stringify(jobs.slice(0, 3), null, 2));
