import * as cheerio from 'cheerio';
async function run() {
  const r = await fetch("https://builtin.com/job/account-executive-ai-sales/435212", {headers: {'User-Agent': 'Mozilla/5.0'}});
  const html = await r.text();
  const $ = cheerio.load(html);
  
  let found = false;
  $('script').each((_, el) => {
    const text = $(el).html();
    if (text && text.includes('description') && text.length > 500) {
      console.log('Found large script tag, length:', text.length);
      console.log(text.substring(0, 200));
      found = true;
    }
  });

  if (!found) console.log("Not found in scripts. Entire HTML length:", html.length);
}
run();
