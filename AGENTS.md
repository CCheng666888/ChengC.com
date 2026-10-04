# 网站工作约定

这是 `chenc.com.cn` 网站的当前源码目录，完整路径为 `D:\编译\C.txt\chenc.com.cn`（原文件夹名 `ChengC.com`）。

开始修改或部署前，先阅读 `网站更新记录/最新版与部署说明.md`。最新版以项目根目录的网页和配套资源为准；不要从 `preview/` 中的历史压缩包或备份恢复、发布旧版本。

每次更新网站内容后，必须同步维护 `网站更新记录/最新版与部署说明.md`：更新最后更新时间、当前内容和发布状态，并追加简短变更记录。部署成功或失败也要登记，未部署时明确注明未部署。统一维护这个记录，不另建“最新版”说明。

## 部署方式（GitHub Pages，2026-10 起）

本目录是 Git 仓库，部署**不再使用 Netlify / deploy.py**，改为推送到 GitHub 由 Pages 发布：

1. 修改网站内容（根目录的 `index.html`、`posts/`、`assets/` 等）
2. 同步更新 `网站更新记录/最新版与部署说明.md`（最后更新时间、当前内容、发布状态，并追加变更记录）
3. 提交并推送：`git add -A` → `git commit -m "说明"` → `git push origin main`
4. 等待 GitHub Pages 构建完成（约 1–2 分钟），打开 https://chenc.com.cn/ 核验新内容

- 仓库：`https://github.com/CCheng666888/ChengC.com`（分支 `main`）
- 自定义域名：`chenc.com.cn`（根目录 `CNAME` 文件）
- 历史 Netlify 部署脚本 `D:\编译\C.txt\deploy.py` 不再用于本网站部署，仅作参考，不要按旧 Netlify 流程部署。
- 部署细节见 `网站更新记录/最新版与部署说明.md`。

## 性能资源维护

主站 19 个展示/文章页面使用带内容哈希的 CSS/JS 合并资源，以及 `sw.js` 的有限缓存。修改这些页面的 HTML 或其原始 CSS/JS 后，必须运行 `node preview/build-delivery.cjs`，再验证并发布生成的 `css/delivery-*`、`js/delivery-*` 和 `sw.js`；不要直接编辑生成的合并文件。该脚本根据 HTML 的 `data-sources` 保留原始资源清单，自动更新资源哈希和缓存版本。部署仍是静态 GitHub Pages，无需在线构建。
