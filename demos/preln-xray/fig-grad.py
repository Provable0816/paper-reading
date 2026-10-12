# 画 grad_at_init.py 的实测结果。浅色版，图里不放标题和图例，系列名直接写在线旁。
import json, matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
plt.rcParams.update({'mathtext.fontset': 'cm', 'font.family': 'serif', 'font.size': 12,
                     'axes.edgecolor': '#6e737b', 'axes.labelcolor': '#3d3d3a', 'xtick.color': '#6e737b', 'ytick.color': '#6e737b'})
POST, PRE, INK = '#6e737b', '#6a55c2', '#3d3d3a'
d = json.load(open('grad_at_init.json'))
fig, ax = plt.subplots(1, 3, figsize=(13.5, 3.6), facecolor='#faf9f5')
for a in ax:
    a.set_facecolor('#faf9f5'); a.spines[['top', 'right']].set_visible(False)

# (a) 各层 W2，先平均再取范数（论文图 3(b) 的统计量）
L = range(1, 7); w = .36
for k, c, off in (('post', POST, -w / 2), ('pre', PRE, w / 2)):
    m, s = d[k]['W2_per_layer'][:6], d[k]['W2_per_layer'][6:]
    ax[0].bar([l + off for l in L], m, w, yerr=s, color=c, alpha=.85, error_kw={'ecolor': INK, 'lw': .8})
ax[0].set_xlabel('layer $l$'); ax[0].set_ylabel(r'$\Vert \mathbb{E}\,\partial\tilde{\mathcal{L}}/\partial W^{2,l}\Vert_F$')
ax[0].set_xlim(.4, 7.6); ax[0].set_xticks(list(L))
ax[0].text(6.45, d['pre']['W2_per_layer'][5], 'Pre-LN', color=PRE, va='center'); ax[0].text(6.45, .45, 'Post-LN', color=POST, va='center')

# (b) 残差流长度和引理 2 的区间
ax[1].fill_between(L, [1 + l / 2 for l in L], [1 + 1.5 * l for l in L], color=PRE, alpha=.12, lw=0)
ax[1].plot(L, d['pre']['norm2/d'][:6], 'o-', color=PRE, ms=4)
ax[1].plot(L, d['post']['norm2/d'][:6], 'o-', color=POST, ms=4)
ax[1].set_xlabel('layer $l$'); ax[1].set_ylabel(r'$\Vert x_l\Vert^2/d$')
ax[1].text(6, 8.6, 'Lemma 2 range', color=PRE, ha='right', fontsize=11)
ax[1].text(6, 1.9, r'Post-LN $x^{post,5}$', color=POST, ha='right', fontsize=11)

# (c) 最后一层 W2 随总层数 L，两种统计量
Ls = [6, 8, 10, 12, 14]
for k, c in (('post', POST), ('pre', PRE)):
    v = d[k + '_lastW2_vs_L']
    ax[2].plot(Ls, [v[str(x)][1] for x in Ls], 'o-', color=c, ms=4)
    ax[2].plot(Ls, [v[str(x)][0] for x in Ls], 'o--', color=c, ms=3, alpha=.6)
ref = d['pre_lastW2_vs_L']['6'][1]
ax[2].plot(Ls, [ref * (6 / x) ** .5 for x in Ls], ':', color=INK, lw=1)
ax[2].text(8.3, ref * (6 / 8) ** .5 + .06, r'$\propto 1/\sqrt{L}$', color=INK, ha='left', fontsize=11)
ax[2].set_xlabel('number of layers $L$'); ax[2].set_ylabel(r'last-layer $W^2$ gradient')
for a, t in zip(ax, 'abc'):
    a.text(-.02, 1.04, '(' + t + ')', transform=a.transAxes, color=INK, fontsize=12)
fig.tight_layout()
fig.savefig('fig-grad.png', dpi=170, facecolor='#faf9f5')
print('ok')
