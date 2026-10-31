// Records the ~60-second demo walkthrough with Playwright.
//   node scripts/record-demo.js <outdir>            silent version with fixed timings
//   VO=<dir> node scripts/record-demo.js <outdir>   narrated version: <dir> holds script.json ([[scene, line], ...])
//                                                   and dur.json ({scene: seconds}); each scene lasts as long as its line,
//                                                   the caption bar shows the spoken line, and scene start times are
//                                                   written to <outdir>/marks.json for mixing the audio.
// Env: BASE (app URL, default http://localhost:3000), PERMA (permalink shown on the end card).
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:3000';
const PERMA = process.env.PERMA || 'https://moss-piglets-play-pen.vercel.app';
const OUT = process.argv[2] || 'demo-out';
const VO = process.env.VO;
const W = 1280, H = 720;

const LINES = VO ? Object.fromEntries(JSON.parse(fs.readFileSync(path.join(VO, 'script.json'), 'utf8'))) : {};
const DUR = VO ? JSON.parse(fs.readFileSync(path.join(VO, 'dur.json'), 'utf8')) : {};
const CAPS = {
  home: 'Home: the build plan for a tardigrade connectome, step by step',
  progress: 'Progress: what is built and what is still needed',
  datasets: 'Real data: C. elegans, FlyWire and hemibrain loaded as stand-ins',
  celegans: 'Real C. elegans connectome: searchable neurons and synaptic partners',
  graph: 'Knowledge graph: every step marked built vs needed, each one addressable',
  chat: 'Chat with no API key: answers straight from the knowledge graph',
  worklog: 'Worklog: timestamped proof of work, recorded in the graph',
};
const FIXED = { title: 4500, home: 6000, progress: 5000, datasets: 2800, celegans: 6000, graph: 6000, chat: 7500, worklog: 5000, install: 7000, end: 5000 };
const MIN = { chat: 6000, home: 4000, celegans: 4500, graph: 4000, install: 5000 };

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const card = (title, sub, extra = '') => `<html><body style="margin:0;width:${W}px;height:${H}px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,#0f2a1d,#1d4d34);color:#eafbe9;font-family:system-ui,Helvetica,Arial,sans-serif;text-align:center">
<div style="font-size:64px;font-weight:800;letter-spacing:-1px">${title}</div>
<div style="font-size:28px;margin-top:18px;opacity:.85;max-width:1000px">${sub}</div>${extra}</body></html>`;

async function caption(page, text) {
  if (!text) return;
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
async function scroll(page, px, ms) {
  const steps = Math.max(1, Math.round(ms / 50));
  for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, px / steps); await wait(50); }
}

(async () => {
  const browser = await chromium.launch();
  fs.mkdirSync(OUT, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: OUT, size: { width: W, height: H } } });
  const t0 = Date.now();
  const page = await ctx.newPage();
  const marks = {};
  let start = 0, name = '';

  const sceneMs = (n) => (VO ? Math.max((DUR[n] + 0.35) * 1000, MIN[n] || 0) : FIXED[n]);
  async function scene(n, setup, act) {
    name = n;
    await setup();
    await caption(page, VO ? LINES[n] : CAPS[n]);
    start = Date.now();
    marks[n] = (start - t0) / 1000;
    console.log(n, marks[n].toFixed(1));
    if (act) await act(sceneMs(n));
    const left = sceneMs(n) - (Date.now() - start);
    if (left > 0) await wait(left);
  }
  const goto = (p) => () => page.goto(BASE + p, { waitUntil: 'networkidle' });
  const set = (html) => () => page.setContent(html);
  const browse = (px) => async (ms) => { await wait(Math.min(1500, ms * 0.25)); await scroll(page, px, ms * 0.45); };

  await scene('title', set(card('Moss Piglet Play Pen', 'An open, agent-ready workbench for building the tardigrade connectome,<br>modeled on how the fly connectome (FlyWire) was done.')));
  await scene('home', goto('/'), browse(900));
  await scene('progress', goto('/progress'), browse(700));
  await scene('datasets', goto('/datasets'));
  await scene('celegans', goto('/datasets/celegans-hermaphrodite'), browse(800));
  await scene('graph', goto('/graph'), browse(700));
  await scene('chat', goto('/chat'), async () => {
    const input = page.locator('input[aria-label="Message"]');
    await input.click();
    await input.pressSequentially("What's next to build?", { delay: 40 });
    await page.keyboard.press('Enter');
    await page.waitForSelector('.bubble.assistant:not(.muted)', { timeout: 20000 }).catch(() => {});
    await wait(1200);
    await scroll(page, 500, 1500);
  });
  await scene('worklog', goto('/worklog'), browse(600));
  const code = (s) => `<div style="font:22px ui-monospace,Menlo,monospace;background:#0b1a12;border:1px solid #3b7a57;border-radius:8px;padding:10px 16px;margin:8px 0;text-align:left;width:1080px;white-space:pre-wrap">${s}</div>`;
  await scene('install', set(card('Plug in any agent', 'CLI, Python, R and an MCP server, all with no API keys',
    `<div style="margin-top:28px">${code('pip install "git+https://github.com/biobitworks/moss-piglets-play-pen#subdirectory=packages/python"')}${code('playpen ask "what still needs building?"   # CLI, also: playpen-mcp')}${code('remotes::install_github("biobitworks/moss-piglets-play-pen", subdir = "packages/r")')}${code('npm install -g ./packages/cli   # Node CLI + MCP server')}</div>`)));
  await scene('end', set(card('Step in and help finish it', 'Open source. Contributor friendly. Agent ready.',
    `<div style="margin-top:40px;font:700 40px system-ui;color:#9cf5b5">${PERMA.replace('https://', '')}</div><div style="margin-top:14px;font-size:22px;opacity:.75">github.com/biobitworks/moss-piglets-play-pen</div>`)));

  marks.done = (Date.now() - t0) / 1000;
  await ctx.close();
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'marks.json'), JSON.stringify(marks, null, 2));
  console.log('done', marks.done.toFixed(1));
})();
