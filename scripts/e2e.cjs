// End-to-end check in a headless browser: datasets, neuron pages, partner links, chat, board.
//   BASE=http://localhost:3000 OUT=e2e-screenshots/ node scripts/e2e.cjs
// Needs Playwright with Chromium (npx playwright install chromium) if it is not already on the machine.
const { chromium } = require('playwright');
(async () => {
  const B = process.env.BASE ?? 'http://localhost:3000', out = process.env.OUT ?? 'e2e-screenshots/';
  require('node:fs').mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  let failed = 0;
  page.on('pageerror', e => errors.push('pageerror ' + e.message));
  page.on('console', m => m.type() === 'error' && errors.push('console ' + m.text()));
  const step = async (name, fn) => { const t = Date.now(); try { await fn(); console.log('PASS', name, Date.now() - t, 'ms'); } catch (e) { failed++; console.log('FAIL', name, e.message.split('\n')[0]); } };
  await step('datasets index lists 4 datasets', async () => {
    await page.goto(B + '/datasets'); 
    const n = await page.locator('[data-testid^=dataset-]').count(); if (n !== 4) throw new Error('got ' + n);
    await page.screenshot({ path: out + '01-datasets.png', fullPage: true });
  });
  await step('open C. elegans and search AVA', async () => {
    await page.click('text=C. elegans hermaphrodite connectome');
    await page.fill('input[name=q]', 'AVA'); await page.click('button:has-text("Search")');
    await page.waitForURL(/q=AVA/);
    const c = await page.textContent('[data-testid=match-count]'); console.log('   ', c);
    await page.screenshot({ path: out + '02-celegans-search.png', fullPage: false });
  });
  await step('open AVAL and see partners', async () => {
    await page.click('[data-testid=neuron-table] a:text-is("AVAL")');
    await page.waitForSelector('text=Upstream (inputs)');
    const rows = await page.locator('table').nth(1).locator('tbody tr').count(); console.log('    upstream rows', rows);
    if (rows < 5) throw new Error('few partners');
    await page.screenshot({ path: out + '03-aval-partners.png', fullPage: false });
  });
  await step('follow a partner link', async () => {
    const link = page.locator('table').nth(1).locator('tbody tr a').first();
    const name = await link.textContent();
    await link.click();
    await page.waitForFunction((n) => document.querySelector('h1')?.textContent === n, name);
    console.log('    now at', await page.textContent('h1'));
  });
  await step('FlyWire: search MBON right', async () => {
    await page.goto(B + '/datasets/flywire-fafb?q=MBON+right');
    const c = await page.textContent('[data-testid=match-count]'); console.log('   ', c);
    await page.screenshot({ path: out + '04-flywire-mbon.png', fullPage: false });
  });
  await step('hemibrain loads', async () => { await page.goto(B + '/datasets/hemibrain?q=KC'); console.log('   ', await page.textContent('[data-testid=match-count]')); });
  await step('tardigrade mock loads', async () => { await page.goto(B + '/datasets/tardigrade-mock'); console.log('   ', await page.textContent('[data-testid=match-count]')); await page.screenshot({ path: out + '05-tardigrade-mock.png', fullPage: false }); });
  await step('chat answers "what is next"', async () => {
    await page.goto(B + '/chat');
    const box = page.locator('textarea, input[type=text]').first();
    await box.fill('What should we build next for the tardigrade connectome, and which starter dataset should I use?');
    await box.press('Enter');
    await page.waitForFunction(() => document.body.innerText.includes('fcg:'), null, { timeout: 60000 });
    await page.screenshot({ path: out + '06-chat.png', fullPage: true });
  });
  await step('built vs needed board', async () => { await page.goto(B + '/graph'); await page.waitForSelector('text=Capabilities'); });
  console.log('browser errors:', errors.length ? errors : 'none');
  if (failed || errors.length) process.exitCode = 1;
  await browser.close();
})();
