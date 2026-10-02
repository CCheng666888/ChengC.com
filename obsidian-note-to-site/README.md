# Note to Site（笔记转网站文章）

一个 Obsidian 插件：**在你需要的时候，把当前笔记一键总结成可直接发布到个人网站的文章页面**。

作者：**ChenC**

- 生成的 HTML 页面完全对齐 [ChengC.com](https://chengc.com) 的文章模板（`posts/*.html` 的 `article-page` 结构）
- **彩色思维导图**：文章末尾自动生成，标题为中心、H2 为一级分支（每支一色）、H3 为二级分支，纯 CSS 实现、自包含
- 支持**本地提取**（不联网）和**可选 AI 摘要**（任意 OpenAI 兼容接口，含 Ollama）
- 两条命令 + 侧边栏图标，弹窗预览后选择「复制 HTML」或「保存到笔记库」

---

## 安装

### 方式一：使用已构建产物（推荐）

把以下 3 个文件复制到你的笔记库：

```
<你的库>/.obsidian/plugins/note-to-site/
├── manifest.json
├── main.js
└── styles.css
```

然后在 Obsidian 中：`设置 → 第三方插件 → 关闭安全模式（如需要）→ 启用「Note to Site（笔记转网站文章）」`。

> 文件夹名必须叫 `note-to-site`（与 `manifest.json` 的 id 一致）。

### 方式二：从源码构建

```bash
cd obsidian-note-to-site
npm install
npm run build     # 产出 main.js
```

构建后同样把 `manifest.json / main.js / styles.css` 放进 `.obsidian/plugins/note-to-site/`。

---

## 使用

1. 打开一篇笔记（支持 YAML frontmatter，可写 `title / date / category / tags`）。
2. 点击左侧栏的 🌐 图标，或执行命令面板中的 **“生成网站文章页面”**。
3. 弹窗中预览生成的 HTML：
   - **复制 HTML** → 粘贴到你网站的 `posts/<文件名>.html`，刷新即上线；
   - **保存到笔记库** → 存到设置的输出文件夹，之后手动移到网站目录。

另有命令 **“复制 Markdown 摘要”**，生成 `frontmatter + 摘要 + 大纲 + 思维导图（嵌套列表）+ 统计` 的 Markdown，适合走自己的发布流程。

### 生成结果包含

| 部分 | 说明 |
| --- | --- |
| `<title>` | `笔记标题 · ChengC`（后缀可配） |
| `<meta description>` | 导语截断版，用于搜索引擎与分享卡片 |
| 分类链接 | 默认 `学习`，可被 frontmatter `category` 覆盖 |
| 导语 `article-lead` | 本地取正文第一段；AI 开启时由模型生成 |
| 时间 + 阅读时长 | 取 frontmatter `date`（缺省为今天），按字数估算阅读分钟数 |
| 正文 | Obsidian 渲染器将 Markdown 转成标准 HTML（表格、代码、引用等均可） |
| 文章大纲 | 正文末尾自动追加 H2/H3 标题列表（可关闭） |
| 彩色思维导图 | 正文末尾追加：标题为中心，H2 一级分支（每支一色），H3 二级分支；自包含 CSS，明暗主题均为白底卡片（可关闭） |
| 页脚按钮 | 「← 返回博客列表」「看看最近动态」 |

---

## 设置

| 设置项 | 默认值 | 说明 |
| --- | --- | --- |
| 默认分类 | 学习 | 生成页面的分类标签，frontmatter `category` 优先 |
| 导语最大字数 | 120 | 本地提取导语的截断长度（字符） |
| 包含文章大纲 | 开 | 正文末尾追加 H2/H3 大纲 |
| 包含彩色思维导图 | 开 | 正文末尾追加彩色思维导图（标题为中心，H2 一级分支，H3 二级分支） |
| 站点名 | ChengC | 页面顶栏与底部显示的名称 |
| 首页链接 | `../index.html` | 返回博客按钮地址（posts 目录内文章适用） |
| 样式表路径 | `../css/style.css` | 文章页引用的 CSS |
| 标题后缀 | ` · ChengC` | `<title>` 后缀 |
| 保存文件夹 | 网站输出 | 「保存到笔记库」的输出路径 |

### AI 摘要（可选）

开启后，导语由大模型生成（失败自动回退本地提取）：

- **接口地址**：OpenAI 兼容端点，如 `https://api.openai.com/v1`；
- **API Key**：本地 Ollama 等无需密钥的接口可留空；
- **模型**：如 `gpt-4o-mini` / `deepseek-chat` / `qwen2.5`；
- **提示词**：模板，`{{title}}` 与 `{{content}}` 会自动替换。

本地 Ollama 示例：

```bash
ollama pull qwen2.5
ollama serve
```

设置中填写：接口地址 `http://localhost:11434/v1`、模型 `qwen2.5`、API Key 留空。

---

## 目录结构

```
obsidian-note-to-site/
├── manifest.json      # 插件清单（id: note-to-site，作者 ChenC）
├── main.ts            # 源码
├── main.js            # 构建产物（esbuild 打包）
├── styles.css         # 预览弹窗样式
├── package.json / tsconfig.json / esbuild.config.mjs
├── smoke-test.mjs     # 纯函数冒烟测试：node smoke-test.mjs
├── demo-gen.mjs       # 思维导图演示页生成脚本（node demo-gen.mjs）
└── versions.json
```

## 验证

- `tsc -noEmit -skipLibCheck` 类型检查通过，`esbuild` 打包成功；
- `node smoke-test.mjs` 覆盖导语提取（首段、超长截断、空正文兜底）、大纲收集、思维导图树构建与渲染（层级归属、配色、二级继承）、frontmatter 解析、阅读时长、文件名转写等断言，全部通过；
- 思维导图可视化验证：用网站真实 `css/style.css` 生成演示页，无头浏览器截图 + 像素取样确认各分支颜色（蓝/红/绿/琥珀/紫等）正常渲染。

## 许可

MIT，作者 ChenC。
