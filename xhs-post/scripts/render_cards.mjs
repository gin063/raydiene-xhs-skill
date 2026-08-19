// 分支② 模板渲染出图：把 HTML 里的每个 .poster 节点截成 PNG。
// 不经过任何图像模型——文字由 CSS 渲染，像素级精确、完全可复现。
//
// 用法: node render_cards.mjs <html文件> [输出目录]
// 依赖: vendor/guizang-social-card-skill 里的 playwright
//
// 注意: guizang 的模板从 Google Fonts 拉字体，首次渲染需要联网。
//       离线环境请把字体下载到本地并改 <link>，否则会回退到系统字体、版式会变。

import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const htmlPath = process.argv[2];
const outDir = process.argv[3] || path.join(path.dirname(htmlPath || '.'), 'png');

if (!htmlPath || !fs.existsSync(htmlPath)) {
  console.error('用法: node render_cards.mjs <html文件> [输出目录]');
  process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

await page.goto(pathToFileURL(path.resolve(htmlPath)).href, { waitUntil: 'networkidle' });
// 等 Web 字体就位，否则会截到回退字体
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(600); // WebGL 背景绘制

const posters = await page.$$('.poster');
if (posters.length === 0) {
  console.error('未找到 .poster 节点');
  await browser.close();
  process.exit(1);
}

for (const [i, node] of posters.entries()) {
  const id = (await node.getAttribute('id')) || `poster-${i + 1}`;
  const box = await node.boundingBox();
  const file = path.join(outDir, `${id}.png`);
  await node.screenshot({ path: file });
  console.log(`${file}  ${Math.round(box.width)}x${Math.round(box.height)}`);
}

await browser.close();
console.log(`\n${posters.length} 张已导出到 ${outDir}`);
