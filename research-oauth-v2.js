/* MB360 Research OAuth · private connector controls */
(() => {
  const GOOGLE_SERVICES={
    google_business_profile:'Google Business Profile',
    google_search_console:'Google Search Console',
    google_analytics_4:'Google Analytics 4'
  };
  const statusLabel=v=>({active:'Conectado',not_connected:'No conectado',awaiting_access:'Esperando acceso',paused:'Pausado',error:'Error',expired:'Vencido',revoked:'Revocado'})[v]||v||'No conectado';
  const escO=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  async function callOAuth(body){
    const {data:{session}}=await sb.auth.getSession();
    if(!session?.access_token) throw new Error('Sesión MB360 no disponible.');
    const res=await fetch(`${SUPABASE_URL}/functions/v1/mb360-research-oauth`,{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`,'apikey':SUPABASE_KEY},
      body:JSON.stringify(body)
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data?.message||data?.error||`OAuth HTTP ${res.status}`);
    return data;
  }

  async function loadConnectors(){
    if(!activeWorkspaceClientId)return[];
    const {data,error}=await sb.from('research_connectors')
      .select('id,provider,display_name,status,config,last_success_at,last_error_at,last_error_message')
      .eq('client_id',activeWorkspaceClientId)
      .in('provider',Object.keys(GOOGLE_SERVICES));
    if(error)throw error;
    return data||[];
  }

  function connectorRow(provider,rows){
    const c=rows.find(x=>x.provider===provider),cfg=c?.config||{},active=c?.status==='active';
    return `<div class="rsv2-item"><div class="rsv2-item-top"><div><h3>${escO(GOOGLE_SERVICES[provider])}</h3><div class="rsv2-meta">${active&&cfg.account_label?escO(cfg.account_label)+' · ':''}${escO(statusLabel(c?.status))}</div></div><span class="rsv2-badge ${active?'current':c?.status==='error'?'critical':'medium'}">${escO(statusLabel(c?.status))}</span></div>${c?.last_error_message?`<div class="rsv2-note">⚠️ ${escO(c.last_error_message)}</div>`:''}${c&&canResearchOAuthEdit()?`<div class="rsv2-actions"><button class="rsv2-action" onclick="rsv2DisconnectConnector('${c.id}')">Desconectar</button></div>`:''}</div>`;
  }

  function canResearchOAuthEdit(){return typeof RS==='undefined'?true:true;}

  async function injectPrivateConnectors(){
    if(currentTool!=='research'||!activeWorkspaceClientId)return;
    const host=document.querySelector('.rsv2');
    if(!host)return;
    document.getElementById('rsv2PrivateConnectors')?.remove();
    try{
      const rows=await loadConnectors();
      const connected=rows.filter(x=>x.status==='active').length;
      const card=document.createElement('div');
      card.id='rsv2PrivateConnectors';
      card.className='card';
      card.innerHTML=`<div class="rsv2-panel-head"><div><div class="section-title">Conexiones privadas</div><div class="hint" style="margin:0">Acceso OAuth del cliente. Los tokens se guardan cifrados en Supabase Vault y nunca en este navegador.</div></div><div class="rsv2-actions"><button class="rsv2-action primary" onclick="rsv2ConnectGoogle()">${connected?'Reconectar Google':'Conectar Google'}</button></div></div><div class="rsv2-note">Google puede autorizar Business Profile, Search Console y Analytics 4 en un solo consentimiento. MB360 solicita solo los alcances necesarios para estos servicios.</div><div class="rsv2-list">${Object.keys(GOOGLE_SERVICES).map(p=>connectorRow(p,rows)).join('')}</div>`;
      const first=host.querySelector(':scope > .card');
      if(first)first.insertAdjacentElement('afterend',card);else host.prepend(card);
    }catch(e){console.error('Research OAuth UI',e);}
  }

  async function connectGoogle(){
    try{
      const data=await callOAuth({
        action:'start',provider:'google',client_id:activeWorkspaceClientId,
        connectors:Object.keys(GOOGLE_SERVICES),
        return_url:location.origin+location.pathname
      });
      if(!data?.authorization_url)throw new Error('Google no devolvió URL de autorización.');
      location.assign(data.authorization_url);
    }catch(e){console.error(e);toast('Google: '+(e.message||'no se pudo iniciar la conexión'));}
  }

  async function disconnectConnector(id){
    try{
      if(!confirm('¿Desconectar este servicio de Google para el cliente activo?'))return;
      await callOAuth({action:'disconnect',connector_id:id});
      toast('Conexión eliminada ✓');
      await injectPrivateConnectors();
    }catch(e){console.error(e);toast('Error: '+(e.message||'no se pudo desconectar'));}
  }

  function handleOAuthReturn(){
    const u=new URL(location.href),status=u.searchParams.get('mb360_oauth');
    if(!status)return;
    const message=u.searchParams.get('mb360_oauth_message')||(status==='success'?'Google conectado':'No se pudo conectar Google');
    u.searchParams.delete('mb360_oauth');u.searchParams.delete('mb360_oauth_provider');u.searchParams.delete('mb360_oauth_message');
    history.replaceState({},'',u.pathname+u.search+u.hash);
    setTimeout(()=>{
      toast(message);
      if(activeWorkspaceClientId&&typeof openTool==='function')openTool('research',true);
    },250);
  }

  function install(){
    window.rsv2ConnectGoogle=connectGoogle;
    window.rsv2DisconnectConnector=disconnectConnector;
    const oldWorkspace=window.renderWorkspaceTool;
    if(typeof oldWorkspace==='function')window.renderWorkspaceTool=function(m){const r=oldWorkspace(m);Promise.resolve(r).finally(()=>setTimeout(injectPrivateConnectors,0));return r;};
    const oldTab=window.rsv2Tab;
    if(typeof oldTab==='function')window.rsv2Tab=function(v){const r=oldTab(v);Promise.resolve(r).finally(()=>setTimeout(injectPrivateConnectors,0));return r;};
    const oldOpenRun=window.rsv2OpenRun;
    if(typeof oldOpenRun==='function')window.rsv2OpenRun=async function(id){const r=await oldOpenRun(id);setTimeout(injectPrivateConnectors,0);return r;};
    handleOAuthReturn();
    setTimeout(injectPrivateConnectors,0);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
