# CHANGELOG — 小红书图文生成 skill

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
