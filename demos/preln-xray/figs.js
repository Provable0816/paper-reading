XRAY.ready(function () {
  /* ---------- 图 1：两种摆法，一层，Pre-LN 的 Final LN 可展开 ---------- */
  (function () {
    var f = FK.fig('#figArch', 1000, 680, 'Post-LN 与 Pre-LN 的一层，以及最后的 LayerNorm 的内部');
    function head(y, name, id) {
      f.label('\\text{' + name + '}', 30, y, { anchor: 'start', size: 15 });
      f.wire([[150, y], [190, y]], { arrow: false, role: 'in' });
      f.label('x_l', 144, y, { anchor: 'end', size: 15, cls: 'r-in' });
    }
    var py = 120, qy = 370;
    head(py, 'Post-LN');
    f.row(py, 190, [
      { id: 'p_d0', dot: true },
      { id: 'p_mha', box: 'Multi-Head\nAttention', role: 'op', w: 'l' },
      { id: 'p_a1', add: true },
      { id: 'p_ln1', box: 'LN', role: 'norm', w: 's' },
      { id: 'p_d1', dot: true },
      { id: 'p_ffn', box: 'Feed\nForward', role: 'op', w: 'ffn', param: 'W^1\\ W^2' },
      { id: 'p_a2', add: true },
      { id: 'p_ln2', box: 'LN', role: 'norm', w: 's' },
      { id: 'p_lin', box: 'Linear', role: 'op', w: 'm', gap: 40, param: 'E^\\top' },
      { id: 'p_sm', box: 'Softmax', role: 'out', w: 68.5 }
    ]);
    f.stack('p_d0', 'p_ln2', { label: 'N\\times', side: 'top' });
    f.skip('p_d0', 'p_a1', 'top'); f.skip('p_d1', 'p_a2', 'top');
    f.io('Loss', { from: 'p_sm', role: 'loss' });

    head(qy, 'Pre-LN');
    f.row(qy, 190, [
      { id: 'q_d0', dot: true },
      { id: 'q_ln1', box: 'LN', role: 'norm', w: 's' },
      { id: 'q_mha', box: 'Multi-Head\nAttention', role: 'op', w: 'l' },
      { id: 'q_a1', add: true },
      { id: 'q_d1', dot: true },
      { id: 'q_ln2', box: 'LN', role: 'norm', w: 's' },
      { id: 'q_ffn', box: 'Feed\nForward', role: 'op', w: 'ffn', param: 'W^1\\ W^2' },
      { id: 'q_a2', add: true },
      { id: 'q_fln', box: 'Final\nLN', role: 'alt', w: 'm', gap: 40 },
      { id: 'q_lin', box: 'Linear', role: 'op', w: 'm', param: 'E^\\top' },
      { id: 'q_sm', box: 'Softmax', role: 'out', w: 68.5 }
    ]);
    f.stack('q_d0', 'q_a2', { label: 'N\\times', side: 'top' });
    f.skip('q_d0', 'q_a1', 'top'); f.skip('q_d1', 'q_a2', 'top');
    f.io('Loss', { from: 'q_sm', role: 'loss' });

    f.zoom('q_fln', { x: 340, y: 480, w: 630, h: 180, title: 'LayerNorm', build: function (z) {
      z.row(50, 120, [
        { id: 'cen', box: 'Subtract\nMean', role: 'norm', w: 'l' },
        { id: 'sc', box: 'Divide by\nRMS', role: 'norm', w: 'l' },
        { id: 'gb', box: 'Scale\nShift', role: 'op', w: 'l', param: '\\gamma\\ \\beta' }
      ]);
      z.io('x', { to: 'cen', role: 'in', len: 40 });
      z.io('LN(x)', { from: 'gb', role: 'in', len: 30 });
      z.math('‖J_{LN}(x)‖ = \\sqrt{d} / ‖y‖', 315, 128);
    } });

    var steps = [
      { ids: [], say: '两种摆法，各画一层；Pre-LN 的 Final LN 点开是它的内部' },
      { ids: ['p_sm', 'p_lin', 'p_ln2', 'p_ffn'], say: 'Post-LN：损失回到最后一层 W² 只穿过一个 LN，入口长度平方约 1.5d，与层数无关' },
      { ids: ['q_sm', 'q_lin', 'q_fln', 'q_ffn'], say: 'Pre-LN：先穿过 Final LN，入口是全网最粗的残差流，长度平方随 L 线性增长' },
      { ids: ['q_a1', 'q_a2'], say: 'Pre-LN 的主干上只有加法，没有东西把长度拉回 √d' },
      { ids: ['p_ln1', 'p_ln2'], say: 'Post-LN 的主干上每个子层之后都有 LN，每层都把长度拉回 √d' }
    ];
    var k = 0, ctl = document.getElementById('ctlArch');
    ctl.innerHTML = '<button aria-label="上一步">‹</button><span class="n"></span><button aria-label="下一步">›</button><span class="say"></span>';
    function show() {
      f.light(steps[k].ids);
      ctl.querySelector('.n').textContent = k + ' / ' + (steps.length - 1);
      ctl.querySelector('.say').textContent = steps[k].say;
    }
    var b = ctl.querySelectorAll('button');
    b[0].onclick = function () { k = Math.max(0, k - 1); show(); };
    b[1].onclick = function () { k = Math.min(steps.length - 1, k + 1); show(); };
    document.getElementById('figArch').addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') b[0].onclick(); if (e.key === 'ArrowRight') b[1].onclick();
    });
    document.getElementById('figArch').tabIndex = 0;
    show();
  })();

  /* ---------- 图 2：Pre-LN 的残差流，实测长度 ---------- */
  (function () {
    var m = [1.52, 2.145, 2.892, 3.736, 4.688, 5.748];   // grad_at_init.json，5 个种子的均值
    var layers = [{ name: '词嵌入加位置嵌入，残差流长度平方 1.00d', role: 'in' }];
    m.forEach(function (v, i) {
      var l = i + 1;
      layers.push({ name: '第 ' + l + ' 层之后，残差流长度平方实测 ' + v.toFixed(2) + 'd，引理 2 区间 ' + (1 + l / 2).toFixed(1) + 'd 到 ' + (1 + 1.5 * l).toFixed(1) + 'd', role: 'op' });
    });
    layers.push({ name: 'Final LN，入口长度平方 5.75d，梯度和更新的影响都乘 1/√5.75 ≈ 0.42', role: 'alt' });
    FK.iso('#figIso', { ctl: '#ctlIso', layers: layers, gap: 15, open: 30, label: 'Pre-LN 的层叠与残差流长度', restSay: '从下往上：词嵌入、六层、Final LN。把指针移到图上' });
  })();
});
