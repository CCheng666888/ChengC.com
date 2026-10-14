/**
 * algo-engine.js — 算法动图 Algo-Vis 共享动画引擎
 * 供 VS Code 扩展 Webview、Obsidian 插件、网页版共同复用。
 * 职责：识别算法 → 生成演示步骤 → 渲染播放。
 * 导出：AlgoEngine（UMD 风格，兼容 importScripts / CommonJS / 全局变量）
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.AlgoEngine = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ===== 算法识别 ===== */
  var ALGOS = [
    { id: "bubble", zh: "冒泡排序", en: "bubble sort", test: /a\s*\[\s*j\s*\]\s*[<>]\s*a\s*\[\s*j\s*\+\s*1\s*\]|a\[j\]\s*>\s*a\[j\+1\]|bubble/i },
    { id: "select", zh: "选择排序", en: "selection sort", test: /min\s*=\s*i|select/i },
    { id: "insert", zh: "插入排序", en: "insertion sort", test: /key\s*=\s*a\s*\[\s*i\s*\]|insert/i },
    { id: "quick", zh: "快速排序", en: "quicksort", test: /quick\s*sort|partition|quick/i },
    { id: "merge", zh: "归并排序", en: "merge sort", test: /merge\s*sort|mergeSort|merge\s*\(/i },
    { id: "heap", zh: "堆排序", en: "heapsort", test: /heap\s*sort|heapify|heap/i },
    { id: "counting", zh: "计数排序", en: "counting sort", test: /counting\s*sort|count\s*sort|counting/i },
    { id: "shell", zh: "希尔排序", en: "shell sort", test: /shell\s*sort|shell/i },
    { id: "binary", zh: "二分查找", en: "binary search", test: /mid\s*=\s*\(\s*l\s*\+\s*r\s*\)|binary|half/i },
    { id: "window", zh: "滑动窗口", en: "sliding window", test: /a\s*\[\s*i\s*-\s*k\s*\]|window|slide/i },
    { id: "prime", zh: "试除法判素数", en: "prime trial", test: /i\s*\*\s*i\s*<=\s*n|prime|素数/i },
    { id: "factor", zh: "质因数分解", en: "prime factors", test: /x\s*%\s*i\s*==\s*0|factor|分解/i },
    { id: "gcd", zh: "辗转相除 GCD", en: "gcd", test: /gcd|%\s*b|取模/i },
    { id: "fib", zh: "斐波那契数列", en: "fibonacci", test: /fib|f\s*\[\s*i\s*\]\s*=\s*f\s*\[\s*i\s*-\s*1\s*\]\s*\+\s*f\s*\[\s*i\s*-\s*2\s*\]/i },
  ];

  function detectAlgorithm(code) {
    if (!code) return { id: "step", zh: "代码步进模式", en: "step mode" };
    var c = String(code);
    for (var i = 0; i < ALGOS.length; i++) {
      if (ALGOS[i].test.test(c)) return ALGOS[i];
    }
    return { id: "step", zh: "代码步进模式", en: "step mode" };
  }

  /* ===== 算法目的说明（播放器标题下展示，让用户知道在做什么/找什么） ===== */
  var GOALS = {
    bubble: "目标：把无序数组从小到大排序",
    select: "目标：每轮选出最小值放到已排序区末尾",
    insert: "目标：逐个取出元素，插入到已排序区正确位置",
    quick: "目标：选基准 pivot 分区，递归排序左右区间",
    merge: "目标：两两归并有序区间，最终完成排序",
    heap: "目标：利用大顶堆，逐个取出最大值完成排序",
    counting: "目标：统计每个值的出现次数，按值从小到大回填",
    shell: "目标：按间隔 gap 分组插入排序，逐步缩小间隔",
    binary: "目标：在有序数组中查找数字 7",
    window: "目标：求定长滑动窗口的最大（和）",
    prime: "目标：判断一个数是否为素数",
    factor: "目标：把一个数分解为质因数的乘积",
    gcd: "目标：用辗转相除法求两数的最大公约数",
    fib: "目标：生成斐波那契数列",
    step: "目标：逐行模拟代码执行过程",
  };

  /* ===== 默认演示输入 ===== */
  var DEFAULT_ARR = [6, 2, 9, 1, 5];

  /* ===== 步骤生成器 ===== */
  function genBubble(arr) {
    var a = arr.slice(), n = a.length, steps = [];
    var push = function (desc, marks) { steps.push({ desc: desc, marks: marks || {}, arr: a.slice() }); };
    push("目标：把数组从小到大排序。初始数组：" + a.join(" "));
    for (var i = 0; i < n - 1; i++) {
      for (var j = 0; j < n - 1 - i; j++) {
        push("比较 a[" + j + "]=" + a[j] + " 与 a[" + (j + 1) + "]=" + a[j + 1], { cmp: [j, j + 1] });
        if (a[j] > a[j + 1]) {
          var t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;
          push("a[" + j + "] > a[" + (j + 1) + "]，交换位置", { swap: [j, j + 1] });
        }
      }
      var sorted = [];
      for (var k = n - 1 - i; k < n; k++) sorted.push(k);
      push("第 " + (i + 1) + " 轮结束，末尾 " + (i + 1) + " 个元素已就位", { sorted: sorted });
    }
    var all = [];
    for (var m = 0; m < n; m++) all.push(m);
    push("排序完成：" + a.join(" "), { sorted: all });
    return steps;
  }

  function genSelect(arr) {
    var a = arr.slice(), n = a.length, steps = [];
    var push = function (desc, marks) { steps.push({ desc: desc, marks: marks || {}, arr: a.slice() }); };
    push("目标：每轮选出最小值放到前面。初始数组：" + a.join(" "));
    for (var i = 0; i < n - 1; i++) {
      var min = i;
      push("第 " + (i + 1) + " 轮：假设 a[" + min + "]=" + a[min] + " 为当前最小值", { cmp: [min] });
      for (var j = i + 1; j < n; j++) {
        push("比较 a[" + j + "]=" + a[j] + " 与当前最小值 a[" + min + "]=" + a[min], { cmp: [min, j] });
        if (a[j] < a[min]) { min = j; push("发现更小值：a[" + min + "]=" + a[min], { cmp: [min] }); }
      }
      if (min !== i) {
        var t = a[i]; a[i] = a[min]; a[min] = t;
        push("交换 a[" + i + "] 与 a[" + min + "]，最小值就位", { swap: [i, min], sorted: [i] });
      } else {
        push("a[" + i + "] 已是最小值，无需交换", { sorted: [i] });
      }
    }
    var all = [];
    for (var k = 0; k < n; k++) all.push(k);
    push("排序完成：" + a.join(" "), { sorted: all });
    return steps;
  }

  function genInsert(arr) {
    var a = arr.slice(), n = a.length, steps = [];
    var push = function (desc, marks) { steps.push({ desc: desc, marks: marks || {}, arr: a.slice() }); };
    push("目标：逐个取出元素插入到已排序区。初始数组：" + a.join(" "));
    for (var i = 1; i < n; i++) {
      var key = a[i], j = i - 1;
      push("取出 key=a[" + i + "]=" + key + "，向左寻找插入位置", { cmp: [i] });
      while (j >= 0 && a[j] > key) {
        push("a[" + j + "]=" + a[j] + " > key=" + key + "，后移一位", { cmp: [j, j + 1] });
        a[j + 1] = a[j]; j--;
        push("a[" + (j + 1) + "] 已后移", { swap: [j + 1, j + 2].filter(function (x) { return x >= 0 && x < n; }) });
      }
      a[j + 1] = key;
      push("key=" + key + " 插入到 a[" + (j + 1) + "]", { sorted: [j + 1] });
    }
    var all = [];
    for (var k = 0; k < n; k++) all.push(k);
    push("排序完成：" + a.join(" "), { sorted: all });
    return steps;
  }

  function genQuick(arr) {
    var a = arr.slice(), steps = [];
    var push = function (desc, marks) { steps.push({ desc: desc, marks: marks || {}, arr: a.slice() }); };
    push("目标：选基准分区，递归排序。初始数组：" + a.join(" "));
    (function qs(l, r) {
      if (l >= r) return;
      var pivot = a[r], i = l - 1;
      push("选基准 pivot=a[" + r + "]=" + pivot + "，区间 [" + l + "," + r + "]", { cmp: [r], pointers: { l: l, r: r, pivot: r } });
      for (var j = l; j < r; j++) {
        push("比较 a[" + j + "]=" + a[j] + " 与 pivot=" + pivot, { cmp: [j, r], pointers: { l: l, r: r, pivot: r } });
        if (a[j] < pivot) {
          i++;
          if (i !== j) {
            var t = a[i]; a[i] = a[j]; a[j] = t;
            push("a[" + j + "] < pivot，交换到左区 a[" + i + "]", { swap: [i, j], pointers: { l: l, r: r, pivot: r } });
          }
        }
      }
      var t2 = a[i + 1]; a[i + 1] = a[r]; a[r] = t2;
      push("pivot 归位到 a[" + (i + 1) + "]，左小右大", { swap: [i + 1, r], sorted: [i + 1], pointers: { l: l, r: r } });
      qs(l, i);
      qs(i + 2, r);
    })(0, a.length - 1);
    var all = [];
    for (var k = 0; k < a.length; k++) all.push(k);
    push("排序完成：" + a.join(" "), { sorted: all });
    return steps;
  }

  function genMerge(arr) {
    var a = arr.slice(), n = a.length, steps = [];
    var push = function (desc, marks) { steps.push({ desc: desc, marks: marks || {}, arr: a.slice() }); };
    push("目标：两两归并有序区间完成排序。初始数组：" + a.join(" "));
    (function ms(l, r) {
      if (l >= r) return;
      var m = (l + r) >> 1;
      push("分割区间 [" + l + "," + r + "] → 左 [" + l + "," + m + "] 右 [" + (m + 1) + "," + r + "]", { cmp: [l, r], pointers: { l: l, r: r, mid: m } });
      ms(l, m); ms(m + 1, r);
      var left = a.slice(l, m + 1), right = a.slice(m + 1, r + 1), i = 0, j = 0, k = l;
      var tmp = a.slice();
      while (i < left.length && j < right.length) {
        push("比较左区 " + left[i] + " 与右区 " + right[j], { cmp: [l + i, m + 1 + j], pointers: { l: l, r: r, mid: m } });
        if (left[i] <= right[j]) { tmp[k] = left[i]; push("取较小值 " + left[i] + " 写入 a[" + k + "]", { swap: [k], pointers: { l: l, r: r, mid: m } }); i++; }
        else { tmp[k] = right[j]; push("取较小值 " + right[j] + " 写入 a[" + k + "]", { swap: [k], pointers: { l: l, r: r, mid: m } }); j++; }
        k++;
      }
      while (i < left.length) { tmp[k] = left[i]; push("剩余左区 " + left[i] + " 直接并入 a[" + k + "]", { swap: [k], pointers: { l: l, r: r, mid: m } }); i++; k++; }
      while (j < right.length) { tmp[k] = right[j]; push("剩余右区 " + right[j] + " 直接并入 a[" + k + "]", { swap: [k], pointers: { l: l, r: r, mid: m } }); j++; k++; }
      for (var x = l; x <= r; x++) a[x] = tmp[x];
      var sorted = [];
      for (var y = l; y <= r; y++) sorted.push(y);
      push("区间 [" + l + "," + r + "] 归并完成：[" + a.slice(l, r + 1).join(" ") + "]", { sorted: sorted, pointers: { l: l, r: r } });
    })(0, n - 1);
    var all = [];
    for (var k = 0; k < n; k++) all.push(k);
    push("排序完成：" + a.join(" "), { sorted: all });
    return steps;
  }

  function genHeap(arr) {
    var a = arr.slice(), n = a.length, steps = [];
    var push = function (desc, marks) { steps.push({ desc: desc, marks: marks || {}, arr: a.slice() }); };
    push("目标：建大顶堆逐出最大值。初始数组：" + a.join(" "));
    function heapify(i, size) {
      var l = 2 * i + 1, r = 2 * i + 2, largest = i;
      if (l < size) {
        push("比较 a[" + i + "]=" + a[i] + " 与左子 a[" + l + "]=" + a[l], { cmp: [i, l] });
        if (a[l] > a[largest]) largest = l;
      }
      if (r < size) {
        push("比较当前最大 a[" + largest + "]=" + a[largest] + " 与右子 a[" + r + "]=" + a[r], { cmp: [largest, r] });
        if (a[r] > a[largest]) largest = r;
      }
      if (largest !== i) {
        var t = a[i]; a[i] = a[largest]; a[largest] = t;
        push("a[" + i + "] 与 a[" + largest + "] 交换（下沉）", { swap: [i, largest] });
        heapify(largest, size);
      }
    }
    push("建大顶堆：从最后一个非叶节点开始向下调整", {});
    for (var i = Math.floor(n / 2) - 1; i >= 0; i--) heapify(i, n);
    push("大顶堆构建完成，堆顶为最大值", { cmp: [0] });
    for (var end = n - 1; end > 0; end--) {
      var t = a[0]; a[0] = a[end]; a[end] = t;
      push("堆顶 a[0]=" + a[end] + " 与末尾 a[" + end + "] 交换，最大值就位", { swap: [0, end], sorted: [end] });
      heapify(0, end);
    }
    var all = [];
    for (var k = 0; k < n; k++) all.push(k);
    push("排序完成：" + a.join(" "), { sorted: all });
    return steps;
  }

  function genCounting(arr) {
    var a = arr.slice(), n = a.length, steps = [];
    var push = function (desc, marks) { steps.push({ desc: desc, marks: marks || {}, arr: a.slice() }); };
    var mx = 0, mn = 0;
    for (var i = 0; i < n; i++) { if (a[i] > mx) mx = a[i]; if (a[i] < mn) mn = a[i]; }
    push("目标：统计出现次数并按值回填。初始数组：" + a.join(" "), {});
    push("统计每个值的出现次数（值域 " + mn + "~" + mx + "）", {});
    var freq = {};
    for (var j = 0; j < n; j++) freq[a[j]] = (freq[a[j]] || 0) + 1;
    var keys = Object.keys(freq).map(Number).sort(function (x, y) { return x - y; });
    var filled = [], idx = 0;
    for (var k = 0; k < keys.length; k++) {
      var v = keys[k];
      push("值 " + v + " 出现 " + freq[v] + " 次，回填到数组", { cmp: [idx] });
      for (var c = 0; c < freq[v]; c++) {
        a[idx] = v; filled.push(idx); idx++;
      }
      push("值 " + v + " 回填完成", { sorted: filled.slice() });
    }
    push("排序完成：" + a.join(" "), { sorted: (function () { var s = []; for (var x = 0; x < n; x++) s.push(x); return s; })() });
    return steps;
  }

  function genShell(arr) {
    var a = arr.slice(), n = a.length, steps = [];
    var push = function (desc, marks) { steps.push({ desc: desc, marks: marks || {}, arr: a.slice() }); };
    push("目标：按间隔分组插入排序。初始数组：" + a.join(" "));
    for (var gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
      push("设置间隔 gap=" + gap + "，分组做插入排序", {});
      for (var i = gap; i < n; i++) {
        var key = a[i], j = i - gap;
        push("组内取出 a[" + i + "]=" + key + "（gap=" + gap + "）", { cmp: [i] });
        while (j >= 0 && a[j] > key) {
          push("a[" + j + "]=" + a[j] + " > key，后移", { cmp: [j, j + gap] });
          a[j + gap] = a[j]; j -= gap;
        }
        a[j + gap] = key;
        push("key 插入 a[" + (j + gap) + "]", { swap: [j + gap] });
      }
      push("gap=" + gap + " 轮结束", {});
    }
    var all = [];
    for (var k = 0; k < n; k++) all.push(k);
    push("排序完成：" + a.join(" "), { sorted: all });
    return steps;
  }

  function genBinary(arr, target) {
    var a = (arr && arr.length) ? arr.slice() : [1, 3, 5, 7, 9, 11];
    var steps = [];
    var push = function (desc, marks) { steps.push({ desc: desc, marks: marks || {}, arr: a.slice() }); };
    var t = target === undefined || target === null ? 7 : Number(target);
    push("目标：在有序数组 [ " + a.join(" ") + " ] 中查找数字 " + t, {});
    var l = 0, r = a.length - 1;
    push("查找区间 [l=0, r=" + r + "]，目标 target=" + t, { pointers: { l: l, r: r } });
    while (l <= r) {
      var mid = (l + r) >> 1;
      push("取 mid=(l+r)/2=" + mid + "，a[" + mid + "]=" + a[mid], { cmp: [mid], pointers: { l: l, r: r, mid: mid } });
      if (a[mid] === t) { push("命中！a[" + mid + "]=" + t + " == target", { sorted: [mid], pointers: { l: l, r: r, mid: mid } }); return steps; }
      if (a[mid] < t) { l = mid + 1; push("a[" + mid + "] < target，左边界 l 移到 " + l, { pointers: { l: l, r: r } }); }
      else { r = mid - 1; push("a[" + mid + "] > target，右边界 r 移到 " + r, { pointers: { l: l, r: r } }); }
    }
    push("区间耗尽，未找到 target=" + t, {});
    return steps;
  }

  function genWindow(arr, k) {
    var a = arr.slice(), n = a.length, steps = [];
    var push = function (desc, marks) { steps.push({ desc: desc, marks: marks || {}, arr: a.slice() }); };
    var w = k === undefined || k === null ? 3 : Number(k);
    push("目标：求长度 k=" + w + " 的滑动窗口最大和。数组：" + a.join(" "), {});
    if (n < w) { push("数组长度小于窗口，无法滑动", {}); return steps; }
    var winIdx = function (s2, e2) { var r2 = []; for (var x2 = s2; x2 <= e2; x2++) r2.push(x2); return r2; };
    var sum = 0, max = -Infinity, maxIdx = 0;
    for (var i = 0; i < w; i++) { sum += a[i]; }
    max = sum;
    push("初始窗口 [0," + (w - 1) + "] 和为 " + sum, { cmp: winIdx(0, w - 1), pointers: { l: 0, r: w - 1 } });
    for (var j = w; j < n; j++) {
      var out = a[j - w], inw = a[j];
      push("窗口右移：滑出 a[" + (j - w) + "]=" + out + "，滑入 a[" + j + "]=" + inw, { cmp: winIdx(j - w + 1, j), pointers: { l: j - w + 1, r: j } });
      sum = sum - out + inw;
      if (sum > max) { max = sum; maxIdx = j - w + 1; push("新最大值 " + sum + "（窗口起点 " + maxIdx + "）", { sorted: winIdx(j - w + 1, j), pointers: { l: j - w + 1, r: j } }); }
      else { push("窗口和 " + sum + "，未超过最大值 " + max, { cmp: winIdx(j - w + 1, j), pointers: { l: j - w + 1, r: j } }); }
    }
    push("滑动结束，最大窗口和=" + max + "（起点 " + maxIdx + "）", {});
    return steps;
  }

  function genPrime(arr, n) {
    var steps = [];
    var push2 = function (desc, marks) { steps.push({ desc: desc, marks: marks || {}, arr: n === undefined ? [] : [n] }); };
    var v = n === undefined || n === null ? 29 : Number(n);
    push2("目标：判断 " + v + " 是否为素数", { cmp: [] });
    if (v < 2) { push2(v + " < 2，不是素数", { sorted: [] }); return steps; }
    push2("只需试除到 √" + v + " = " + Math.floor(Math.sqrt(v)), {});
    for (var i = 2; i * i <= v; i++) {
      push2("试除 i=" + i + "：i*i=" + (i * i) + " ≤ " + v, { cmp: [] });
      if (v % i === 0) { push2(v + " 能被 " + i + " 整除，不是素数", { sorted: [] }); return steps; }
      push2(v + " 不能被 " + i + " 整除，继续", {});
    }
    push2(v + " 是素数！", { sorted: [] });
    return steps;
  }

  function genFactor(arr, n) {
    var steps = [];
    var push2 = function (desc, marks) { steps.push({ desc: desc, marks: marks || {}, arr: n === undefined ? [] : [n] }); };
    var v = n === undefined || n === null ? 84 : Number(n);
    push2("目标：将 " + v + " 分解为质因数乘积", {});
    var x = v, factors = [];
    push2("先除尽所有因子 2", {});
    while (x % 2 === 0) { factors.push(2); x /= 2; push2("取出质因数 2，剩余 x=" + x, { sorted: [] }); }
    for (var i = 3; i * i <= x; i += 2) {
      while (x % i === 0) { factors.push(i); x /= i; push2("取出质因数 " + i + "，剩余 x=" + x, { sorted: [] }); }
    }
    if (x > 1) { factors.push(x); push2("剩余 x=" + x + " 本身是质因数", { sorted: [] }); }
    push2(v + " = " + factors.join(" × "), { sorted: [] });
    return steps;
  }

  function genGcd(arr, ab) {
    var steps = [];
    var push2 = function (desc, marks) { steps.push({ desc: desc, marks: marks || {}, arr: [] }); };
    var p = ab || [84, 36];
    var a = p[0], b = p[1];
    push2("目标：求 gcd(" + a + ", " + b + ") 最大公约数", {});
    while (b !== 0) {
      var r = a % b;
      push2(a + " % " + b + " = " + r, {});
      a = b; b = r;
      push2("更新：a=" + a + "，b=" + b, {});
    }
    push2("余数为 0，gcd = " + a, { sorted: [] });
    return steps;
  }

  function genFib(arr, n) {
    var steps = [];
    var push2 = function (desc, marks) { steps.push({ desc: desc, marks: marks || {}, arr: [] }); };
    var v = n === undefined || n === null ? 10 : Number(n);
    push2("目标：生成前 " + v + " 项斐波那契数列", {});
    var f = [0, 1], idx = 0;
    push2("f[0]=0", { sorted: [] });
    push2("f[1]=1", { sorted: [] });
    for (var i = 2; i < v; i++) {
      f.push(f[i - 1] + f[i - 2]);
      push2("f[" + i + "] = f[" + (i - 1) + "] + f[" + (i - 2) + "] = " + f[i], { sorted: [] });
    }
    push2("数列：" + f.slice(0, v).join(" "), {});
    return steps;
  }

  /* 步进模式：简化版逐行模拟 */
  function genStep(code) {
    var lines = String(code).split("\n").filter(function (l) { return l.trim().length > 0; });
    var steps = [];
    for (var i = 0; i < lines.length; i++) {
      steps.push({ desc: "执行第 " + (i + 1) + " 行：" + lines[i].trim(), marks: { line: i }, arr: [] });
    }
    steps.push({ desc: "代码执行完毕（步进模式）", marks: {}, arr: [] });
    return steps;
  }

  /* ===== 统一入口 ===== */
  function buildSteps(algoId, opts) {
    var arr = (opts && opts.arr) || DEFAULT_ARR;
    var target = opts && opts.target;
    switch (algoId) {
      case "bubble": return genBubble(arr);
      case "select": return genSelect(arr);
      case "insert": return genInsert(arr);
      case "quick": return genQuick(arr);
      case "merge": return genMerge(arr);
      case "heap": return genHeap(arr);
      case "counting": return genCounting(arr);
      case "shell": return genShell(arr);
      case "binary": return genBinary((opts && opts.arr && opts.arr !== DEFAULT_ARR) ? opts.arr : null, opts && opts.target);
      case "window": return genWindow(arr, opts && opts.k);
      case "prime": return genPrime(null, opts && opts.n);
      case "factor": return genFactor(null, opts && opts.n);
      case "gcd": return genGcd(null, opts && opts.ab);
      case "fib": return genFib(null, opts && opts.n);
      default: return genStep(opts && opts.code);
    }
  }

  return {
    ALGOS: ALGOS,
    GOALS: GOALS,
    DEFAULT_ARR: DEFAULT_ARR,
    detectAlgorithm: detectAlgorithm,
    buildSteps: buildSteps,
  };
});
