import {
  App,
  MarkdownRenderer,
  MarkdownView,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  moment,
  normalizePath,
  requestUrl,
} from "obsidian";

/* ============================================================
 * Note to Site（笔记转网站文章）
 * 作者：ChenC
 * 把当前笔记总结成可直接发布到个人网站（ChengC.com 风格）
 * 的文章 HTML 页面：导语 + 正文 + 大纲 + 阅读时长 + 彩色思维导图。
 * 支持本地提取与可选 AI 摘要（OpenAI 兼容接口）。
 * ============================================================ */

/* ---------------- 设置类型与默认值 ---------------- */

interface NoteToSiteSettings {
  defaultCategory: string;   // 默认分类（可被 frontmatter category 覆盖）
  leadMaxChars: number;      // 本地提取导语的最大字符数
  includeOutline: boolean;   // 正文末尾是否追加 H2/H3 大纲
  includeMindMap: boolean;   // 正文末尾是否追加彩色思维导图
  outputFolder: string;      // “保存到笔记库”时的输出文件夹
  siteName: string;          // 站点名（顶栏 brand 与底部版权）
  homeHref: string;          // 返回首页的链接（posts 内文章通常为 ../index.html）
  cssPath: string;           // 文章页引用的样式表
  titleSuffix: string;       // <title> 后缀，如 " · ChengC"
  aiEnabled: boolean;        // 是否启用 AI 摘要
  aiBaseUrl: string;         // OpenAI 兼容接口地址
  aiApiKey: string;          // API Key（本地 Ollama 可留空）
  aiModel: string;           // 模型名
  aiPrompt: string;          // 提示词模板，支持 {{title}} 与 {{content}}
}

const DEFAULT_SETTINGS: NoteToSiteSettings = {
  defaultCategory: "学习",
  leadMaxChars: 120,
  includeOutline: true,
  includeMindMap: true,
  outputFolder: "网站输出",
  siteName: "ChengC",
  homeHref: "../index.html",
  cssPath: "../css/style.css",
  titleSuffix: " · ChengC",
  aiEnabled: false,
  aiBaseUrl: "https://api.openai.com/v1",
  aiApiKey: "",
  aiModel: "gpt-4o-mini",
  aiPrompt: [
    "你是一位个人网站编辑。请为下面的笔记写 1~3 句导语（文章摘要），它会直接放在文章开头。",
    "要求：",
    "1. 用自然、口语化的中文直接总结内容，不要出现“本文”“这篇文章”“以下”“首先”等套话；",
    "2. 长度控制在 80~120 字；",
    "3. 只输出导语本身，不要任何前缀、标题或解释。",
    "",
    "笔记标题：{{title}}",
    "",
    "笔记内容：",
    "{{content}}",
  ].join("\n"),
};

/* ---------------- 思维导图常量 ---------------- */

/** 一级分支的配色（按 H2 顺序循环取色） */
const MINDMAP_COLORS = [
  "#3b82f6", // 蓝
  "#ef4444", // 红
  "#22c55e", // 绿
  "#f59e0b", // 琥珀
  "#8b5cf6", // 紫
  "#ec4899", // 粉
  "#06b6d4", // 青
  "#f97316", // 橙
];

/** 思维导图自带样式（自包含，不依赖网站 CSS，明暗主题下都用白底卡片保证配色可读） */
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

interface MindNode {
  label: string;
  children: MindNode[];
}

/* ---------------- 纯函数工具 ---------------- */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** 去掉常见 Markdown 语法，得到纯文本 */
function stripMarkdown(s: string): string {
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

/** 估算阅读时长（中文按字、英文按词，合计约 400 字/分钟） */
function estimateReadingTime(text: string): number {
  const cjk = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
  const words = (text.replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, " ").match(/[A-Za-z0-9]+/g) || []).length;
  return Math.max(1, Math.round((cjk + words) / 400));
}

/** 从正文中提取导语：取第一个自然段；段落过短时再补充后续段落，最后按句子边界截断 */
function extractLead(content: string, maxChars: number): string {
  const lines = content.split(/\r?\n/);
  const paragraphs: string[] = [];
  let buffer: string[] = [];
  let inCode = false;

  for (const line of lines) {
    const t = line.trim();
    if (/^```/.test(t)) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    if (!t) {
      if (buffer.length) {
        paragraphs.push(buffer.join(" "));
        buffer = [];
      }
      continue;
    }
    if (/^#{1,6}\s/.test(t)) continue; // 跳过标题
    if (/^[-*+]\s/.test(t)) continue;  // 跳过列表
    if (/^\d+[.、)]\s/.test(t)) continue;
    if (/^>\s?/.test(t)) continue;     // 跳过引用
    if (/^---$/.test(t)) continue;     // 跳过分隔线
    buffer.push(t);
  }
  if (buffer.length) paragraphs.push(buffer.join(" "));

  // 只取第一个自然段；仅当它过短（<30 字）时才继续补充下一段
  let lead = "";
  for (const p of paragraphs) {
    const clean = stripMarkdown(p);
    if (!clean) continue;
    if (!lead) {
      lead = clean;
      continue;
    }
    if (lead.length >= 30 || lead.length + clean.length > maxChars) break;
    lead = `${lead} ${clean}`;
  }

  if (lead.length > maxChars) {
    const cut = lead.slice(0, maxChars);
    const lastPunct = Math.max(
      cut.lastIndexOf("。"),
      cut.lastIndexOf("！"),
      cut.lastIndexOf("？"),
      cut.lastIndexOf("."),
      cut.lastIndexOf("!")
    );
    lead =
      lastPunct > maxChars * 0.4
        ? cut.slice(0, lastPunct + 1)
        : cut.replace(/[，、,;；\s]+$/, "") + "……";
  }

  return lead || "（暂无摘要：笔记正文似乎为空）";
}

/** 把标题转成安全的文件名 */
function slugify(title: string): string {
  return title
    .trim()
    .replace(/[\\/:*?"<>|#^[\]{}]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** 收集 Markdown 文本中的 H2/H3 标题（含层级），供大纲与思维导图使用 */
function collectHeadingsWithLevel(text: string): { level: 2 | 3; text: string }[] {
  const out: { level: 2 | 3; text: string }[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^(#{2,3})\s+(.*)$/);
    if (m && m[2].trim()) {
      const clean = stripMarkdown(m[2].trim());
      if (clean) out.push({ level: m[1].length === 2 ? 2 : 3, text: clean });
    }
  }
  return out;
}

/** 由标题序列构建思维导图树：根 = 文章标题，H2 为一级分支，H3 挂在最近的前置 H2 下 */
function buildMindTree(title: string, headings: { level: 2 | 3; text: string }[]): MindNode {
  const root: MindNode = { label: title, children: [] };
  let current: MindNode | null = null;
  for (const h of headings) {
    if (h.level === 2) {
      current = { label: h.text, children: [] };
      root.children.push(current);
    } else if (h.level === 3) {
      (current ?? root).children.push({ label: h.text, children: [] });
    }
  }
  return root;
}

/** 把思维导图树渲染成 HTML（根节点深色，一级分支按调色板循环取色，二级继承父分支色） */
function renderMindTree(tree: MindNode, depth = 0, colorIndex = 0): string {
  const isRoot = depth === 0;
  const cls = isRoot ? "mm-root" : depth === 1 ? "mm-l1" : "mm-l2";
  const color = isRoot ? "#111827" : MINDMAP_COLORS[colorIndex % MINDMAP_COLORS.length];
  const liStyle = depth <= 1 ? ` style="--mmc:${color}"` : "";
  const children = tree.children.length
    ? "\n        <ul>" +
      tree.children.map((c, i) => renderMindTree(c, depth + 1, depth === 0 ? i : 0)).join("") +
      "\n        </ul>"
    : "";
  return `\n          <li${liStyle}><div class="mm-node ${cls}">${escapeHtml(tree.label)}</div>${children}</li>`;
}

/** 简易 frontmatter 解析（供缓存未就绪时兜底） */
function parseFrontmatter(content: string): { data: Record<string, unknown>; rest: string } | null {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return null;
  const data: Record<string, unknown> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([^:#\s][^:]*):\s*(.*)$/);
    if (kv) data[kv[1].trim()] = kv[2].trim();
  }
  return { data, rest: content.slice(m[0].length) };
}

function toTags(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  return String(raw)
    .split(/[\s,，]+/)
    .filter(Boolean);
}

/* ---------------- 预览弹窗 ---------------- */

class ArticlePreviewModal extends Modal {
  constructor(
    app: App,
    private html: string,
    private onSave: () => Promise<void>
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.addClass("note-to-site-modal");
    contentEl.createEl("h3", { text: "网站文章预览（HTML 源码）" });

    const pre = contentEl.createEl("pre");
    pre.addClass("note-to-site-pre");
    pre.setText(this.html);

    const actions = contentEl.createDiv({ cls: "note-to-site-actions" });

    const copyBtn = actions.createEl("button", { text: "复制 HTML", cls: "mod-cta" });
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(this.html);
        new Notice("文章 HTML 已复制到剪贴板");
      } catch {
        new Notice("复制失败：无法访问剪贴板");
      }
    });

    const saveBtn = actions.createEl("button", { text: "保存到笔记库" });
    saveBtn.addEventListener("click", async () => {
      try {
        await this.onSave();
        this.close();
      } catch (e) {
        new Notice(`保存失败：${(e as Error).message || "未知错误"}`);
      }
    });

    const closeBtn = actions.createEl("button", { text: "关闭" });
    closeBtn.addEventListener("click", () => this.close());
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}

/* ---------------- 主插件 ---------------- */

export default class NoteToSitePlugin extends Plugin {
  settings: NoteToSiteSettings;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.addRibbonIcon("globe", "生成网站文章（Note to Site）", () => {
      void this.generateArticle();
    });

    this.addCommand({
      id: "note-to-site-generate",
      name: "生成网站文章页面",
      callback: () => {
        void this.generateArticle();
      },
    });

    this.addCommand({
      id: "note-to-site-copy-summary",
      name: "复制 Markdown 摘要",
      callback: () => {
        void this.copyMarkdownSummary();
      },
    });

    this.addSettingTab(new NoteToSiteSettingTab(this.app, this));
  }

  onunload(): void {
    // 无需清理
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private getActiveNote(): TFile | null {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    return view?.file ?? null;
  }

  /** 汇总笔记元信息：frontmatter → 兜底解析 → 默认值 */
  private getNoteMeta(note: TFile, content: string) {
    const cached = this.app.metadataCache.getFileCache(note)?.frontmatter ?? {};
    const naive = parseFrontmatter(content)?.data ?? {};
    const pick = <T>(key: string, fallback: T): T =>
      (cached[key] as T) ?? (naive[key] as T) ?? fallback;

    const title = String(pick("title", "")).trim() || note.basename;
    const category = String(pick("category", this.settings.defaultCategory)).trim();
    const dateRaw = String(pick("date", "")).trim();
    const date = dateRaw && moment(dateRaw).isValid()
      ? moment(dateRaw).format("YYYY-MM-DD")
      : moment().format("YYYY-MM-DD");
    const tags = toTags(cached.tags ?? naive.tags);
    return { title, category, date, tags };
  }

  /** 生成导语：AI 优先，失败则回退本地提取 */
  private async buildLead(body: string, title: string): Promise<string> {
    let lead = extractLead(body, this.settings.leadMaxChars);
    if (this.settings.aiEnabled) {
      const ai = await this.summarizeWithAI(body, title);
      if (ai) {
        lead = stripMarkdown(ai).replace(/\s+/g, " ").trim() || lead;
      }
    }
    return lead;
  }

  /** 调用 OpenAI 兼容接口生成导语 */
  private async summarizeWithAI(content: string, title: string): Promise<string | null> {
    const base = this.settings.aiBaseUrl.trim().replace(/\/+$/, "");
    const prompt = this.settings.aiPrompt
      .replace(/\{\{title\}\}/g, title)
      .replace(/\{\{content\}\}/g, content.slice(0, 8000));
    try {
      const res = await requestUrl({
        url: `${base}/chat/completions`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.settings.aiApiKey.trim()
            ? { Authorization: `Bearer ${this.settings.aiApiKey.trim()}` }
            : {}),
        },
        body: JSON.stringify({
          model: this.settings.aiModel,
          messages: [
            {
              role: "system",
              content: "你是一位认真负责的个人网站编辑，擅长为文章撰写自然、准确的中文导语。",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
        }),
      });
      const text = res.json?.choices?.[0]?.message?.content;
      if (typeof text === "string" && text.trim()) return text.trim();
      new Notice("AI 摘要返回为空，已使用本地提取");
      return null;
    } catch (e) {
      console.error("[Note to Site] AI 摘要失败：", e);
      new Notice(`AI 摘要失败（${(e as Error).message || "未知错误"}），已使用本地提取`);
      return null;
    }
  }

  /** 生成完整网站文章 HTML 页面 */
  private buildArticleHtml(opts: {
    title: string;
    category: string;
    date: string;
    lead: string;
    metaDescription: string;
    readingMinutes: number;
    bodyHtml: string;
    outlineHtml: string;
    mindmapHtml: string;
  }): string {
    const s = this.settings;
    const homeHref = escapeHtml(s.homeHref || "../index.html");
    const cssPath = escapeHtml(s.cssPath || "../css/style.css");
    const siteName = escapeHtml(s.siteName || "ChengC");
    const title = escapeHtml(opts.title);
    const category = escapeHtml(opts.category);
    const lead = escapeHtml(opts.lead);
    const metaDescription = escapeHtml(opts.metaDescription);
    const titleTag = escapeHtml((opts.title + (s.titleSuffix || "")).trim());
    const dateDisplay = moment(opts.date).format("YYYY 年 M 月 D 日");

    return `<!DOCTYPE html>
<html lang="zh-CN" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${titleTag}</title>
  <meta name="description" content="${metaDescription}">
  <meta name="theme-color" content="#090910">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+SC:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${cssPath}">
  <style>${MINDMAP_CSS}</style>
</head>
<body class="article-page">
  <header class="site-header">
    <nav class="nav-shell" aria-label="文章导航">
      <a class="brand" href="${homeHref}">${siteName}</a>
      <div class="article-nav"><a href="${homeHref}#blog">← 返回博客</a><button id="articleTheme" class="theme-btn" type="button" aria-label="切换主题"><svg class="sun-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-width="2" d="M12 3v2m0 14v2M3 12h2m14 0h2M6 6l1.5 1.5m9 9L18 18m0-12-1.5 1.5m-9 9L6 18M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"/></svg><svg class="moon-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-width="2" d="M20 15.5A9 9 0 0 1 8.5 4 9 9 0 1 0 20 15.5z"/></svg></button></div>
    </nav>
  </header>
  <main class="article-shell">
    <article>
      <header class="article-header">
        <a class="article-category" href="${homeHref}#blog">${category}</a>
        <h1>${title}</h1>
        <p class="article-lead">${lead}</p>
        <div class="article-meta"><time datetime="${opts.date}">${dateDisplay}</time><span>约 ${opts.readingMinutes} 分钟阅读</span></div>
      </header>
      <div class="article-body">
${opts.bodyHtml}
${opts.outlineHtml}
${opts.mindmapHtml}
      </div>
      <footer class="article-footer"><a class="button secondary" href="${homeHref}#blog">← 返回博客列表</a><a class="button primary" href="${homeHref}#journal">看看最近动态</a></footer>
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
  }

  /** 主流程：读取笔记 → 总结 → 渲染正文 → 弹窗预览 */
  async generateArticle(): Promise<void> {
    const note = this.getActiveNote();
    if (!note) {
      new Notice("请先打开一篇 Markdown 笔记");
      return;
    }
    const content = await this.app.vault.read(note);
    const fm = parseFrontmatter(content);
    const body = fm ? fm.rest : content;
    const meta = this.getNoteMeta(note, content);

    const lead = await this.buildLead(body, meta.title);
    const metaDescription =
      lead.length > 110 ? lead.slice(0, 107) + "…" : lead;

    // 用 Obsidian 渲染器把 Markdown 正文转成 HTML
    const container = document.createElement("div");
    container.addClass("markdown-rendered");
    await MarkdownRenderer.render(this.app, body, container, note.path, this);

    // 从渲染后的 DOM 收集 H2/H3 标题，供大纲与思维导图使用
    const headingList: { level: 2 | 3; text: string }[] = [];
    Array.from(container.querySelectorAll("h2, h3")).forEach((h) => {
      const text = h.textContent?.trim() ?? "";
      if (text) headingList.push({ level: h.tagName === "H2" ? 2 : 3, text });
    });

    // 大纲
    let outlineHtml = "";
    if (this.settings.includeOutline && headingList.length) {
      outlineHtml =
        `\n        <h2>文章大纲</h2>\n        <ul>\n` +
        headingList.map((h) => `          <li>${escapeHtml(h.text)}</li>`).join("\n") +
        `\n        </ul>`;
    }

    // 彩色思维导图（根 = 标题，H2 一级分支，H3 二级分支）
    let mindmapHtml = "";
    if (this.settings.includeMindMap && headingList.length) {
      const tree = buildMindTree(meta.title, headingList);
      mindmapHtml =
        `\n        <h2>本文思维导图</h2>\n` +
        `        <div class="mm-wrap">\n          <div class="mm-tree">\n` +
        `            <ul>${renderMindTree(tree)}\n            </ul>\n          </div>\n        </div>`;
    }

    const readingMinutes = estimateReadingTime(stripMarkdown(body));
    const html = this.buildArticleHtml({
      title: meta.title,
      category: meta.category,
      date: meta.date,
      lead,
      metaDescription,
      readingMinutes,
      bodyHtml: container.innerHTML,
      outlineHtml,
      mindmapHtml,
    });

    new ArticlePreviewModal(this.app, html, async () => {
      await this.saveToVault(html, meta.title);
    }).open();
  }

  /** 复制 Markdown 摘要（frontmatter + 导语 + 大纲 + 统计） */
  async copyMarkdownSummary(): Promise<void> {
    const note = this.getActiveNote();
    if (!note) {
      new Notice("请先打开一篇 Markdown 笔记");
      return;
    }
    const content = await this.app.vault.read(note);
    const fm = parseFrontmatter(content);
    const body = fm ? fm.rest : content;
    const meta = this.getNoteMeta(note, content);

    const lead = await this.buildLead(body, meta.title);
    const headingList = collectHeadingsWithLevel(body);
    const outline = headingList.map((h) => h.text);
    const readingMinutes = estimateReadingTime(stripMarkdown(body));
    const charCount = stripMarkdown(body).length;

    const parts: string[] = [
      "---",
      `title: ${meta.title}`,
      `date: ${meta.date}`,
      `category: ${meta.category}`,
    ];
    if (meta.tags.length) parts.push(`tags: [${meta.tags.join(", ")}]`);
    parts.push(`summary: ${lead}`);
    parts.push("---", "");
    parts.push(`> **摘要**：${lead}`, "");
    if (outline.length) {
      parts.push("## 大纲", "");
      parts.push(outline.map((o) => `- ${o}`).join("\n"), "");
    }
    if (this.settings.includeMindMap && headingList.length) {
      const renderMd = (node: MindNode, indent: number): string =>
        "  ".repeat(indent) +
        `- ${node.label}` +
        (node.children.length ? "\n" + node.children.map((c) => renderMd(c, indent + 1)).join("\n") : "");
      parts.push("## 思维导图", "");
      parts.push(renderMd(buildMindTree(meta.title, headingList), 0), "");
    }
    parts.push(
      `> 字数：约 ${charCount} 字 · 预计阅读：约 ${readingMinutes} 分钟`
    );

    const md = parts.join("\n");
    try {
      await navigator.clipboard.writeText(md);
      new Notice("Markdown 摘要已复制到剪贴板");
    } catch {
      new Notice("复制失败：无法访问剪贴板");
    }
  }

  /** 保存生成的 HTML 到笔记库（自动处理重名与文件夹） */
  private async saveToVault(html: string, title: string): Promise<void> {
    const folder = normalizePath(this.settings.outputFolder.trim() || "网站输出");
    await this.ensureFolder(folder);

    const base = slugify(title) || "untitled";
    let path = normalizePath(`${folder}/${base}.html`);
    let i = 1;
    while (this.app.vault.getAbstractFileByPath(path)) {
      path = normalizePath(`${folder}/${base}-${i}.html`);
      i++;
    }
    await this.app.vault.create(path, html);
    new Notice(`已生成：${path}`);
  }

  private async ensureFolder(path: string): Promise<void> {
    const parts = path.split("/");
    let cur = "";
    for (const p of parts) {
      if (!p) continue;
      cur = cur ? `${cur}/${p}` : p;
      if (!this.app.vault.getAbstractFileByPath(cur)) {
        await this.app.vault.createFolder(cur);
      }
    }
  }
}

/* ---------------- 设置页 ---------------- */

class NoteToSiteSettingTab extends PluginSettingTab {
  plugin: NoteToSitePlugin;

  constructor(app: App, plugin: NoteToSitePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName("文章格式").setHeading();

    new Setting(containerEl)
      .setName("默认分类")
      .setDesc("生成文章页面的分类标签，可被笔记 frontmatter 的 category 覆盖")
      .addText((t) =>
        t
          .setPlaceholder("学习")
          .setValue(this.plugin.settings.defaultCategory)
          .onChange(async (v) => {
            this.plugin.settings.defaultCategory = v.trim() || "学习";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("导语最大字数")
      .setDesc("本地提取导语时的截断长度（字符），AI 摘要不受此限制")
      .addText((t) =>
        t
          .setPlaceholder("120")
          .setValue(String(this.plugin.settings.leadMaxChars))
          .onChange(async (v) => {
            const n = parseInt(v, 10);
            if (!isNaN(n) && n > 0) {
              this.plugin.settings.leadMaxChars = n;
              await this.plugin.saveSettings();
            }
          })
      );

    new Setting(containerEl)
      .setName("包含文章大纲")
      .setDesc("在正文末尾追加由 H2/H3 标题组成的大纲")
      .addToggle((t) =>
        t
          .setValue(this.plugin.settings.includeOutline)
          .onChange(async (v) => {
            this.plugin.settings.includeOutline = v;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("包含彩色思维导图")
      .setDesc("在文章末尾追加彩色思维导图：标题为中心，H2 为一级分支（每支一色），H3 为二级分支")
      .addToggle((t) =>
        t
          .setValue(this.plugin.settings.includeMindMap)
          .onChange(async (v) => {
            this.plugin.settings.includeMindMap = v;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl).setName("网站路径").setHeading();

    new Setting(containerEl)
      .setName("站点名")
      .setDesc("页面顶栏与底部显示的名称")
      .addText((t) =>
        t
          .setPlaceholder("ChengC")
          .setValue(this.plugin.settings.siteName)
          .onChange(async (v) => {
            this.plugin.settings.siteName = v.trim() || "ChengC";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("首页链接")
      .setDesc("返回博客按钮指向的地址，posts 目录内通常是 ../index.html")
      .addText((t) =>
        t
          .setPlaceholder("../index.html")
          .setValue(this.plugin.settings.homeHref)
          .onChange(async (v) => {
            this.plugin.settings.homeHref = v.trim() || "../index.html";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("样式表路径")
      .setDesc("文章页面引用的 CSS 路径")
      .addText((t) =>
        t
          .setPlaceholder("../css/style.css")
          .setValue(this.plugin.settings.cssPath)
          .onChange(async (v) => {
            this.plugin.settings.cssPath = v.trim() || "../css/style.css";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("标题后缀")
      .setDesc("浏览器标签页 <title> 的后缀，如 “ · ChengC”")
      .addText((t) =>
        t
          .setPlaceholder(" · ChengC")
          .setValue(this.plugin.settings.titleSuffix)
          .onChange(async (v) => {
            this.plugin.settings.titleSuffix = v;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("保存文件夹")
      .setDesc("点击“保存到笔记库”时，生成的 HTML 在笔记库中的存放路径")
      .addText((t) =>
        t
          .setPlaceholder("网站输出")
          .setValue(this.plugin.settings.outputFolder)
          .onChange(async (v) => {
            this.plugin.settings.outputFolder = v.trim() || "网站输出";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl).setName("AI 摘要（可选）").setHeading();

    new Setting(containerEl)
      .setName("启用 AI 摘要")
      .setDesc("开启后调用大模型生成导语；关闭时使用本地提取（无需联网）")
      .addToggle((t) =>
        t
          .setValue(this.plugin.settings.aiEnabled)
          .onChange(async (v) => {
            this.plugin.settings.aiEnabled = v;
            this.display();
            await this.plugin.saveSettings();
          })
      );

    if (this.plugin.settings.aiEnabled) {
      new Setting(containerEl)
        .setName("接口地址")
        .setDesc("OpenAI 兼容接口，如 https://api.openai.com/v1 或 http://localhost:11434/v1（Ollama）")
        .addText((t) =>
          t
            .setValue(this.plugin.settings.aiBaseUrl)
            .onChange(async (v) => {
              this.plugin.settings.aiBaseUrl = v;
              await this.plugin.saveSettings();
            })
        );

      new Setting(containerEl)
        .setName("API Key")
        .setDesc("本地 Ollama 等无需密钥的接口可留空")
        .addText((t) =>
          t
            .setValue(this.plugin.settings.aiApiKey)
            .onChange(async (v) => {
              this.plugin.settings.aiApiKey = v;
              await this.plugin.saveSettings();
            })
        );

      new Setting(containerEl)
        .setName("模型")
        .setDesc("如 gpt-4o-mini / deepseek-chat / qwen2.5")
        .addText((t) =>
          t
            .setValue(this.plugin.settings.aiModel)
            .onChange(async (v) => {
              this.plugin.settings.aiModel = v.trim() || "gpt-4o-mini";
              await this.plugin.saveSettings();
            })
        );

      new Setting(containerEl)
        .setName("提示词")
        .setDesc("模板中的 {{title}} 与 {{content}} 会被自动替换")
        .addTextArea((t) =>
          t
            .setValue(this.plugin.settings.aiPrompt)
            .onChange(async (v) => {
              this.plugin.settings.aiPrompt = v;
              await this.plugin.saveSettings();
            })
        );
    }
  }
}
