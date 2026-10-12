# 把 reader-kit / figure-kit 的六段整块拷进来，拼上正文、图、BPE 合并表和预置标注，产出单文件 HTML。
import base64, html, json, re, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import bpe
R = os.path.join(HERE, '..', '..', 'references')
rk = open(os.path.join(R, 'reader-kit.html'), encoding='utf-8').read()
fk = open(os.path.join(R, 'figure-kit.html'), encoding='utf-8').read()
rd = lambda f: open(os.path.join(HERE, f), encoding='utf-8').read() if os.path.exists(os.path.join(HERE, f)) else ''

def block(src, name, htmlc):
    a, b = (('<!-- ===== ' + name + ' START', '<!-- ===== ' + name + ' END ===== -->') if htmlc
            else ('/* ===== ' + name + ' START', '/* ===== ' + name + ' END ===== */'))
    i, j = src.index(a), src.index(b)
    return src[i:j + len(b)]

def img(p):
    return 'data:image/png;base64,' + base64.b64encode(open(os.path.join(HERE, p), 'rb').read()).decode()

def code(p):
    out = []
    for ln in open(os.path.join(HERE, p), encoding='utf-8').read().rstrip().split('\n'):
        e = html.escape(ln, quote=False)
        k = e.find('#')
        out.append(e if k < 0 else e[:k] + '<span class="c">' + e[k:] + '</span>')
    return '\n'.join(out)

body = ''.join(rd(f) for f in ('body1.html', 'body2.html', 'body3.html', 'body4.html'))
body = body.replace('__TINY__', rd('tiny.html')).replace('__SCHED__', rd('sched.html'))
for k, f in (('__FIGTINY__', 'fig-tiny.png'), ('__FIGSCHED__', 'fig-sched.png')):
    if k in body: body = body.replace(k, img(f))
for k, f in (('__CODE_TINYLM__', 'tinylm.py'), ('__CODE_FIT__', 'fit.py')):
    if k in body: body = body.replace(k, code(f))

# 分词器在正文的纯文本上训练：去掉标签和公式，只留读者看到的字
K = 1500
plain = html.unescape(re.sub(r'<[^>]+>', '', re.sub(r'\$\$[\s\S]*?\$\$|\$[^$]*\$', '', body)))
merges, curve, nchar = bpe.train(plain, K)
body = body.replace('__BPEK__', str(len(merges)))
bpejs = 'window.BPE = ' + json.dumps({'merges': merges, 'curve': curve, 'chars': nchar}, separators=(',', ':')) + ';\n'

OUT = 'D:/Desktop/paper-xray/demos/llm-pretraining-xray/llm-pretraining-xray.html'
marks = json.loads(rd('marks.json') or '[]')
plaintext = re.sub(r'<[^>]+>', '', body)
for m in marks:
    assert m['quote'] in plaintext, 'quote not found: ' + m['quote']
    m.setdefault('prefix', ''); m.setdefault('suffix', '')
t = max([m['t'] for m in marks] or ['2026-10-12T00:00:00.000Z'])
state = {'v': 1, 'doc': {'title': '大模型只训一次，所有决定都在小模型上做完', 'source': '主题：基座大模型的完整训练流程',
                         'made': '2026-10-12', 'lang': 'zh', 'file': OUT},
         'marks': marks, 'folds': [], 'updated': t, 'saved': t}

bottom = block(rk, 'XRAY BODY BOTTOM', True)
bottom = re.sub(r'(<script type="application/json" id="xray-notes">)[\s\S]*?(</script>)',
                lambda g: g.group(1) + json.dumps(state, ensure_ascii=False).replace('<', '\\u003c') + g.group(2), bottom)

doc = ('<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'
       '<title>大模型训练全流程</title>\n' + block(rk, 'XRAY HEAD', True) + '\n<style>\n' + block(rk, 'XRAY PAGE CSS', False) + '\n'
       + block(fk, 'FIGKIT TOKENS', False) + '\n</style>\n</head>\n<body>\n' + block(rk, 'XRAY BODY TOP', True) + '\n' + body + '\n'
       + bottom + '\n<script>\n' + block(fk, 'FIGKIT JS', False) + '\n</script>\n<script>\n' + bpejs + rd('figs.js') + '</script>\n</body>\n</html>\n')
open(OUT, 'w', encoding='utf-8').write(doc)
print('built', len(doc) // 1024, 'KB,', len(marks), 'marks,', len(merges), 'merges,', nchar, 'chars')
