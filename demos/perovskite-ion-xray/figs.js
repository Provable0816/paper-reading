XRAY.ready(function () {
  /* ---------- 图 1：从势垒到时间尺度的小计算器 ---------- */
  (function () {
    var kB = 8.617e-5, q = 1.602e-19, e0 = 8.854e-14, er = 24, N = 1.6e19, hop = 4.45e-8, nu = 1e12, Lh = 250e-7;
    var host = document.getElementById('calc'), ctl = document.getElementById('ctlCalc');
    ctl.innerHTML = '<span>E<sub>A</sub></span><input type="range" min="0.30" max="0.90" step="0.01" value="0.58" aria-label="活化能"><span class="v1"></span>' +
                    '<span style="margin-left:18px">T</span><input type="range" min="263" max="323" step="1" value="298" aria-label="温度"><span class="v2"></span>';
    var s = ctl.querySelectorAll('input');
    function fmt(x) { if (x >= 1000) return x.toExponential(1).replace('e+', ' × 10^'); if (x >= 10) return x.toFixed(0); if (x >= 0.1) return x.toFixed(2); return x.toExponential(1).replace('e-', ' × 10^-'); }
    function sup(t) { return t.replace(/10\^(-?\d+)/, '10<sup>$1</sup>'); }
    function draw() {
      var Ea = +s[0].value, T = +s[1].value, kT = kB * T;
      var D = hop * hop * nu * Math.exp(-Ea / kT);
      var LD = Math.sqrt(e0 * er * kT / (q * N)), sig = q * N * D / kT;
      var rows = [
        ['扩散系数 D', sup(fmt(D)) + ' cm²/s', ''],
        ['10 秒内的扩散长度', fmt(Math.sqrt(D * 10) * 1e7) + ' nm', ''],
        ['介电弛豫 ε/σ', sup(fmt(e0 * er / sig)) + ' s', 't'],
        ['界面电荷层充电 λ<sub>D</sub>L/D', sup(fmt(LD * Lh / D)) + ' s', 't'],
        ['扩散穿过膜厚 L²/D', sup(fmt((2 * Lh) * (2 * Lh) / D)) + ' s', 't']
      ];
      var obs = 1 / Math.exp(Math.log(1 / 53) + (Math.log(1 / 0.36) - Math.log(1 / 53)) * (1 / 263.65 - 1 / T) / (1 / 263.65 - 1 / 323.15));
      var h = '<table class="t left"><tr><th>量</th><th>推算值</th></tr>';
      rows.forEach(function (r) {
        var v = parseFloat(r[1].replace(/<[^>]+>/g, '').replace(' × 10', 'e').replace(/\s/g, ''));
        var hit = r[2] && v > obs / 3 && v < obs * 3;
        h += '<tr' + (hit ? ' class="hl"' : '') + '><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>';
      });
      h += '<tr><td style="color:var(--ink-tertiary)">实测快过程 1/k<sub>1</sub>（按图 4b 的直线插值）</td><td style="color:var(--ink-tertiary)">' + fmt(obs) + ' s</td></tr></table>';
      host.innerHTML = h;
      ctl.querySelector('.v1').textContent = Ea.toFixed(2) + ' eV';
      ctl.querySelector('.v2').textContent = T + ' K（' + (T - 273.15).toFixed(1) + ' °C）';
    }
    s[0].addEventListener('input', draw); s[1].addEventListener('input', draw); draw();
  })();

  /* ---------- 图 2：器件层叠 ---------- */
  FK.iso('#figStack', { ctl: '#ctlStack', gap: 16, open: 30, label: '钙钛矿电池的层叠', layers: [
    { name: 'FTO 玻璃，锌粉加 2 M 盐酸刻蚀出图案，光从这一面进入', role: 'in' },
    { name: '致密 TiO₂，约 80 nm，喷雾热解后 450 °C 处理，收集电子并挡住空穴', role: 'op' },
    { name: 'MAPbI₃，约 500 nm，MAI 与 PbCl₂ 按 3:1 旋涂，90 °C 退火 3 小时；碘空位在这一层里迁移', role: 'alt' },
    { name: 'spiro-OMeTAD，掺 LiTFSI 和 tBP，收集空穴；其中的锂离子同样可以移动', role: 'loss' },
    { name: '金电极，蒸镀，有效面积 0.08 cm²，整块器件在手套箱里封装', role: 'norm' }
  ], restSay: '从下往上：FTO 玻璃、致密 TiO₂、钙钛矿、空穴层、金。把指针移到图上' });

  /* ---------- 图 3：测量序列与拟合 ---------- */
  (function () {
    var f = FK.fig('#figSeq', 1000, 380, '计时光电流法的四段测量序列和拟合');
    var y = 90;
    f.row(y, 150, [
      { id: 'b1', box: 'Dark\n−0.5 V', role: 'norm', w: 'l' },
      { id: 'b2', box: 'Light\n0 V', role: 'out', w: 'l' },
      { id: 'b3', box: 'Dark\n+1 V', role: 'norm', w: 'l' },
      { id: 'b4', box: 'Light\n0 V', role: 'out', w: 'l' },
      { id: 'fit', box: 'Fit', role: 'op', w: 'l', gap: 40, param: 'k_1\\ k_2\\ k_3' },
      { id: 'arr', box: 'Arrhenius', role: 'op', w: 'l', param: '\\text{11 temperatures}' }
    ]);
    f.io('Device', { to: 'b1', role: 'in' });
    f.io('E_A', { from: 'arr', role: 'alt' });
    ['b1', 'b2', 'b3', 'b4'].forEach(function (id) { var p = f.p(id + '.t'); f.note('100\\ s', p[0], p[1] - 14); });
    f.zoom('b2', { x: 40, y: 190, w: 440, h: 170, title: 'Rise after reverse bias', build: function (z) {
      z.row(50, 120, [{ id: 'k1', box: 'Fast\nk₁', role: 'op', w: 'l' }, { id: 'k2', box: 'Slow\nk₂', role: 'op', w: 'l' }]);
      z.math('J = J_{eq} − J_1 e^{−k_1 t} − J_2 e^{−k_2 t}', 220, 112);
    } });
    f.zoom('b4', { x: 520, y: 190, w: 440, h: 170, title: 'Decay after forward bias', build: function (z) {
      z.row(50, 120, [{ id: 'sh', box: 'Shoulder', role: 'loss', w: 'l' }, { id: 'k3', box: 'Tail\nk₃', role: 'op', w: 'l' }]);
      z.math('J = J_{eq} + J_3 e^{−k_3 t}', 220, 112);
    } });
    var steps = [
      { ids: [], say: '四段各 100 秒，光和偏压在 1 ms 内同步切换' },
      { ids: ['b1'], say: '暗处反偏 −0.5 V：空位被推向界面，内建电场被屏蔽得最多' },
      { ids: ['b2'], say: '切到短路并开灯：光电流从低处爬升，双指数拟合出 k₁ 和 k₂' },
      { ids: ['b3'], say: '暗处正偏 +1 V：内建电场被抵消，积累的空位散回体内' },
      { ids: ['b4'], say: '再切回短路开灯：光电流从高处回落，开头有肩，只用尾巴拟合 k₃' },
      { ids: ['fit', 'arr'], say: '11 个温度各做一遍，ln k 对 1/T 作直线，斜率给出 E_A' }
    ];
    var k = 0, ctl = document.getElementById('ctlSeq');
    ctl.innerHTML = '<button aria-label="上一步">‹</button><span class="n"></span><button aria-label="下一步">›</button><span class="say"></span>';
    function show() { f.light(steps[k].ids); ctl.querySelector('.n').textContent = k + ' / ' + (steps.length - 1); ctl.querySelector('.say').textContent = steps[k].say; }
    var b = ctl.querySelectorAll('button');
    b[0].onclick = function () { k = Math.max(0, k - 1); show(); };
    b[1].onclick = function () { k = Math.min(steps.length - 1, k + 1); show(); };
    show();
  })();
});
