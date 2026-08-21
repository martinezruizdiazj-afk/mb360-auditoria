from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
css='  <link rel="stylesheet" href="resultados-v2.css?v=res2-1">'
css_new=css+'\n  <link rel="stylesheet" href="reportes-v2.css?v=rep2-1">'
if 'reportes-v2.css?v=rep2-1' not in s:
    if css not in s: raise SystemExit('CSS anchor not found')
    s=s.replace(css,css_new,1)
js='  <script src="resultados-v2.js?v=res2-1"></script>'
js_new=js+'\n  <script src="reportes-v2.js?v=rep2-1"></script>'
if 'reportes-v2.js?v=rep2-1' not in s:
    if js not in s: raise SystemExit('JS anchor not found')
    s=s.replace(js,js_new,1)
p.write_text(s,encoding='utf-8')
print('Reportes v2 installed in index.html')
