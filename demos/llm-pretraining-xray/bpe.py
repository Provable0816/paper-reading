# 字节级 BPE，在本页正文上训练。build.py 调用 train()，把合并表和压缩曲线写进页面。
import regex, collections
PAT = r"""'(?:[sdmt]|ll|ve|re)| ?\p{L}+| ?\p{N}{1,3}| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+"""   # 和 JS 端同一条预切分规则

def train(text, K):
    words = collections.Counter(regex.findall(PAT, text))
    seqs = [list(w.encode('utf-8')) for w in words]; freq = list(words.values())
    pairs, where = collections.Counter(), collections.defaultdict(set)
    for i, s in enumerate(seqs):
        for a, b in zip(s, s[1:]): pairs[a, b] += freq[i]; where[a, b].add(i)
    total = sum(len(s) * f for s, f in zip(seqs, freq)); curve, merges = [total], []
    for r in range(K):
        if not pairs: break
        (a, b), c = max(pairs.items(), key=lambda kv: (kv[1], -kv[0][0], -kv[0][1]))   # 频次相同按 id 小的先合，结果可复现
        if c < 2: break
        new = 256 + r; merges.append([a, b])
        for i in list(where[a, b]):
            s, f = seqs[i], freq[i]
            for x, y in zip(s, s[1:]): pairs[x, y] -= f
            t, j = [], 0
            while j < len(s):
                if j + 1 < len(s) and s[j] == a and s[j + 1] == b: t.append(new); j += 2
                else: t.append(s[j]); j += 1
            total -= (len(s) - len(t)) * f; seqs[i] = t
            for x, y in zip(t, t[1:]): pairs[x, y] += f; where[x, y].add(i)
        for k in [k for k, v in pairs.items() if v <= 0]: del pairs[k]
        curve.append(total)
    return merges, curve, len(text)
