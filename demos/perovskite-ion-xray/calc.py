# 正文里所有手算数字的出处。常数和输入全部取自论文正文与方法部分，推算过程按文中写法。
import math, json
kB = 8.617e-5            # eV/K
q, e0 = 1.602e-19, 8.854e-14   # C, F/cm
out = {}

# 1. 0.4% Schottky 缺陷对应的浓度：赝立方晶胞 6.28 Å，每个晶胞一个化学式单元
a = 6.28e-8
cells = 1 / a ** 3
out['cells_per_cm3'] = cells
out['N_0.4pct'] = 0.004 * cells

# 2. 从势垒到扩散系数：D ~ a_hop^2 * nu * exp(-Ea/kT)，320 K，nu = 1e12 Hz
T = 320; kT = kB * T
def D(Ea, hop):
    return hop ** 2 * 1e12 * math.exp(-Ea / kT)
out['kT_320'] = kT
out['D_I'] = D(0.58, 4.45e-8)          # I-I 间距 4.45 Å（表 2）
out['D_MA'] = D(0.84, 6.28e-8)         # A 位到 A 位，一个晶格常数
out['D_Pb'] = D(2.31, 6.28e-8 * 2 ** .5)
out['factor_per_0.1eV'] = math.exp(0.1 / kT)

# 3. 10 s 内的扩散长度和漂移距离（D 取论文的 1e-12）
Dp = 1e-12
out['Ldiff_10s_nm'] = math.sqrt(Dp * 10) * 1e7
mu = Dp / kT                            # 爱因斯坦关系，cm2/Vs
out['drift_10s_nm'] = mu * (1 / 500e-7) * 10 * 1e7

# 4. 10 nm 积累层上的电势差 q w^2 N / (2 e0 er)
N, er, w = 1.6e19, 24, 10e-7
out['dV_10nm'] = q * w ** 2 * N / (2 * e0 * er)

# 5. 德拜长度与三个时间尺度（300 K）
kT3 = kB * 300
LD = math.sqrt(e0 * er * kT3 / (q * N))
out['LD_nm'] = LD * 1e7
sigma = q * N * Dp / kT3                # S/cm
out['tau_dielectric_s'] = e0 * er / sigma
out['tau_doublelayer_s'] = LD * 250e-7 / Dp      # Bazant 2004：lambda_D * L / D，L 取半厚 250 nm
out['tau_diffusion_s'] = (500e-7) ** 2 / Dp

# 6. 图 4b 的快过程：53 s @ -9.5 °C，0.36 s @ 50 °C
T1, T2 = 273.15 - 9.5, 273.15 + 50
dinv = 1 / T1 - 1 / T2
out['Ea_from_endpoints'] = math.log((1 / 0.36) / (1 / 53)) * kB / dinv
out['dinv'] = dinv
out['rate_ratio_over_window'] = {str(E): math.exp(E * dinv / kB) for E in (0.3, 0.58, 0.62, 0.68, 0.84)}
json.dump(out, open('calc.json', 'w'), indent=1)
for k, v in out.items(): print(k, v)
