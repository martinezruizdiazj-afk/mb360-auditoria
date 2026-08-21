from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')
css='  <link rel="stylesheet" href="resultados-v2.css?v=res2-1">'
js='  <script src="resultados-v2.js?v=res2-1"></script>'
if css not in s:
    anchor='  <link rel="stylesheet" href="tareas-v2.css?v=task2-1">'
    if anchor not in s:
        raise SystemExit('CSS anchor not found')
    s=s.replace(anchor,anchor+'\n'+css,1)
if js not in s:
    anchor='  <script src="tareas-v2.js?v=task2-1"></script>'
    if anchor not in s:
        raise SystemExit('JS anchor not found')
    s=s.replace(anchor,anchor+'\n'+js,1)
p.write_text(s,encoding='utf-8')
for f in [Path('.github/workflows/install-results-v2.yml'),Path('scripts/install-results-v2.py'),Path('trigger-results-v2.txt')]:
    if f.exists(): f.unlink()
