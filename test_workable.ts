async function run() {
  const response = await fetch(`https://apply.workable.com/api/v3/accounts/typeform/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Origin': 'https://apply.workable.com',
      'Referer': `https://apply.workable.com/typeform/`,
    },
    body: JSON.stringify({ query: '', location: [], department: [], worktype: [], remote: true }),
  });
  const data = await response.json();
  if (data.results && data.results.length > 0) {
    console.log(Object.keys(data.results[0]));
  }
}
run();
