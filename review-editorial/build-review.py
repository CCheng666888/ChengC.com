"""Build the isolated review from canonical content; never rewrite main pages."""
from pathlib import Path
from html.parser import HTMLParser
import html, json, re, hashlib, posixpath

REVIEW = Path(__file__).resolve().parent
ROOT = REVIEW.parent

class Element:
    def __init__(self, tag, attrs, start, content, parent=None):
        self.tag, self.attrs, self.start, self.content = tag, dict(attrs), start, content
        self.parent, self.children, self.end, self.close = parent, [], content, content
    def all(self, predicate):
        result = [self] if predicate(self) else []
        for child in self.children: result.extend(child.all(predicate))
        return result
    def cls(self, name): return name in self.attrs.get('class', '').split()

class Document(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=False)
        self.source = source
        self.offsets = [0]
        for line in source.splitlines(keepends=True): self.offsets.append(self.offsets[-1]+len(line))
        self.root = Element('root', [], 0, 0)
        self.stack = [self.root]
        self.feed(source)
    def position(self):
        line, col = self.getpos()
        return self.offsets[line-1]+col
    def handle_starttag(self, tag, attrs):
        start = self.position()
        node = Element(tag, attrs, start, start+len(self.get_starttag_text()), self.stack[-1])
        self.stack[-1].children.append(node)
        if tag not in {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}:
            self.stack.append(node)
        else: node.end = node.close = node.content
    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if self.stack[-1].tag == tag: self.stack.pop()
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1, 0, -1):
            if self.stack[i].tag == tag:
                node = self.stack[i]
                node.close = self.position()
                node.end = self.source.find('>',node.close)+1
                self.stack = self.stack[:i]
                break
    def all(self, predicate): return self.root.all(predicate)
    def one(self, predicate): return self.all(predicate)[0]
    def raw(self, node): return self.source[node.start:node.end]
    def inner(self, node): return self.source[node.content:node.close]
    def text(self, node): return html.unescape(re.sub('<[^>]+>', ' ', self.inner(node))).strip()

def esc(value): return html.escape(str(value), quote=True)
def write(name, content):
    path = REVIEW/name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding='utf-8', newline='\n')

canonical = [ROOT/'index.html', ROOT/'css/style.css', *list((ROOT/'js').glob('*.js')), *list((ROOT/'posts').glob('*.html'))]
baseline = {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in canonical}
write('qa/source-hashes.json', json.dumps(baseline, indent=2, ensure_ascii=False))
source = (ROOT/'index.html').read_text(encoding='utf-8')
doc = Document(source)
app = (ROOT/'js/app.js').read_text(encoding='utf-8')
posts = json.loads(re.search(r'const DEFAULT_POSTS = (\[.*?\]);', app, re.S).group(1))
about = Document((ROOT/'about.html').read_text(encoding='utf-8'))
projects = json.loads(about.inner(about.one(lambda n:n.attrs.get('id')=='productData')))
extras = [
    {'id':'yinian','name':'一念天下','description':'从秦开始的历史卡牌策略游戏。用有限的权力、信息与资源，面对历史事件，做出自己的选择。','version':'v0.3.0 · 网页 / Windows','status':'试玩版','category':'games','href':'play/yi-nian-tian-xia/','detail':'work/yi-nian-tian-xia.html','image':'assets/products/yinian-cover-desktop.webp','mobile':'assets/products/yinian-cover-mobile.webp'},
    {'id':'beat','name':'节拍失控！BEAT.exe','description':'四轨下落式音游，八首原创曲目、四种难度，支持键盘与触屏。','version':'v1.0.2 · 网页 / Windows','status':'可试玩与下载','category':'games','href':'play/beat-exe.html','detail':'work/upcoming-rhythm-game.html'},
    {'id':'schedule','name':'空课查询系统','description':'面向新媒体中心的纯前端空课查询工具，支持课节多选、全天交集与值班表。','version':'MIT 开源','status':'可在线使用','category':'tools','href':'Free-Schedule-Query-System/index.html','detail':'posts/schedule-query.html'},
    {'id':'dog','name':'DOG WALK','description':'移动遛狗、沿途互动与随机事件，一段轻松的日常。项目正在筹备。','version':'筹备中','status':'筹备中','category':'games','href':'work/upcoming-dog-walk.html','detail':'work/upcoming-dog-walk.html'}
]
detail_map = {'chenc':'index.html','gamestation':'https://chencgamedemo.netlify.app/','qa':'work/multi-book-qa.html','notes':'work/note-to-site.html','ming':'work/mingchronicles.html','badminton':'work/yujing.html','fish':'work/spongebob-vs-zombie-fish.html','defense':'work/underwater-defense.html'}
for p in projects: p['detail']=detail_map[p['id']]
qa = next(p for p in projects if p['id']=='qa')
qa['description']='六本书，326 条知识点。用语义检索找到相关内容，再由 AI 组织回答，让每个答案都有出处。'
qa['version']='语义检索 + AI · 已上线'
all_projects = [extras[0],qa,next(p for p in projects if p['id']=='notes'), *[p for p in projects if p['id'] not in {'qa','notes'}], *extras[1:]]

def root_link(url):
    return url if re.match(r'^(?:https?:|mailto:|#)',url) else ('index.html' if url=='index.html' else '../'+url)

def search_form(nav=False):
    ident='navSearchInput' if nav else 'searchInput'
    return f'''<form class="{'nav-search' if nav else 'blog-search'}" data-blog-search role="search"><label class="sr-only" for="{ident}">搜索文章标题与正文</label><div class="search-control"><span class="search-icon" aria-hidden="true">⌕</span><input id="{ident}" type="text" autocomplete="off" placeholder="{'搜索文章' if nav else '搜索标题、摘要或正文…'}"><button type="button" data-search-clear aria-label="清空搜索" hidden>×</button><span class="search-firefly" aria-hidden="true"><video muted loop playsinline></video></span><canvas class="search-effects" aria-hidden="true"></canvas></div>{'<div id="navSearchResults" class="nav-search-results" hidden><p id="navSearchStatus" aria-live="polite"></p><ul id="navSearchList" role="listbox"></ul><button type="submit" data-search-all>查看全部结果 ↗</button></div>' if nav else ''}<span data-search-hint class="sr-only"></span></form>'''

def header(article=False):
    base='../index.html' if article else ''
    return f'''<header class="site-header"><div class="nav-shell"><a class="brand" href="{base or '#top'}" aria-label="ChenC 首页">ChenC<span>.</span></a><nav class="quick-nav" aria-label="常用导航"><a href="{base}#blog">Blog</a><a href="{base}#projects">Projects</a></nav>{'' if article else search_form(True)}<nav class="nav-links" id="navLinks" aria-label="主导航"><a href="{base}#blog">Blog</a><a href="{base}#projects">Projects</a><a href="{base}#journal">Recent</a><a href="{base}#about">About</a><a href="{base}#contact">Contact</a></nav><div class="nav-actions">{'<button id="musicToggle" class="icon-button" type="button" aria-label="打开音乐播放器" aria-expanded="false">♫</button><button id="mobileSearchToggle" class="icon-button mobile-search-toggle" type="button" aria-expanded="false" aria-controls="navSearchInput" aria-label="搜索文章">⌕</button>' if not article else ''}<button id="themeToggle" class="icon-button" type="button" aria-label="切换深色主题">◐</button><button id="menuToggle" class="icon-button menu-toggle" type="button" aria-expanded="false" aria-controls="navLinks" aria-label="打开导航菜单">☰</button></div></div></header>'''

def head(title,article=False):
    base='../' if article else ''
    return f'''<!doctype html><html lang="zh-CN" class="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#f5f3ee"><meta name="robots" content="noindex,nofollow"><title>{esc(title)} · ChenC / 审核副本</title><link rel="icon" href="{base}../assets/avatar.jpg"><link rel="stylesheet" href="{base}css/editorial.css"><script src="{base}js/theme.js"></script></head>'''

def card(p):
    return f'''<article class="post-card" data-post-id="{p['id']}"><a class="post-link" href="{p['url']}"><div class="post-top"><span class="post-tag tag-{p['category']}">{'学习' if p['category']=='study' else '生活'}</span><time datetime="{p['date'].replace('/','-')}">{p['date'].replace('/','.')}</time></div><h3 class="post-title">{esc(p['title'])}</h3><p class="post-content">{esc(p['content'])}</p><span class="read-more">阅读全文 <span aria-hidden="true">↗</span></span></a></article>'''

recent=doc.all(lambda n:n.cls('timeline-item'))
recent_links={'AI 上线':'../work/multi-book-qa.html','大模型':'posts/ai-web-security.html','BEAT.exe':'../work/upcoming-rhythm-game.html','一念天下':'../work/yi-nian-tian-xia.html','建站记录':'posts/building-this-site.html','语义问答':'posts/multi-book-qa.html','Linux':'posts/linux-commands.html','空课':'posts/schedule-query.html','三下乡':'posts/summer-support-teaching.html','通讯':'../contact.html','个人空间':'../about.html','作品详情':'#projects','游戏项目':'../games.html','第一篇':'posts/hello-world.html','网站建立':'posts/hello-world.html'}
def recent_item(n):
    text=doc.text(n)
    url=next((url for key,url in recent_links.items() if key in text),None)
    raw=doc.raw(n)
    if url: raw=re.sub(r'(<h3>)(.*?)(</h3>)',lambda m:m[1]+f'<a href="{url}">'+m[2]+' <span aria-hidden="true">↗</span></a>'+m[3],raw,count=1,flags=re.S)
    return raw
def project_row(p,number):
    return f'''<a class="project-row" href="{root_link(p['detail'])}"><span class="project-number">{number:02}</span><div><h3>{esc(p['name'])}</h3><p>{esc(p['description'])}</p></div><span class="project-meta"><span>{'工具' if p['category']=='tools' else '游戏' if p['category']=='games' else '网站'}</span><span>{esc(p['version'])}</span></span><span class="project-arrow" aria-hidden="true">↗</span></a>'''

modal = source[source.index('<div id="privateOverlay"'):source.index('  <div class="tools"')]
modal = re.sub(r'href="(?!https?:|#)([^"]+)"',lambda m:'href="../'+m[1]+'"',modal)
controls=''.join(f'''<label class="slider" for="{name}"><span class="slider-top"><span>{label}</span><output id="{name}Value" for="{name}">{value}%</output></span><input id="{name}" type="range" min="0" max="100" value="{value}"></label>''' for name,label,value in [('density','湖面起伏',65),('speed','风的速度',35),('mist','山间云雾',40),('glow','水面微光',60),('lanterns','渔灯密度',55)])
home = head('山海之间，记录日常')+f'''<body class="review-home"><a class="skip-link" href="#main">跳到博客内容</a><section class="hero" id="top" aria-label="当前封面：苍山洱海"><h1 class="sr-only">ChenC · 山海之间，记录日常</h1><div class="photo-frame" id="landscapeArt" data-night-image="../assets/cangshan-erhai-night.webp" data-night-image-mobile="../assets/cangshan-erhai-night-mobile.webp"><picture id="coverPicture"><source media="(max-width: 800px)" srcset="../assets/cangshan-erhai-mobile.webp"><img id="coverImage" src="../assets/cangshan-erhai.webp" width="1672" height="941" alt="苍山的雪峰与洱海，天光落在湖面上。" fetchpriority="high" decoding="async"></picture><canvas id="water" aria-hidden="true"></canvas><canvas id="particles" aria-hidden="true"></canvas><div class="photo-mark"><a href="#blog">ChenC.</a><span>山海之间，记录日常。</span></div><div class="photo-caption"><span>01 — CURRENT EDITION</span><span id="editionTitle">苍山 · 洱海</span></div><a class="scroll-cue" href="#blog"><span>向下，翻开下一页</span><span aria-hidden="true">↓</span></a><button id="settingsToggle" class="photo-settings-button" type="button" aria-expanded="false" aria-controls="settings">照片设置 <span aria-hidden="true">↗</span></button><aside id="settings" class="settings" aria-label="封面照片设置" hidden><div class="settings-head"><h2>苍山 · 洱海</h2><button id="settingsClose" class="icon-button" type="button" aria-label="关闭照片设置">×</button></div><div class="settings-foot"><button id="nightToggle" type="button" aria-pressed="false">切换夜色</button><button id="pauseToggle" type="button" aria-pressed="true">开启山水动画</button></div><div id="legacyControls">{controls}</div><div class="settings-foot"><button id="reset" type="button">恢复默认</button><button id="sceneToggle" type="button" aria-pressed="false">只看风景</button></div><p class="settings-note" id="motionNote">默认展示静态封面。五项参数沿用原站山水设置，在主动开启动画后生效。</p><p class="sr-only" id="sceneHint">照片之后是博客与项目，始终可以正常向下滚动。</p></aside></div></section>
{header()}<main id="main"><section class="journal-section section" id="blog"><div class="section-topline"><span>01 / WRITING</span><span>学习、生活，以及一路上的发现。</span></div><div class="blog-masthead"><div class="stage-papers" aria-hidden="true"><div class="stage-paper paper-one"><span>CHENC / JOURNAL</span><b>想法，<br>落在纸上。</b><small>04 OCT 2026</small></div><div class="stage-paper paper-two"><span>NOTES & STORIES</span><b>记录，<br>保持生长。</b><small>03 OCT 2026</small></div><div class="stage-paper paper-three"><span>FROM THE ARCHIVE</span><b>山海之间。</b><small>SINCE 2026</small></div></div><h2>Journal<span class="masthead-dot">.</span></h2><div class="masthead-note"><span>博客 / 文章</span><p>把学到的、做过的、<br>值得记住的，写下来。</p></div></div><div class="blog-toolbar"><div class="filters" role="group" aria-label="文章分类"><button type="button" class="filter-btn active" data-filter="all" aria-pressed="true">全部</button><button type="button" class="filter-btn" data-filter="study" aria-pressed="false">学习</button><button type="button" class="filter-btn" data-filter="life" aria-pressed="false">生活</button></div>{search_form()}<span id="postCount" aria-live="polite">共 8 条</span></div><div id="postsContainer" class="posts-grid">{''.join(card(p) for p in posts)}</div></section>
<section class="projects-section" id="projects"><div class="section"><div class="section-topline"><span>02 / SELECTED WORK</span><a href="../about.html#products">原站作品介绍 ↗</a></div><div class="section-title"><h2>Made, with care<span>.</span></h2><span>项目 / 工具与游戏</span></div><a class="project-feature" href="../work/yi-nian-tian-xia.html"><div class="project-feature-copy"><span class="eyebrow">01 / 历史卡牌策略</span><h3>一念天下</h3><p>{esc(extras[0]['description'])}</p><div class="project-feature-bottom"><span>v0.3.0 · 试玩版</span><span>查看项目 ↗</span></div></div><picture><source media="(max-width:800px)" srcset="../assets/products/yinian-cover-mobile.webp"><img src="../assets/products/yinian-cover-desktop.webp" width="1280" height="720" loading="lazy" decoding="async" alt="一念天下：秦宫与山河的游戏封面"></picture></a><div class="project-list">{''.join(project_row(p,i+2) for i,p in enumerate(all_projects[1:3]))}</div><details class="project-archive"><summary><span>查看全部项目</span><span>12 个作品 / 包含筹备项目 <span aria-hidden="true">＋</span></span></summary><div class="project-list">{''.join(project_row(p,i+4) for i,p in enumerate(all_projects[3:]))}</div><p class="archive-links"><a href="../tools.html">原站工具页 ↗</a><a href="../games.html">原站游戏页 ↗</a></p></details></div></section>
<section class="section recent-section" id="journal"><div class="section-topline"><span>03 / THE ONGOING</span><span>持续更新的个人档案</span></div><div class="section-title"><h2>Recently<span>.</span></h2><span>最近动态</span></div><div class="timeline">{''.join(recent_item(n) for n in recent[:6])}</div><details class="recent-archive"><summary><span>更早的动态</span><span>16 条记录 <span aria-hidden="true">＋</span></span></summary><div class="timeline">{''.join(recent_item(n) for n in recent[6:])}</div></details></section>
<section class="section about-section" id="about"><div class="section-topline"><span>04 / THE PERSON BEHIND</span><span>关于 ChenC</span></div><div class="about-layout"><a class="portrait-link" href="../about.html"><img src="../assets/avatar.jpg" width="640" height="639" loading="lazy" decoding="async" alt="ChenC 的个人头像"></a><div class="about-copy"><span class="eyebrow">山海之间，记录日常。</span><h2>你好，<br>我是 ChenC<span>.</span></h2><p>这里是我的数字花园：整理学习笔记，也收藏生活里值得记住的小事。</p><p>学习、生活与创造，慢慢汇成这个个人空间。</p><div class="about-links"><a href="../about.html">进入个人空间 ↗</a><button id="privateBtn" class="text-button" type="button">Private ↗</button></div></div></div></section>
<section class="contact-section section" id="contact"><div class="section-topline"><span>05 / KEEP IN TOUCH</span><span>联系</span></div><a class="contact-link" href="../contact.html"><span>保持联系<span class="masthead-dot">.</span></span><span aria-hidden="true">↗</span></a><p>联系方式正在全力更新。先到原有的联系页面坐坐。</p></section></main><footer class="site-footer section"><span>© 2026 ChenC · 山海之间</span><div><a href="../index.html">返回原版网站 ↗</a><span class="review-label">设计审核副本</span><button id="backToTop" class="text-button" type="button">回到照片 ↑</button></div></footer>{modal}<script src="js/cover-editions.js" defer></script><script src="js/blog-search.js" defer></script><script src="js/app.js" defer></script><script src="js/review.js" defer></script><script src="js/search-firefly.js" defer></script><script src="js/music.js" defer></script><script src="../js/private.js" defer></script></body></html>'''
home=home.replace('../about.html#products','../about.html#portfolio')
home=home.replace('想法，<br>落在纸上。','AI 与 Web<br>安全笔记').replace('记录，<br>保持生长。','我的小站，<br>是这样搭的。').replace('<b>山海之间。</b><small>SINCE 2026','<b>六本书，<br>一个问答台。</b><small>22 SEP 2026')
home=home.replace('这里是我的数字花园：整理学习笔记，也收藏生活里值得记住的小事。',esc('这里是我的数字花园。我会记录正在学习的知识、生活中的小事，以及从想法到成品的创作过程。希望这些内容和作品也能给你一点灵感。'))
write('index.html',home)

for name in ['theme.js','blog-search.js','blog-search-index.js','search-firefly.js','music.js']:
    content=(ROOT/'js'/name).read_text(encoding='utf-8')
    if name in {'search-firefly.js','music.js'}: content=content.replace("'assets/", "'../assets/").replace('"assets/', '"../assets/')
    write('js/'+name,content)
# Review reads existing local notes, but cannot delete or alter their storage.
app=re.sub(r"\$\{p\.builtin \? '' : `<div class=\"post-actions\">.*?</div>`\}", '',app)
start=app.index('    const remove = event.target.closest')
end=app.index('\n  });',start)
app=app[:start]+app[end:]
app=app.replace("const url = new URL(post.url, location.href);", "const url = new URL(post.url, post.builtin ? location.href : new URL('../index.html', location.href));")
app=app.replace("? post.url : '';", "? (post.builtin ? post.url : url.href) : '';")
write('js/app.js',app)

def adapt_article_links(fragment):
    def replace(m):
        url=html.unescape(m[2])
        if re.match(r'^(?:https?:|mailto:|data:|#)',url): return m[0]
        match=re.match(r'([^?#]*)(.*)',url)
        path,tail=match.groups()
        target=posixpath.normpath(posixpath.join('posts',path))
        if target.startswith('posts/'): new=target[6:]
        elif target=='index.html': new='../index.html'
        else: new='../../'+target
        return m[1]+'="'+esc(new+tail)+'"'
    return re.sub(r'(href|src)="([^"]+)"',replace,fragment)

article_manifest=[]
for path in sorted((ROOT/'posts').glob('*.html')):
    d=Document(path.read_text(encoding='utf-8'))
    body=d.one(lambda n:n.cls('article-body') or n.cls('refs-body'))
    fragment=d.inner(body)
    nested=d.all(lambda n:n.cls('article-head'))
    if nested: fragment=fragment.replace(d.raw(nested[0]),'')
    item=next((p for p in posts if p['url']=='posts/'+path.name),None)
    title=item['title'] if item else '星间文献库 · 参考文献'
    date=item['date'].replace('/','.') if item else '2026.10.04'
    category=('学习' if item['category']=='study' else '生活') if item else '文献 / 22 条'
    raw=adapt_article_links(fragment)
    raw=raw.replace('<iframe ', '<iframe loading="lazy" ')
    result=head(title,True)+f'''<body class="review-article"><a class="skip-link" href="#articleBody">跳到文章正文</a>{header(True)}<main class="article-shell" id="main"><div class="article-breadcrumb"><a href="../index.html#blog">← 返回博客</a><span>CHENC / JOURNAL</span></div><article><header class="reading-header"><div class="reading-meta"><span>{category}</span><time>{date}</time></div><h1>{esc(title)}</h1>{'<p class="reading-lead">'+esc(item['content'])+'</p>' if item else ''}<div class="reading-rule"><span>记录 / {date[:4]}</span><span>ChenC.</span></div></header><div class="article-body" id="articleBody">{raw}</div></article><nav class="reading-footer" aria-label="文章导航"><a href="../index.html#blog">← 所有文章</a><a href="../index.html#projects">看看项目 ↗</a></nav></main><footer class="site-footer section"><span>© 2026 ChenC</span><span class="review-label">设计审核副本</span></footer><script src="../js/article.js" defer></script></body></html>'''
    write('posts/'+path.name,result)
    text_of=lambda s:html.unescape(re.sub('<[^>]+>', '',s))
    article_manifest.append({'file':path.name,'title':title,'bodySourceHash':hashlib.sha256(fragment.encode()).hexdigest(),'bodyCopyHash':hashlib.sha256(raw.encode()).hexdigest(),'textRetained':text_of(fragment)==text_of(raw)})
write('qa/content-manifest.json',json.dumps({'articles':article_manifest,'posts':len(posts),'recent':len(recent),'projects':len(all_projects)},ensure_ascii=False,indent=2))
print(f'Generated isolated review: {len(posts)} posts, {len(recent)} updates, {len(all_projects)} projects, {len(article_manifest)} article pages.')
