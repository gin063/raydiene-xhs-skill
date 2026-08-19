# xhs-skill · 雷迪恩小红书图文生产

给 **Codex / Claude Code** 用的 skill：从一个选题或一篇待复写的爆文，产出可直接发布的小红书图文（正文 + 配图 + 合规自查）。

> ⚠️ **本仓库应设为 Private。** 内含竞品参数对照、投放打法、合规红线、素人账号策略。

---

## 目录

```
xhs-post/                    ← skill 本体，装到 agent 的 skills 目录
├── SKILL.md                 调度：分流 → 四段闸 → references 索引
├── styles.registry.json     画风注册表（含许可证与商用判定）
├── references/              按需读的知识
│   ├── voices/              10 种文风规格 + 选择矩阵
│   ├── selling-points.md    8 个卖点
│   ├── compliance.md        合规红线（优先级高于一切创意）
│   ├── image-plan.md        配图决策
│   ├── image-production.md  配图落地七条分支
│   ├── humanize.md          去 AI 味 + 小红书语境豁免
│   ├── cover.md             封面独立建模
│   ├── platform-rules.md    平台硬约束
│   └── workflows/           new-post.md · rewrite.md
├── templates/               自有出图模板（CSS 渲染，中文像素级精确）
├── schemas/                 post-spec 交接契约
└── scripts/                 入库 / 出图 / 校验 / 依赖

data/                        36 篇语料 + 四维标注 + 转化 tier
vendor/                      外部 skill（不入库，脚本按需拉）
output/                      验收产出示例（两次实跑留档）
install.ps1                  一次装到 Claude 与 Codex 两侧
```

---

## 快速开始

```bash
npm install                                    # playwright（出图用）
node xhs-post/scripts/setup_vendor.mjs         # 拉外部依赖 + 许可证体检
.\install.ps1                                  # junction 到两侧 skills 目录
```

装好后在 Codex 里说「写一篇小红书」或 `$xhs-post` 即可触发。

⚠️ **出图命令必须在仓库根执行**——Node 模块解析从脚本位置向上找，联接到 skills 目录后找不到 `node_modules`。

---

## 核心设计

**决策顺序不能倒**：`轨道 → 卖点 → 文风 → 植入强度 → 承载度 → 配图`
卖点定不下来，后面全是猜。每一步的理由写进 `axes.rationale`——转化数据回流时那是唯一的归因依据。

**四段闸**：`PLAN → DRAFT → 去AI味 → IMAGE PLAN → RENDER`，每段之间交人确认。
配图返工成本远高于文案，顺序错了会全盘重来。

**规则尽量做成机器检查**，因为人工自查会打假勾：

| 检查 | 命令 |
|---|---|
| 合规（极限词/618/脱敏/降配/监管口径） | `validate_post.py <交付.md>` |
| 复写查重（连续 8 汉字） | `validate_post.py <交付.md> --against <原文.txt>` |
| 数字承诺与条目数一致 | `validate_post.py <交付.md> --cards <cards.json>` |
| 版式（内容占比/留白均衡/溢出） | 随 `render_cards.mjs` 自动跑 |
| 外部依赖许可证 | 随 `setup_vendor.mjs` 自动跑 |

---

## 两条工作流

| 输入 | 走哪条 |
|---|---|
| 一个标题 / 选题 | `references/workflows/new-post.md` |
| 原文全文 + 原文配图 | `references/workflows/rewrite.md` |

---

## 数据说明

`data/templates.json` 是 36 篇语料的索引，含 voice / placement / body_carries / art 四维标注和转化 tier。

**排序只用转化 tier，不用互动量**——点赞收藏 ≠ 转化。且 tier 只在转化轨内有效，养号轨（`conflict-story` / `meme-remix`）不背转化 KPI。

新增语料：往 xlsx 加行 → 重跑 `ingest_notes.py`。标注在 `data/labels.json`，与 xlsx 解耦，重跑不会丢。

---

## 维护约定

- **改完一批东西追加到 `CHANGELOG.md` 最上面**：改了什么 + 为什么 + 已验证/未验证 + 待办。里面记的是 git 看不出来的东西——实测数据、口径为什么这么定、踩过哪些坑
- 规格文件里 **⚑ = 推断，未经验证**；🔴 = 样本不足，置信度低。用完回填结果
- `vendor/` 不入库。新增外部依赖只改 `styles.registry.json`，脚本读它拉取
- **非商用许可（NC / Personal Non-Commercial）一律不能用**——本项目是商业推广。见 `compliance.md` 第 8.5 节
