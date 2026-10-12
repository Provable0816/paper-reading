# 按论文第 3 节和表 1 实现，非官方代码。只看初始化那一刻：Post-LN 和 Pre-LN 各层 W2 的梯度有多大。
import sys, json, torch, torch.nn as nn, torch.nn.functional as F
d, n, V, B = 512, 32, 1000, 8          # 宽度、序列长、词表、每批句数

class Layer(nn.Module):
    def __init__(s, pre):
        super().__init__()
        s.pre = pre
        s.Wq, s.Wk, s.Wv = (nn.Linear(d, d) for _ in range(3))
        s.W1, s.W2 = nn.Linear(d, 2 * d), nn.Linear(2 * d, d)   # IWSLT 配置：512 -> 1024 -> 512
        s.ln1, s.ln2 = nn.LayerNorm(d), nn.LayerNorm(d)
        for m in (s.Wq, s.Wk, s.Wv, s.W1, s.W2):
            nn.init.xavier_normal_(m.weight); nn.init.zeros_(m.bias)   # 论文 3.3 节：Xavier，偏置为 0

    def attn(s, x):                                     # x: (B, n, d)
        a = s.Wq(x) @ s.Wk(x).transpose(1, 2) / d ** .5  # (B, n, n)；单头，和定理的设定一致
        return a.softmax(-1) @ s.Wv(x)

    def forward(s, x):
        ffn = lambda h: s.W2(F.relu(s.W1(h)))
        if s.pre:                                       # 表 1 右栏：LN 在残差支路里面，主干上只有加法
            x = x + s.attn(s.ln1(x))
            return x + ffn(s.ln2(x))
        x = s.ln1(x + s.attn(x))                        # 表 1 左栏：每次相加之后都过一次 LN
        s.x5 = x + ffn(x)                               # 引理 2 里的 x^{post,5}，留着看范数
        return s.ln2(s.x5)

class Net(nn.Module):
    def __init__(s, L, pre):
        super().__init__()
        s.E = nn.Parameter(torch.randn(V, d) / d ** .5)  # fairseq 的做法：嵌入按 N(0, 1/d) 初始化
        s.layers = nn.ModuleList(Layer(pre) for _ in range(L))
        s.final = nn.LayerNorm(d) if pre else nn.Identity()   # Pre-LN 多出来的最后一个 LN，梯度缩放全靠它

    def forward(s, tok, tgt):
        x, s.norms = s.E[tok] * d ** .5, []             # 输入再乘 sqrt(d)，和论文假设一致：|x0|^2 约等于 d
        for layer in s.layers:
            x = layer(x)
            h = x if layer.pre else layer.x5            # Post-LN 的 x_l 被 LN 钉在 d 上，看 x5 才有信息
            s.norms.append((h.pow(2).sum(-1).mean() / d).item())    # 引理 2 预测：Post 约 1.5，Pre 随层数线性涨
        logits = s.final(x) @ s.E.t()                   # 输出层和词嵌入共享；LN 之后 |h|^2 = d，logits 标准差约 1
        return F.cross_entropy(logits.reshape(-1, V), tgt.reshape(-1))

def grads(L, pre, batches=20):
    net = Net(L, pre)
    acc = [torch.zeros_like(l.W2.weight) for l in net.layers]; each = [0.] * len(net.layers)
    for _ in range(batches):                            # 论文 3.4 节的做法：先对各批的梯度取平均，再取 F 范数
        net.zero_grad()
        tok = torch.randint(V, (B, n)); tgt = (tok + 1) % V   # 目标有规律，平均梯度才不是纯噪声
        net(tok, tgt).backward()
        for k, l in enumerate(net.layers):
            acc[k] += l.W2.weight.grad / batches
            each[k] += l.W2.weight.grad.norm().item() / batches   # 定理 1 管的是这个：单批梯度的范数
    return [a.norm().item() for a in acc], net.norms, each

if __name__ == '__main__':                              # 每个配置 5 个种子，报均值和标准差
    ms = lambda xs: [round(float(torch.tensor(c).mean()), 3) for c in zip(*xs)] + [round(float(torch.tensor(c).std()), 3) for c in zip(*xs)]
    out = {}
    for pre in (False, True):
        k = 'pre' if pre else 'post'
        runs = [(torch.manual_seed(s), grads(6, pre))[1] for s in range(5)]
        out[k] = {'W2_per_layer': ms([r[0] for r in runs]), 'W2_per_batch': ms([r[2] for r in runs]), 'norm2/d': ms([r[1] for r in runs])}
        lastW2 = {L: [(torch.manual_seed(s), grads(L, pre, 10))[1] for s in range(5)] for L in (6, 8, 10, 12, 14)}
        out[k + '_lastW2_vs_L'] = {L: ms([[r[0][-1], r[2][-1]] for r in rs]) for L, rs in lastW2.items()}
    json.dump(out, sys.stdout, indent=1)
