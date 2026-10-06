# 节拍失控！BEAT.exe · v1.0.2

完整四轨节奏游戏：8 首原创普通曲目、1 首隐藏曲、4 种难度，包含点击、长按、换轨滑动、连击、评级、成就、收藏、背景和自动存档。

## 开始游戏

- 网页版：双击本目录 `index.html`，或用静态网站服务器托管整个目录。站内试玩使用 `BEAT-exe-1.0.2-web/beat-exe.html` 和同级 `beat-exe/` 资源目录，页面按需加载音乐和视频。离线单文件 `BEAT-exe-1.0.2-offline.html` 包含全部音乐、图片和视频，体积较大，适合电脑离线使用。
- Windows 版：双击 `BEAT-exe-1.0.2-windows.exe`。无需安装或联网，使用 Windows 自带的 Microsoft Edge 显示独立游戏窗口，需要 Edge 和 .NET Framework 4.8。关闭窗口后退出；也可通过系统托盘的 BEAT.exe 菜单退出。
- D / F / J / K 分别控制四轨；鼠标或触屏同样可玩。长按保持至尾部；滑动先击打起点，再按目标轨的键或向目标轨拖动。空格 / Esc 暂停，后台切换自动暂停。
- PERFECT ±45ms，GREAT ±95ms，GOOD ±150ms，超过窗口为 MISS。评分满分 1,000,000，长按和滑动的起点与终点分别计分。SS ≥99.9%、S ≥98%、A ≥90%、B ≥80%、C ≥65%、D <65%；生命值归零为 F。
- 设置中可调整音量、下落速度、判定偏移、减少动态效果，并提供听节拍校准。观谱练习自动演奏，不保存成绩，不推动解锁。

## 进度与解锁

网页端自动保存到当前浏览器当前站点的 localStorage，包含最佳成绩、累计次数、通关、解锁、成就、收藏和设置。更换浏览器或网址前请在设置中导出存档。Windows 版另将进度原子写入 `%LOCALAPPDATA%\BEAT-exe\progress.json`，保留 `progress.backup.json`。网页和 Windows 版可通过导出 / 导入 JSON 互通；导入前自动导出旧进度备份。

初始 6 首普通曲目。累计 3 次正式游玩解锁 ZERO GRAVITY 和青色网格，累计 6 次解锁 LAST TRANSMISSION；3 次通关解锁 INSANE 特殊谱面，6 次通关解锁玫瑰极光。

## 异常谱面（给制作者的说明）

正常菜单不显示朋友素材。电脑主菜单直接依次输入 `zxx`，或点击左下角 `BEAT OS v1.0.2` 输入 `zxx`，即可立即进入隐藏关。手机点击右上角 `OS`，输入 `zxx`，点击连接或使用键盘提交，默认以 EASY 开始。代码不区分大小写。自然解锁条件：完成至少 3 次正式游玩，且 NEON AFTERLIFE 的任意难度通关达到 90% 准确率。普通曲目第二次完成，及之后部分结算，会出现可点击日志 `PLAYER_DATA_FRAGMENT_07`。隐藏成就「你发现了不属于这里的东西」也能连接隐藏关。

UNKNOWN_07 的 0–20 秒完全正常，20–30 秒显示赛博 Boss 并保持音游操作。第 30 秒开始播放朋友视频，声音切换为视频原声，完整播放约 3 分 43 秒；整关约 4 分 13 秒。竖屏时视频位于上方、轨道位于下方，音符继续按原声节奏判定。暂停、恢复、重开共用一个媒体时钟，画面、声音和谱面保持同步。隐藏关即使多次 MISS 也会继续播放，失误正常计分；普通关仍保留生命值失败规则。减少动态效果时关闭 Boss 阶段的闪烁和脉冲。

隐藏关的视频阶段出现 MISS 时，随机选择用户提供的两张原照片之一，覆盖视频区域 0.5 秒，再恢复视频画面；视频和原声始终继续播放，音符不被遮挡。持续时间内的连续或同时失误合并为一次闪现，不延长或排队。暂停、重开、退出和结算立即清除照片。普通关、前 30 秒及 PERFECT / GREAT / GOOD 不触发。

v1.0.2 同时保留站内后续加入的手机与 Safari 补丁：触屏优先使用 Baseline 轻量视频，有声播放被拦截时提供直接点击重试，Boss 使用轻量 WebP，手机舞台限制渲染像素比例。

朋友 Boss 使用内置 ImageGen 生成，提示词要点：将附件男子转换为保留五官特征的赛博动漫角色、黑色科技夹克、青色全息环、洋红轮廓光、深蓝背景、无文字无水印。生成结果位于 `images/boss-zxx.png`。用户提供的视频已制作成 `videos/zxx-stage.mp4`：前 30 秒包含序幕音轨和空白画面，后续为完整视频和原声。游戏只在第 30 秒后显示视频画面，并从同一个文件播放声音。`images/memory-stage.png` 保留为可替换素材。

## 替换 / 增加朋友关卡

资源目录为 `songs/`、`charts/`、`images/`、`videos/`、`bonus_pack/`。网站部署或 EXE 模式读取 JSON 配置，核心代码无需改动。

修改 `bonus_pack/zxx.json` 可替换 `bossImage`、`backgroundImage`、`video`、`bossName`、`title`、`verdict`、`song`、`chart`、`unlock`、`stages`。时间单位均为秒；当前配置为 `stages: {bossStart:20, videoStart:30}`、`videoIncludesIntro:true`、`continueOnMiss:true`。`videoIncludesIntro` 表示视频已经包含前 30 秒序幕，此时它作为唯一的有声播放器，不循环。资源路径均相对游戏根目录。

`mobileVideo` 可指定手机轻量视频；`missImages` 是失误时可随机闪现的照片路径数组，当前为 `images/miss-photo-01.png` 和 `images/miss-photo-02.png`；`missFlashDuration:0.5` 指定闪现秒数。替换照片与配置即可更换朋友素材，无需改核心代码。

替换视频时，运行 `python tools/beat/prepare_video.py "视频完整路径.mp4"`，自动生成序幕与视频原声的连续文件、四种难度的节奏谱面和相应配置，再运行构建脚本。需要 numpy 和 ffmpeg；找不到系统 ffmpeg 时可安装 imageio-ffmpeg。无需修改核心游戏代码。

EXE 支持同目录旁置资源覆盖内置资源：在 EXE 旁创建 `bonus_pack/zxx.json` 与配置所引用的 `images/`、`songs/`、`videos/`、`charts/` 即可，无需重新编译。网页目录的配置通过 HTTP 读取；直接使用 file:// 打开时浏览器限制 JSON 读取，使用内置配置。需要本地修改配置时可用静态服务器，或运行构建工具重新生成单文件 HTML。

要增加其他朋友关卡，在 `bonus_pack/index.json` 的 `packs` 数组中添加配置文件相对路径，例如 `bonus_pack/friend02.json`。每个配置具有 `version:1`、唯一 `id`、`song.id`、`chart`、`bossImage`、`backgroundImage`、`bossName`、`title`、`verdict`、`stages`。新增关卡在连接异常频段后出现在曲目库，并复用四轨判定。`zxx` 保留为默认关卡快捷入口。

谱面 JSON 是具有 EASY、NORMAL、HARD、INSANE 四个数组的对象。每个音符：`{"t":2.0,"lane":0,"type":"hold","duration":1.0,"target":0}`，轨道为 0–3，type 为 tap / hold / slide，滑动的 target 为相邻目标轨。滑动的目标时机是 t + duration。配置和素材请使用完整资源目录一起分享。

## 构建与测试

构建脚本在项目 `tools/beat/`。`make_content.py` 生成原创 WAV、谱面和原生 SVG 封面，需要 Python 与 numpy；如重新生成全部内容，应接着运行 `prepare_video.py` 恢复完整的视频关卡。`build.py` 使用 Windows 自带 .NET Framework C# 编译器，将资源嵌入单个 EXE，并导出离线单文件 HTML、站内模块化试玩和源码 ZIP。运行 `node tools/beat/test_engine.cjs` 检查判定、长按、滑动、谱面和存档校验，`node tools/beat/test_media.cjs` 检查 20 / 30 秒切换与移动端播放调用顺序，`node tools/beat/test_miss_flash.cjs` 检查失误照片触发条件、随机选择、500 ms 显示与清理。

音乐为代码合成的原创短曲，每首约 1 分钟，包含鼓、贝斯、和弦、主旋律和段落变化。游戏无需 CDN、登录或网络服务；默认资源全部包含在发行文件中。
