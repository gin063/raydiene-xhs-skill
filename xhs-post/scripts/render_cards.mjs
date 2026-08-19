// 分支② 模板渲染出图：把 HTML 里的每个 .poster 节点截成 PNG。
// 不经过任何图像模型——文字由 CSS 渲染，像素级精确、完全可复现。
//
// 用法: node render_cards.mjs <html文件> [输出目录]
//
// 浏览器: 默认用**系统已装的 Chrome**（channel: 'chrome'），不下载 playwright 自带的
//   Chromium。原因见 CHANGELOG 2026-08-19：CDN 下载在本网络环境下会停滞（第一次
//   27 分钟只到 80MB，第二次卡在 0.32MB）。系统 Chrome 151 与 playwright 需要的
//   Chrome for Testing 151 是同一大版本，渲染 CSS 卡片完全够用。
//   代价：结果依赖本机 Chrome 版本，跨机器可能有细微差异。对"截一张 CSS 卡片"
//   这个用途可以接受——我们要的是像素级准确的中文，不是跨版本一致的 WebGL。
//   若哪天需要严格可复现，装好 Chromium 后把 CHANNEL 改成 undefined 即可。
//
// 注意: guizang 的模板从 Google Fonts 拉字体，首次渲染需要联网。
//       离线环境请把字体下载到本地并改 <link>，否则会回退到系统字体、版式会变。

import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const dataIdx = args.indexOf('--data');
const dataPath = dataIdx >= 0 ? args[dataIdx + 1] : null;
const rest = args.filter((_, i) => i !== dataIdx && i !== dataIdx + 1);
const htmlPath = rest[0];
const outDir = rest[1] || path.join(path.dirname(htmlPath || '.'), 'png');

if (!htmlPath || !fs.existsSync(htmlPath)) {
  console.error('用法: node render_cards.mjs <模板.html> [--data 数据.json] [输出目录]');
  process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });

// 把数据注入模板的 <script id="card-data">，写成同目录的临时 html 再渲染。
// 同目录是为了让模板里的相对路径（字体、图片）仍然有效。
let renderTarget = htmlPath;
if (dataPath) {
  const tpl = fs.readFileSync(htmlPath, 'utf8');
  const data = fs.readFileSync(dataPath, 'utf8');
  const injected = tpl.replace(
    /(<script id="card-data" type="application\/json">)[\s\S]*?(<\/script>)/,
    (_m, a, b) => a + '\n' + data.trim() + '\n' + b);
  if (injected === tpl) {
    console.error('模板里没找到 <script id="card-data" type="application/json"> 块');
    process.exit(2);
  }
  renderTarget = path.join(path.dirname(htmlPath), '.render-tmp.html');
  fs.writeFileSync(renderTarget, injected, 'utf8');

  // 渲染时把条目数打出来，方便写标题时直接取用。
  // 硬性比对在 validate_post.py --cards 里做，且不需要任何声明——
  // 需要人记得声明的检查，人就会忘（claimedTotal 试过，删了）。
  try {
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const actual = (data.cards || []).reduce((n, c) => n + (c.items || []).length, 0);
    if (actual) console.log(`ℹ️ 条目共 ${actual} 条 —— 标题/封面里的数字承诺按此写。`);
  } catch { /* 数据不是清单形态就跳过 */ }
}

const CHANNEL = process.env.PW_CHANNEL ?? 'chrome';
let browser;
try {
  browser = await chromium.launch(CHANNEL ? { channel: CHANNEL } : {});
} catch (e) {
  console.error(`用 channel="${CHANNEL}" 启动失败，回退到 playwright 自带 Chromium。`);
  console.error(`若两者都失败，说明既没装系统 Chrome 也没下载 Chromium。原因：${e.message.split('\n')[0]}`);
  browser = await chromium.launch();
}
const page = await browser.newPage({ deviceScaleFactor: 1 });

await page.goto(pathToFileURL(path.resolve(renderTarget)).href, { waitUntil: 'networkidle' });
// 等 Web 字体就位，否则会截到回退字体
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(600); // WebGL 背景绘制

const posters = await page.$$('.poster');
if (posters.length === 0) {
  console.error('未找到 .poster 节点');
  await browser.close();
  process.exit(1);
}

// 轻量版式自查。guizang 自带的 validate-social-deck.mjs 硬编码 chromium.launch()，
// 在没下载 Chromium 的环境跑不起来，所以这里做等价的两项核心检查。
async function qa(node) {
  return node.evaluate((el) => {
    const pr = el.getBoundingClientRect();
    const visible = [...el.querySelectorAll('*')].filter((c) => {
      const r = c.getBoundingClientRect();
      const s = getComputedStyle(c);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    });
    if (!visible.length) return { bottomGap: 0, overflow: 0 };

    // 底部留白只能用「有文字的叶子节点」来量，三个坑：
    // 1) 容器（如 .content）常被 flex 撑满整卡，按它算间隙恒为 0
    // 2) 页脚条钉在底边（自身 absolute，子 span 却是 static），要顺祖先链排
    // 3) 页脚也可能用 margin-top:auto 待在文档流里 —— 位置检测抓不到，
    //    所以模板需显式打 data-qa-ignore，这里同样顺祖先链排
    const pinned = (c) => {
      for (let n = c; n && n !== el; n = n.parentElement) {
        const pos = getComputedStyle(n).position;
        if (pos === 'absolute' || pos === 'fixed') return true;
        if (n.hasAttribute && n.hasAttribute('data-qa-ignore')) return true;
      }
      return false;
    };
    const leaves = visible.filter(
      (c) => c.tagName !== 'CANVAS' && !c.querySelector('*') &&
             c.textContent.trim().length > 0 && !pinned(c));

    const base = leaves.length ? leaves : visible;
    const top = Math.min(...base.map((c) => c.getBoundingClientRect().top));
    const bottom = Math.max(...base.map((c) => c.getBoundingClientRect().bottom));
    const right = Math.max(...visible.map((c) => c.getBoundingClientRect().right));
    const pct = (v) => Math.round((v / pr.height) * 100);
    return {
      // 内容占卡片高度的比例。居中布局下单看底部间隙会误报——
      // 上下各留 30% 是刻意的均衡留白，不是"没填满"。
      fill: pct(bottom - top),
      topGap: pct(top - pr.top),
      bottomGap: pct(pr.bottom - bottom),
      overflow: Math.round(Math.max(0, right - pr.right)),
    };
  });
}

let warned = 0;
for (const [i, node] of posters.entries()) {
  const id = (await node.getAttribute('id')) || `poster-${i + 1}`;
  const box = await node.boundingBox();
  const file = path.join(outDir, `${id}.png`);
  await node.screenshot({ path: file });

  const { fill, topGap, bottomGap, overflow } = await qa(node);
  const isCover = (await node.getAttribute('class') || '').includes('cover');
  const flags = [];
  // 封面是大字+副标，天生就空，不参与内容占比检查
  if (!isCover && fill < 45) flags.push(`内容仅占 ${fill}% — 太空，加内容或放大字号`);
  if (Math.abs(topGap - bottomGap) > 15)
    flags.push(`上下留白失衡 ${topGap}% / ${bottomGap}% — 观感像被截断`);
  if (overflow > 0) flags.push(`右侧溢出 ${overflow}px — 文字超框`);
  console.log(`${file}  ${Math.round(box.width)}x${Math.round(box.height)}  内容占比 ${fill}%` +
              (flags.length ? `\n   ⚠️ ${flags.join('\n   ⚠️ ')}` : ''));
  warned += flags.length;
}

await browser.close();
if (dataPath) fs.rmSync(renderTarget, { force: true });
console.log(`\n${posters.length} 张已导出到 ${outDir}` +
            (warned ? `，${warned} 项版式告警` : '，版式自查通过'));
