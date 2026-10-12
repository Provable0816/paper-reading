# 用论文给出的两个端点重建图 4b 的快过程直线，并把几个候选活化能放在同一个温度窗口里比较。
import math, matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
plt.rcParams.update({'mathtext.fontset': 'cm', 'font.family': 'serif', 'font.size': 12,
                     'axes.edgecolor': '#6e737b', 'axes.labelcolor': '#3d3d3a', 'xtick.color': '#6e737b', 'ytick.color': '#6e737b'})
INK, WIRE, ALT, LOSS, OP = '#3d3d3a', '#6e737b', '#6a55c2', '#b34a06', '#0b7a5c'
kB = 8.617e-5
x1, x2 = 1000 / 263.65, 1000 / 323.15          # -9.5 °C 与 50 °C
k1, k2 = 1 / 53, 1 / 0.36
xm = 1000 / 297.65                               # 24.5 °C，图里重复测量的那个温度
km = math.exp(math.log(k1) + (math.log(k2) - math.log(k1)) * (xm - x1) / (x2 - x1))
fig, ax = plt.subplots(figsize=(7.4, 4.4), facecolor='#faf9f5')
ax.set_facecolor('#faf9f5'); ax.spines[['top', 'right']].set_visible(False)
xs = [x2, x1]
def line(E, **kw):
    ys = [km * math.exp(-E / kB * (x - xm) / 1000) for x in xs]
    ax.plot(xs, ys, **kw); return ys
ax.fill_between(xs, [km * math.exp(-0.48 / kB * (x - xm) / 1000) for x in xs], [km * math.exp(-0.68 / kB * (x - xm) / 1000) for x in xs], color=ALT, alpha=.10, lw=0)
line(0.30, color=WIRE, lw=1, ls=':')
line(0.84, color=LOSS, lw=1.2, ls='--')
line(0.58, color=ALT, lw=1.4)
ax.plot([x2, x1], [k2, k1], 'o', color=OP, ms=5)
ax.plot([x2, x1], [k2, k1], '-', color=OP, lw=1, alpha=.5)
ax.plot([xm, xm], [0.55, 0.31], 's', color=OP, ms=4.5, mfc='none')
ax.set_yscale('log'); ax.set_xlim(3.05, 3.98); ax.set_ylim(0.004, 12)
ax.set_xlabel(r'$1000/T$  (K$^{-1}$)'); ax.set_ylabel(r'rate constant $k$  (s$^{-1}$)')
ax.text(3.81, k1 * 0.55, '53 s at $-9.5$ °C', color=OP, fontsize=10.5, ha='left', va='center')
ax.text(3.11, 8.0, '0.36 s at 50 °C', color=OP, fontsize=10.5, va='center')
ax.text(3.40, 0.62, 'two points at 24.5 °C', color=OP, fontsize=10, ha='left')
ax.text(3.81, 0.03, r'$0.58\pm0.1$ eV (DFT, $V_I$)', color=ALT, fontsize=10.5, ha='left', va='center')
ax.text(3.81, 0.0058, r'0.84 eV ($V_{MA}$)', color=LOSS, fontsize=10.5, ha='left', va='center')
ax.text(3.81, 0.12, '0.30 eV', color=WIRE, fontsize=10.5, ha='left', va='center')
fig.tight_layout(); fig.savefig('fig-arrhenius.png', dpi=170, facecolor='#faf9f5'); print(km)
