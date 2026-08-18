# 文风选择矩阵

先读本文选定 voice，再读对应的 `<voice>.md`。不要一次读完所有文风文件。

**voice（叙事骨架）与 art（配图形式）、placement（植入强度）是三条独立的轴。**
同一个 voice 可以配任何画风、任何植入强度。原始 xlsx 的「爆文分类」列混淆了 voice 和 art，已弃用。

---

## 九种 voice

| voice | 一句话 | 样本 | 典型字数 | 常用 placement |
|---|---|---|---|---|
| `structured-guide` | 说明书口吻，一/二/三级小标题拆维度 | 7 | 400–900 | soft |
| `persona-match-review` | 多品牌各给一段「适合谁」，结尾对号入座 | 5 | 250–900 | hard |
| `hardcore-review` | 先讲原理，再下钻到继电器/MCU型号和耐压值 | 5 | 400–1100 | medium |
| `nanny-guide` | 小白过来人口吻，编号流程 + 图承载主体 | 5 | 300–850 | hard |
| `conflict-story` | 邻居/物业/家人制造冲突，我方合规讲理 | 4 | 900–1100 | 跨度最大 |
| `head-to-head` | 我的桩 vs 邻居/朋友的桩，交换实测 | 3 | 600–800 | hard |
| `first-person-journey` | 完整时间线纪实，有挫折有转折 | 3 | 550–1050 | soft→hard |
| `meme-remix` | 套用站内流行句式，情绪浓信息密度低 | 3 | 950–1100 | soft–medium |
| `first-principles` | 借外部理论降维打击，几乎不带货 | 1 | 820 | soft |

---

## 怎么选

**按目标选，不要按题材选。** 同一个选题可以用任何 voice 写。

| 你想要的效果 | 选 | 为什么 |
|---|---|---|
| 被收藏、当工具反复查 | `nanny-guide` / `structured-guide` | 流程和清单有留存价值 |
| 建立专业可信度 | `hardcore-review` / `first-principles` | 元器件级数据和理论框架难以伪造 |
| 用户已决策疲劳，要推一把 | `persona-match-review` | 直接告诉他「你属于哪类，就买哪个」 |
| 引评论区互动 | `conflict-story` | 冲突天然激发站队 |
| 触达非搜索流量、破圈 | `meme-remix` | 靠身份认同而非参数 |
| 让硬植入显得自然 | `head-to-head` / `first-person-journey` | 「我自己花钱买的」是最强的植入外壳 |

**避免的组合：**
- `meme-remix` + `hard` — 玩梗体信息密度低，硬塞参数会让梗断掉。样本 037 是唯一成功的，靠的是把参数塞进「答疑」段落而非正文主线
- `conflict-story` + `hard` — 冲突未解决时推产品会显得吃人血馒头。样本 035 成功是因为冲突是**家庭内部的选购分歧**（本来就该以选品收尾），而 036（邻居道德绑架）刻意不带货、只求共鸣
- `first-principles` + `hard` — 该体的说服力来自「我不卖你东西」，一带货就塌

---

## placement（植入强度）

| 值 | 定义 | 样本数 |
|---|---|---|
| `soft` | 正文不出现品牌，或仅结尾一句带过 | 10 |
| `medium` | 品牌作为并列项之一出现，不下优劣结论 | 8 |
| `hard` | 明确推荐，或竞品对比后落到雷迪恩 | 18 |

⚠️ **当前 18/36 是 hard，占一半。** 这个比例是否合理，要等转化数据回来才能判断——高 hard 比例可能提升单篇转化，也可能拉低账号整体可信度从而降低长期转化。数据到位前不要把 hard 当默认值。

---

## art（配图形式）

`chart-compare` 图表对比 · `spec-table` 参数表 · `memo-text` 多字备忘录 · `teardown-photo` 拆机实拍 · `install-photo` 安装实拍 · `product-single` 单张产品图 · `screenshot` 流程截图

art 与具体画风 skill 的映射见 `../../styles.registry.json`。`memo-text` 和 `spec-table` 文字密集，**必须走 `html-screenshot` 类画风**（文字 CSS 渲染），不要交给生图模型。

---

## body_carries（正文自足性）

- `self-contained`（27 篇）— 正文信息完整，图是补充
- `image-dependent`（9 篇）— 正文只是引子（「详见图片」「字数有限看备忘录」），信息主体在图上

选 `image-dependent` 时正文压到 300 字上下，把钩子和产品结论留在正文，**中间的干货全部推到图上**。这是 `nanny-guide` 拿高收藏的核心手法（样本 019/022/025）。

---

## 数据说明

- 互动量**不作为排序依据**（点赞收藏≠转化）。它只用于诊断：收藏 >> 点赞说明被当工具存档，两者接近说明是情绪共鸣。
- `first-principles` 只有 1 个样本，规格是从单篇归纳的，**置信度低**，用前先补样本。
- 样本 008（行8）正文疑似截断，已标 `quality_flag`，不要当模板。
