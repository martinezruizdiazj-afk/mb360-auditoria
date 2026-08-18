from pathlib import Path
import re


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 occurrence, found {count}")
    return text.replace(old, new, 1)

# ---------- index.html ----------
p = Path('index.html')
s = p.read_text(encoding='utf-8')

s = replace_once(
    s,
    "let productionDraft = [];",
    "let productionDraft = [];\nlet activeWorkspaceClientId = localStorage.getItem('mb360_active_client_id')||'';",
    'active client state'
)

css_marker = "/* ---------- diagnosis ---------- */"
client_css = r'''/* ---------- Cliente activo ---------- */
.active-client-banner{
  display:flex;align-items:center;justify-content:space-between;gap:12px;
  background:#E8EEFC;border:2px solid #0B48D0;border-radius:14px;padding:12px 14px;
  margin:0 0 14px;box-shadow:0 5px 16px rgba(11,72,208,.08)
}
.active-client-banner .active-client-copy{min-width:0}
.active-client-banner .active-client-label{display:block;font:800 10px 'Archivo',sans-serif;letter-spacing:.14em;color:#0B48D0;margin-bottom:2px}
.active-client-banner strong{display:block;font:800 18px 'Archivo',sans-serif;color:#0C1524;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.active-client-banner small{display:block;color:#5B6472;font-size:12px;margin-top:2px}
.active-client-banner .active-client-ok{width:30px;height:30px;flex:0 0 30px;border-radius:50%;display:grid;place-items:center;background:#0B48D0;color:#fff;font-weight:900}
.active-client-banner.empty{background:#FCF1E0;border-color:#C77400;box-shadow:none}
.active-client-banner.empty .active-client-label{color:#9B5B00}
.active-client-banner.empty strong{font-size:15px}
.active-client-banner.empty .active-client-ok{display:none}
'''
if client_css not in s:
    s = replace_once(s, css_marker, client_css + "\n" + css_marker, 'client banner css')

helpers_marker = "function lines(v){"
helpers = r'''function activeClientBannerMarkup(id,name='',detail='',emptyText='Selecciona un cliente antes de cargar datos'){
  const n=String(name||'').trim(),d=String(detail||'').trim();
  if(!n) return `<div id="${id}" class="active-client-banner empty"><div class="active-client-copy"><span class="active-client-label">CLIENTE</span><strong>${esc(emptyText)}</strong><small>Así evitas guardar información en la ficha equivocada.</small></div></div>`;
  return `<div id="${id}" class="active-client-banner"><div class="active-client-copy"><span class="active-client-label">CLIENTE ACTIVO</span><strong>${esc(n)}</strong>${d?`<small>📍 ${esc(d)}</small>`:''}</div><div class="active-client-ok">✓</div></div>`;
}
function auditActiveClientBanner(){
  return activeClientBannerMarkup('auditActiveClient',D['nombre']||'',D['ubicacion']||'','Escribe el nombre del negocio para identificar esta auditoría');
}
function updateAuditClientBanner(){
  const old=document.getElementById('auditActiveClient');
  if(old) old.outerHTML=auditActiveClientBanner();
}
function setWorkspaceActiveClient(id){
  activeWorkspaceClientId=id||'';
  try{ if(activeWorkspaceClientId)localStorage.setItem('mb360_active_client_id',activeWorkspaceClientId); else localStorage.removeItem('mb360_active_client_id'); }catch(e){}
}
function updateToolClientBanner(prefix){
  const sel=document.getElementById(prefix+'Client'),host=document.getElementById(prefix+'ActiveClient');
  if(!host)return;
  const c=clientCache.find(x=>x.id===(sel?.value||''));
  const loc=(c?.locations||[]).find(x=>x.is_primary)||(c?.locations||[])[0];
  host.outerHTML=activeClientBannerMarkup(prefix+'ActiveClient',c?.business_name||'',loc?.address||'');
}
'''
if "function activeClientBannerMarkup(" not in s:
    s = replace_once(s, helpers_marker, helpers + "\n" + helpers_marker, 'client helper functions')

s = replace_once(
    s,
    "function setD(k,v){ if(v===undefined||v===''){ delete D[k]; } else { D[k]=v; } updateTicker(); }",
    "function setD(k,v){ if(v===undefined||v===''){ delete D[k]; } else { D[k]=v; } updateTicker(); if(k==='nombre'||k==='ubicacion') updateAuditClientBanner(); }",
    'audit banner live update'
)

section_old = "${s.hint?`<p class=\"hint\">${s.hint}</p>`:''}\n      <div class=\"card\">${s.f.map(renderField).join('')}</div>"
section_new = "${s.hint?`<p class=\"hint\">${s.hint}</p>`:''}\n      ${auditActiveClientBanner()}\n      <div class=\"card\">${s.f.map(renderField).join('')}</div>"
s = replace_once(s, section_old, section_new, 'audit section banner')

diag_old = "    <p class=\"hint internal\">Girá el celular y mostrá esta pantalla al dueño. Activá \"Modo cliente\" para ocultar tus notas internas.</p>\n\n    <div class=\"diag-total\">"
diag_new = "    <p class=\"hint internal\">Girá el celular y mostrá esta pantalla al dueño. Activá \"Modo cliente\" para ocultar tus notas internas.</p>\n    ${auditActiveClientBanner()}\n\n    <div class=\"diag-total\">"
s = replace_once(s, diag_old, diag_new, 'audit diagnosis banner')

s = replace_once(
    s,
    "    Object.assign(D,data.raw_answers||{});\n    currentAuditId=data.id; currentClientId=data.client_id; currentLocationId=data.location_id;\n    cur=SECTIONS.length; render(); toast('Auditoría cargada ✓');",
    "    Object.assign(D,data.raw_answers||{});\n    currentAuditId=data.id; currentClientId=data.client_id; currentLocationId=data.location_id;\n    if(currentClientId) setWorkspaceActiveClient(currentClientId);\n    cur=SECTIONS.length; render(); toast('Auditoría cargada ✓');",
    'audit load active client'
)

s = replace_once(
    s,
    "    await ensureCentralRecords();\n    const leaks=calcLeaks();",
    "    await ensureCentralRecords();\n    if(currentClientId) setWorkspaceActiveClient(currentClientId);\n    const leaks=calcLeaks();",
    'audit save active client'
)

s = replace_once(
    s,
    "  Object.keys(D).forEach(k=>delete D[k]); currentClientId=currentLocationId=currentAuditId=null; cur=0; render();",
    "  Object.keys(D).forEach(k=>delete D[k]); currentClientId=currentLocationId=currentAuditId=null; setWorkspaceActiveClient(''); cur=0; render();",
    'new audit clears active client'
)

client_picker_pattern = re.compile(r"function clientPicker\(prefix,allowNew=false\)\{.*?\n\}\nasync function resolveToolClient", re.S)
client_picker_new = r'''function clientPicker(prefix,allowNew=false){
  const selected=activeWorkspaceClientId&&clientCache.some(c=>c.id===activeWorkspaceClientId)?activeWorkspaceClientId:'';
  const c=clientCache.find(x=>x.id===selected);
  const loc=(c?.locations||[]).find(x=>x.is_primary)||(c?.locations||[])[0];
  return `${activeClientBannerMarkup(prefix+'ActiveClient',c?.business_name||'',loc?.address||'')}<div class="card"><div class="section-title">Cliente</div><div class="form-grid">
    <div class="${allowNew?'':'wide'}"><label class="field-label" for="${prefix}Client">Cliente existente</label><select id="${prefix}Client" onchange="setWorkspaceActiveClient(this.value);updateToolClientBanner('${prefix}')">${clientOptions(selected)}</select></div>
    ${allowNew?`<div><label class="field-label" for="${prefix}NewName">O crea uno nuevo</label><input id="${prefix}NewName" type="text" placeholder="Nombre del negocio"></div>
    <div><label class="field-label" for="${prefix}Type">Tipo de negocio</label><select id="${prefix}Type"><option value="restaurant">Restaurante</option><option value="bar">Bar</option><option value="cafe">Café</option></select></div>
    <div><label class="field-label" for="${prefix}Address">Dirección principal</label><input id="${prefix}Address" type="text" placeholder="Dirección"></div>`:''}
  </div>${allowNew?'<p class="hint" style="margin:10px 0 0">Si eliges un cliente existente, los campos de nuevo negocio se ignoran.</p>':''}</div>`;
}
async function resolveToolClient'''
s, n = client_picker_pattern.subn(client_picker_new, s, count=1)
if n != 1:
    raise RuntimeError(f'client picker replacement: expected 1, found {n}')

s = replace_once(
    s,
    "  clientCache=data||[];\n  return clientCache;",
    "  clientCache=data||[];\n  if(activeWorkspaceClientId&&!clientCache.some(c=>c.id===activeWorkspaceClientId)) setWorkspaceActiveClient('');\n  return clientCache;",
    'validate active client cache'
)

s = replace_once(
    s,
    "    MB360Onboarding.mount(document.getElementById('onboardingHost'), sb);",
    "    MB360Onboarding.mount(document.getElementById('onboardingHost'), sb, activeWorkspaceClientId||currentClientId||null);",
    'onboarding inherits active client'
)

s = s.replace('inicio-cliente.css?v=native1','inicio-cliente.css?v=clientactive1',1)
s = s.replace('inicio-cliente-app.js?v=dedup20','inicio-cliente-app.js?v=clientactive1',1)
p.write_text(s,encoding='utf-8')

# ---------- inicio-cliente-app.js ----------
p = Path('inicio-cliente-app.js')
s = p.read_text(encoding='utf-8')

s = replace_once(
    s,
    '  setv(id,v){ this.state[id]=v; this.touchSource(id); this.persist(); },',
    '  setv(id,v){ this.state[id]=v; this.touchSource(id); this.persist(); if(id==="business_name")this.refreshActiveClient(); },',
    'onboarding business name banner update'
)

method_marker = '  /* ---------- controles ---------- */'
methods = r'''  activeClientMarkup(){
    const c=this.clients.find(x=>x.id===this.selectedClientId),name=String(c?.business_name||this.state.business_name||"").trim();
    if(!name) return `<div id="obActiveClient" class="active-client-banner empty"><div class="active-client-copy"><span class="active-client-label">CLIENTE</span><strong>Selecciona un cliente o escribe el nombre del nuevo negocio</strong><small>Los datos quedarán vinculados a esa ficha.</small></div></div>`;
    return `<div id="obActiveClient" class="active-client-banner"><div class="active-client-copy"><span class="active-client-label">${this.selectedClientId?"CLIENTE ACTIVO":"NUEVO CLIENTE"}</span><strong>${E(name)}</strong><small>${this.selectedClientId?"Inicio de Cliente vinculado a esta ficha central.":"Se creará una ficha central al guardar."}</small></div><div class="active-client-ok">✓</div></div>`;
  },
  refreshActiveClient(){ const h=this.$("obActiveClient"); if(h)h.outerHTML=this.activeClientMarkup(); },

'''
if 'activeClientMarkup(){' not in s:
    s = replace_once(s, method_marker, methods + method_marker, 'onboarding banner methods')

s = replace_once(
    s,
    '      this.selectedClientId=null; this.persist(); this.render(); return;',
    '      this.selectedClientId=null; if(window.setWorkspaceActiveClient)window.setWorkspaceActiveClient(""); this.persist(); this.refreshActiveClient(); this.render(); return;',
    'onboarding clear active client'
)

s = replace_once(
    s,
    '    this.selectedClientId=id;\n    await this.loadAuditForClient(id);',
    '    this.selectedClientId=id;\n    if(window.setWorkspaceActiveClient)window.setWorkspaceActiveClient(id);\n    await this.loadAuditForClient(id);',
    'onboarding select active client'
)

s = replace_once(
    s,
    '    this.persist(); this.render();\n  },\n\n  /* ---------- ciclo de vida ---------- */',
    '    this.persist(); this.refreshActiveClient(); this.render();\n  },\n\n  /* ---------- ciclo de vida ---------- */',
    'onboarding refresh selected client banner'
)

s = replace_once(
    s,
    '    if(r.error)throw r.error;\n    return r.data.id;\n  },\n  async save(finalize){',
    '    if(r.error)throw r.error;\n    this.selectedClientId=r.data.id;\n    if(window.setWorkspaceActiveClient)window.setWorkspaceActiveClient(r.data.id);\n    this.refreshActiveClient();\n    return r.data.id;\n  },\n  async save(finalize){',
    'new onboarding client becomes active'
)

mount_old = '''      <div class="obtop">
        <div class="prog"><i id="obBar"></i></div>
        <div id="obPt" class="mini"></div>
      </div>
      <div class="picker">'''
mount_new = '''      <div class="obtop">
        <div class="prog"><i id="obBar"></i></div>
        <div id="obPt" class="mini"></div>
      </div>
      ${this.activeClientMarkup()}
      <div class="picker">'''
s = replace_once(s, mount_old, mount_new, 'onboarding banner markup')

p.write_text(s,encoding='utf-8')

# ---------- inicio-cliente.css ----------
p = Path('inicio-cliente.css')
s = p.read_text(encoding='utf-8')
scoped_css = r'''
#mb360ob .active-client-banner{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#12233f;border:2px solid #4f8dff;border-radius:16px;padding:12px 14px;margin-top:14px}
#mb360ob .active-client-banner .active-client-copy{min-width:0}
#mb360ob .active-client-banner .active-client-label{display:block;font-size:10px;font-weight:900;letter-spacing:.14em;color:#72d9ff;margin-bottom:2px}
#mb360ob .active-client-banner strong{display:block;color:#fff;font-size:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#mb360ob .active-client-banner small{display:block;color:#aebdca;font-size:12px;margin-top:2px}
#mb360ob .active-client-banner .active-client-ok{width:30px;height:30px;flex:0 0 30px;border-radius:50%;display:grid;place-items:center;background:#8dffcc;color:#062016;font-weight:900}
#mb360ob .active-client-banner.empty{background:#2b2416;border-color:#9a7427}
#mb360ob .active-client-banner.empty .active-client-label{color:#ffd37a}
#mb360ob .active-client-banner.empty strong{font-size:14px}
#mb360ob .active-client-banner.empty .active-client-ok{display:none}
'''
if '#mb360ob .active-client-banner{' not in s:
    s = s.rstrip() + '\n' + scoped_css + '\n'
p.write_text(s,encoding='utf-8')

print('Active client banner and cross-tool client selection applied successfully.')
