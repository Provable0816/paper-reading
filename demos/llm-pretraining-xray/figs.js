XRAY.ready(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  function sci(x, d) {                      // 3.8×10²⁵ for the HTML read-outs
    var e = Math.floor(Math.log10(x)), m = x / Math.pow(10, e);
    if (m >= 9.995) { m /= 10; e++; }
    return m.toFixed(d === undefined ? 1 : d) + '×10<sup>' + e + '</sup>';
  }
  function si(x) {                          // 405B / 16.5T / 77M
    var u = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
    for (var i = 0; i < u.length; i++) if (x >= u[i][0]) { var v = x / u[i][0]; return (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)) + u[i][1]; }
    return x.toFixed(0);
  }
  function slider(ctl, sym, o, on) {
    ctl.innerHTML = '<span>' + sym + '</span><input type="range" min="' + o.min + '" max="' + o.max + '" step="' + o.step + '" value="' + o.value + '" aria-label="' + o.aria + '"><span class="say"></span>';
    var s = ctl.querySelector('input'), say = ctl.querySelector('.say');
    function go() { say.innerHTML = on(+s.value); }
    s.addEventListener('input', go); go();
    return { input: s, say: say, go: go };
  }
  function stepper(ctl, n, on) {
    ctl.innerHTML = '<button aria-label="上一步">‹</button><span class="n"></span><button aria-label="下一步">›</button><span class="say"></span>';
    var k = 0, b = ctl.querySelectorAll('button');
    function show() { ctl.querySelector('.n').textContent = (k + 1) + ' / ' + n; ctl.querySelector('.say').innerHTML = on(k); }
    b[0].onclick = function () { k = Math.max(0, k - 1); show(); };
    b[1].onclick = function () { k = Math.min(n - 1, k + 1); show(); };
    ctl.tabIndex = 0;
    ctl.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') b[0].onclick(); if (e.key === 'ArrowRight') b[1].onclick(); });
    var m = new RegExp('[?&]at=' + ctl.id + '(\\d+)').exec(location.search); if (m) k = Math.min(n - 1, +m[1]);
    show();
    return { set: function (i) { k = i; show(); } };
  }
  function logspace(a, b, n) { var r = []; for (var i = 0; i < n; i++) r.push(Math.pow(10, a + (b - a) * i / (n - 1))); return r; }

  /* ---------- 图 1：流水线全景 ---------- */
  (function () {
    var f = FK.fig('#figMap', 1000, 290, '训练流水线的十二个决定');
    var y1 = 70, y2 = 210;
    f.row(y1, 96, [
      { id: 's0', box: 'Budget', role: 'op', w: 'l', param: '6ND' },
      { id: 's1', box: 'Data', role: 'in', w: 'l', param: '15T', gap: 22 },
      { id: 's2', box: 'Tokenizer', role: 'in', w: 'l', param: '128K', gap: 22 },
      { id: 's3', box: 'Model', role: 'op', w: 'l', param: 'N', gap: 22 },
      { id: 's4', box: 'Parallelism', role: 'op', w: 'l', param: 'TP\\cdot PP\\cdot DP', gap: 22 },
      { id: 's5', box: 'LR\nschedule', role: 'op', w: 'l', param: '\\eta(t)', gap: 22 },
      { id: 's6', box: 'Run', role: 'loss', w: 'l', param: '54\\ days', gap: 22 }
    ]);
    f.row(y2, 96, [
      { id: 's7', box: 'Anneal\nlong ctx', role: 'alt', w: 'l', param: '8K\\to 128K' },
      { id: 's8', box: 'Vision\naudio', role: 'in', w: 'l', param: '66\\text{–}258/frame', gap: 22 },
      { id: 's9', box: 'SFT', role: 'out', w: 'l', param: 'K=10\\text{–}30', gap: 22 },
      { id: 's10', box: 'RL', role: 'out', w: 'l', param: '>10\\%\\ of\\ PT', gap: 22 },
      { id: 's11', box: 'Eval', role: 'out', w: 'l', param: 'NLL\\to acc', gap: 22 }
    ]);
    var r = f.p('s6.r'), a = f.p('s7.t');
    f.wire([r, [r[0] + 26, r[1]], [r[0] + 26, 140], [a[0], 140], a]);
    f.note('\\text{pre-training}', 96, 20, 'start');
    f.note('\\text{after pre-training}', 158, 162, 'start');
    var D = [
      ['算力预算', '3.8×10²⁵ FLOPs，最多 16K 张 H100，MFU 38% 到 43%', '278.8 万 H800 卡时，按每卡时 2 美元是 557.6 万美元', '按 6ND 估算约 1.8×10²³ FLOPs', '在目标集群上用目标形状测出 MFU', '#budget'],
      ['数据', '约 15T 多语言 token；通用 50%、数学推理 25%、代码 17%、多语言 8%', '14.8T token，提高数学和代码的比例', '预训练 3.90T，中期训练 50B 做三遍', 'FineWeb 用 1.71B 模型做每个处理环节的消融；Llama 3 用训到一半的 8B 退火给新数据估价', '#data'],
      ['分词器', '128K：100K 来自 tiktoken，另加 28K 非英语 token；英文 3.94 字符每 token', '字节级 BPE，128K 词表', '沿用 cl100k 的词表和预切分', 'OLMo 2 用 1B 模型训 100B token 对比新旧分词器', '#tok'],
      ['模型结构', '稠密，126 层，宽 16384，8 个 KV 头的 GQA，RoPE 基频 5×10⁵', 'MoE，总参数 671B、激活 37B；1 个共享专家加 256 个路由专家取 8 个；MLA', '32 层，宽 4096；QK 归一化，子层输出端 RMSNorm', 'Wortsman 等人在小模型上用高学习率复现不稳定性，筛选 QK 归一化和 z-loss', '#arch'],
      ['并行', 'TP 8 × PP 16 × DP 64 或 128；长上下文时 CP 16', '专家分布在 8 个节点的 64 张卡上；DualPipe 流水线；FP8 训练，与 BF16 的相对损失误差低于 0.25%', '代码、数据和日志全部公开', 'Llama 3 的显存估算器和性能预测工具', '#par'],
      ['学习率与批大小', '峰值 8×10⁻⁵，预热 8000 步，余弦 120 万步；批大小 4M、8M、16M token', '2.2×10⁻⁴ 常数到 10T，余弦降到 2.2×10⁻⁵；批大小 3072 到 15360 条', '3×10⁻⁴；余弦按 5T 设计，4T 处截断', 'isoFLOP 实验里每档单独设学习率（Llama 3 用 2×10⁻⁴ 到 4×10⁻⁴）', '#lr'],
      ['训练运行', '54 天观察期 466 次中断，有效训练时间超过 90%', '没有不可恢复的损失尖峰，没有回滚', '八处稳定性改动：重复 n-gram 过滤、QK 归一化、z-loss 等', '小模型上调高学习率，复现注意力 logit 的增长', '#run'],
      ['退火与长上下文', '六步从 8K 到 128K，约 800B token；退火到 0，检查点平均', 'YaRN，4K 到 32K 到 128K，各 1000 步，11.9 万卡时', '中期训练 50B token 做三遍，权重平均', '每加长一步，用大海捞针和短上下文分数是否恢复作为通过标准', '#anneal'],
      ['多模态', '外挂图像编码器，经交叉注意力层接入语言模型（报告第 7 节）', 'V3 是纯文本模型', '纯文本模型', 'Qwen3-VL 先冻住视觉编码器和语言模型，只训中间的投影层', '#mm'],
      ['监督微调', '拒绝采样每题 10 到 30 个候选；学习率 10⁻⁵，8500 到 9000 步', '后训练合计 5000 卡时', '沿用 Tülu 3 的配方', 'InstructGPT：1.3B 模型在偏好评测里胜过 175B 的 GPT-3', '#sft'],
      ['强化学习', '六轮 SFT 加 DPO，β = 0.1，屏蔽格式 token，加 0.2 的 NLL 项', 'V3.2：六个领域的专家各做强化学习再蒸馏，后训练算力超过预训练的 10%', 'DPO 加 RLVR', 'ScaleRL：用前一段的 S 形曲线外推 10 万 GPU 小时的结果', '#rlscale'],
      ['评测', '8-gram 污染分析；先预测 NLL 再映射成准确率', 'AIME、代码等可验证的评测', 'GSM8K 的 200 道测试题作开发集，只在其余 1119 道上报告', 'Llama 3 用 10²² FLOPs 以内的模型预测 405B 的 ARC-Challenge', '#eval']
    ];
    var card = $('#mapCard'), cur = 0, ctlS;
    function render(i) {
      cur = i; f.light(['s' + i]); var d = D[i];
      card.innerHTML = '<table class="t left"><tr><th style="width:9em">' + d[0] + '</th><th>Llama 3 405B</th><th>DeepSeek-V3</th><th>OLMo 2 7B</th></tr>' +
        '<tr><td>实际选择</td><td>' + d[1] + '</td><td>' + d[2] + '</td><td>' + d[3] + '</td></tr>' +
        '<tr class="hl"><td>依据的小实验</td><td colspan="3">' + d[4] + '</td></tr></table>';
      return (i + 1) + '. ' + d[0] + ' · 详见正文 <a href="' + d[5] + '">对应小节</a>';
    }
    ctlS = stepper($('#ctlMap'), D.length, render);
    D.forEach(function (_, i) {
      var g = f.at['s' + i].g; g.classList.add('hit');
      g.addEventListener('click', function () { ctlS.set(i); });
    });
  })();

  /* ---------- 图 2：isoFLOP 滑块 ---------- */
  (function () {
    var P1 = { E: 1.8172, A: 482.01, B: 2085.43, a: 0.3478, b: 0.3658, name: 'Epoch 重拟合' };
    var P0 = { E: 1.69, A: 406.4, B: 410.7, a: 0.34, b: 0.28, name: 'Hoffmann 正文（四舍五入）' };
    var P = P1;
    var L = function (N, D) { return P.E + P.A / Math.pow(N, P.a) + P.B / Math.pow(D, P.b); };
    function opt(C) { var G = Math.pow(P.a * P.A / (P.b * P.B), 1 / (P.a + P.b)), N = G * Math.pow(C / 6, P.b / (P.a + P.b)); return [N, C / 6 / N]; }
    var p = FK.plot('#figIso', { w: 1000, h: 440, label: 'isoFLOP 曲线', x: { min: 1e7, max: 1e13, log: true, label: '\\role{op}{N}\\ \\text{(parameters)}' }, y: { min: 1.85, max: 3.1, label: '\\role{loss}{L}', ticks: [2, 2.25, 2.5, 2.75, 3] } });
    var Ns = logspace(7, 13, 160);
    var M = [['GPT-3', 175e9, 300e9, 'end', -12, -8], ['Gopher', 280e9, 300e9, 'start', 10, 14], ['Chinchilla', 70e9, 1.4e12, 'start', 8, 16], ['Llama 3 8B', 8e9, 15e12, 'end', -10, -10], ['Llama 3 405B', 405e9, 15.6e12, 'start', 10, 12], ['DeepSeek-V3', 37e9, 14.8e12, 'end', -10, 12], ['OLMo 2 7B', 7.3e9, 4.05e12, 'end', -10, 12]];
    function draw(lc, tween) {
      var C = Math.pow(10, lc);
      for (var e = 18; e <= 26; e++) p.line('f' + e, Ns.map(function (N) { return [N, L(N, Math.pow(10, e) / 6 / N)]; }), { cls: 'faint', under: true });
      p.line('locus', logspace(17, 27, 60).map(function (c) { var o = opt(c); return [o[0], L(o[0], o[1])]; }), { cls: 'guide', under: true });
      p.line('cur', Ns.map(function (N) { return [N, L(N, C / 6 / N)]; }), { role: 'loss', tween: tween });
      var o = opt(C); p.dot('opt', [o[0], L(o[0], o[1])], { role: 'out', cls: 'solid', r: 5.5 });
      M.forEach(function (m, i) {
        var Cm = 6 * m[1] * m[2], near = Math.abs(Math.log10(Cm) - lc) < 0.16;
        if (near) { p.dot('m' + i, [m[1], L(m[1], m[2])], { role: 'op', r: 4.8 }); p.text('t' + i, '\\text{' + m[0] + '}', [m[1], L(m[1], m[2])], { anchor: m[3], dx: m[4], dy: m[5], size: 12.5, role: 'op' }); }
        else { p.remove('m' + i); p.remove('t' + i); }
      });
      return o;
    }
    var s = slider($('#ctlIso'), 'C', { min: 19, max: 26, step: 0.02, value: Math.log10(5.88e23).toFixed(2), aria: '训练算力的对数' }, function (lc) {
      var o = draw(lc), C = Math.pow(10, lc);
      var near = M.filter(function (m) { return Math.abs(Math.log10(6 * m[1] * m[2]) - lc) < 0.16; }).map(function (m) { return m[0]; });
      return sci(C) + ' FLOPs · N* = ' + si(o[0]) + ' · D* = ' + si(o[1]) + ' · 每参数 ' + (o[1] / o[0]).toFixed(0) + ' 个 token' + (near.length ? ' · 这一档附近：' + near.join('、') : '') +
        ' · <a href="#" class="swp">' + (P === P1 ? '换成 Hoffmann 正文的参数' : '换回 Epoch 重拟合') + '</a>';
    });
    $('#ctlIso').addEventListener('click', function (e) { if (e.target.classList.contains('swp')) { e.preventDefault(); P = P === P1 ? P0 : P1; s.go(); } });
  })();

  /* ---------- 图 3：Porian 的四步修正 ---------- */
  (function () {
    var CC = 5.88e23;
    var S = [[0.835, 3e12, '复现 Kaplan 的设定：a = 0.835，外推到 Chinchilla 的预算是 3T 参数'],
             [0.706, 787e9, '把最后一层的计算量算进 FLOPs：a = 0.706，787B'],
             [0.602, 292e9, '预热长度随模型大小缩放，不再对所有模型用同样长的预热：a = 0.602，292B'],
             [0.571, 183e9, '余弦衰减的长度和每个配置的训练长度匹配：a = 0.571，183B'],
             [0.497, 77e9, '按模型大小分别调学习率、批大小和 AdamW 的 β₂，学习率不衰减：a = 0.497，77B']];
    var p = FK.plot('#figPorian', { w: 1000, h: 420, label: 'Porian 的四步修正', x: { min: 1e16, max: 1e24, log: true, label: '\\text{compute } C\\ \\text{(FLOPs)}' }, y: { min: 1e5, max: 1e13, log: true, label: '\\role{op}{N^*}' } });
    var xs = logspace(16, Math.log10(CC), 40);
    function pts(k) { return xs.map(function (c) { return [c, S[k][1] * Math.pow(c / CC, S[k][0])]; }); }
    p.vline('cc', CC, { y0: 1e5, y1: 1e13 });
    p.text('cct', '\\text{Chinchilla budget}', [CC, 1e13], { anchor: 'end', dx: -8, dy: 10, size: 12, cls: 'note' });
    p.dot('chin', [CC, 70e9], { role: 'alt', cls: 'solid', r: 4.5 });
    p.text('chint', '\\text{Chinchilla 70B}', [CC, 70e9], { anchor: 'end', dx: -10, dy: 16, size: 12, role: 'alt' });
    var last = -1;
    stepper($('#ctlPorian'), S.length, function (k) {
      for (var i = 0; i < S.length; i++) { if (i < k) p.line('old' + i, pts(i), { cls: 'faint' }); else p.remove('old' + i); }
      p.line('cur', pts(k), { role: 'op', tween: last >= 0 });
      p.dot('end', [CC, S[k][1]], { role: 'out', cls: 'solid', r: 5.5 });
      p.text('endt', '\\role{out}{' + (S[k][1] >= 1e12 ? (S[k][1] / 1e12) + 'T' : (S[k][1] / 1e9) + 'B') + '}', [CC, S[k][1]], { anchor: 'start', dx: 10, dy: 0, size: 14 });
      p.text('slope', '\\role{op}{a = ' + S[k][0] + '}', [3e17, S[k][1] * Math.pow(3e17 / CC, S[k][0])], { anchor: 'start', dx: 8, dy: -16, size: 14 });
      last = k;
      return S[k][2];
    });
  })();

  /* ---------- 图 4：FineWeb 的数据流 ---------- */
  (function () {
    var R = [['基础过滤后', 36, 'in', '96 个快照，WARC 抽取，网址黑名单、语种、质量规则：约 36T'],
             ['全局去重', 4, 'loss', '所有快照放在一起做 MinHash：只剩 4T，训出来的模型几乎没有改进，放弃'],
             ['逐快照去重', 20, 'in', '每个快照单独做 MinHash：20T，追平 RefinedWeb'],
             ['C4 与自定义过滤', 15, 'in', '加上 C4 的部分规则和自己统计出的阈值：15T，这就是 FineWeb'],
             ['教育质量 ≥ 3', 1.3, 'alt', 'Llama-3-70B 标注 46 万页，训分类器，阈值 3 分：1.3T，FineWeb-Edu']];
    var p = FK.plot('#figFunnel', { w: 1000, h: 300, label: 'FineWeb 数据流', pad: { l: 170, r: 90, t: 20, b: 20 }, x: { min: 0, max: 36, hide: true }, y: { min: 5.4, max: 0, hide: true } });
    R.forEach(function (r, i) { p.text('n' + i, '\\text{' + r[0] + '}', [0, i + 0.5], { anchor: 'end', dx: -14, size: 13.5 }); });
    stepper($('#ctlFunnel'), R.length, function (k) {
      R.forEach(function (r, i) {
        if (i <= k) { p.rect('b' + i, [0, i + 0.18], [r[1], i + 0.82], { role: r[2], cls: i === k ? 'on' : '' }); p.text('v' + i, '\\text{' + r[1] + 'T}', [r[1], i + 0.5], { anchor: 'start', dx: 10, size: 13.5, role: r[2] }); }
        else { p.remove('b' + i); p.remove('v' + i); }
      });
      return R[k][3];
    });
  })();

  /* ---------- 图 5：在本页正文上训练的 BPE ---------- */
  (function () {
    var B = window.BPE, K = B.merges.length, rank = new Map(), vocab = [];
    for (var i = 0; i < 256; i++) vocab.push([i]);
    B.merges.forEach(function (m, r) { rank.set(m[0] * 65536 + m[1], r); vocab.push(vocab[m[0]].concat(vocab[m[1]])); });
    var PAT = /'(?:[sdmt]|ll|ve|re)| ?\p{L}+| ?\p{N}{1,3}| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;
    var enc = new TextEncoder(), dec = new TextDecoder('utf-8', { fatal: true });
    function encode(text, k) {
      var out = [];
      (text.match(PAT) || []).forEach(function (w) {
        var s = Array.from(enc.encode(w));
        for (;;) {
          var best = -1, br = Infinity;
          for (var j = 0; j + 1 < s.length; j++) { var r = rank.get(s[j] * 65536 + s[j + 1]); if (r !== undefined && r < k && r < br) { br = r; best = j; } }
          if (best < 0) break;
          var a = s[best], b = s[best + 1], t = [];
          for (var q = 0; q < s.length; q++) { if (q + 1 < s.length && s[q] === a && s[q + 1] === b) { t.push(256 + br); q++; } else t.push(s[q]); }
          s = t;
        }
        out = out.concat(s);
      });
      return out;
    }
    function show(id) { var b = new Uint8Array(vocab[id]); try { return dec.decode(b); } catch (e) { return { raw: Array.from(b).map(function (x) { return x.toString(16).toUpperCase(); }).join(' ') }; } }
    var lines = [['中文', '大模型只训一次，所有决定都在小模型上做完。'], ['英文', 'Training compute is roughly six times parameters times tokens.'], ['代码', 'loss = F.cross_entropy(logits.view(-1, V), targets.view(-1))']];
    var tk = FK.tokens('#figBpe', { label: 'BPE 切分' });
    var cpt = B.curve.map(function (n) { return B.chars / n; });
    var ymax = Math.ceil(cpt[cpt.length - 1] * 5 + 0.5) / 5;
    var p = FK.plot('#figBpeCurve', { w: 1000, h: 250, label: '压缩率曲线', pad: { l: 76, r: 34, t: 34, b: 50 }, x: { min: 0, max: K, label: '\\text{merges } k' }, y: { min: 0, max: ymax, label: '\\role{in}{\\text{characters per token}}' } });
    var xs = []; for (var k = 0; k <= K; k += Math.max(1, Math.floor(K / 200))) xs.push([k, cpt[k]]);
    p.line('c', xs, { role: 'in' });
    slider($('#ctlBpe'), 'k', { min: 0, max: K, step: 1, value: Math.min(K, 600), aria: '合并次数' }, function (k) {
      var per = lines.map(function (l) { var ids = encode(l[1], k); return { label: l[0] + ' · ' + ids.length + ' 个 token', toks: ids.map(show), n: ids.length, c: Array.from(l[1]).length }; });
      tk.set(per);
      p.dot('d', [k, cpt[k]], { role: 'out', cls: 'solid', r: 5.5 });
      return '合并 ' + k + ' 次，词表 ' + (256 + k) + ' · 整份正文每个 token ' + cpt[k].toFixed(2) + ' 个字符 · 中文那句每字 ' + (per[0].n / per[0].c).toFixed(2) + ' 个 token';
    });
  })();

  /* ---------- 图 6：8B 模型的零件清单 ---------- */
  (function () {
    var cfg = { '8B': [4096, 32, 14336], '70B': [8192, 80, 28672], '405B': [16384, 126, 53248] };
    function parts(name) {
      var c = cfg[name], d = c[0], L = c[1], F = c[2], kv = 1024, V = 128256;
      var blk = [['Q', d * d, 'alt'], ['K', d * kv, 'alt'], ['V', d * kv, 'alt'], ['O', d * d, 'alt'], ['gate', d * F, 'op'], ['up', d * F, 'op'], ['down', d * F, 'op']];
      var b = blk.reduce(function (s, x) { return s + x[1]; }, 0) + 2 * d;
      return { emb: V * d, blk: blk, b: b, L: L, total: 2 * V * d + L * b + d };
    }
    var p = FK.plot('#figParts', { w: 1000, h: 300, label: '参数拆解', pad: { l: 40, r: 40, t: 30, b: 16 }, x: { min: 0, max: 1, hide: true }, y: { min: 10, max: 0, hide: true } });
    var ids = [];
    function clear() { ids.forEach(function (i) { p.remove(i); }); ids = []; }
    function R(id, x0, x1, y0, y1, role, cls) { ids.push(id); p.rect(id, [x0, y0], [x1, y1], { role: role, cls: cls || '' }); }
    function T(id, txt, x, y, o) { ids.push(id); p.text(id, txt, [x, y], o); }
    function seg(row, list, total, y0, y1, prefix) {   // list: [name, count, role]; labels inside if room, else above
      var x = 0, out = [];
      list.forEach(function (s, i) {
        var w = s[1] / total, id = prefix + i, px = w * 920;
        R(id, x, x + w, y0, y1, s[2]);
        var txt = s[0] + ' ' + si(s[1]), need = txt.length * 7.2 + 10;
        if (px > need) T(id + 't', '\\text{' + txt + '}', x + w / 2, (y0 + y1) / 2, { anchor: 'middle', size: 12.5, role: s[2] });
        else if (px > s[0].length * 7.6 + 6) T(id + 't', '\\text{' + s[0] + '}', x + w / 2, (y0 + y1) / 2, { anchor: 'middle', size: 12.5, role: s[2] });
        else out.push(s);
        x += w;
      });
      return out;
    }
    var steps = [
      function () { var q = parts('8B'); R('all', 0, 1, 1.2, 3.2, 'op'); T('allt', '\\text{Llama 3 8B · ' + (q.total / 1e9).toFixed(2) + 'B}', 0.5, 2.2, { anchor: 'middle', size: 14, role: 'op' }); return '整个模型 8,030,261,248 个参数'; },
      function () { return top('8B') + '：嵌入和输出层各 5.25 亿，32 个块合计 69.8 亿'; },
      function () { var t = top('8B'); detail('8B'); return '一个块 2.18 亿：前馈层三个矩阵各 5873 万，Q 和 O 各 1678 万，K 和 V 各 419 万'; },
      function () { top('70B'); detail('70B'); return '70B：嵌入占比降到 3.0%，前馈层占 79.9%'; },
      function () { top('405B'); detail('405B'); return '405B：嵌入降到 1.0%，K 和 V 只有 Q 的 1/16，前馈层占 81.2%'; }
    ];
    function top(name) {
      var q = parts(name), list = [['Embedding', q.emb, 'in'], [q.L + ' × block', q.L * q.b, 'op'], ['Output', q.emb, 'out']];
      var rest = seg(0, list, q.total, 1.2, 3.2, 'tp');
      if (rest.length) { T('e0', '\\text{Embedding ' + si(q.emb) + '}', 0, 0.55, { anchor: 'start', size: 12, role: 'in' }); T('e1', '\\text{Output ' + si(q.emb) + '}', 1, 0.55, { anchor: 'end', size: 12, role: 'out' }); }
      return name;
    }
    function detail(name) {
      var q = parts(name), x0 = q.emb / q.total, x1 = x0 + q.b / q.total;
      R('slice', x0, x1, 1.2, 3.2, 'op', 'on');
      ids.push('w1'); p.line('w1', [[x0, 3.2], [x0, 4.6], [0, 4.6], [0, 5.6]], { cls: 'faint' });
      ids.push('w2'); p.line('w2', [[x1, 3.2], [x1, 4.6], [1, 4.6], [1, 5.6]], { cls: 'faint' });
      var rest = seg(1, q.blk, q.b - 2 * q.blk[0][1] * 0, 5.6, 7.6, 'bk');
      if (rest.length) T('kv', '\\text{K, V ' + si(q.blk[1][1]) + ' each}', q.blk[0][1] / q.b + q.blk[1][1] / q.b, 8.4, { anchor: 'middle', size: 12, role: 'alt' });
      T('blab', '\\text{one block · ' + si(q.b) + '}', 0, 9.5, { anchor: 'start', size: 12.5, cls: 'note' });
    }
    stepper($('#ctlParts'), steps.length, function (k) { clear(); return steps[k](); });
  })();

  /* ---------- 图 7：每卡显存 ---------- */
  (function () {
    var XM = 170;
    var p = FK.plot('#figMem', { w: 1000, h: 330, label: '每卡显存', pad: { l: 250, r: 90, t: 26, b: 52 }, x: { min: 0, max: XM, label: '\\text{GB per GPU}', ticks: [0, 20, 40, 60, 80, 100, 120, 140, 160] }, y: { min: 4.3, max: 0, hide: true } });
    var rows = [['Data parallel', function (N, A) { return [2 * N, 2 * N, 12 * N, A]; }],
                ['ZeRO-1 · 64 GPUs', function (N, A) { return [2 * N, 2 * N, 12 * N / 64, A]; }],
                ['ZeRO-3 · 64 GPUs', function (N, A) { return [2 * N / 64, 2 * N / 64, 12 * N / 64, A]; }],
                ['TP 8 · PP 16 · FSDP 128', function (N, A) { return [2 * N / 128, 2 * N / 16384, 12 * N / 16384, A / 8]; }]];
    var roles = ['op', 'alt', 'norm', 'in'];
    rows.forEach(function (r, i) { p.text('n' + i, '\\text{' + r[0] + '}', [0, i + 0.5], { anchor: 'end', dx: -14, size: 13.5 }); });
    p.vline('lim', 80, { role: 'loss', y0: 4.3, y1: 0 });
    p.text('limt', '\\role{loss}{\\text{80 GB}}', [80, 0], { anchor: 'start', dx: 6, dy: -8, size: 12.5 });
    slider($('#ctlMem'), 'N', { min: 9, max: 11.7, step: 0.01, value: Math.log10(8.03e9).toFixed(2), aria: '参数量的对数' }, function (ln) {
      var N = Math.pow(10, ln), d = Math.pow(N * 128 / 12, 1 / 3), L = d / 128, A = 34 * 8192 * d * L;
      rows.forEach(function (r, i) {
        var v = r[1](N, A).map(function (b) { return b / 1e9; }), x = 0, tot = v.reduce(function (a, b) { return a + b; }, 0);
        v.forEach(function (g, j) { var a = Math.min(x, XM), b = Math.min(x + g, XM); p.rect('r' + i + j, [a, i + 0.2], [b, i + 0.8], { role: roles[j], rx: 0 }); x += g; });
        p.text('v' + i, '\\text{' + (tot > XM ? '→ ' : '') + (tot >= 1000 ? (tot / 1000).toFixed(1) + ' TB' : tot.toFixed(0) + ' GB') + '}', [Math.min(tot, XM), i + 0.5], { anchor: 'start', dx: 8, size: 13, role: tot > 80 ? 'loss' : null });
      });
      var fit = rows.filter(function (r) { var t = r[1](N, A).reduce(function (a, b) { return a + b; }, 0) / 1e9; return t <= 80; }).length;
      return si(N) + ' 参数 · 模型状态 ' + (16 * N / 1e9 >= 1000 ? (16 * N / 1e12).toFixed(1) + ' TB' : (16 * N / 1e9).toFixed(0) + ' GB') + ' · 激活约 ' + (A / 1e9).toFixed(0) + ' GB（示意）· 四种方案里 ' + fit + ' 种装得下';
    });
  })();

  /* ---------- 图 8：检查点间隔 ---------- */
  (function () {
    var lam = 419 / (16384 * 54 * 24 * 60), d = 1 / 3, R = 6;          // 每卡每分钟的故障率；δ 与 R 为示意
    var p = FK.plot('#figCkpt', { w: 1000, h: 400, label: '检查点间隔与浪费', x: { min: 1, max: 300, log: true, label: '\\text{checkpoint interval } \\tau\\ \\text{(min)}', ticks: [1, 3, 10, 30, 100, 300], fmt: function (v) { return String(v); } }, y: { min: 0, max: 0.6, label: '\\role{loss}{\\text{time wasted}}', ticks: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6], fmt: function (v) { return Math.round(v * 100) + '\\%'; } } });
    var ts = logspace(0, Math.log10(300), 120);
    slider($('#ctlCkpt'), 'GPUs', { min: 10, max: 17, step: 0.05, value: 14, aria: '卡数的以 2 为底的对数' }, function (lg) {
      var n = Math.round(Math.pow(2, lg)), M = 1 / (lam * n), t = Math.sqrt(2 * d * M), w = function (x) { return d / x + x / (2 * M) + R / M; };
      p.line('a', ts.map(function (x) { return [x, d / x]; }), { cls: 'faint' });
      p.line('b', ts.map(function (x) { return [x, x / (2 * M)]; }), { cls: 'faint' });
      p.line('c', ts.map(function (x) { return [x, R / M]; }), { cls: 'faint' });
      p.line('tot', ts.map(function (x) { return [x, w(x)]; }), { role: 'loss' });
      p.dot('o', [t, w(t)], { role: 'out', cls: 'solid', r: 5.5 });
      p.text('ot', '\\role{out}{\\tau^* = ' + t.toFixed(t < 10 ? 1 : 0) + '\\ min}', [t, w(t)], { anchor: 'middle', dy: 22, size: 13 });
      p.text('la', '\\delta/\\tau', [1.15, d / 1.15], { anchor: 'start', dx: 8, size: 12.5, cls: 'note' });
      var xb = Math.min(260, 2 * M * 0.42); p.text('lb', '\\tau/2M', [xb, xb / (2 * M)], { anchor: 'end', dx: -8, dy: -4, size: 12.5, cls: 'note' });
      p.text('lc', 'R/M', [300, R / M], { anchor: 'end', dy: -12, size: 12.5, cls: 'note' });
      return n.toLocaleString() + ' 张卡 · 平均每 ' + (M >= 120 ? (M / 60).toFixed(1) + ' 小时' : M.toFixed(0) + ' 分钟') + '一次故障 · 最优间隔 ' + t.toFixed(t < 10 ? 1 : 0) + ' 分钟 · 浪费 ' + (100 * w(t)).toFixed(1) + '%';
    });
  })();

  /* ---------- 图 9：两条多模态路线 ---------- */
  (function () {
    var f = FK.fig('#figMM', 1000, 330, '外挂式与原生式多模态');
    var ya = 100, yb = 260;
    f.row(ya, 150, [
      { id: 'a0', box: 'Frames\n1–2 fps', role: 'in', w: 'l' },
      { id: 'a1', box: 'SigLIP-2\nViT', role: 'op', w: 'l', param: '\\text{pre-trained apart}' },
      { id: 'a2', box: 'Merger', role: 'op', w: 'l', param: '\\text{trained first}' },
      { id: 'aa', add: true, gap: 34 },
      { id: 'a3', box: 'Qwen3', role: 'op', w: 'l', param: '\\text{pre-trained on text}' }
    ]);
    f.box('at', { x: f.p('aa')[0], y: ya - 70, w: 'l', role: 'in', text: 'Text +\n<3.0 s>' });
    f.wire([f.p('at.b'), [f.p('aa')[0], ya - 8.2]]);
    f.io('Answer', { from: 'a3', role: 'out' });
    f.row(yb, 150, [
      { id: 'b0', box: 'Frames\n1 fps', role: 'in', w: 'l' },
      { id: 'b1', box: 'Tokenize', role: 'op', w: 'l', param: '66\\text{–}258/frame' },
      { id: 'bb', add: true, gap: 34 },
      { id: 'b2', box: 'Gemini', role: 'alt', w: 'l', param: '\\text{all modalities from step 0}' }
    ]);
    f.box('bt', { x: f.p('bb')[0], y: yb - 70, w: 'l', role: 'in', text: 'Text\naudio 32/s' });
    f.wire([f.p('bt.b'), [f.p('bb')[0], yb - 8.2]]);
    f.io('Answer', { from: 'b2', role: 'out' });
    f.note('\\text{bolt-on}', 40, ya, 'start');
    f.note('\\text{native}', 40, yb, 'start');
  })();

  /* ---------- 图 10：一百万 token 装多少视频 ---------- */
  (function () {
    var p = FK.plot('#figVid', { w: 1000, h: 380, label: '上下文能装的视频时长', x: { min: 0.25, max: 4, log: true, label: '\\text{frames per second}', ticks: [0.25, 0.5, 1, 2, 4], fmt: function (v) { return String(v); } }, y: { min: 5, max: 2000, log: true, label: '\\text{minutes in 1M tokens}', ticks: [10, 30, 60, 180, 600, 1800], fmt: function (v) { return String(v); } } });
    var xs = [], f0 = 0.25; while (f0 <= 4.0001) { xs.push(f0); f0 *= 1.05; } xs.push(4);
    p.hline('h1', 60, { x0: 0.25, x1: 4 }); p.text('h1t', '\\text{1 hour}', [4, 60], { anchor: 'end', dy: -11, size: 12, cls: 'note' });
    p.hline('h3', 180, { x0: 0.25, x1: 4 }); p.text('h3t', '\\text{3 hours}', [4, 180], { anchor: 'end', dy: -11, size: 12, cls: 'note' });
    slider($('#ctlVid'), '每帧 token', { min: 32, max: 512, step: 2, value: 258, aria: '每帧的 token 数' }, function (t) {
      var mins = function (fps, au) { return 1e6 / (fps * t + au) / 60; };
      p.line('va', xs.map(function (x) { return [x, mins(x, 32)]; }), { role: 'out' });
      p.line('vn', xs.map(function (x) { return [x, mins(x, 0)]; }), { role: 'in', cls: 'thin' });
      p.dot('d', [1, mins(1, 32)], { role: 'out', cls: 'solid', r: 5.5 });
      p.text('dt', '\\role{out}{' + mins(1, 32).toFixed(0) + '\\ min}', [1, mins(1, 32)], { anchor: 'start', dx: 10, dy: 14, size: 13 });
      p.text('vat', '\\role{out}{\\text{video + audio}}', [0.27, mins(0.27, 32)], { anchor: 'start', dy: 16, size: 12.5 });
      p.text('vnt', '\\role{in}{\\text{video only}}', [0.27, mins(0.27, 0)], { anchor: 'start', dy: -14, size: 12.5 });
      return t + ' 个 token 每帧 · 每秒 1 帧时，带音轨装 ' + mins(1, 32).toFixed(0) + ' 分钟，只看画面装 ' + mins(1, 0).toFixed(0) + ' 分钟 · 每秒 4 帧时带音轨只有 ' + mins(4, 32).toFixed(0) + ' 分钟';
    });
  })();

  /* ---------- 图 11：GRPO 的优势 ---------- */
  (function () {
    var G = 16;
    var p = FK.plot('#figGrpo', { w: 1000, h: 360, label: 'GRPO 优势', x: { min: 0, max: G, hide: true }, y: { min: -4, max: 4, label: '\\role{out}{A_i}', ticks: [-4, -2, 0, 2, 4] } });
    p.hline('z', 0, {});
    slider($('#ctlGrpo'), '答对', { min: 0, max: G, step: 1, value: 4, aria: '16 个回答里答对的个数' }, function (k) {
      var q = k / G, sd = Math.sqrt(q * (1 - q)), ap = sd ? (1 - q) / sd : 0, an = sd ? -q / sd : 0;
      for (var i = 0; i < G; i++) { var ok = i < k, a = ok ? ap : an; p.rect('b' + i, [i + 0.18, 0], [i + 0.82, a], { role: ok ? 'op' : 'loss', rx: 1 }); }
      var tot = k * Math.abs(ap) + (G - k) * Math.abs(an);
      if (!sd) return k + ' / 16 · 奖励全部相同，标准差为 0，这道题不产生任何梯度';
      return k + ' / 16 · 答对的 A = +' + ap.toFixed(2) + ' · 答错的 A = ' + an.toFixed(2) + ' · 信号总量 ' + tot.toFixed(1) + '（最大 16，在答对一半时）';
    });
  })();

  /* ---------- 图 12：涌现与评分方式 ---------- */
  (function () {
    var c = 5.6e8, al = -0.401, pN = function (N) { return Math.exp(-Math.pow(N / c, al)); };
    var p = FK.plot('#figEmerge', { w: 1000, h: 400, label: '涌现与评分方式', x: { min: 1e8, max: 1e12, log: true, label: '\\role{op}{N}' }, y: { min: 0, max: 1, label: '\\text{accuracy}', ticks: [0, 0.25, 0.5, 0.75, 1] } });
    var Ns = logspace(8, 12, 160);
    p.line('pt', Ns.map(function (N) { return [N, pN(N)]; }), { role: 'op', cls: 'thin' });
    p.text('ptt', '\\role{op}{p(N)\\ \\text{per token}}', [1.6e8, pN(1.6e8)], { anchor: 'start', dx: 10, dy: -14, size: 13 });
    p.hline('res', 0.01, { x0: 1e8, x1: 1e12 });
    p.text('rest', '\\text{1\\% · resolution of 100 questions}', [1e12, 0.01], { anchor: 'end', dy: -12, size: 12, cls: 'note' });
    slider($('#ctlEmerge'), 'L', { min: 1, max: 40, step: 1, value: 10, aria: '答案的 token 数' }, function (L) {
      p.line('em', Ns.map(function (N) { return [N, Math.pow(pN(N), L)]; }), { role: 'out' });
      var at = function (acc) { var lce = -Math.log(acc) / L; return c * Math.pow(lce, 1 / al); };
      var n1 = at(0.01), n5 = at(0.5);
      p.text('emt', '\\role{out}{p(N)^{' + L + '}}', [n5, 0.5], { anchor: 'end', dx: -12, dy: -6, size: 14 });
      return 'L = ' + L + ' · 精确匹配从 1% 升到 50%，参数量从 ' + si(n1) + ' 到 ' + si(n5) + '，跨 ' + (n5 / n1).toFixed(1) + ' 倍';
    });
  })();
});
