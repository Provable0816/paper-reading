# 画 train_toy.py 的结果：两种摆法、有无 warm-up、两个峰值学习率，两个种子取平均。
import json, math, matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
plt.rcParams.update({'mathtext.fontset': 'cm', 'font.family': 'serif', 'font.size': 12,
                     'axes.edgecolor': '#6e737b', 'axes.labelcolor': '#3d3d3a', 'xtick.color': '#6e737b', 'ytick.color': '#6e737b'})
POST, PRE, INK = '#6e737b', '#6a55c2', '#3d3d3a'
d = json.load(open('train_toy.json'))
POS = {'0.001': {('post', '0'): (505, 5.6), ('post', '300'): (312, 2.95), ('pre', '300'): (168, 3.8), ('pre', '0'): (20, 1.57)},
       '0.003': {('post', '0'): (505, 5.62, 'Post-LN, with or without'), ('post', '300'): (505, 5.27, 'warm-up 300'), ('pre', '300'): (505, 1.92), ('pre', '0'): (505, 1.5)}}
fig, ax = plt.subplots(1, 2, figsize=(12, 3.8), facecolor='#faf9f5', sharey=True)
for a, lr in zip(ax, ('0.001', '0.003')):
    a.set_facecolor('#faf9f5'); a.spines[['top', 'right']].set_visible(False)
    a.axhline(math.log(4), color=INK, lw=.8, ls=':')
    for arch, c in (('post', POST), ('pre', PRE)):
        for w, ls in (('0', '-'), ('300', '--')):
            runs = [d[f'{arch} lr={lr} warm={w} seed={s}'] for s in (0, 1)]
            t = [p[0] for p in runs[0]]; y = [(p[1] + q[1]) / 2 for p, q in zip(*runs)]
            a.plot(t, y, ls, color=c, lw=1.6)
            name = ('Post-LN' if arch == 'post' else 'Pre-LN') + (', no warm-up' if w == '0' else ', warm-up 300')
            pos = POS[lr].get((arch, w))
            if pos: a.text(pos[0], pos[1], pos[2] if len(pos) > 2 else name, color=c, fontsize=10.5, va='center')
    a.set_xlim(0, 660); a.set_ylim(1.0, 6.5); a.set_xlabel('step'); a.text(.01, 1.03, r'$\mathrm{lr}_{\max}=%s$' % ('10^{-3}' if lr == '0.001' else r'3\times10^{-3}'), transform=a.transAxes, color=INK)
    a.text(545, math.log(4) - .22, r'optimum $\ln 4$', color=INK, fontsize=10.5)
ax[0].set_ylabel('training loss')
fig.tight_layout(); fig.savefig('fig-toy.png', dpi=170, facecolor='#faf9f5'); print('ok')
