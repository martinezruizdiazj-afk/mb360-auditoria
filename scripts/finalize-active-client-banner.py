from pathlib import Path

p=Path('inicio-cliente-app.js')
s=p.read_text(encoding='utf-8')
old='    this.restore();\n    this.render();\n    this.loadClients(this.initialClientId);'
new='    this.restore();\n    this.refreshActiveClient();\n    this.render();\n    this.loadClients(this.initialClientId);'
if s.count(old)!=1:
    raise RuntimeError(f'Expected one onboarding restore block, found {s.count(old)}')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

p=Path('index.html')
s=p.read_text(encoding='utf-8')
old='inicio-cliente-app.js?v=clientactive1'
new='inicio-cliente-app.js?v=clientactive2'
if s.count(old)!=1:
    raise RuntimeError(f'Expected one app cache reference, found {s.count(old)}')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
