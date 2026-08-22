/* MB360 Research Google private resources · discovery, selection and sync */
(() => {
  const SERVICES={
    google_business_profile:{label:'Google Business Profile',icon:'📍'},
    google_search_console:{label:'Google Search Console',icon:'🔎'},
    google_analytics_4:{label:'Google Analytics 4',icon:'📊'}
  };
  let G={role:'',connectors:[],resources:[],sources:[],runId:null};
  const escG=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const canEdit=()=>['admin','operator'].includes(G.role);
  const statusLabel=v=>({active:'Conectado',not_connected:'No conectado',awaiting_access:'Esperando acceso',paused:'Pausado',error:'Error',expired:'Vencido',revoked:'Revocado'})[v]||v||'No conectado';

  async function session(){const {data:{session}}=await sb.auth.getSession();G.role=session?.user?.app_metadata?.mb360_role||'';return session;}
  async function edge(slug,body){
    const s=await session();if(!s?.access_token)throw new Error('Sesión MB360 no disponible.');
    const r=await fetch(`${SUPABASE_URL}/functions/v1/${slug}`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${s.access_token}`,'apikey':SUPABASE_KEY},body:JSON.stringify(body)});
    const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d?.message||d?.error||`HTTP ${r.status}`);return d;
  }
  async function currentRunId(){
    if(typeof window.rsv2CurrentRunId==='function'){const x=window.rsv2CurrentRunId();if(x)return x;}
    const {data}=await sb.from('research_runs').select('id').eq('client_id',activeWorkspaceClientId).order('created_at',{ascending:false}).limit(1);return data?.[0]?.id||null;
  }
  async function load(){
    await session();G.runId=await currentRunId();
    if(!activeWorkspaceClientId){G.connectors=[];G.resources=[];G.sources=[];return;}
    const [c,r,s]=await Promise.all([
      sb.from('research_connectors').select('id,provider,display_name,status,config,last_success_at,last_error_at,last_error_message').eq('client_id',activeWorkspaceClientId).in('provider',Object.keys(SERVICES)),
      sb.from('research_connector_resources').select('*').eq('client_id',activeWorkspaceClientId).in('provider',Object.keys(SERVICES)).order('display_name'),
      G.runId?sb.from('research_sources').select('id,connector_id,source_ref,source_name,refresh_state,freshness_status,retrieved_at,last_refresh_error_message').eq('client_id',activeWorkspaceClientId).eq('research_run_id',G.runId):Promise.resolve({data:[],error:null})
    ]);
    if(c.error)throw c.error;if(r.error)throw r.error;if(s.error)throw s.error;G.connectors=c.data||[];G.resources=r.data||[];G.sources=s.data||[];
  }
  function connector(provider){return G.connectors.find(x=>x.provider===provider)||null;}
  function serviceRow(provider){
    const def=SERVICES[provider],c=connector(provider),active=c?.status==='active',resources=c?G.resources.filter(x=>x.connector_id===c.id):[],selected=resources.filter(x=>x.selected),account=c?.config?.account_label;
    return `<div class="rsv2-item"><div class="rsv2-item-top"><div><h3>${def.icon} ${escG(def.label)}</h3><div class="rsv2-meta">${active&&account?escG(account)+' · ':''}${escG(statusLabel(c?.status))}${selected.length?' · '+selected.length+' recurso(s) activo(s)':''}</div></div><span class="rsv2-badge ${active?'current':c?.status==='error'||c?.status==='expired'?'critical':'medium'}">${escG(statusLabel(c?.status))}</span></div>${c?.last_error_message?`<div class="rsv2-note">⚠️ ${escG(c.last_error_message)}</div>`:''}${selected.length?`<div class="rsv2-copy"><b>Usando:</b> ${selected.map(x=>escG(x.display_name)).join(' · ')}</div>`:''}${canEdit()&&active?`<div class="rsv2-actions"><button class="rsv2-action" onclick="rsgDiscover('${c.id}')">Detectar recursos</button>${resources.length?`<button class="rsv2-action primary" onclick="rsgConfigure('${c.id}')">Elegir recursos</button>`:''}<button class="rsv2-action" onclick="rsgDisconnect('${c.id}')">Desconectar</button></div>`:''}</div>`;
  }
  async function renderCard(){
    if(currentTool!=='research'||!activeWorkspaceClientId)return;
    const host=document.querySelector('.rsv2');if(!host)return;
    try{await load();}catch(e){console.error('Google private connectors',e);return;}
    let card=document.getElementById('rsv2PrivateConnectors');if(!card){card=document.createElement('div');card.id='rsv2PrivateConnectors';card.className='card';const first=host.querySelector(':scope > .card');if(first)first.insertAdjacentElement('afterend',card);else host.prepend(card);}
    const connected=G.connectors.filter(x=>x.status==='active').length;
    card.innerHTML=`<div class="rsv2-panel-head"><div><div class="section-title">Conexiones privadas</div><div class="hint" style="margin:0">Datos autorizados por el cliente. Los tokens permanecen cifrados en Supabase Vault.</div></div>${canEdit()?`<div class="rsv2-actions"><button class="rsv2-action primary" onclick="rsgConnectGoogle()">${connected?'Reconectar Google':'Conectar Google'}</button></div>`:''}</div>${!G.runId?'<div class="rsv2-note">Crea o abre una investigación antes de seleccionar recursos privados.</div>':''}<div class="rsv2-list">${Object.keys(SERVICES).map(serviceRow).join('')}</div>`;
  }
  async function connectGoogle(){try{const d=await edge('mb360-research-oauth',{action:'start',provider:'google',client_id:activeWorkspaceClientId,connectors:Object.keys(SERVICES),return_url:location.origin+location.pathname});if(!d.authorization_url)throw new Error('No se recibió URL de autorización.');location.assign(d.authorization_url);}catch(e){console.error(e);toast('Google: '+(e.message||'no se pudo iniciar'));}}
  async function disconnect(id){try{if(!confirm('¿Desconectar este servicio de Google del cliente activo?'))return;await edge('mb360-research-oauth',{action:'disconnect',connector_id:id});toast('Servicio desconectado ✓');await renderCard();}catch(e){console.error(e);toast('Error: '+e.message);}}
  async function discover(id){try{toast('Buscando recursos de Google…');const d=await edge('mb360-research-google-sync',{action:'discover',connector_id:id});toast(`${d.count||0} recurso(s) detectado(s) ✓`);await load();openConfig(id);}catch(e){console.error(e);toast('Google: '+e.message);}}
  function dialog(html){document.getElementById('rsgDialog')?.remove();const d=document.createElement('div');d.id='rsgDialog';d.className='rsv2-dialog';d.innerHTML=`<div class="rsv2-dialog-card">${html}</div>`;document.body.appendChild(d);}
  function close(){document.getElementById('rsgDialog')?.remove();}
  async function configureOpen(id){try{await load();openConfig(id);}catch(e){toast('Error: '+e.message);}}
  function openConfig(id){
    const c=G.connectors.find(x=>x.id===id),rows=G.resources.filter(x=>x.connector_id===id);if(!c)return;
    dialog(`<div class="rsv2-dialog-head"><h2>${escG(c.display_name)}</h2><button class="rsv2-close" onclick="rsgClose()">×</button></div><div class="rsv2-note">Selecciona únicamente los recursos que pertenecen a este cliente y deben alimentar la investigación activa.</div>${rows.length?`<div class="rsv2-list">${rows.map(r=>`<label class="rsv2-item" style="display:flex;gap:12px;align-items:flex-start;cursor:pointer"><input type="checkbox" name="rsgResource" value="${escG(r.resource_ref)}" ${r.selected?'checked':''} style="margin-top:5px;transform:scale(1.25)"><div><h3>${escG(r.display_name)}</h3><div class="rsv2-meta">${escG(r.resource_type||r.provider)} · ${escG(r.resource_ref)}</div></div></label>`).join('')}</div>`:'<div class="rsv2-empty">No hay recursos detectados. Cierra y usa “Detectar recursos”.</div>'}<div class="rsv2-actions">${rows.length?`<button class="rsv2-action primary" onclick="rsgSaveConfig('${id}')">Guardar selección</button>`:''}<button class="rsv2-action" onclick="rsgClose()">Cancelar</button></div>`);
  }
  async function saveConfig(id){try{if(!G.runId)throw new Error('No hay investigación activa.');const refs=[...document.querySelectorAll('input[name=rsgResource]:checked')].map(x=>x.value);await edge('mb360-research-google-sync',{action:'configure',connector_id:id,research_run_id:G.runId,resource_refs:refs});close();toast('Recursos vinculados ✓');await renderCard();if(typeof window.renderResearch==='function')setTimeout(()=>window.renderResearch(document.getElementById('main')),50);}catch(e){console.error(e);toast('Error: '+e.message);}}
  async function syncSource(id){try{toast('Sincronizando Google…');const d=await edge('mb360-research-google-sync',{action:'sync',source_id:id,trigger_type:'manual'});const r=d?.results?.[0];if(r?.status==='failed')throw new Error(r.error||r.error_code);toast(r?.changed?'Google actualizado · hay cambios ✓':'Google actualizado ✓');if(typeof window.renderResearch==='function')await window.renderResearch(document.getElementById('main'));setTimeout(renderCard,0);}catch(e){console.error(e);toast('Google: '+e.message);}}
  function injectSyncButtons(){
    if(currentTool!=='research')return;for(const src of G.sources){if(!src.connector_id||!src.source_ref)continue;const cards=[...document.querySelectorAll('.rsv2-item')];const card=cards.find(x=>x.textContent?.includes(src.source_name));if(card&&!card.querySelector(`[data-rsg-sync="${src.id}"]`)){const actions=document.createElement('div');actions.className='rsv2-actions';actions.innerHTML=`<button class="rsv2-action primary" data-rsg-sync="${src.id}" onclick="rsgSyncSource('${src.id}')">Sincronizar Google</button>`;card.appendChild(actions);}}
  }
  async function refreshAll(){await renderCard();injectSyncButtons();}
  function install(){
    window.rsgConnectGoogle=connectGoogle;window.rsgDisconnect=disconnect;window.rsgDiscover=discover;window.rsgConfigure=configureOpen;window.rsgSaveConfig=saveConfig;window.rsgClose=close;window.rsgSyncSource=syncSource;
    const old=window.renderWorkspaceTool;if(typeof old==='function')window.renderWorkspaceTool=function(m){const r=old(m);Promise.resolve(r).finally(()=>setTimeout(refreshAll,20));return r;};
    const oldTab=window.rsv2Tab;if(typeof oldTab==='function')window.rsv2Tab=function(v){const r=oldTab(v);Promise.resolve(r).finally(()=>setTimeout(refreshAll,20));return r;};
    const oldRun=window.rsv2OpenRun;if(typeof oldRun==='function')window.rsv2OpenRun=async function(id){const r=await oldRun(id);setTimeout(refreshAll,20);return r;};
    setTimeout(refreshAll,30);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
