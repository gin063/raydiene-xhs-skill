// 按 styles.registry.json 里登记的 upstream 拉取外部依赖到 vendor/。
//
// 为什么不入库、也不用 submodule：
//   - 上游代码提交进本库 → 版权与更新都会乱，且 diff 里全是别人的代码
//   - git submodule → 要记得 clone --recursive，忘了是**静默缺失**，生产环境很危险
//   - registry 本身已是清单（upstream + vendor_path），读它就不用维护第二份列表
//
// 用法:
//   node xhs-post/scripts/setup_vendor.mjs            # 拉取全部缺失项
//   node xhs-post/scripts/setup_vendor.mjs --list     # 只看清单和状态
//   node xhs-post/scripts/setup_vendor.mjs --only swiss-ikb

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const reg = JSON.parse(fs.readFileSync(path.join(repo, 'xhs-post/styles.registry.json'), 'utf8'));

const args = process.argv.slice(2);
const listOnly = args.includes('--list');
const onlyIdx = args.indexOf('--only');
const only = onlyIdx >= 0 ? args[onlyIdx + 1] : null;

// styles[] 和 resources{} 里都可能有 upstream，合并成一张表
const entries = [
  ...(reg.styles || []).map((s) => ({ id: s.id, upstream: s.upstream, dir: s.vendor_path, kind: '画风' })),
  ...Object.entries(reg.resources || {})
    .filter(([k]) => !k.startsWith('$'))
    .map(([k, v]) => ({ id: k, upstream: v.upstream, dir: v.vendor_path, kind: v.kind })),
].filter((e) => e.upstream && e.dir);

if (!entries.length) {
  console.log('registry 里没有登记任何 upstream。');
  process.exit(0);
}

let missing = 0;
for (const e of entries) {
  const abs = path.join(repo, e.dir);
  const have = fs.existsSync(abs);
  if (!have) missing += 1;
  if (listOnly || (only && only !== e.id)) {
    console.log(`${have ? '✓' : '·'} ${e.id.padEnd(28)} ${e.kind.padEnd(10)} ${e.dir}`);
    continue;
  }
  if (have) { console.log(`✓ ${e.id} 已存在，跳过`); continue; }

  fs.mkdirSync(path.dirname(abs), { recursive: true });
  console.log(`↓ ${e.id} ← ${e.upstream}`);
  try {
    // --depth 1：只要工作副本，不要上游的完整历史
    execSync(`git clone --depth 1 ${e.upstream} "${abs}"`, { stdio: 'inherit' });
  } catch {
    console.error(`  ✗ 拉取失败。手动执行：git clone --depth 1 ${e.upstream} ${e.dir}`);
  }
}

// 许可证体检。本项目是品牌商业推广——非商用许可（NC / Personal Non-Commercial）
// 一律不能用。2026-08-19 实测：拉下来才发现 gathered-scenes-zine 是
// Personal Non-Commercial，已删；photo-abstract-editorial 是 CC BY-NC-SA，未装。
// 这个检查放在拉取之后立刻跑，别等事后想起来才审。
const NC = [/non-?commercial/i, /\bNC\b/, /BY-NC/i, /personal use only/i];
const bad = [];
for (const e of entries) {
  const abs = path.join(repo, e.dir);
  if (!fs.existsSync(abs)) continue;
  const lf = fs.readdirSync(abs).find((f) => /^licen[cs]e/i.test(f));
  if (!lf) { bad.push(`${e.id}: 未找到 LICENSE 文件 —— 手动确认许可后再用`); continue; }
  const head = fs.readFileSync(path.join(abs, lf), 'utf8').slice(0, 3000);
  if (NC.some((re) => re.test(head))) {
    bad.push(`${e.id}: 疑似**非商用**许可 —— 本项目是商业推广，不能用。核对后从 registry 移除`);
  }
}
if (bad.length) {
  console.log('\n🔴 许可证告警：');
  bad.forEach((b) => console.log('   ' + b));
}

if (listOnly) {
  console.log(`\n共 ${entries.length} 项，缺失 ${missing} 项。`);
  console.log('拉取：node xhs-post/scripts/setup_vendor.mjs');
} else {
  console.log('\n⚠️ vendor/ 下的 skill 一律不装进 ~/.claude/skills 或 ~/.codex/skills。');
  console.log('   guizang 的 description 含触发词「做一套小红书图文」，装进去会静默抢走调度权。');
  console.log('   只以 vendor 目录按路径读取，见 registry 的 $comment_auto_trigger。');
}
