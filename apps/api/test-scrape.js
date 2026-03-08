import * as cheerio from 'cheerio';

async function test() {
  const res = await fetch('https://remote.co/remote-developer-jobs/');
  const html = await res.text();
  const $ = cheerio.load(html);

  const jobs = [];
  $('a.card').each((i, el) => {
    const title = $(el).find('p.font-weight-bold').text().trim();
    const company = $(el).find('p.m-0.text-secondary').text().trim().split('\n')[0].trim();
    const link = $(el).attr('href');
    if (title && link) {
      jobs.push({ title, company, link });
    }
  });

  console.log('Total jobs found:', jobs.length);
  console.log(JSON.stringify(jobs.slice(0, 5), null, 2));
}

test();
