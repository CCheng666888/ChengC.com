/* ============ Hero 实时演示：冒泡排序迷你播放器（互换动画 · 放慢速度） ============ */
(function(){
	var steps = AlgoEngine.buildSteps('bubble', {});
	var cellsEl=document.getElementById('demo-cells'),
		descEl=document.getElementById('demo-desc'),
		stepEl=document.getElementById('demo-step'),
		playBtn=document.getElementById('demo-play'),
		resetBtn=document.getElementById('demo-reset'),
		speedSel=document.getElementById('demo-speed');
	var idx=0,timer=null,speeds={'0.5x':2400,'1x':1400,'2x':700,'4x':350},cur=1400;
	var cellEls=[],arrLen=0;

	function ensureCells(n){
		if(n===arrLen)return;
		cellsEl.innerHTML='';cellEls=[];arrLen=n;
		for(var i=0;i<n;i++){
			var c=document.createElement('div');
			c.className='dcell';
			var val=document.createElement('span');val.textContent='';
			var small=document.createElement('small');small.textContent='['+i+']';
			c.appendChild(val);c.appendChild(small);
			cellsEl.appendChild(c);cellEls.push(c);
		}
	}
	function flipSwap(i,j){
        if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
        var a=cellEls[i],b=cellEls[j];if(!a||!b)return;
        var ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect(),dx=rb.left-ra.left,dy=rb.top-ra.top;
        var duration=Math.min(480,cur*.65);
        a.animate([{transform:'translate('+dx+'px,'+dy+'px)'},{transform:'translate(0,0)'}],{duration:duration,easing:'ease-out'});
        b.animate([{transform:'translate('+(-dx)+'px,'+(-dy)+'px)'},{transform:'translate(0,0)'}],{duration:duration,easing:'ease-out'});
    }
	function render(){
        var previousBubble=cellsEl.querySelector('.demo-cmp-bubble');if(previousBubble)previousBubble.remove();
		var st=steps[idx],mk=st.marks||{};
		ensureCells(st.arr.length);
		st.arr.forEach(function(v,i){
			var c=cellEls[i];
			c.querySelector('span').textContent=v;
			c.className='dcell';
			if(mk.sorted&&mk.sorted.indexOf(i)>=0)c.className+=' d-sorted';
			if(mk.cmp&&mk.cmp.indexOf(i)>=0)c.className+=' d-cmp';
			if(mk.swap&&mk.swap.indexOf(i)>=0)c.className+=' d-swap';
			if(mk.cmp&&mk.cmp.length===2&&(i===mk.cmp[0]||i===mk.cmp[1]))c.className+=' d-move';
		});
		if(mk.swap&&mk.swap.length===2){
			var i0=mk.swap[0],j0=mk.swap[1];
			if(i0!==j0)flipSwap(i0,j0);
		}
		var oldP=document.querySelectorAll('.d-pointer');for(var pi=0;pi<oldP.length;pi++)oldP[pi].remove();
		var bubLeft=-1;
		if(mk.cmp&&mk.cmp.length===2){
			var oldB=document.querySelector('.demo-cmp-bubble');if(oldB)oldB.remove();
			bubLeft=Math.min(mk.cmp[0],mk.cmp[1]);
		}
		if(mk.pointers){
			var order={};
			for(var pk in mk.pointers){
				var idxv=mk.pointers[pk];
				if(order[idxv]===undefined)order[idxv]=0;
				var slot=order[idxv]++;
				var pd=document.createElement('div');
				pd.className='d-pointer d-pointer-'+pk;
				pd.textContent='▼ '+pk+'='+idxv;
				pd.style.left='-8px';
				pd.style.top=(-40-slot*22)+'px';
				cellEls[idxv].appendChild(pd);
			}
		}
		if(bubLeft>=0){
			var left=bubLeft,right=Math.max(mk.cmp[0],mk.cmp[1]);
			var bub=document.createElement('div');
			bub.className='demo-cmp-bubble';
			bub.textContent=st.arr[left]+' vs '+st.arr[right];
			bub.style.top='34px';
			bub.style.left=(left*60+8)+'px';
			bub.style.width=Math.max(70,(right-left)*60)+'px';
			cellsEl.appendChild(bub);
		}
		descEl.textContent=st.desc;
		stepEl.textContent='步骤 '+(idx+1)+' / '+steps.length+(idx>=steps.length-1?' · 已完成':'');
	}
	function stop(){if(timer){clearInterval(timer);timer=null;}cellEls.forEach(function(c){c.getAnimations().forEach(function(a){a.cancel();});});playBtn.textContent='播放';}
	function play(){stop();if(idx>=steps.length-1)idx=0;playBtn.textContent='暂停';timer=setInterval(function(){
		if(idx>=steps.length-1){stop();render();return;}
		idx++;render();
	},cur);}
	playBtn.addEventListener('click',function(){timer?stop():play();});
	resetBtn.addEventListener('click',function(){stop();idx=0;render();});
	speedSel.addEventListener('change',function(){cur=speeds[speedSel.value]||1400;if(timer)play();});
	document.getElementById('demo-next').addEventListener('click',function(){stop();idx=Math.min(idx+1,steps.length-1);render();});
	document.addEventListener('visibilitychange',function(){if(document.hidden)stop();});
	new IntersectionObserver(function(entries){if(!entries[0].isIntersecting)stop();}).observe(cellsEl);
	render();if(!matchMedia('(max-width:800px), (pointer:coarse), (prefers-reduced-motion: reduce)').matches && !navigator.connection?.saveData)play();
})();

;

/* ============ 算法卡片点击 → 弹窗动画演示（互换动画 + 目标栏） ============ */
(function(){
	var engine = AlgoEngine;
	var modal = document.getElementById('av-modal');
	var titleEl = document.getElementById('av-title');
	var goalEl = document.getElementById('av-goal');
	var cellsEl = document.getElementById('av-cells');
	var descEl = document.getElementById('av-desc');
	var stepEl = document.getElementById('av-step');
	var playBtn = document.getElementById('av-play');
	var resetBtn = document.getElementById('av-reset');
	var speedSel = document.getElementById('av-speed');
	var closeBtn = document.getElementById('av-close');
	var editBtn = document.getElementById('av-edit');
	var editPanel = document.getElementById('av-edit-panel');
	var editForm = document.getElementById('aep-form');
	var editCode = document.getElementById('aep-code');
	var editErr = document.getElementById('aep-err');
	var idx = 0, timer = null, cur = 1400;
	var speeds = {'0.5x':2400,'1x':1400,'2x':700,'4x':350};
	var steps = [], cellEls = [], arrLen = 0;
	var curAlgo = 'bubble', curOpts = {}, returnFocus=null;

	function ensureCells(n){
		if (n === arrLen) return;
		cellsEl.innerHTML = ''; cellEls = []; arrLen = n;
		for (var i = 0; i < n; i++){
			var c = document.createElement('div');
			c.className = 'av-cell';
			var val = document.createElement('span'); val.textContent = '';
			var small = document.createElement('small'); small.textContent = '[' + i + ']';
			c.appendChild(val); c.appendChild(small);
			cellsEl.appendChild(c); cellEls.push(c);
		}
	}
	function flipSwap(i,j){
        if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
        var a=cellEls[i],b=cellEls[j];if(!a||!b)return;
        var ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect(),dx=rb.left-ra.left,dy=rb.top-ra.top;
        var duration=Math.min(480,cur*.65);
        a.animate([{transform:'translate('+dx+'px,'+dy+'px)'},{transform:'translate(0,0)'}],{duration:duration,easing:'ease-out'});
        b.animate([{transform:'translate('+(-dx)+'px,'+(-dy)+'px)'},{transform:'translate(0,0)'}],{duration:duration,easing:'ease-out'});
    }
	function render(){
        document.getElementById('av-progress').max=steps.length-1;document.getElementById('av-progress').value=idx;document.getElementById('av-previous').disabled=idx===0;document.getElementById('av-next').disabled=idx===steps.length-1;
		var st = steps[idx], mk = st.marks || {};
		if (st.arr && st.arr.length) {
			ensureCells(st.arr.length);
			st.arr.forEach(function(v, i){
				var c = cellEls[i];
				c.querySelector('span').textContent = v;
				c.className = 'av-cell';
				if (mk.sorted && mk.sorted.indexOf(i) >= 0) c.className += ' av-sorted';
				if (mk.cmp && mk.cmp.indexOf(i) >= 0) c.className += ' av-cmp';
				if (mk.swap && mk.swap.indexOf(i) >= 0) c.className += ' av-swap';
			});
			if (mk.swap && mk.swap.length === 2) {
				var i0 = mk.swap[0], j0 = mk.swap[1];
				if (i0 !== j0) flipSwap(i0, j0);
			}
			var oldP = document.querySelectorAll('.av-pointer'); for (var pi = 0; pi < oldP.length; pi++) oldP[pi].remove();
			var oldB = document.querySelector('.av-bubble'); if (oldB) oldB.remove();
			var bubLeft = -1;
			if (mk.cmp && mk.cmp.length === 2 && typeof st.arr[mk.cmp[0]] === 'number') {
				bubLeft = Math.min(mk.cmp[0], mk.cmp[1]);
			}
			if (mk.pointers) {
				var order = {};
				for (var pk in mk.pointers) {
					var idxv = mk.pointers[pk];
					if (order[idxv] === undefined) order[idxv] = 0;
					var slot = order[idxv]++;
					var pd = document.createElement('div');
					pd.className = 'av-pointer av-pointer-' + pk;
					pd.textContent = '▼ ' + pk + '=' + idxv;
					pd.style.left = '-8px';
					pd.style.top = (-40 - slot * 22) + 'px';
					cellEls[idxv].appendChild(pd);
				}
			}
			if (bubLeft >= 0) {
				var left = bubLeft, right = Math.max(mk.cmp[0], mk.cmp[1]);
				var bub = document.createElement('div');
				bub.className = 'av-bubble';
				bub.textContent = st.arr[left] + ' vs ' + st.arr[right];
				bub.style.top = '2px';
				bub.style.left = '8px';
				cellsEl.appendChild(bub);
			}
		} else {
			cellsEl.innerHTML = ''; cellEls = []; arrLen = 0;
			var e = document.createElement('div');
			e.className = 'av-empty';
			e.textContent = st.desc;
			cellsEl.appendChild(e);
		}
		descEl.textContent = st.desc;
		stepEl.textContent = '步骤 ' + (idx + 1) + ' / ' + steps.length + (idx >= steps.length - 1 ? ' · 已完成' : '');
	}
	function stop(){ if (timer) { clearInterval(timer); timer = null; } cellEls.forEach(function(c){c.getAnimations().forEach(function(a){a.cancel();});});playBtn.textContent = '播放'; }
	function play(){ stop(); if (idx >= steps.length - 1) idx = 0; playBtn.textContent = '暂停'; timer = setInterval(function(){
		if (idx >= steps.length - 1) { stop(); render(); return; }
		idx++; render();
	}, cur); }
	function open(algoId, zh){
        returnFocus=document.activeElement;
		titleEl.textContent = '算法动图 · ' + zh;
		goalEl.textContent = engine.GOALS[algoId] || '';
		curAlgo = algoId; curOpts = {};
		editPanel.classList.remove('open');
		editErr.textContent = '';
		steps = engine.buildSteps(algoId, curOpts);
		idx = 0; cellEls = []; arrLen = 0;
		modal.classList.add('open');
		document.body.style.overflow = 'hidden';
		render();if(!matchMedia('(prefers-reduced-motion: reduce)').matches)play();
        closeBtn.focus();
	}
	function close(){ stop(); modal.classList.remove('open'); document.body.style.overflow = '';returnFocus?.focus(); }
	playBtn.addEventListener('click', function(){ timer ? stop() : play(); });
	resetBtn.addEventListener('click', function(){ stop(); idx = 0; render(); });
	speedSel.addEventListener('change', function(){ cur = speeds[speedSel.value] || 1400;if(timer)play(); });
    document.getElementById('av-next').addEventListener('click',function(){stop();idx=Math.min(idx+1,steps.length-1);render();});
    document.getElementById('av-previous').addEventListener('click',function(){stop();idx=Math.max(idx-1,0);render();});
    document.getElementById('av-progress').addEventListener('input',function(e){stop();idx=Number(e.target.value);render();});
    document.addEventListener('visibilitychange',function(){if(document.hidden)stop();});
    document.addEventListener('keydown',function(e){if(e.key!=='Tab'||!modal.classList.contains('open'))return;var focusable=[...modal.querySelectorAll('button,input,select,[tabindex]')].filter(function(el){return !el.disabled&&el.getClientRects().length;});var first=focusable[0],last=focusable[focusable.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
	closeBtn.addEventListener('click', close);
	modal.addEventListener('click', function(e){ if (e.target === modal) close(); });

	/* ===== 修改数据：仅允许修改数字，不接收文件/脚本（防注入） ===== */
	var DATA_CODES = {
		bubble: { params: [{key:'arr',label:'数组值（逗号分隔）',ph:'如 6,2,9,1,5'},{key:'size',label:'数组大小（数组值留空时随机）',ph:'2~15 的整数'}], code: `// 冒泡排序：每次比较相邻两数，把大的往后“冒”
var n = [[size]];                        // 【可改】数组大小（数组值留空时随机生成）
var a = [ [[arr]] ];                     // 【可改】数组值：逗号分隔，只允许数字
for (var i = 0; i < n - 1; i++) {        // 外层循环：共进行 n-1 轮
  for (var j = 0; j < n - 1 - i; j++) {  // 内层循环：比较相邻元素
    if (a[j] > a[j + 1]) {               // 逆序则交换
      var t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;
    }
  }
}` },
		select: { params: [{key:'arr',label:'数组值（逗号分隔）',ph:'如 6,2,9,1,5'},{key:'size',label:'数组大小（数组值留空时随机）',ph:'2~15 的整数'}], code: `// 选择排序：每轮选出未排序区的最小值放到最前
var n = [[size]];                        // 【可改】数组大小
var a = [ [[arr]] ];                     // 【可改】数组值
for (var i = 0; i < n - 1; i++) {        // 外层：已排序区末尾位置
  var min = i;                           // 假设当前为最小值
  for (var j = i + 1; j < n; j++) {      // 内层：找真正最小值
    if (a[j] < a[min]) min = j;
  }
  var t = a[i]; a[i] = a[min]; a[min] = t;  // 交换到已排序区
}` },
		insert: { params: [{key:'arr',label:'数组值（逗号分隔）',ph:'如 6,2,9,1,5'},{key:'size',label:'数组大小（数组值留空时随机）',ph:'2~15 的整数'}], code: `// 插入排序：像整理扑克牌，把每个元素插入已排序区
var n = [[size]];                        // 【可改】数组大小
var a = [ [[arr]] ];                     // 【可改】数组值
for (var i = 1; i < n; i++) {            // 外层：从第 2 个元素开始
  var key = a[i], j = i - 1;             // 取出待插入元素
  while (j >= 0 && a[j] > key) {         // 在已排序区中找插入位置
    a[j + 1] = a[j]; j--;                // 元素后移
  }
  a[j + 1] = key;                        // 插入到正确位置
}` },
		quick: { params: [{key:'arr',label:'数组值（逗号分隔）',ph:'如 6,2,9,1,5'},{key:'size',label:'数组大小（数组值留空时随机）',ph:'2~15 的整数'}], code: `// 快速排序：选基准 pivot，分区后递归排序
var n = [[size]];                        // 【可改】数组大小
var a = [ [[arr]] ];                     // 【可改】数组值
function sort(l, r) {                    // 递归：排序区间 [l, r]
  if (l >= r) return;
  var pivot = a[r], i = l;               // 取末尾为基准 pivot
  for (var j = l; j < r; j++) {          // 分区：小于 pivot 放左边
    if (a[j] < pivot) { swap(i, j); i++; }
  }
  swap(i, r);                            // pivot 归位
  sort(l, i - 1); sort(i + 1, r);        // 递归排序左右区间
}` },
		merge: { params: [{key:'arr',label:'数组值（逗号分隔）',ph:'如 6,2,9,1,5'},{key:'size',label:'数组大小（数组值留空时随机）',ph:'2~15 的整数'}], code: `// 归并排序：分而治之，两两合并有序区间
var n = [[size]];                        // 【可改】数组大小
var a = [ [[arr]] ];                     // 【可改】数组值
function sort(l, r) {                    // 递归：排序区间 [l, r]
  if (l >= r) return;
  var m = (l + r) >> 1;                  // 中间位置
  sort(l, m); sort(m + 1, r);            // 分别排序两半
  merge(l, m, r);                        // 合并两个有序区间
}` },
		heap: { params: [{key:'arr',label:'数组值（逗号分隔）',ph:'如 6,2,9,1,5'},{key:'size',label:'数组大小（数组值留空时随机）',ph:'2~15 的整数'}], code: `// 堆排序：建大顶堆，反复取出最大值
var n = [[size]];                        // 【可改】数组大小
var a = [ [[arr]] ];                     // 【可改】数组值
for (var i = (n >> 1) - 1; i >= 0; i--) heapify(i, n);  // 从最后一个非叶节点开始建堆
for (var i = n - 1; i > 0; i--) {        // 逐个取出堆顶最大值
  swap(0, i); heapify(0, i);             // 堆顶换到末尾，重新调整
}` },
		counting: { params: [{key:'arr',label:'数组值（逗号分隔）',ph:'如 3,1,2,1,3'},{key:'size',label:'数组大小（数组值留空时随机）',ph:'2~15 的整数'}], code: `// 计数排序：统计每个值的出现次数，按值回填
var n = [[size]];                        // 【可改】数组大小
var a = [ [[arr]] ];                     // 【可改】数组值（建议非负整数）
var max = Math.max.apply(null, a);       // 找最大值
var cnt = new Array(max + 1).fill(0);    // 计数数组
for (var i = 0; i < n; i++) cnt[a[i]]++; // 统计出现次数
var k = 0;
for (var v = 0; v <= max; v++)           // 按值从小到大回填
  while (cnt[v]--) a[k++] = v;` },
		shell: { params: [{key:'arr',label:'数组值（逗号分隔）',ph:'如 6,2,9,1,5'},{key:'size',label:'数组大小（数组值留空时随机）',ph:'2~15 的整数'}], code: `// 希尔排序：按间隔分组插入排序，间隔逐步缩小
var n = [[size]];                        // 【可改】数组大小
var a = [ [[arr]] ];                     // 【可改】数组值
for (var gap = n >> 1; gap > 0; gap >>= 1) {  // 间隔每次折半
  for (var i = gap; i < n; i++) {        // 对每组做插入排序
    var key = a[i], j = i - gap;
    while (j >= 0 && a[j] > key) { a[j + gap] = a[j]; j -= gap; }
    a[j + gap] = key;
  }
}` },
		binary: { params: [{key:'arr',label:'数组值（逗号分隔，需有序）',ph:'如 1,3,5,7,9,11'},{key:'size',label:'数组大小（数组值留空时随机）',ph:'2~15 的整数'},{key:'target',label:'要找的数 target',ph:'整数'}], code: `// 二分查找：在有序数组中查找目标值 target
var n = [[size]];                        // 【可改】数组大小
var a = [ [[arr]] ];                     // 【可改】数组值（需升序有序）
var target = [[target]];                 // 【可改】要找的数
var l = 0, r = n - 1;                    // 左右边界
while (l <= r) {                         // 区间不为空就继续
  var mid = (l + r) >> 1;                // 取中间位置
  if (a[mid] === target) return mid;     // 命中
  if (a[mid] < target) l = mid + 1;      // 去右半区找
  else r = mid - 1;                      // 去左半区找
}
return -1;                               // 未找到` },
		window: { params: [{key:'arr',label:'数组值（逗号分隔）',ph:'如 2,1,5,1,3,2'},{key:'size',label:'数组大小（数组值留空时随机）',ph:'2~15 的整数'},{key:'k',label:'窗口大小 k',ph:'1~数组长度'}], code: `// 滑动窗口：求定长 k 窗口的最大（和）
var n = [[size]];                        // 【可改】数组大小
var a = [ [[arr]] ];                     // 【可改】数组值
var k = [[k]];                           // 【可改】窗口大小
var sum = 0;
for (var i = 0; i < k; i++) sum += a[i]; // 初始窗口求和
var best = sum;                          // 记录最大值
for (var i = k; i < n; i++) {            // 窗口向右滑动
  sum += a[i] - a[i - k];                // 加入新元素、去掉旧元素
  best = Math.max(best, sum);            // 更新最大值
}` },
		prime: { params: [{key:'n',label:'要判断的数 n',ph:'2~999 的整数'}], code: `// 试除法判素数：判断 n 是否为素数
var n = [[n]];                           // 【可改】要判断的数
if (n < 2) return false;                 // 0、1 不是素数
for (var i = 2; i * i <= n; i++)         // 只需试除到 sqrt(n)
  if (n % i === 0) return false;         // 有因子则非素数
return true;                             // 无因子则为素数` },
		factor: { params: [{key:'n',label:'要分解的数 n',ph:'2~999 的整数'}], code: `// 质因数分解：把 n 分解为质因数的乘积
var n = [[n]];                           // 【可改】要分解的数
var factors = [];
for (var i = 2; i * i <= n; i++)         // 从小到大试除
  while (n % i === 0) { factors.push(i); n /= i; }
if (n > 1) factors.push(n);              // 剩余的大质因子
return factors;` },
		gcd: { params: [{key:'ab',label:'两个数 a, b（逗号分隔）',ph:'如 24,18'}], code: `// 辗转相除法：求 a 和 b 的最大公约数
var a = [[a]];                           // 【可改】第一个数
var b = [[b]];                           // 【可改】第二个数
while (b !== 0) {                        // 余数为 0 时终止
  var t = a % b; a = b; b = t;           // 辗转相除
}
return a;                                // 最后的 a 即最大公约数` },
		fib: { params: [{key:'n',label:'项数 n',ph:'2~79 的整数'}], code: `// 斐波那契数列：生成前 n 项
var n = [[n]];                           // 【可改】项数
var f = [0, 1];
for (var i = 2; i < n; i++)              // 每项等于前两项之和
  f[i] = f[i - 1] + f[i - 2];
return f;` },
	};

	function escHtml(t){ return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

	function openEdit(id){
		var spec = DATA_CODES[id];
		if (!spec) { editErr.textContent = '该算法暂不支持自定义数据'; return; }
		editErr.textContent = '';
		var curArr = (steps[0] && steps[0].arr) || [];
		var defT = curArr.indexOf(7) >= 0 ? 7 : (curArr[Math.floor(curArr.length / 2)] || 7);
		var defaults = { arr: curArr.join(','), size: curArr.length, target: defT, k: 3, n: 12, ab: '24,18' };
		var abp = String(defaults.ab).split(',');
		defaults.a = abp[0].trim(); defaults.b = abp[1].trim();
		var html = '';
		spec.params.forEach(function(p){
			html += '<label for="aep_in_' + p.key + '">' + p.label + '</label><input id="aep_in_' + p.key + '" type="text" value="' + escHtml(defaults[p.key]) + '" placeholder="' + escHtml(p.ph || '') + '">';
		});
		editForm.innerHTML = html;
		renderCode(id, defaults);
		editPanel.classList.add('open');
	}

	function renderCode(id, vals){
		var code = DATA_CODES[id].code;
		for (var k in vals) {
			code = code.split('[[' + k + ']]').join('<b class="dv">' + escHtml(vals[k]) + '</b>');
		}
		editCode.innerHTML = '<pre>' + code + '</pre>';
	}

	function applyEdit(){
		var id = curAlgo, spec = DATA_CODES[id];
		var errs = [];
		function gi(k){ var el = document.getElementById('aep_in_' + k); return el ? el.value.trim() : ''; }
		function intVal(v, name, lo, hi){
			if (!/^-?\d+$/.test(v)) { errs.push(name + ' 需为整数'); return null; }
			var x = parseInt(v, 10);
			if (x < lo || x > hi) { errs.push(name + ' 需在 ' + lo + '~' + hi + ' 之间'); return null; }
			return x;
		}
		var opts = {};
		var rawArr = gi('arr'), arr = null;
		if (rawArr) {
			var parts = rawArr.split(',');
			if (parts.length < 2 || parts.length > 15) errs.push('数组长度需在 2~15 之间');
			arr = [];
			for (var i = 0; i < parts.length; i++) {
				var pv = parts[i].trim();
				if (!/^-?\d+$/.test(pv)) { errs.push('数组只能包含整数，如 6,2,9,1,5'); break; }
				var vv = parseInt(pv, 10);
				if (vv < -99 || vv > 999) { errs.push('数组值需在 -99~999 之间'); break; }
				arr.push(vv);
			}
		} else if(spec.params.some(function(p){return p.key==='size';})) {
			var sz = intVal(gi('size'), '数组大小', 2, 15);
			if (sz !== null) {
				arr = [];
				if (id === 'binary') {
					var bv = Math.floor(Math.random() * 5) + 1;
					for (var j = 0; j < sz; j++) { arr.push(bv); bv += Math.floor(Math.random() * 3) + 1; }
				} else {
					for (var j = 0; j < sz; j++) arr.push(Math.floor(Math.random() * 20) + 1);
				}
			}
		}
		if (arr) opts.arr = arr;
		if(errs.length){editErr.textContent=errs.join('；');return;}
        var keys = spec.params.map(function(p){ return p.key; });
		if (keys.indexOf('target') >= 0) {
			var tRaw = gi('target');
			var t = intVal(tRaw, '要找的数 target', -999, 999);
			if (t !== null) {
				if (tRaw === '7' && arr.indexOf(7) < 0) {
					var midV = arr[Math.floor(arr.length / 2)] || 0;
					opts.target = midV;
					var ti = document.getElementById('aep_in_target');
					if (ti) ti.value = String(midV);
					editErr.textContent = '提示：目标 7 不在新数组中，已自动改为数组中的 ' + midV;
				} else {
					opts.target = t;
					if (arr.indexOf(t) < 0) editErr.textContent = '提示：目标 ' + t + ' 不在数组中，将演示“查找失败”的过程';
				}
			}
		}
		if (keys.indexOf('k') >= 0) {
			var k = intVal(gi('k'), '窗口大小 k', 1, (arr || []).length || 1);
			if (k !== null) opts.k = k;
		}
		if (keys.indexOf('n') >= 0) {
			var n = intVal(gi('n'), 'n', 2, id==='fib'?79:999);
			if (n !== null) opts.n = n;
		}
		if (keys.indexOf('ab') >= 0) {
			var ab = gi('ab').split(',');
			if (ab.length !== 2 || !/^-?\d+$/.test(ab[0].trim()) || !/^-?\d+$/.test(ab[1].trim())) errs.push('需输入两个整数，如 24,18');
			else {var aa=Number(ab[0]),bb=Number(ab[1]);if(!Number.isSafeInteger(aa)||!Number.isSafeInteger(bb)||Math.abs(aa)>999999999||Math.abs(bb)>999999999)errs.push('两个整数的绝对值不得超过 999999999');else opts.ab=[Math.abs(aa),Math.abs(bb)];}
		}
		if (errs.length) { editErr.textContent = errs.join('；'); return; }
		curOpts = opts;
		steps = engine.buildSteps(id, curOpts);
		idx = 0; cellEls = []; arrLen = 0;
		var g = engine.GOALS[id] || '';
		if (id === 'binary' && opts.target !== undefined) g = '目标：在有序数组中查找数字 ' + opts.target;
		if (id === 'window' && opts.k !== undefined) g = '目标：求定长 k=' + opts.k + ' 窗口的最大（和）';
		goalEl.textContent = g;
		editPanel.classList.remove('open');
		editErr.textContent = '';
		render();if(!matchMedia('(prefers-reduced-motion: reduce)').matches)play();
        closeBtn.focus();
	}

	editBtn.addEventListener('click', function(){ openEdit(curAlgo); });
	document.getElementById('aep-ok').addEventListener('click', applyEdit);
	document.getElementById('aep-cancel').addEventListener('click', function(){ editPanel.classList.remove('open'); editErr.textContent = ''; });
	document.getElementById('aep-close').addEventListener('click', function(){ editPanel.classList.remove('open'); editErr.textContent = ''; });
	document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && modal.classList.contains('open')) close(); });

	var zhMap = {};
	engine.ALGOS.forEach(function(a){ zhMap[a.id] = a.zh; });
	document.querySelectorAll('.algo-card').forEach(function(card){
		card.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();card.click();}});
        card.addEventListener('click', function(){
            card.focus();
			var id = card.getAttribute('data-algo');
			open(id, zhMap[id] || card.querySelector('h4').textContent);
		});
	});
})();
