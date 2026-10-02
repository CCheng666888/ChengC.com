// 生成思维导图演示页（与 main.ts 同款函数与样式，逐字一致）
import { readFileSync, writeFileSync } from "node:fs";

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const MINDMAP_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

const MINDMAP_CSS = `
.mm-wrap{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px 12px;overflow-x:auto;margin:16px 0}
.mm-tree,.mm-tree ul,.mm-tree li{margin:0;padding:0;list-style:none}
.mm-tree ul{padding-top:16px;position:relative;display:flex;justify-content:flex-start;align-items:flex-start;min-width:max-content}
.mm-tree li{position:relative;padding:16px 8px 0;text-align:center;min-width:0}
.mm-tree li::before,.mm-tree li::after{content:"";position:absolute;top:0;height:16px;width:50%;border-top:2px solid #cbd5e1}
.mm-tree li::before{right:50%}
.mm-tree li::after{left:50%;border-left:2px solid #cbd5e1}
.mm-tree li:only-child::before,.mm-tree li:only-child::after{display:none}
.mm-tree li:only-child{padding-top:0}
.mm-tree li:first-child::before,.mm-tree li:last-child::after{border:0 none}
.mm-tree li:last-child::before{border-right:2px solid #cbd5e1;border-radius:0 6px 0 0}
.mm-tree li:first-child::after{border-radius:6px 0 0 0}
.mm-tree ul ul::before{content:"";position:absolute;top:0;left:50%;width:0;height:16px;border-left:2px solid #cbd5e1}
.mm-tree .mm-node{display:inline-block;border:2px solid var(--mmc,#3b82f6);border-radius:8px;padding:5px 12px;font-size:13px;line-height:1.45;background:#fff;color:var(--mmc,#3b82f6);font-weight:600;max-width:230px;word-break:break-word;vertical-align:top}
.mm-tree .mm-root{background:var(--mmc,#111827);border-color:var(--mmc,#111827);color:#fff;font-size:15px;font-weight:700}
.mm-tree .mm-l2{border-width:1.5px;font-weight:500;opacity:.92;font-size:12.5px}
`;

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

// ---- 模拟一篇笔记的标题结构 ----
const headings = [
  { level: 2, text: "查（看文件）" },
  { level: 2, text: "增（新建）" },
  { level: 2, text: "改（编辑）" },
  { level: 3, text: "nano 用法" },
  { level: 3, text: "vi 用法" },
  { level: 2, text: "删（删除）" },
  { level: 2, text: "实用技巧" },
  { level: 3, text: "--help 与 man" },
];
const tree = buildMindTree("WSL 使用备忘", headings);
const mindmapHtml =
  `        <h2>本文思维导图</h2>\n` +
  `        <div class="mm-wrap">\n          <div class="mm-tree">\n` +
  `            <ul>${renderMindTree(tree)}\n            </ul>\n          </div>\n        </div>`;

// ---- 组装文章页面（内联网站 CSS 以保证渲染一致） ----
const siteCss = readFileSync("D:\\编译\\C.txt\\ChengC.com\\css\\style.css", "utf8");
const outlineHtml = `        <h2>文章大纲</h2>\n        <ul>\n${headings.map(h => `          <li>${escapeHtml(h.text)}</li>`).join("\n")}\n        </ul>`;

const html = `<!DOCTYPE html>
<html lang="zh-CN" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>WSL 使用备忘 · ChengC（思维导图演示）</title>
  <meta name="description" content="思维导图渲染演示页">
  <meta name="theme-color" content="#090910">
  <style>${siteCss}</style>
  <style>${MINDMAP_CSS}</style>
</head>
<body class="article-page">
  <header class="site-header">
    <nav class="nav-shell" aria-label="文章导航">
      <a class="brand" href="../index.html">ChengC</a>
      <div class="article-nav"><a href="../index.html#blog">← 返回博客</a><button id="articleTheme" class="theme-btn" type="button" aria-label="切换主题"><svg class="sun-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-width="2" d="M12 3v2m0 14v2M3 12h2m14 0h2M6 6l1.5 1.5m9 9L18 18m0-12-1.5 1.5m-9 9L6 18M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"/></svg><svg class="moon-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-width="2" d="M20 15.5A9 9 0 0 1 8.5 4 9 9 0 1 0 20 15.5z"/></svg></button></div>
    </nav>
  </header>
  <main class="article-shell">
    <article>
      <header class="article-header">
        <a class="article-category" href="../index.html#blog">学习</a>
        <h1>WSL 使用备忘</h1>
        <p class="article-lead">第一次用 Linux 终端的人，最怕的就是“不知道敲什么”。这篇文章把最常用的文件操作命令按查、增、改、删四类整理成速查表，命令、作用一眼就能对应上。</p>
        <div class="article-meta"><time datetime="2026-09-20">2026 年 9 月 20 日</time><span>约 5 分钟阅读</span></div>
      </header>
      <div class="article-body">
        <p>正文段落（省略具体命令表格，仅作排版演示）。</p>
${outlineHtml}
${mindmapHtml}
      </div>
      <footer class="article-footer"><a class="button secondary" href="../index.html#blog">← 返回博客列表</a><a class="button primary" href="../index.html#journal">看看最近动态</a></footer>
    </article>
  </main>
  <script>
    const saved=localStorage.getItem('theme');
    const apply=t=>{document.documentElement.classList.toggle('light',t==='light');document.documentElement.classList.toggle('dark',t!=='light')};
    apply(saved||(matchMedia('(prefers-color-scheme:light)').matches?'light':'dark'));
    document.getElementById('articleTheme').addEventListener('click',()=>{const next=document.documentElement.classList.contains('dark')?'light':'dark';apply(next);localStorage.setItem('theme',next)});
  </script>
</body>
</html>`;

writeFileSync("D:\\编译\\C.txt\\ChengC.com\\obsidian-note-to-site\\demo-mindmap.html", html, "utf8");
console.log("demo-mindmap.html 已生成，长度：", html.length);
