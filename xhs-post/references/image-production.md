# 配图落地 · 四条分支

`image-plan.md` 决定**用什么图**，本文决定**怎么把它做出来**。方案确认后走这里。

每张图按来源走对应分支，**一篇里不同图可以走不同分支**。

---

## 分支 ① 现成模板（内置图式）

适用：`ios-memo` `note-app-screenshot` `spec-table-card` `product-card` `warm-journal` `chat-screenshot`

**产出：每张图的完整文本，放在独立代码块里，便于直接复制。**

不要只给要点提纲——排版的人需要的是可以整段贴进去的成品文本。格式：

````markdown
### 图3 · ios-memo · 类型二「先买桩、后办电表」

```
先买桩、后办电表

桩都到家了，电表还没申请
只能晾在阳台吃灰

✅ 顺序是：先办电表，再买桩
✅ 申请 / 勘测 / 安装 全程免费
✅ 走「网上国网」APP，线上提交
```
````

要求：
- **换行位置就是最终换行位置**，不要让排版的人再断行
- emoji 写进文本里，不要另外说明
- 单图中文 ≤80 字（`platform-rules.md`）
- 参数值逐个对过产品 xlsx

---

## 分支 ② 模板渲染出图（无 AI）

适用：`swiss-ikb`（vendor/guizang-social-card-skill）

**已核实：guizang 的 `package.json` 唯一依赖是 `playwright ^1.60.0`，零 AI / 生图库。** 流程是 HTML 模板 → 填数据 → 无头浏览器截图 → PNG，全程不经过图像模型。

这条分支的价值：

| | 模板渲染 | AI 生图 |
|---|---|---|
| 中文准确性 | 像素级，不会错字 | 需逐字核对 |
| 可复现性 | 同输入同输出 | 每次不同 |
| 成本 | 零 | 按次 |
| 复写改配色 | 改 CSS 变量 | 重新生成，构图会变 |

**参数密集的图优先走这条。** 一张 13 列 × 15 行的对比表交给生图模型，错一格就是事故；交给 CSS 就不存在这个问题。

产出：填好的数据结构 + 调用说明。**可以直接出图，不需要人工介入。**

⚠️ 依赖 Node 环境。Codex 侧首次使用需确认 `npm install` 能跑通。

---

## 分支 ③ 实拍图

适用：`photo-realistic` `cart-screenshot`，以及任何有现成素材的场景

**不出 prompt。** 产出三样：

````markdown
### 图4 · 实拍 · 露天车位淋雨

**用哪张**：露天安装照，桩体正面偏左 15°，能看到雨痕和墙面走线
**怎么拍**（若需补拍）：阴天或雨后，手机原相机不开美颜，人眼高度平视，不用广角
**加什么**：
- 左上角 📍 emoji + 白色描边花字
- 右下角半透明白底文字块（不透明度约 85%）

**图上文本**：
```
装在露天，淋了半年

桩体 IP65 ／ 枪头 IP67
```
````

三样缺一不可：
- **用哪张 / 怎么拍** —— 类型、角度、光线
- **加什么** —— emoji、花字、文字块的位置和样式
- **图上文本** —— 仍然由模型产出，这是文案工作不是美工工作

⚠️ 电商截图必须遮挡真实订单号、收货信息，并检查有无 618。

---

## 分支 ④ AI 生成

适用：`native-image-gen` `gathered-scenes-zine`，以及无素材又无模板的场景

**用结构化散文，不用 JSON。** 理由见文末。

### 模板

```
A [风格描述] Xiaohongshu infographic card, vertical 3:4 aspect ratio, 1080x1440.

LAYOUT:
- Top band: large bold Chinese headline reading 「装桩花冤枉钱的5类人」
- Below headline: smaller subtitle reading 「按你会遇到的顺序排」
- Middle: five stacked rounded cards, evenly spaced
- Each card: a small numbered badge on the left, then Chinese text reading 「...」
- Bottom right: small watermark-free caption reading 「...」

STYLE:
[配色、材质、字体感觉、参考美学 —— 整套图逐字复用同一段]

CONSTRAINTS:
Render all Chinese text crisply and accurately.
No competitor logos, no watermarks, no extra text beyond what is specified.
Do not render any bracket, quotation mark, or label name from this prompt.
```

### 四条要点

1. **要渲染的中文用「」括起来并单独成行。** 这是模型区分"要画的字"和"描述文字"的唯一依据。
2. **STYLE 段整套图逐字复用。** 一套 7 张卡的视觉一致性来自这里，不来自任何结构化格式。
3. **比例写死** `vertical 3:4 aspect ratio, 1080x1440`。
4. **必须同时产出 `text_on_image` 清单** —— 出图后逐条核对。GPT Image 2 的中文渲染质量已经足够好，但"足够好"不等于"不用核"，参数数字错一位就是事故。

### 为什么不用 JSON

| 理由 | 说明 |
|---|---|
| 训练分布 | 图像模型的文本编码器在自然语言图注上训练，不是 JSON。括号引号键名不携带视觉语义 |
| **渲染污染** | **JSON 的键名和括号会被画进图里。这个风险和中文渲染能力正相关**——模型越擅长把字符串画出来，越容易把 `"title":` 也画上 |
| 一致性来源 | 一致性来自逐字复用 STYLE 段，JSON 在这件事上没有优势 |
| 分层 | 结构化的需求由 `images[].content`（JSON）满足，那是给验证器和复写流程读的；`images[].prompt`（自然语言）是给模型读的。两层各司其职 |

模板里那句 `Do not render any bracket, quotation mark, or label name from this prompt` 是对渲染污染的兜底，即使用自然语言也建议保留。

---

## 出图后必查

不分分支，全部适用：

```
□ 比例 3:4（1080×1440）
□ 中文逐字校对，重点核参数数字（IP65/IP67、5000V、26重、964）
□ 品牌名已脱敏（雷*恩 / *牛 / *达 / *想 / *米 / 特*拉 / 比*迪），型号名保留全称
□ 无 AI 生成的竞品外观、logo、内部结构
□ 无水印、无原作者名、无 prompt 残留字符
□ 无 618（含截图素材内）
□ 封面标题与正文标题一致
```

参数错了改 prompt 或改数据重出，**不要将就**。
