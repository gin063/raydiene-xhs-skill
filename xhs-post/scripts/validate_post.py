#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""交付前自动检查。只查能机器判定的项，人工项见 references/compliance.md 第 9 节。

用法: python validate_post.py <post-spec.json 或 交付的 .md>
退出码: 0 全过 / 1 有 FAIL
"""
import json
import re
import sys
from pathlib import Path

# --- compliance.md 第 1 节 ---
BANNED_SUPERLATIVE = ["最好", "最佳", "最强", "最高", "最优", "蕞", "第一品牌", "唯一",
                      "领先", "顶尖", "极致", "王者", "全球首款", "天花板"]
BANNED_TRAFFIC = ["618"]
BANNED_AGGRESSIVE = {"智商税": "冤枉钱 / 品牌溢价", "杂牌": "冷门小众 / 没认证",
                     "割韭菜": "后期一直收费", "傻": "花冤枉钱"}
# 误报豁免：这些不是极限词
EXEMPT = ["最大负载", "第一台", "第一行", "第一步", "最后", "最新"]

# --- compliance.md 第 6 节：脱敏。型号名不脱敏 ---
BRAND_RAW = {"雷迪恩": "雷*恩", "公牛": "*牛", "挚达": "*达",
             "理想": "*想", "小米": "*米", "特斯拉": "特*拉", "比亚迪": "比*迪"}

# --- compliance.md 第 4 节：不暴露降配 ---
LEAK_PATTERNS = [
    (r"4000\s*V.{0,12}(公牛|\*牛)|(公牛|\*牛).{0,12}4000\s*V", "*牛介质耐压只写终值 2500V"),
    (r"224\s*[kK]", "雷*恩运行内存只写终值 144K"),
    (r"(80\s*个?\s*(?:→|->)\s*53|I\s*/\s*O\s*[:：])", "雷*恩 I/O 不单列"),
]

# --- compliance.md 第 5 节：监管口径 ---
REGULATION = [
    (r"GB\s*39752.{0,20}2024\s*年?\s*8\s*月\s*1", "GB39752 是 2024-07-24 发布 / 2025-08-01 实施，别混"),
    (r"2026\s*年?\s*8\s*月.{0,10}(不许|不能|禁止)\s*使用(?!.{0,6}经营)",
     "3C 强制限的是出厂/销售/进口/经营性使用，家用自用不在其列"),
]


def check_text(text, where, issues):
    for w in BANNED_SUPERLATIVE:
        for m in re.finditer(re.escape(w), text):
            ctx = text[max(0, m.start() - 4):m.end() + 4]
            if any(e in ctx for e in EXEMPT):
                continue
            issues.append(("FAIL", where, f"极限词「{w}」— 上下文：…{ctx}…"))
    for w in BANNED_TRAFFIC:
        if w in text:
            issues.append(("FAIL", where, f"限流词「{w}」— 注意也检查配图素材内"))
    for w, alt in BANNED_AGGRESSIVE.items():
        if w in text:
            issues.append(("FAIL", where, f"攻击性词「{w}」→ 改为：{alt}"))
    for raw, masked in BRAND_RAW.items():
        if re.search(raw, text):
            issues.append(("FAIL", where, f"品牌未脱敏「{raw}」→ 应为「{masked}」（型号名不脱敏）"))
    for pat, msg in LEAK_PATTERNS:
        if re.search(pat, text):
            issues.append(("FAIL", where, f"降配泄露 — {msg}"))
    for pat, msg in REGULATION:
        if re.search(pat, text):
            issues.append(("FAIL", where, f"监管口径 — {msg}"))


def check_spec(spec, issues):
    copy = spec.get("copy", {})
    title = copy.get("title", "")
    if len(title) >= 20:
        issues.append(("FAIL", "copy.title", f"标题 {len(title)} 字，必须 < 20"))

    # caption 含换行与话题标签，按字符计
    body = copy.get("body", "")
    tags = " ".join(copy.get("tags", []))
    n = len(body) + len(tags) + 1
    if n > 1000:
        issues.append(("FAIL", "copy", f"caption {n} 字符（含标签换行），上限 1000"))
    elif n > 850:
        issues.append(("WARN", "copy", f"caption {n} 字符，超过 850 的余量目标"))

    check_text(body + " " + title + " " + tags, "copy", issues)

    axes = spec.get("axes", {})
    if not axes.get("rationale"):
        issues.append(("FAIL", "axes.rationale", "决策理由为空 — 转化数据回流时无法归因"))

    for i, img in enumerate(spec.get("images", [])):
        w = f"images[{i}]"
        mode = img.get("render_mode")
        if mode == "image-gen":
            if not img.get("prompt"):
                issues.append(("FAIL", w, "image-gen 模式缺 prompt"))
            if not img.get("text_on_image"):
                issues.append(("FAIL", w, "image-gen 模式缺 text_on_image — 生图会写错字，这是核对依据"))
        elif mode == "photo-real":
            if not img.get("production_notes"):
                issues.append(("FAIL", w, "photo-real 模式缺 production_notes（制作指导）"))
            if not img.get("text_on_image"):
                issues.append(("FAIL", w, "photo-real 模式缺 text_on_image — 实拍图不出 prompt，但图上文本仍需产出"))
            if img.get("prompt"):
                issues.append(("WARN", w, "photo-real 不应出 prompt"))
        elif mode == "html-screenshot":
            if not img.get("content"):
                issues.append(("FAIL", w, "html-screenshot 模式缺 content"))

        txt = " ".join(img.get("text_on_image", []) or [])
        if len(txt) > 80:
            issues.append(("WARN", w, f"单图中文 {len(txt)} 字，>80 建议拆图"))
        check_text(txt + " " + str(img.get("prompt") or ""), w, issues)


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    p = Path(sys.argv[1])
    issues = []
    if p.suffix == ".json":
        check_spec(json.loads(p.read_text(encoding="utf-8")), issues)
    else:
        check_text(p.read_text(encoding="utf-8"), p.name, issues)
        if not p.name.isascii():
            issues.append(("FAIL", p.name, "文件名含非 ASCII 字符，前端会加载失败"))

    fails = [i for i in issues if i[0] == "FAIL"]
    for lvl, where, msg in issues:
        print(f"[{lvl}] {where}: {msg}")
    if not issues:
        print("自动检查全部通过。")
    print(f"\n{len(fails)} FAIL / {len(issues) - len(fails)} WARN")
    print("人工项仍需逐条过 references/compliance.md 第 9 节清单。")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
