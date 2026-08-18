from pathlib import Path
import re

p = Path('index.html')
s = p.read_text(encoding='utf-8')

# 1) Stop navigating away from Centro de Operaciones.
s = s.replace("  if(id==='onboarding'){ window.location.href='./inicio-cliente-maestro.html'; return; }\n", "")

# 2) Replace the old/basic embedded onboarding view with the Master view inside an iframe.
pattern = re.compile(r"async function renderOnboarding\(m\)\{.*?\n\}\nasync function saveOnboarding\(\)", re.S)
replacement = r'''async function renderOnboarding(m){
  m.innerHTML=pageHead('Configuración','🤝 Inicio de cliente · Maestro','Versión Maestra MB360 integrada dentro del Centro de Operaciones.','<button class="btn ghost" onclick="openTool(\\'home\\')">← Inicio</button>')+`
    <div class="card" style="padding:0;overflow:hidden;background:#0b0d10;border-color:#1f2937">
      <iframe
        id="onboardingMasterFrame"
        src="./inicio-cliente-maestro.html?embedded=1&v=6"
        title="Inicio de Cliente Maestro"
        style="display:block;width:100%;height:calc(100dvh - 190px);min-height:680px;border:0;background:#0b0d10"
        allow="clipboard-write"
      ></iframe>
    </div>`;
}
async function saveOnboarding()'''

s2, n = pattern.subn(replacement, s, count=1)
if n != 1:
    raise SystemExit(f'No se encontró renderOnboarding para reemplazar (matches={n})')

p.write_text(s2, encoding='utf-8')
print('index.html actualizado: Inicio de Cliente Maestro integrado en Centro de Operaciones')
