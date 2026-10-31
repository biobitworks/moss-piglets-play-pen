const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:3000';
const PERMA = process.env.PERMA || 'https://moss-piglets-play-pen.vercel.app';
const OUT = process.argv[2];
const W = 1280, H = 720;

const card = (title, sub, extra = '') => `<html><body style="margin:0;width:${W}px;height:${H}px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,#0f2a1d,#1d4d34);color:#eafbe9;font-family:system-ui,Helvetica,Arial,sans-serif;text-align:center">
<div style="font-size:64px;font-weight:800;letter-spacing:-1px">${title}</div>
<div style="font-size:28px;margin-top:18px;opacity:.85;max-width:1000px">${sub}</div>${extra}</body></html>`;

async function caption(page, text) {
  await page.evaluate((t) => {
    let el = document.getElementById('__cap');
    if (!el) {
      el = document.createElement('div');
      el.id = '__cap';
      el.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:99999;padding:14px 24px;background:rgba(10,30,20,.88);color:#fff;font:600 24px system-ui,Helvetica,Arial,sans-serif;text-align:center';
      document.body.appendChild(el);
    }
    el.textContent = t;
  }, text);
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function scroll(page, px, ms) {
  const steps = Math.max(1, Math.round(ms / 50));
  for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, px / steps); await wait(50); }
}
async function visit(page, path, cap) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await caption(page, cap);
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: OUT, size: { width: W, height: H } } });
  const page = await ctx.newPage();
  const t0 = Date.now();
  const mark = (n) => console.log(n, ((Date.now() - t0) / 1000).toFixed(1));

  await page.setContent(card('Moss Piglet Play Pen', 'An open, agent-ready workbench for building the tardigrade connectome,<br>modeled on how the fly connectome (FlyWire) was done.'));
  mark('title'); await wait(4500);

  await visit(page, '/', 'Home: the build plan for a tardigrade connectome, step by step');
  mark('home'); await wait(2000); await scroll(page, 900, 2500); await wait(1000);

  await visit(page, '/progress', 'Progress: what is built and what is still needed');
  mark('progress'); await wait(1500); await scroll(page, 700, 2000); await wait(800);

  await visit(page, '/datasets', 'Real data: C. elegans, FlyWire and hemibrain loaded as stand-ins');
  mark('datasets'); await wait(2500);
  await visit(page, '/datasets/celegans-hermaphrodite', 'Real C. elegans connectome: searchable neurons and synaptic partners');
  mark('celegans'); await wait(2000); await scroll(page, 800, 2500); await wait(800);

  await visit(page, '/graph', 'Knowledge graph: every step marked built vs needed, each one addressable');
  mark('graph'); await wait(2500); await scroll(page, 700, 2000); await wait(800);

  await visit(page, '/chat', 'Chat with no API key: answers straight from the knowledge graph');
  mark('chat');
  const input = page.locator('input[aria-label="Message"]');
  await input.click();
  await input.pressSequentially("What's next to build?", { delay: 45 });
  await page.keyboard.press('Enter');
  await page.waitForSelector('.bubble.assistant:not(.muted)', { timeout: 20000 }).catch(() => {});
  await wait(1500); await scroll(page, 500, 1500); await wait(2500);

  await visit(page, '/worklog', 'Worklog: timestamped proof of work, recorded in the graph');
  mark('worklog'); await wait(2000); await scroll(page, 600, 2000); await wait(800);

  const code = (s) => `<div style="font:22px ui-monospace,Menlo,monospace;background:#0b1a12;border:1px solid #3b7a57;border-radius:8px;padding:10px 16px;margin:8px 0;text-align:left;width:1080px;white-space:pre-wrap">${s}</div>`;
  await page.setContent(card('Plug in any agent', 'CLI, Python, R and an MCP server, all with no API keys',
    `<div style="margin-top:28px">${code('pip install "git+https://github.com/biobitworks/moss-piglets-play-pen#subdirectory=packages/python"')}${code('playpen ask "what still needs building?"   # CLI, also: playpen-mcp')}${code('remotes::install_github("biobitworks/moss-piglets-play-pen", subdir = "packages/r")')}${code('npm install -g ./packages/cli   # Node CLI + MCP server')}</div>`));
  mark('install'); await wait(7000);

  await page.setContent(card('Step in and help finish it', 'Open source. Contributor friendly. Agent ready.',
    `<div style="margin-top:40px;font:700 40px system-ui;color:#9cf5b5">${PERMA.replace('https://', '')}</div><div style="margin-top:14px;font-size:22px;opacity:.75">github.com/biobitworks/moss-piglets-play-pen</div>`));
  mark('end'); await wait(5000);

  await ctx.close(); await browser.close();
  mark('done');
})();
