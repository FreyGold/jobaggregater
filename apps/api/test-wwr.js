import * as cheerio from 'cheerio';

async function testWWR() {
  const res = await fetch('https://weworkremotely.com/categories/remote-programming-jobs.rss');
  const xml = await res.text();
  const $ = cheerio.load(xml, { xmlMode: true });

  const jobs = [];
  $('item').each((_, el) => {
    const title = $(el).find('title').text();
    const link = $(el).find('link').text();
    const pubDate = $(el).find('pubDate').text();
    jobs.push({ title, link, pubDate });
  });

  console.log(`Found ${jobs.length} jobs in WWR RSS.`);
  if (jobs.length > 0) {
    console.log(jobs[0]);
  }
}

testWWR();
