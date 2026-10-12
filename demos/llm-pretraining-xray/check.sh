CH="/c/Program Files/Google/Chrome/Application/chrome.exe"
U="file:///D:/Desktop/paper-xray/demos/llm-pretraining-xray/llm-pretraining-xray.html"
"$CH" --headless=new --disable-gpu --virtual-time-budget=8000 --dump-dom "$U?lint" 2>/dev/null > dom.html
python -c "
import re;s=open('dom.html',encoding='utf-8').read()
for i in ('xr-lint','fk-lint'):
  m=re.search(r'<pre id=\"'+i+r'\"[^>]*>([\s\S]*?)</pre>',s);print(i, m.group(1)[:1500] if m else None)
print('marks',len(re.findall(r'<mark class=\"xr-m',s)),'cards',s.count('class=\"xr-card'))
"
for t in light dark; do "$CH" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=8000 --window-size=1440,${H:-9000} --screenshot="$PWD/shot-$t.png" "$U?theme=$t" 2>/dev/null; done
"$CH" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=8000 --window-size=560,${H:-9000} --screenshot="$PWD/shot-narrow.png" "$U?theme=light" 2>/dev/null
