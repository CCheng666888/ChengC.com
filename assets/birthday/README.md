# 二十岁生日祝福页面

入口是项目根目录的 `birthday.html`。蛋糕图片已经以 data URL 内嵌；只需要发送这一个 HTML 文件，不需要联网或安装依赖。

## 使用

1. 点击蛋糕上的数字 2 和 0，分别点燃两根蜡烛。
2. 第二根点燃后房间渐暗，等待 10 秒许愿。
3. 向上滑动、滚轮向下，或点击底部箭头，进入祝福卡片动画。
4. 卡片由慢到快出现，并汇成“生日快乐”；结束后继续向下滚动，阅读随滚动出现的分段祝福。
5. 文末可重新开始。也支持 Tab、Enter 和向下方向键。

修改 `WISH_WAIT_MS` 可以调整许愿时间，`wishes` 数组可修改开场与主题祝福，`moments` 和 `dailyWishes` 补充日常祝福，`letter` 部分可修改长文。祝福池按完整文字去重，每张拼字卡片使用不同内容；后续祝福打散排列，不循环重复。

两根蜡烛各自对应一层暖色表面光照，光线从蜡烛附近向蛋糕顶部、前侧逐渐衰减，并随火焰轻微闪动。蛋糕底部保留暗部。

## 图片

最终项目资产：`assets/birthday/cake-20.png`。

使用内置 imagegen 编辑工具。以用户提供的双层青提白花蛋糕照片为编辑目标，保留蛋糕造型与装饰，移除截图界面和背景，添加未点燃的 20 数字蜡烛，输出透明 PNG。原始照片未修改。

最终提示词：

> Use case: precise-object-edit and background-extraction.
> Input image: the attached screenshot is the EDIT TARGET, not merely style inspiration.
> Primary request: extract and preserve THIS EXACT two-tier pale sage green grape-and-white-flower birthday cake, and add two UNLIT numeral wax candles "2" on the left and "0" on the right standing upright on its top tier.
> Preserve invariants aggressively: keep the same two-tier cake silhouette, irregular pale green buttercream texture, translucent green grape slices, white flowers and green leaves, ivory piping, the existing dark cursive Happy Birthday topper on the lower front left, and the white square cake board. Do not redesign the cake, change decoration positions, simplify, add tiers, strawberries, gold dots, or substitute another cake.
> Remove ONLY all surrounding screenshot UI and background: phone status bar, gray and black borders, playback buttons, dark tabletop, wall and everything outside the cake and its square white board. Background must be truly transparent alpha.
> Add exactly two pale ivory wax numeral candles with a subtle sage edge, a 2 on left and 0 on right, centered above the cake top, at x approximately 43 percent and 59 percent of a square output. Black unlit wick tips should be clearly visible, at equal height near y 12 percent. Candle shapes must be readable, realistic and fit the photographed cake perspective. Both candles unlit with no flames or glow.
> Framing: square transparent image, entire cake board fully visible and cake centered, leave enough transparent space above for both candles. The board bottom about y 94 percent, cake top about y 29 percent, numeral wicks about y 12 percent. Photographic realism and original natural colors. No interface, new text, watermark, backdrop, hands, or extra candles.
