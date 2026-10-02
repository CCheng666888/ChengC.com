// Note to Site 纯函数冒烟测试（与 main.ts 中实现逐字一致）
import assert from "node:assert/strict";

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripMarkdown(s) {
  return s
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/[*_~>#|]/g, "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function estimateReadingTime(text) {
  const cjk = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
  const words = (text.replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, " ").match(/[A-Za-z0-9]+/g) || []).length;
  return Math.max(1, Math.round((cjk + words) / 400));
}

function extractLead(content, maxChars) {
  const lines = content.split(/\r?\n/);
  const paragraphs = [];
  let buffer = [];
  let inCode = false;

  for (const line of lines) {
    const t = line.trim();
    if (/^```/.test(t)) { inCode = !inCode; continue; }
    if (inCode) continue;
    if (!t) { if (buffer.length) { paragraphs.push(buffer.join(" ")); buffer = []; } continue; }
    if (/^#{1,6}\s/.test(t)) continue;
    if (/^[-*+]\s/.test(t)) continue;
    if (/^\d+[.、)]\s/.test(t)) continue;
    if (/^>\s?/.test(t)) continue;
    if (/^---$/.test(t)) continue;
    buffer.push(t);
  }
  if (buffer.length) paragraphs.push(buffer.join(" "));

  // 只取第一个自然段；仅当它过短（<30 字）时才继续补充下一段
  let lead = "";
  for (const p of paragraphs) {
    const clean = stripMarkdown(p);
    if (!clean) continue;
    if (!lead) { lead = clean; continue; }
    if (lead.length >= 30 || lead.length + clean.length > maxChars) break;
    lead = `${lead} ${clean}`;
  }

  if (lead.length > maxChars) {
    const cut = lead.slice(0, maxChars);
    const lastPunct = Math.max(
      cut.lastIndexOf("。"), cut.lastIndexOf("！"), cut.lastIndexOf("？"),
      cut.lastIndexOf("."), cut.lastIndexOf("!")
    );
    lead = lastPunct > maxChars * 0.4
      ? cut.slice(0, lastPunct + 1)
      : cut.replace(/[，、,;；\s]+$/, "") + "……";
  }
  return lead || "（暂无摘要：笔记正文似乎为空）";
}

function slugify(title) {
  return title
    .trim()
    .replace(/[\\/:*?"<>|#^[\]{}]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const MINDMAP_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

function collectHeadingsWithLevel(text) {
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^(#{2,3})\s+(.*)$/);
    if (m && m[2].trim()) { const clean = stripMarkdown(m[2].trim()); if (clean) out.push({ level: m[1].length === 2 ? 2 : 3, text: clean }); }
  }
  return out;
}

function buildMindTree(title, headings) {
  const root = { label: title, children: [] };
  let current = null;
  for (const h of headings) {
    if (h.level === 2) { current = { label: h.text, children: [] }; root.children.push(current); }
    else if (h.level === 3) { (current ?? root).children.push({ label: h.text, children: [] }); }
  }
  return root;
}

function renderMindTree(tree, depth = 0, colorIndex = 0) {
  const isRoot = depth === 0;
  const cls = isRoot ? "mm-root" : depth === 1 ? "mm-l1" : "mm-l2";
  const color = isRoot ? "#111827" : MINDMAP_COLORS[colorIndex % MINDMAP_COLORS.length];
  const liStyle = depth <= 1 ? ` style="--mmc:${color}"` : "";
  const children = tree.children.length
    ? "\n        <ul>" + tree.children.map((c, i) => renderMindTree(c, depth + 1, depth === 0 ? i : 0)).join("") + "\n        </ul>"
    : "";
  return `\n          <li${liStyle}><div class="mm-node ${cls}">${escapeHtml(tree.label)}</div>${children}</li>`;
}

function parseFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return null;
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([^:#\s][^:]*):\s*(.*)$/);
    if (kv) data[kv[1].trim()] = kv[2].trim();
  }
  return { data, rest: content.slice(m[0].length) };
}

// ---- 样例笔记 ----
const note = `---
title: WSL 使用备忘
date: 2026-09-20
tags: [linux, wsl]
category: 学习
---

第一次用 Linux 终端的人，最怕的就是“不知道敲什么”。这篇文章把最常用的文件操作命令按**查、增、改、删**四类整理成速查表，命令、作用一眼就能对应上。

## 查（看文件）

- \`pwd\` 显示当前在哪个文件夹
- \`ls\` 列出内容

## 增（新建）

\`\`\`bash
mkdir -p a/b/c
\`\`\`

> 引用内容不应该进入导语。

## 删（删除）

\`rm -rf\` 很危险，不要乱用。`;

// ---- 断言 ----
const fm = parseFrontmatter(note);
assert.ok(fm, "frontmatter 解析应成功");
assert.equal(fm.data.title, "WSL 使用备忘");
assert.equal(fm.data.category, "学习");
assert.ok(!fm.rest.startsWith("---"), "rest 不应再含 frontmatter");

const lead = extractLead(fm.rest, 120);
assert.equal(
  lead,
  "第一次用 Linux 终端的人，最怕的就是“不知道敲什么”。这篇文章把最常用的文件操作命令按查、增、改、删四类整理成速查表，命令、作用一眼就能对应上。",
  "导语应取第一个自然段并清理加粗语法"
);
assert.ok(!lead.includes("**"), "导语不应含 markdown 加粗符号");

const headings = collectHeadingsWithLevel(fm.rest);
assert.deepEqual(headings.map(h => h.text), ["查（看文件）", "增（新建）", "删（删除）"], "大纲应收集全部 H2");

// ---- 思维导图 ----
const tree = buildMindTree("WSL 使用备忘", headings);
assert.equal(tree.label, "WSL 使用备忘");
assert.equal(tree.children.length, 3, "三个 H2 应成为三个一级分支");
assert.equal(tree.children[0].label, "查（看文件）");
assert.deepEqual(tree.children[1].children, [], "无 H3 时二级分支应为空");

const treeWithSub = buildMindTree("标题", [
  { level: 2, text: "A" },
  { level: 3, text: "A1" },
  { level: 3, text: "A2" },
  { level: 2, text: "B" },
  { level: 3, text: "B1" },
]);
assert.deepEqual(treeWithSub.children.map(c => c.label), ["A", "B"]);
assert.deepEqual(treeWithSub.children[0].children.map(c => c.label), ["A1", "A2"], "H3 应挂在最近的前置 H2 下");
assert.deepEqual(treeWithSub.children[1].children.map(c => c.label), ["B1"]);

const html = renderMindTree(tree, 0, 0);
assert.ok(html.includes('class="mm-node mm-root"'), "根节点应有 mm-root 类");
assert.match(html, /class="mm-node mm-l1"/g, "一级分支应有 mm-l1 类");
assert.equal((html.match(/style="--mmc:/g) || []).length, 4, "根与三个一级分支都应带 --mmc 颜色");
assert.ok(!html.includes("mm-l2"), "无 H3 时不应出现二级节点");

const htmlColorful = renderMindTree(treeWithSub, 0, 0);
assert.equal((htmlColorful.match(/style="--mmc:#[0-9a-f]{6}"/g) || []).length, 3, "根 + 两个一级分支各有一个颜色");
assert.ok(htmlColorful.includes('class="mm-node mm-l2"'), "有 H3 时应出现二级节点");
assert.ok(/<li><div class="mm-node mm-l2">/.test(htmlColorful), "二级 li 不应自带颜色（应继承父级 --mmc）");
assert.match(htmlColorful, /A1/, "二级分支应包含 H3 文本");

const minutes = estimateReadingTime(fm.rest);
assert.ok(minutes >= 1 && minutes <= 10, `阅读时长应合理，得到 ${minutes}`);

assert.equal(slugify("Linux 命令速查：增删查改"), "Linux-命令速查：增删查改");
assert.equal(slugify("Hello World!"), "Hello-World!");

// 超长导语截断
const long = extractLead("这是一段非常非常长没有标点符号的文字".repeat(20), 120);
assert.ok(long.endsWith("……"), "无句子边界时应以省略号结尾");
const punct = extractLead("第一句完整结束。第二句也很完整。第三句开始被截断的内容继续继续", 30);
assert.ok(punct.endsWith("。"), "有句子边界时应在句号处截断");

// 空正文兜底
assert.ok(extractLead("", 120).includes("暂无摘要"));

console.log("全部断言通过 ✔");
console.log("样例导语：", lead);
console.log("阅读时长：", minutes, "分钟");
