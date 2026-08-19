# CHANGELOG — 小红书图文生成 skill

## 2026-08-19 · 自有模板体系 + 素人身份约束 + 双端部署

**素人身份是这轮最重要的约束（compliance.md 6.5 新增）**

所有笔记发素人账号做软植入，不发官方号。三层：
1. **单篇**：禁固定署名/水印/logo；人称无「我们」；不出现内部信息；不用电商白底渲染图
2. **跨篇**：同一套配色连发多篇 = 像营销号
3. **跨账号**：多个素人账号发出长得像同一套模板的图 = 集体暴露，比单个暴露更严重

由此，模板的 CSS 变量主题从「复写防查重」升级为**同时承担素人身份隔离**。

踩到的三个实例，都已修：
- 页脚写了「雷*恩」——我加的，等于给软文盖品牌章
- 尾图 kicker 写了「收束」——那是 PLAN 里的内部定位术语
- 对比表把自家列高亮成蓝色——中立表描色 = 明显偏好

新增判定方法：**这个词是不是只有做这篇的人才会用？** 是 → 不能出现在成品里。

**自有模板体系**

- `templates/_base.css` 共享基座：主题变量 + 字体栈单一来源
- `templates/ios-memo.html`、`spec-table.html`、`product-card.html`
- **字体栈必须西文在前、中文在后**。ASCII（脱敏的 `*`、数字、IP65 的字母）走西文字体，中文自动 fallback。反过来会让 `*` 在思源宋体里渲染成 `★`
- 中文只有思源黑/宋两个可选（Google Fonts 简中就这些）；西文在 `cards.json` 设 `latinFont` 即可换
- **页码由模板自动计算，不读数据字段**——手填过一次就错一次（7 张卡序号全填成 /05）
- `spec-table` / `product-card` 把「不暴露降配」做成**字段级约束**：实测 8 行进 7 行出、6 胶囊进 5 出，违规项自动剔除
- 空值归一：xlsx 里 `None`/`-`/`×` 混用，统一成 `—`

**版式自查改了两轮**

- 第一版按所有子元素算底部间隙 → 恒为 0（容器被 flex 撑满）
- 第二版排除 absolute 还不够 → 页脚用 `margin-top:auto` 待在流内，位置检测抓不到，**换个模板同一个 bug 就回来**。加 `data-qa-ignore` 显式标记才根治
- 指标本身也换了：内容垂直居中后单看底部间隙必然误报，改为量**内容占比 + 上下是否失衡**

**双端部署（install.ps1）**

Claude 读 `~/.claude/skills`，Codex 读 `$CODEX_HOME/skills`，**两个独立路径，`~/.agents/` 根本不存在**。
用 **junction** 让两侧指向同一仓库目录：改文件立刻同步、无版本漂移、Windows 上不需要管理员权限。实测通过。

- ⚠️ 只联接单个 skill，别联整个 skills 目录——Codex 的 `.system/` 有 imagegen / skill-installer 等内置 skill，整目录互联会打架
- ⚠️ 出图工具链不随 skill 走：node 模块解析从脚本位置向上找，联接过去找不到 `node_modules`，渲染必须在仓库根执行
- ⚠️ `.ps1` 必须存 **UTF-8 with BOM**，否则 PS 5.1 按 ANSI 读中文直接解析失败

**配图分支扩到七条**

划分标准统一为「这张图的像素从哪来」。新增：⑤既有素材（不创作只筛选处理）、⑥合成（AI 底图+贴实拍，用户最早提的 reserved_area 需求终于成为分支）、⑦数据图表（表是罗列、图是可视化，含三条防止图表撒谎的约束）。

动图/Live Photo 暂不做。

**待确认**

- 素人账号与配色的映射关系怎么管理（谁维护、存在哪）


## 2026-08-19 · 分支②（模板渲染出图）验证通过

**结论：成立。** 首张 PNG 已出，1080×1440，**中文零错字**。

**做了什么**
- `vendor/guizang-social-card-skill` clone 完成
- `xhs-post/scripts/render_cards.mjs`：截取 `.poster` 节点出 PNG + 轻量版式自查
- `INSTALL.md`：本机 skill 安装位置实测 + GitHub 手动安装流程

**关键决策：用系统 Chrome，不下载 Chromium**

playwright 的 Chromium 二进制在本网络环境下载不下来——第一次 27 分钟只到 80MB（≈50KB/s），第二次卡在 0.32MB 停滞 8 分钟。诊断过程见下方「踩坑」。

改用 `chromium.launch({ channel: 'chrome' })` 驱动系统已装的 Chrome **151.0.7922.140**，与 playwright 需要的 Chrome for Testing **151.0.7922.34** 同一大版本。
- 代价：结果依赖本机 Chrome 版本，跨机器可能有细微差异
- 判断：对「截一张 CSS 卡片」可接受——要的是像素级准确的中文，不是跨版本一致的 WebGL
- 需要严格可复现时，装好 Chromium 后设 `PW_CHANNEL=` 空值即可回退

**⚠️ 踩坑：我误判了下载进度并 kill 了一个已下 80MB 的任务**

判断「进度为 0」时查的是 `ms-playwright\` 目录和进程的 `ReadTransferCount`——**两个指标都不反映真实进度**。playwright 下载落在 `%TEMP%\playwright-download-*\`，且 socket 读取不计入进程 I/O 计数器。
**以后查 playwright 下载进度，只看 `%TEMP%\playwright-download-*` 下的 zip 文件大小与 LastWriteTime。**

另：两次下的 revision 不同（vendor 的 playwright 要 1223，项目根的要 1234），所以那 80MB 对第二次也用不上。

**⚠️ guizang 的三个约束（文档里没写的）**
1. **不自带截图脚本。** SKILL.md:209 只说「用 Playwright 导出 .poster 节点」，渲染这一环留给调用方实现
2. **模板从 Google Fonts 拉字体**，离线会**静默回退**到系统字体、版式变化但不报错
3. **自带的 `validate-social-deck.mjs` 硬编码 `chromium.launch()`**，用系统 Chrome 的方案绕不过它。已在 `render_cards.mjs` 里实现等价的两项核心检查（底部留白、右侧溢出），不改 vendor 代码

**版式自查踩的两个坑**（记下来免得重犯）
- 按所有子元素算底部间隙 → 恒为 0，因为 `.content` 容器被 flex 撑满整卡
- 排除 absolute 元素还不够 → 页脚条自身 absolute 但子 span 是 static，要**顺祖先链**排
- 正确做法：只量「有文字的叶子节点」，且祖先链上无 absolute/fixed

**首张卡的实测问题**
- ✅ 中文全部正确，零错字（分支②的核心价值）
- ⚠️ **底部留白 42%** — 把 ios-memo 的短内容塞进 editorial 长文模板导致，QA 已能自动抓出
- ⚠️ WebGL 背景未渲染（canvas 空白），headless 下可能不生效，待查
- ⚠️ **脱敏的 `*` 在衬线字体下渲染成 `★`**（`雷*恩` → `雷★恩`）。语义仍是脱敏，但视觉不一致，多张图混用不同字体时会更明显

**未验证**
- 仅渲染了 1 张测试卡，7 张全量未跑
- guizang 的 Swiss 模板未测（只用了 editorial）
- 版式问题未修——需要为 ios-memo 这类短内容卡另配模板，或调 editorial 的 content 布局


## 2026-08-18 · 框架主体完成

**做了什么**

框架已可运行，缺的是内容（7 份 voice 规格）。

- `SKILL.md` 调度主体：分流（新写/复写）→ 四段闸（PLAN→DRAFT→IMAGE PLAN→RENDER）→ references 索引
- `references/selling-points.md` **新增卖点轴**：7 个卖点 + 卖点×voice 搭配 + 竞品诚实对照 + 不能打的卖点
- `references/image-plan.md` 配图三步决策，含 photo-real 分支
- `references/cover.md` 封面独立建模，4 种套路 + 复写时的可改/不可改边界
- `references/workflows/new-post.md` + `rewrite.md`
- `styles.registry.json` v2：并入 v1 的 10 种配图风格，新增 `photo-real` render_mode
- `scripts/validate_post.py`：把 compliance 里可机器判定的做成自动检查
- schema 增加 `axes.track` / `axes.selling_point` / `images[].production_notes` / `meta.source_images`

**关键决策与理由**

1. **卖点是 PLAN 的第一个决策，先于 voice。** 用户指出「根据目的宣传不同卖点，会影响整体行文逻辑和配图风格」。卖点定不下来后面全是猜，所以决策顺序固定为 轨道→卖点→文风→植入→承载度→配图。

2. **新增 `photo-real` render_mode。** 36 篇里实拍图占比很高。实拍图**不出 prompt**，出 `production_notes`（怎么加工已有照片）+ `text_on_image`（图上文本仍由模型生成，那是文案工作）。这是原 html/image-gen 二分法覆盖不到的第三种。

3. **v1 的 10 种配图风格直接注册进 registry，而不是我看图反推。** 那是实操踩出来的知识，比从 178 张图归纳准。配图只用于抽查验证。

4. **复写的封面策略：小改不重做。** 原封面的视觉记忆是爆款资产，重做等于扔掉。定了可改（配色/字体/图标/文案/产品图角度）与不可改（构图/相对位置/信息层级/排布方式）的边界。原则：扫一眼像同一系列，逐帧比对是两张图。

5. **复写不能跳过合规复查。** 「原文能发说明没问题」这个假设不成立——原文可能本来就踩线、监管口径会变、脱敏规则已于今日变更（雷迪恩本品改为 `雷*恩`）、618 可能藏在原配图里。

**已验证**

- ✅ `validate_post.py` 用故意违规的样本测过，10 项 FAIL 全部命中（极限词/618/攻击性词/品牌未脱敏/降配泄露/rationale 空/photo-real 缺字段）
- ✅ 产品 xlsx 结构确认：6 组 42 个参数行 × 13 个产品列。`运行内存 224k→144K`、`I/O 80个→53个` 印证了 v1 的「不暴露降配」规则

**未验证**

- ❌ 整套流程未跑过一次真实产出
- ❌ `polish` 轴仍 35/36 为 null（改用 registry 的风格映射，未逐张标注 178 张配图）
- ❌ vendor/ 下两个外部 skill 尚未 clone
- ❌ Codex 侧实际读取的 skills 路径未确认

**下一步**

1. 补齐 7 份 voice 规格（含 v1 的配图张数与 prompt 要点），并按双轨/tier 发现重写已有的 2 份
2. 跑一次端到端真实产出做验收
3. clone vendor/ 两个外部 skill，写 install 脚本部署到 Codex 侧

---

## 2026-08-18 · 语料三轴标注 + 文风库开工

**做了什么**

- 通读 36 篇全文，**按中文内容重判分类**（原表分类不采信，见下）
- 新增 `data/labels.json`：36 篇 × 四个维度（voice / placement / body_carries / art）全覆盖标注
- `ingest_notes.py` 增加 labels merge，标注与 xlsx 解耦——xlsx 加行重跑不会丢标注
- `references/voices/_index.md`：文风选择矩阵
- 两份文风规格样例：`nanny-guide.md`（干货型）、`conflict-story.md`（情绪型）
- `git init` + 首次提交

**重判结果：原表「爆文分类」列已弃用**

原分类 5 个值中 4 个（图表对比 / 实拍对比 / 多字图表干货 / 单张图表对比）描述的是**配图形式**，不是文风。真正的文风信号在「正文结构」列。按内容重判后得到 9 个 voice：

| voice | 样本 | | voice | 样本 |
|---|---|---|---|---|
| structured-guide | 7 | | head-to-head | 3 |
| persona-match-review | 5 | | first-person-journey | 3 |
| hardcore-review | 5 | | meme-remix | 3 |
| nanny-guide | 5 | | first-principles | 1 |
| conflict-story | 4 | | | |

**新发现**

1. **模板 22（原「偏UGC内容」8 篇）确认是杂物抽屉**，已拆成 conflict-story(3) + meme-remix(3) + first-person-journey(1) + 另1篇。这 8 篇原本零标注，现已全部覆盖。
2. **新增第四个维度 `body_carries`**（正文自足 27 / 依赖图 9）。`image-dependent` 是 nanny-guide 拿高收藏的核心手法：正文压到 300 字只留钩子和产品结论，干货全推到图上（样本 019/022/025）。这个维度原表完全没有，但它直接决定配图要生成多少内容。
3. **placement 分布 hard 18 / soft 10 / medium 8**——硬植入占一半。合理性待转化数据验证，数据到位前不设默认值。
4. **`first-principles` 只有 1 个样本**（行3 马斯克第一性原理），规格置信度低，已在 index 标注。它是唯一一篇几乎不带货却建立专业权威的，值得补样本。
5. **行 8「买充电桩怕踩雷」正文疑似截断**（仅 210 字，末尾无收束），已打 `quality_flag`，不要当模板。

**未验证**

- 9 个 voice 的切分粒度是否合适，尤其 `structured-guide`(7) 是否该再拆
- 两份文风规格的格式是否够用——待用户确认后再产出剩余 7 份

**下一步**

1. 用户确认文风规格格式 → 补齐剩余 7 份
2. `references/workflows/new-post.md` + `rewrite.md`
3. `xhs-post/SKILL.md` 主体
4. `scripts/validate_post.py` + `install.ps1`

**GitHub 状态**

本地仓库已建（`xhs-skill/`，独立于 `app/`），首次提交完成。**远程未建**：本会话无 GitHub 连接器、无 `gh` CLI，无法代建仓库。系统级 Git Credential Manager 可用，用户手动建空仓后 `git push` 会弹浏览器授权。

---

## 2026-08-18 · 打地基

**做了什么**

- 建立目录骨架：`xhs-post/`（调度 skill）+ `vendor/`（外部画风 skill）+ `data/`（语料）
- `xhs-post/scripts/ingest_notes.py`：把 `xhs_examples.xlsx` 转成 `data/templates.json` + 36 份单篇 txt。新增参考笔记时重跑，不要手改 json
- `xhs-post/styles.registry.json`：画风注册表（适配层）
- `xhs-post/schemas/post-spec.schema.json`：调度器与画风 skill 之间的交接契约

**关键决策与理由**

1. **三条正交轴：叙事骨架(voice) / 配图形式(art_style) / 植入强度(placement)。**
   原 xlsx 的「爆文分类」列（图表对比、实拍对比、多字图表干货、单张图表对比、经验分享）其中 4/5 描述的是配图形式而非文风，文风信号实际藏在「正文结构」列。混轴的后果是每加一个画风就要重写一遍文风文档。
   `placement` 是新增轴，原表没有——读全文发现同一文风下植入强度差异极大（`骂醒一个算一个` 软植入 361 字 vs `我和师傅都沉默了` 竞品并列硬植入 1055 字），且这条轴最可能直接影响转化率。

2. **post-spec 作为唯一交接契约。** 调度器只负责产出合格 post-spec，画风 skill 只负责消费。两侧独立演进，这是「能持续迭代」这个需求的技术前提。

3. **vendor 目录方案，画风 skill 一律不装进 skills 目录。**
   guizang 上游 description 含触发词「做一套小红书图文」，装进 `~/.codex/skills/` 会直接抢走调度权且**静默失败**（文风选择、合规自查全部跳过，不报错）。vendor 方案同时解决路径可移植问题（Claude 用 `~/.claude/skills/`，Codex 用 `~/.codex/skills/`）。

4. **registry 区分 `render_mode`。** 两个示例画风分属不同技术路线：guizang 是 HTML/CSS 模板截图（文字 CSS 渲染，像素级精确），zine 是 prompt 生图（文字模型绘制，不保证准确）。post-spec 的 `images[]` 因此需要按 mode 分别填 `content` 或 `prompt`+`text_on_image`。新增画风若引入新 mode，只改 registry。

**已验证 / 未验证**

- ✅ ingest 脚本跑通，36 篇全部提取
- ✅ Codex 支持 SKILL.md（`~/.codex/skills/`，`$name` 调用），已联网核实
- ❌ 未验证：Codex 实际读取的 skills 路径（部分来源提到 `~/.agents/skills/`）。装第一个 skill 时用 `codex --print-instructions` 确认
- ❌ 未验证：guizang 的 node 依赖在 Codex 环境能否跑通
- ❌ 未验证：GPT Image 2 的中文渲染实测效果（用户口头确认良好，未跑样本）

**数据问题（待处理）**

- 第 31–38 行（模板编号 22，8 篇）无「正文结构」「图片」「互动量」标注。且模板 22 是杂物抽屉：辟谣、维权、玩梗三种骨架混用一个编号，需拆分
- 模板编号 3 出现两次，挂了两个不同分类（经验分享 / 图表对比），需按内容重判
- 编号不连续（缺 2/5/8/10/17/19/20），说明当前爆文库是子集

**下一步**

1. 读全部 36 篇正文，产出 `references/voices/` 下的文风规格 + `_index.md` 选择矩阵
2. 写 `references/workflows/new-post.md` 与 `rewrite.md`（两条流程逻辑不同，需分开）
3. 写 `xhs-post/SKILL.md` 主体
4. `scripts/validate_post.py` + `install.ps1`（部署到 Codex / Claude 两侧）

**待用户确认**

- 转化率数据（uuid 追踪的搜索/进店）目前不在表内。拿到哪怕 10 篇的转化数据，对文风排序的价值远超再补 40 篇笔记。已在 schema 预留 `conversion` 字段等回填
