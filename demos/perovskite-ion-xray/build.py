# 把 reader-kit / figure-kit 的六段整块拷进来，拼上正文、图和预置标注，产出单文件 HTML。
import base64, html, json, re, os
HERE = os.path.dirname(os.path.abspath(__file__))
R = os.path.join(HERE, '..', '..', 'references')
rk = open(os.path.join(R, 'reader-kit.html'), encoding='utf-8').read()
fk = open(os.path.join(R, 'figure-kit.html'), encoding='utf-8').read()

def block(src, name, htmlc):
    a, b = (('<!-- ===== ' + name + ' START', '<!-- ===== ' + name + ' END ===== -->') if htmlc
            else ('/* ===== ' + name + ' START', '/* ===== ' + name + ' END ===== */'))
    i, j = src.index(a), src.index(b)
    return src[i:j + len(b)]

def img(p):
    return 'data:image/' + ('jpeg' if p.endswith('.jpg') else 'png') + ';base64,' + base64.b64encode(open(os.path.join(HERE, p), 'rb').read()).decode()

def code(p):
    out = []
    for ln in open(os.path.join(HERE, p), encoding='utf-8').read().rstrip().split('\n'):
        e = html.escape(ln, quote=False)
        k = e.find('#')
        out.append(e if k < 0 else e[:k] + '<span class="c">' + e[k:] + '</span>')
    return '\n'.join(out)

body = ''.join(open(os.path.join(HERE, f), encoding='utf-8').read() for f in ('body1.html', 'body2.html', 'body3.html'))
body = (body.replace('__PFIG3__', img('paper-fig3.jpg')).replace('__PFIG4__', img('paper-fig4.jpg'))
            .replace('__PFIG5__', img('paper-fig5.jpg')).replace('__FIGARR__', img('fig-arrhenius.png')))

OUT = 'D:/Desktop/paper-xray/demos/perovskite-ion-xray/perovskite-ion-xray.html'
marks = json.load(open(os.path.join(HERE, 'marks.json'), encoding='utf-8'))
plain = re.sub(r'<[^>]+>', '', body)
for m in marks:
    assert m['quote'] in plain, 'quote not found: ' + m['quote']
    m.setdefault('prefix', ''); m.setdefault('suffix', '')
state = {'v': 1, 'doc': {'title': '光电流的慢弛豫和碘空位的一次跳跃共用一个 0.6 eV', 'source': 'Ionic transport in hybrid lead iodide perovskite solar cells (Eames et al., Nat. Commun. 2015)',
                         'made': '2026-10-11', 'lang': 'zh', 'file': OUT},
         'marks': marks, 'folds': [], 'updated': max(m['t'] for m in marks), 'saved': max(m['t'] for m in marks)}

bottom = block(rk, 'XRAY BODY BOTTOM', True)
bottom = re.sub(r'(<script type="application/json" id="xray-notes">)[\s\S]*?(</script>)',
                lambda g: g.group(1) + json.dumps(state, ensure_ascii=False).replace('<', '\\u003c') + g.group(2), bottom)

doc = ('<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'
       '<title>钙钛矿里的碘空位</title>\n' + block(rk, 'XRAY HEAD', True) + '\n<style>\n' + block(rk, 'XRAY PAGE CSS', False) + '\n'
       + block(fk, 'FIGKIT TOKENS', False) + '\n</style>\n</head>\n<body>\n' + block(rk, 'XRAY BODY TOP', True) + '\n' + body + '\n'
       + bottom + '\n<script>\n' + block(fk, 'FIGKIT JS', False) + '\n</script>\n<script>\n'
       + open(os.path.join(HERE, 'figs.js'), encoding='utf-8').read() + '</script>\n</body>\n</html>\n')
open(OUT, 'w', encoding='utf-8').write(doc)
print('built', len(doc) // 1024, 'KB,', len(marks), 'marks')
