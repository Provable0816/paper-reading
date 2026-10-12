# 玩具规模的实验台：Post-LN / Pre-LN，有无 warm-up，看前几百步。非论文实验，数字只作示意。
import sys, json, math, torch, torch.nn as nn, torch.nn.functional as F
d, n, V, B, L, STEPS = 128, 32, 256, 16, 8, 500

def chain(seed=123):                                   # 每个 token 只有 4 个可能的后继，最优损失 = ln 4 = 1.386
    g = torch.Generator().manual_seed(seed)
    return torch.stack([torch.randperm(V, generator=g)[:4] for _ in range(V)])
NEXT = chain()
def batch():
    x = torch.empty(B, n + 1, dtype=torch.long); x[:, 0] = torch.randint(V, (B,))
    for t in range(n): x[:, t + 1] = NEXT[x[:, t], torch.randint(4, (B,))]
    return x[:, :-1], x[:, 1:]

class Layer(nn.Module):
    def __init__(s, pre):
        super().__init__(); s.pre = pre
        s.Wq, s.Wk, s.Wv, s.Wo = (nn.Linear(d, d) for _ in range(4))
        s.W1, s.W2 = nn.Linear(d, 2 * d), nn.Linear(2 * d, d)
        s.ln1, s.ln2 = nn.LayerNorm(d), nn.LayerNorm(d)
        for m in (s.Wq, s.Wk, s.Wv, s.Wo, s.W1, s.W2): nn.init.xavier_normal_(m.weight); nn.init.zeros_(m.bias)
    def attn(s, x):
        a = s.Wq(x) @ s.Wk(x).transpose(1, 2) / math.sqrt(d)
        a = a.masked_fill(torch.ones(n, n, dtype=torch.bool).triu(1), -1e9)
        return s.Wo(a.softmax(-1) @ s.Wv(x))
    def forward(s, x):
        ffn = lambda h: s.W2(F.relu(s.W1(h)))
        if s.pre: x = x + s.attn(s.ln1(x)); return x + ffn(s.ln2(x))
        x = s.ln1(x + s.attn(x)); return s.ln2(x + ffn(x))

class Net(nn.Module):
    def __init__(s, pre):
        super().__init__()
        s.E = nn.Parameter(torch.randn(V, d) / math.sqrt(d)); s.P = nn.Parameter(torch.randn(n, d) / math.sqrt(d))
        s.layers = nn.ModuleList(Layer(pre) for _ in range(L)); s.final = nn.LayerNorm(d) if pre else nn.Identity()
    def forward(s, tok, tgt):
        x = (s.E[tok] + s.P) * math.sqrt(d)
        for l in s.layers: x = l(x)
        return F.cross_entropy((s.final(x) @ s.E.t()).reshape(-1, V), tgt.reshape(-1))

def run(pre, lr, warm, seed):
    torch.manual_seed(seed); net = Net(pre)
    opt = torch.optim.Adam(net.parameters(), lr=lr, betas=(0.9, 0.98), eps=1e-9)
    curve = []
    for t in range(1, STEPS + 1):
        for g in opt.param_groups: g['lr'] = lr * min(1, t / warm) if warm else lr
        tok, tgt = batch(); loss = net(tok, tgt)
        opt.zero_grad(); loss.backward(); opt.step()
        if t % 50 == 0 or t <= 5: curve.append((t, round(loss.item(), 3)))
    return curve

if __name__ == '__main__':
    cfg = [(p, lr, w) for p in (False, True) for lr, w in ((1e-3, 0), (1e-3, 300), (3e-3, 0), (3e-3, 300))]
    out = {('pre' if p else 'post') + f' lr={lr} warm={w} seed={s}': run(p, lr, w, s) for p, lr, w in cfg for s in (0, 1)}
    json.dump(out, sys.stdout, indent=0)
