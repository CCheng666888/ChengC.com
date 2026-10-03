# ChenC 个人页 · 片头风格改版

2026 年 10 月 2 日。范围为 `about.html`，本地实现完成。

参考来自制作公司 Huge Designs 的完整片头，而非短视频平台的配乐改编：
- 制作公司：https://hugedesigns.co.uk/project/magpie-murders/
- 完整视频（约 45 秒）：https://player.vimeo.com/video/676323296?app_id=122963&dnt=1&h=d1695c2b9d

采用红、黑、米白的有限配色，硬边色块、剪影、透视楼梯、书页、钢笔以及轻微印刷颗粒。场景以 SVG 实现；生活章节人物后续按用户要求改用制作方原片头图片中的侦探抠图，未使用图像生成。未嵌入剧集音乐。

“学习 / 生活 / 创造”三个章节对应书与楼梯、道路与行人、代码与游戏手柄。点击或用方向键切换章节，会同步更新插画、短句、章节编号、入口链接和辅助技术播报。沿用现有头像、个人简介、文章 / 工具 / 游戏入口以及主题偏好。

补充暂停动画、只看画面和 Esc 返回；适配系统减少动态偏好。页面资源均在本地，无新增第三方字体或视频请求。样式限定于此个人页，新文件 `css/profile-titles.css`；交互更新 `js/profile.js`。

验证记录：
- JavaScript 语法检查通过，11 个页面、202 个本地资源和链接检查通过。
- 实际浏览器检查深 / 浅主题、章节按钮、方向键切换、入口目标同步。
- 实际检查暂停后 SVG 动画的计算状态为 paused，以及只看画面 / Esc 返回。
- 390px、320px 手机视口无横向溢出，手机菜单可打开并通过 Esc 关闭。
- 桌面及手机预览保存在 `magpie-profile-desktop.png`、`magpie-profile-mobile.png`；其他章节保存在 `magpie-profile-life.png`、`magpie-profile-create.png`。

修改前备份：`before-magpie-profile/about.html`、`before-magpie-profile/profile.js`。
预览：http://127.0.0.1:8765/about.html

后续调整：头像取消灰度滤镜，恢复原图彩色；生活章节替换为礼帽、长风衣、白色衣领和插袋站姿的红色侦探剪影。桌面与 390px 手机显示已检查。新截图：`magpie-profile-life-v2.png`、`magpie-profile-life-mobile-v2.png`。

再次调整：删除自行绘制的侦探，替换为 `assets/magpie-original-detective.png`。原素材是制作方完整片头播放器的高清封面（1920×1080），备份见 `magpie-source/original-poster.png`，出处和处理记录见 `magpie-source/provenance.json`。处理仅包括裁切、透明背景，以及从同一原图的邻近衣料像素清理叠加片名，没有生成或重绘人物。

道路远端从 y=435 降至地形内的 y=596，近端向底部展开，车道标记按地面透视逐渐放大；不再穿入天空。最新预览：`magpie-profile-life-original.png`、`magpie-profile-life-original-mobile.png`。
