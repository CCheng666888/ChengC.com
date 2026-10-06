(() => {
  'use strict';
  const body = document.body;
  const sceneToggle = document.getElementById('sceneToggle');
  const pauseToggle = document.getElementById('pauseToggle');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const chapters = {
    study: {number:'01', caption:'把每一页，变成下一步。', label:'阅读我的文章', href:'index.html#blog', name:'学习'},
    life: {number:'02', caption:'沿着日常，走进故事。', label:'翻开生活记录', href:'index.html#journal', name:'生活'},
    create: {number:'03', caption:'让一个想法，有了形状。', label:'试玩我的游戏', href:'games.html', name:'创造'}
  };
  const buttons = [...document.querySelectorAll('.chapter-button')];
  function selectChapter(chapter) {
    const item = chapters[chapter];
    if (!item) return;
    body.dataset.chapter = chapter;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.chapter === chapter)));
    document.getElementById('artChapter').textContent = `CHAPTER ${item.number}`;
    document.getElementById('artNumber').textContent = item.number;
    document.getElementById('artCaption').textContent = item.caption;
    document.getElementById('chapterEntry').setAttribute('href', item.href);
    document.getElementById('chapterEntryLabel').textContent = item.label;
    document.getElementById('chapterStatus').textContent = `已切换到${item.name}章节。${item.caption}`;
  }
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => selectChapter(button.dataset.chapter));
    button.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % buttons.length;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + buttons.length - 1) % buttons.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = buttons.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      buttons[next].focus();
      selectChapter(buttons[next].dataset.chapter);
    });
  });
  function setScene(only) {
    body.classList.toggle('scene-only', only);
    sceneToggle.textContent = only ? '显示个人页' : '只看画面';
    sceneToggle.setAttribute('aria-pressed', String(only));
    if (only) scrollTo({top:0,behavior:'instant'});
  }
  sceneToggle.addEventListener('click', () => setScene(!body.classList.contains('scene-only')));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && body.classList.contains('scene-only')) { setScene(false); sceneToggle.focus(); } });
  let userPaused = matchMedia('(max-width:800px), (pointer:coarse)').matches || Boolean(navigator.connection?.saveData);
  function updateMotion() {
    const paused = userPaused || reduced.matches;
    body.classList.toggle('motion-paused', paused);
    pauseToggle.setAttribute('aria-pressed', String(paused));
    pauseToggle.textContent = reduced.matches ? '已减少动态' : paused ? '继续动画' : '暂停动画';
    pauseToggle.disabled = reduced.matches;
  }
  pauseToggle.addEventListener('click', () => { userPaused = !userPaused; updateMotion(); });
  reduced.addEventListener('change', updateMotion);
  updateMotion();
  const meta = document.querySelector('meta[name="theme-color"]');
  const updateThemeColor = () => { if (meta) meta.content = document.documentElement.classList.contains('light') ? '#eee9dc' : '#131311'; };
  new MutationObserver(updateThemeColor).observe(document.documentElement, {attributes:true,attributeFilter:['class']});
  updateThemeColor();
})();
