from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

old_tools = """const APP_TOOLS = [
  {id:'home',label:'Inicio',icon:'⌂',subtitle:'Centro de operaciones'},
  {id:'audit',label:'Auditoría',icon:'🔎',subtitle:'Auditoría de campo'},
  {id:'onboarding',label:'Inicio de cliente',icon:'🤝',subtitle:'Inicio de cliente'},
  {id:'production',label:'Producción',icon:'🎬',subtitle:'Producción de contenido'},
  {id:'tasks',label:'Tareas',icon:'✓',subtitle:'Tareas y seguimiento'},
  {id:'metrics',label:'Resultados',icon:'↗',subtitle:'Métricas y resultados'},
  {id:'reports',label:'Reportes',icon:'▤',subtitle:'Reportes para clientes'}
];"""
new_tools = """const APP_TOOLS = [
  {id:'home',label:'Inicio',icon:'⌂',subtitle:'Centro de operaciones'},
  {id:'clients',label:'Clientes',icon:'👥',subtitle:'Clientes'},
  {id:'audit',label:'Auditoría',icon:'🔎',subtitle:'Auditoría de campo'},
  {id:'onboarding',label:'Inicio de cliente',icon:'🤝',subtitle:'Inicio de cliente'},
  {id:'production',label:'Producción',icon:'🎬',subtitle:'Producción de contenido'},
  {id:'tasks',label:'Tareas',icon:'✓',subtitle:'Tareas y seguimiento'},
  {id:'metrics',label:'Resultados',icon:'↗',subtitle:'Métricas y resultados'},
  {id:'reports',label:'Reportes',icon:'▤',subtitle:'Reportes para clientes'}
];"""
if old_tools not in s:
    raise SystemExit('APP_TOOLS anchor not found')
s = s.replace(old_tools, new_tools, 1)

old_views = "const views={home:renderDashboard,onboarding:renderOnboarding,production:renderProduction,tasks:renderTasks,metrics:renderMetrics,reports:renderReports};"
new_views = "const views={home:renderDashboard,clients:renderClients,onboarding:renderOnboarding,production:renderProduction,tasks:renderTasks,metrics:renderMetrics,reports:renderReports};"
if old_views not in s:
    raise SystemExit('views anchor not found')
s = s.replace(old_views, new_views, 1)

anchor = "async function renderDashboard(m){"
if anchor not in s:
    raise SystemExit('renderDashboard anchor not found')

clients_code = r'''function clientTypeLabel(v){
  const x=String(v||'').toLowerCase();
  if(x==='restaurant'||x==='restaurante') return 'Restaurante';
  if(x==='bar') return 'Bar';
  if(x==='cafe'||x==='café'||x==='cafetería'||x==='cafeteria') return 'Cafetería';
  return v||'Sin tipo';
}
function clientStatusLabel(v){
  return ({prospect:'Prospecto',onboarding:'Inicio',active:'Activo',paused:'Pausado',closed:'Cerrado'})[v]||v||'Sin estado';
}
function clientMainLocation(c){
  return (c?.locations||[]).find(x=>x.is_primary)||(c?.locations||[])[0]||null;
}
function clientSearchText(c){
  const loc=clientMainLocation(c);
  return [c?.business_name,c?.business_type,c?.status,loc?.address].filter(Boolean).join(' ').toLowerCase();
}
function renderClientList(query=''){
  const host=document.getElementById('clientsList'); if(!host) return;
  const q=String(query||'').trim().toLowerCase();
  const items=clientCache.filter(c=>!q||clientSearchText(c).includes(q));
  if(!items.length){ host.innerHTML='<div class="empty">No se encontraron clientes.</div>'; return; }
  host.innerHTML=items.map(c=>{
    const loc=clientMainLocation(c),active=c.id===activeWorkspaceClientId;
    return `<div class="record" style="align-items:flex-start">
      <div class="record-main">
        <div class="record-title">${esc(c.business_name||'Sin nombre')} ${active?'<span class="badge ok">Cliente activo</span>':''}</div>
        <div class="record-meta">${esc(clientTypeLabel(c.business_type))} · <span class="badge ${c.status==='active'?'ok':'gray'}">${esc(clientStatusLabel(c.status))}</span>${loc?.address?' · 📍 '+esc(loc.address):''}</div>
        <div class="record-actions" style="margin-top:10px;flex-wrap:wrap">
          <button class="mini-btn ${active?'ok':''}" onclick="selectClientFromList('${c.id}')">${active?'Seleccionado ✓':'Seleccionar'}</button>
          <button class="mini-btn" onclick="openClientWorkspace('${c.id}','audit')">Auditoría</button>
          <button class="mini-btn" onclick="openClientWorkspace('${c.id}','onboarding')">Inicio de cliente</button>
          <button class="mini-btn" onclick="openClientWorkspace('${c.id}','production')">Producción</button>
          <button class="mini-btn" onclick="openClientWorkspace('${c.id}','tasks')">Tareas</button>
          <button class="mini-btn" onclick="openClientWorkspace('${c.id}','metrics')">Resultados</button>
          <button class="mini-btn" onclick="openClientWorkspace('${c.id}','reports')">Reportes</button>
        </div>
      </div>
    </div>`;
  }).join('');
}
async function renderClients(m){
  m.innerHTML=pageHead('Base Central','👥 Clientes','Selecciona primero el negocio y luego abre el módulo que necesites.','<button class="btn ghost" onclick="openTool(\'home\')">← Inicio</button>')+'<div class="card loading">Cargando clientes…</div>';
  try{
    await loadClients(true);
    const active=clientCache.find(c=>c.id===activeWorkspaceClientId),loc=clientMainLocation(active);
    m.innerHTML=pageHead('Base Central',`👥 Clientes · ${clientCache.length}`,'Busca, selecciona y continúa trabajando sin perder de vista qué negocio está activo.','<button class="btn ghost" onclick="openTool(\'home\')">← Inicio</button>')+
      activeClientBannerMarkup('clientsActiveClient',active?.business_name||'',loc?.address||'','Selecciona un cliente para comenzar')+
      `<div class="card"><div class="toolbar">
        <div><label class="field-label" for="clientSearch">Buscar cliente</label><input id="clientSearch" type="text" placeholder="Nombre, dirección, tipo o estado" oninput="renderClientList(this.value)"></div>
        <button class="btn primary" onclick="startNewClient()">+ Nuevo cliente</button>
      </div><div id="clientsList" class="record-list"></div></div>`;
    renderClientList('');
  }catch(e){ workspaceError(m,e); }
}
function selectClientFromList(id){
  setWorkspaceActiveClient(id);
  renderClients(document.getElementById('main'));
}
function startNewClient(){
  setWorkspaceActiveClient('');
  try{ localStorage.removeItem('mb360_inicio_cliente_v1'); }catch(e){}
  openTool('onboarding');
}
async function openClientWorkspace(id,tool){
  setWorkspaceActiveClient(id);
  const c=clientCache.find(x=>x.id===id),loc=clientMainLocation(c);
  if(tool==='audit'){
    try{
      const {data,error}=await sb.from('audits').select('id,audit_date,status').eq('client_id',id).order('audit_date',{ascending:false}).limit(1);
      if(error) throw error;
      if(data?.length){ openTool('audit',true); await loadAudit(data[0].id); return; }
      Object.keys(D).forEach(k=>delete D[k]);
      currentClientId=id; currentLocationId=loc?.id||null; currentAuditId=null;
      D['nombre']=c?.business_name||''; D['ubicacion']=loc?.address||'';
      const t=String(c?.business_type||'').toLowerCase();
      D['tipo']=t==='bar'?'Bar':(t==='cafe'||t==='café'||t==='cafetería'||t==='cafeteria')?'Café':'Restaurante';
      cur=0; openTool('audit'); return;
    }catch(e){ console.error(e); toast('No se pudo abrir la auditoría'); return; }
  }
  openTool(tool);
}

'''
s = s.replace(anchor, clients_code + anchor, 1)

old_grid = """    m.insertAdjacentHTML('beforeend',`<div class=\"tool-grid\">
      <button class=\"tool-card\" onclick=\"openTool('audit')\"><div class=\"tool-icon\">🔎</div><h2>Auditoría de campo</h2><p>Detecta fugas de dinero y prepara el diagnóstico comercial.</p><span class=\"tool-link\">Abrir auditoría →</span></button>"""
new_grid = """    m.insertAdjacentHTML('beforeend',`<div class=\"tool-grid\">
      <button class=\"tool-card\" onclick=\"openTool('clients')\"><div class=\"tool-icon\">👥</div><h2>Clientes</h2><p>Ve todos los clientes, busca uno y elígelo antes de abrir cualquier módulo.</p><span class=\"tool-link\">Abrir clientes →</span></button>
      <button class=\"tool-card\" onclick=\"openTool('audit')\"><div class=\"tool-icon\">🔎</div><h2>Auditoría de campo</h2><p>Detecta fugas de dinero y prepara el diagnóstico comercial.</p><span class=\"tool-link\">Abrir auditoría →</span></button>"""
if old_grid not in s:
    raise SystemExit('dashboard grid anchor not found')
s = s.replace(old_grid, new_grid, 1)

p.write_text(s, encoding='utf-8')
print('Clientes menu applied')
