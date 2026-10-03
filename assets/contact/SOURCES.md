# 联系作者页角色素材

本页是供 ChenC 审核的本地像素小人视觉稿。下列原版素材仅作造型参考；当前页面使用按 48×64 像素网格绘制的完整小人，保留角色发型、配色、服饰和标志配饰。不是把原图直接贴进页面，也不是三维手办风格。

每个小人有八帧：待机、眨眼、四帧行走、两帧人物动作。像素帧保持硬边和限定配色，不经过平滑滤镜。场景纵深、前后移动和地面投影提供立体感，人物仍保持二维像素画风。访问者不能拖动、旋转或操控。

当前人物代码在 `js/pixel-characters.js`，像素帧在 `assets/contact/pixel/`，绘制网格代码在 `preview/build-pixel-characters.py`，场景代码在 `js/world-room.js`。绘制脚本不加载原版 PNG，不对原图做像素化滤镜，也未调用生成式图片工具制作这批像素小人。它们是参照原角色制作的页面像素重绘稿，不是官方像素素材。

渲染采用本地 Three.js 0.180.0，MIT 许可文件在 `js/vendor/THREE-LICENSE.txt`。`character-cutouts.js`、`character-models.js`、`models/*.glb` 和旧三面审核页仅保留为已弃用的探索稿，当前页面不加载它们。

## 崩坏：星穹铁道

官方《走近星穹》常让其他角色担任嘉宾，因此角色本人的介绍节目不一定包含本人小人。经用户允许，本稿使用官方「帕姆展览馆」Q 版素材补齐。

| 文件 | 角色 | 官方发布原帖 |
|---|---|---|
| firefly.png | 流萤 | [帕姆展览馆第 15 弹](https://www.taptap.cn/moment/552453987656271637) |
| sparkle.png | 花火 | [帕姆展览馆第 15 弹](https://www.taptap.cn/moment/552453987656271637) |
| sunday.png | 星期日 | [帕姆展览馆第 15 弹](https://www.taptap.cn/moment/552453987656271637) |
| castorice.png | 遐蝶 | [帕姆展览馆第 22 弹](https://www.taptap.cn/moment/658731346092362857) |
| robin.png | 知更鸟 | [帕姆展览馆第 14 弹](https://www.taptap.cn/moment/537949616117646906) |
| aventurine.png | 砂金 | [帕姆展览馆第 13 弹](https://www.taptap.cn/moment/522383511651352989) |
| sparxie.png | 火花 | [帕姆展览馆第 26 弹](https://www.taptap.cn/moment/771036620978651378) |
| jingyuan.png | 景元 | [官方账号发布第 4 弹](https://www.bilibili.com/opus/802100604419702899) |

以上图片作为像素重绘的参考，原文件仍保留。当前像素帧不是官方素材；人物的像素动作是页面设计的演绎。

## 无悔华夏

三位名臣的参考来自原游戏截图中的小人，不是截图作者的同人图。下面是截图转载页，区别于星穹官方发布帖。当前小人以像素网格重绘，参考图未作生成式放大。

| 文件 | 角色 | 原游戏截图来源 |
|---|---|---|
| lisi.png | 李斯 | [政类名臣测评](https://www.taptap.cn/moment/315542308441296621)，当前大图原尺寸 2560 × 1600 |
| mengtian.png | 蒙恬 | [蒙恬与第五季社稷之鉴](https://www.taptap.cn/moment/388253088156221927)，当前大图原尺寸 1920 × 864 |
| wangjian.png | 王翦 | [王翦测评](https://www.taptap.cn/moment/334853025904460674) |

## 嬴政：单独审核的设计稿

`yingzheng.png` 是先前用户允许单独设计的二维参考稿，使用内置 image_gen 工具制作。当前像素版参照它的黑金秦服、冕冠和简牍，以同一套像素网格重新制作；本稿并非《无悔华夏》的官方嬴政素材。

先前参考图的提示词保存在 `preview/yingzheng-prompt.txt`；当前单独审核 `preview/yingzheng-pixel-review.png`。旧 `preview/yingzheng-3d.html` 是已弃用的手办风格探索稿。
