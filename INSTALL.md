# Skill 安装与查询

## 你本机的实际状态（2026-08-19 实测）

| 位置 | 用途 | 现状 |
|---|---|---|
| `C:\Users\gin_\.codex\skills\` | **Codex 个人级** | ✅ 存在，装了 `img2threejs` |
| `C:\Users\gin_\.claude\skills\` | **Claude Code 个人级** | ❌ 不存在（没装过任何个人 skill） |
| `<项目>\.codex\skills\` | Codex 项目级 | 未使用 |
| `<项目>\.claude\skills\` | Claude Code 项目级 | 未使用 |
| `%APPDATA%\Claude\local-agent-mode-sessions\skills-plugin\<uuid>\<uuid>\skills\` | 应用内置 | 10 个 anthropic-skills，**应用托管，勿手改**，更新会被覆盖 |
| `C:\Users\gin_\.agents\skills\` | 跨工具约定路径 | 存在但为空 |

**优先级**：项目级 > 个人级。同名时项目级覆盖个人级。

## 怎么查

```bash
ls ~/.codex/skills ~/.claude/skills
ls .codex/skills .claude/skills          # 项目级
```

Codex 侧确认实际加载了什么：

```bash
codex --print-instructions
```

（该命令 dump 的是合并后的 AGENTS.md；skills 是否列出取决于版本，以 `ls` 为准。）

---

## 从 GitHub 手动安装

### 步骤

**1. 先看仓库结构，确认 SKILL.md 在哪一级**

这是最容易出错的地方。三种常见布局：

```
A. SKILL.md 在仓库根           →  整个仓库就是一个 skill
   guizang-social-card-skill/
   ├── SKILL.md  ← 在这
   ├── assets/
   └── references/

B. SKILL.md 在 skills/ 子目录  →  一个仓库含多个 skill
   gathered-scenes-zine-skill/
   ├── README.md
   └── skills/
       ├── scenes-gathered-zine-v1-3/SKILL.md      ← 装这一级
       └── scene-distillation-zine-v1-3/SKILL.md   ← 和这一级

C. 混合                        →  按 SKILL.md 所在目录为准
```

**规则：拷贝「含 SKILL.md 的那个目录」本身，不是它的父目录，也不是它的内容。**

**2. clone**

```bash
git clone --depth 1 https://github.com/<owner>/<repo>.git
```

**3. 先读，再装**

```bash
cat <repo>/SKILL.md
ls <repo>/scripts/
```

⚠️ **skill 是喂给 agent 的指令集。装来路不明的 skill = 让陌生人替你写 agent 的指令。** 至少扫一遍 SKILL.md 和 scripts/，重点看有没有网络请求、文件删除、凭据读取。

**4. 拷到目标目录**

```bash
# Codex 个人级
cp -R <repo> ~/.codex/skills/<skill-name>

# Claude Code 个人级（目录不存在就先建）
mkdir -p ~/.claude/skills && cp -R <repo> ~/.claude/skills/<skill-name>

# 项目级（能随 git 走给同事）
mkdir -p .codex/skills && cp -R <repo> .codex/skills/<skill-name>
```

**5. 装依赖**

看仓库根有没有 `package.json` / `requirements.txt`：

```bash
cd ~/.codex/skills/<skill-name> && npm install
# 或
python -m pip install -r requirements.txt
```

**6. 验证**

开新会话，用 `$<skill-name>` 显式调用，或说一句该 skill description 里的触发词。

### 一键安装（多数仓库支持）

```bash
npx skills add https://github.com/<owner>/<repo>
```

多 skill 仓库指定其一：

```bash
npx skills add https://github.com/<owner>/<repo> --skill <skill-name>
```

装完仍然建议按第 3 步读一遍。

---

## ⚠️ 本项目的例外：外部画风 skill 一律不装进 skills 目录

`vendor/` 下的 guizang 等**不要**按上面的流程装。原因见 `xhs-post/styles.registry.json` 的 `$comment_auto_trigger`：

guizang 的 description 含触发词「做一套小红书图文」，装进 `~/.codex/skills/` 会**静默抢走调度权**——照样出图，但文风选择、卖点决策、合规自查全部跳过且不报错。

正确做法：`git clone` 到 `vendor/`，由 `xhs-post` 按路径读取。

```bash
cd xhs-skill/vendor && git clone --depth 1 https://github.com/op7418/guizang-social-card-skill.git
```

需要装的只有 `xhs-post` 本身：

```bash
cp -R xhs-skill/xhs-post ~/.codex/skills/xhs-post
```

---

## 依赖说明

分支②（模板渲染出图）需要 playwright。**装在本项目根，不装在 vendor 里**——上游 `git pull` 不会影响渲染，vendor 的 node_modules 被清也不影响。

```bash
cd xhs-skill && npm install && npx playwright install chromium
```

首次会下载约 150MB 的 Chromium。
