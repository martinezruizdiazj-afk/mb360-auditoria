/* MB360 · Producción v2 · 2026-08 */
(() => {
  const P2 = {
    view: 'dashboard',
    clientId: '',
    data: null,
    draftShots: [],
    currentSessionId: '',
    currentPlan: null,
    filter: 'all'
  };

  const $ = id => document.getElementById(id);
  const qsa = sel => Array.from(document.querySelectorAll(sel));
  const safe = v => typeof esc === 'function' ? esc(v) : String(v ?? '');
  const nowIso = () => new Date().toISOString();
  const dateOnly = d => new Date(d).toISOString().slice(0,10);
  const dayNames = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  const statusLabel = s => ({planned:'Planificada',confirmed:'Confirmada',in_production:'En producción',completed:'Finalizada',delivered_to_editing:'Material a edición',cancelled:'Cancelada'})[s] || s || 'Planificada';
  const shotStatusLabel = s => ({pending:'Pendiente',recorded:'Grabada',repeat:'Repetir',discarded:'Descartada'})[s] || s || 'Pendiente';
  const editLabel = s => ({pending_edit:'Pendiente de editar',editing:'En edición',edited:'Editado',do_not_use:'No usar'})[s] || s || 'Pendiente de editar';
  const prioLabel = p => ({high:'Alta',medium:'Media',low:'Baja'})[p] || p || 'Media';
  const typeLabel = t => ({photo:'Foto',video:'Video',photo_video:'Foto + video'})[t] || t || 'Foto + video';
  const fmtDateTime = v => {
    if(!v) return 'Sin fecha';
    const d=new Date(v); if(Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString('es-US',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'});
  };
  const weekStart = (d=new Date()) => {
    const x=new Date(d); const day=(x.getDay()+6)%7; x.setHours(12,0,0,0); x.setDate(x.getDate()-day); return dateOnly(x);
  };
  const arr = v => Array.isArray(v) ? v : (v == null || v === '' ? [] : [v]);
  const text = v => Array.isArray(v) ? v.join(', ') : (v && typeof v==='object' ? JSON.stringify(v) : String(v||''));
  const normalize = v => text(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');

  function main(){ return $('main'); }
  function activeClient(){ return clientCache.find(c=>c.id===activeWorkspaceClientId) || null; }
  function mainLoc(c=activeClient()){ return c ? clientMainLocation(c) : null; }

  async function ensureClient(){
    await loadClients();
    if(activeWorkspaceClientId && clientCache.some(c=>c.id===activeWorkspaceClientId)){
      P2.clientId=activeWorkspaceClientId; return activeWorkspaceClientId;
    }
    P2.clientId=''; return '';
  }

  async function loadClientData(clientId){
    const empty = {sessions:[], products:[], onboarding:null, slots:[], media:[], plans:[]};
    if(!clientId) return empty;
    const [s,p,o,t,m,pl] = await Promise.all([
      sb.from('production_sessions').select('id,client_id,location_id,scheduled_date,actual_date,production_goal,status,notes,production_type,desired_outputs,responsibles,plan_context,validation_warnings,carryover_policy,finalized_at,created_at,production_shots(id,product_id,subject_name,shot_type,description,orientation,duration_target_seconds,priority,planned_use,completed,completed_at,notes,status,assignee,edit_status,source_shot_id,position,metadata)').eq('client_id',clientId).order('scheduled_date',{ascending:false,nullsFirst:false}).limit(100),
      sb.from('products').select('id,name,category,sales_level,profitability_level,client_wants_to_push,active,notes').eq('client_id',clientId).eq('active',true).order('client_wants_to_push',{ascending:false}).limit(100),
      sb.from('onboardings').select('id,onboarding_date,raw_answers,preliminary_priorities').eq('client_id',clientId).order('onboarding_date',{ascending:false}).limit(1),
      sb.from('business_time_slots').select('id,day_of_week,start_time,end_time,demand_level,available_capacity,notes').eq('client_id',clientId).order('day_of_week').order('start_time'),
      sb.from('production_media').select('id,production_session_id,production_shot_id,product_id,storage_path,file_name,mime_type,file_size,media_status,edit_status,notes,created_at').eq('client_id',clientId).order('created_at',{ascending:false}).limit(300),
      sb.from('production_plans').select('id,week_start,objective,source_context,priorities,status,converted_session_id,created_at').eq('client_id',clientId).order('week_start',{ascending:false}).limit(20)
    ]);
    const firstErr=[s,p,o,t,m,pl].find(x=>x.error)?.error; if(firstErr) throw firstErr;
    return {sessions:s.data||[],products:p.data||[],onboarding:o.data?.[0]||null,slots:t.data||[],media:m.data||[],plans:pl.data||[]};
  }

  function productionShell(inner, title='🎬 Producción', hint='Planifica, ejecuta y organiza el contenido del cliente.'){
    const c=activeClient(), loc=mainLoc(c);
    const head=pageHead('Operación',title,hint,'<button class="btn ghost" onclick="openTool(\'home\')">← Inicio</button>');
    const banner=activeClientBannerMarkup('prod2Active',c?.business_name||'',loc?.address||'','Selecciona un cliente para trabajar en Producción');
    return head+banner+prodNav()+`<div class="prod2">${inner}</div>`;
  }

  function prodNav(){
    const items=[['dashboard','Resumen'],['new','+ Nueva'],['plan','Plan semanal'],['agenda','Agenda'],['history','Historial'],['material','Material']];
    return `<div class="prod2-tabs">${items.map(([id,l])=>`<button class="${P2.view===id?'active':''}" onclick="prod2Go('${id}')">${l}</button>`).join('')}</div>`;
  }

  function clientChooser(){
    return `<div class="card"><div class="section-title">Selecciona el cliente</div><label class="field-label">Cliente</label><select id="prod2Client" onchange="prod2SelectClient(this.value)">${clientOptions(activeWorkspaceClientId)}</select><p class="hint" style="margin-top:10px">La producción quedará siempre vinculada al cliente activo.</p></div>`;
  }

  function dashboardHtml(d){
    const now=new Date();
    const future=d.sessions.filter(s=>s.scheduled_date && new Date(s.scheduled_date)>=now && !['completed','delivered_to_editing','cancelled'].includes(s.status)).sort((a,b)=>new Date(a.scheduled_date)-new Date(b.scheduled_date));
    const next=future[0];
    const activeShots=d.sessions.flatMap(s=>(s.production_shots||[]).map(x=>({...x,_session:s}))).filter(x=>['pending','repeat'].includes(x.status|| (x.completed?'recorded':'pending')));
    const done=d.sessions.filter(s=>['completed','delivered_to_editing'].includes(s.status)).sort((a,b)=>new Date(b.actual_date||b.scheduled_date||b.created_at)-new Date(a.actual_date||a.scheduled_date||a.created_at));
    const last=done[0];
    const pieces=new Set(activeShots.map(x=>x.subject_name||x.product_id||x.description)).size;
    const alerts=buildAlerts(d);
    return `<div class="prod2-stats">
      <div class="prod2-stat"><span>Próxima sesión</span><b>${next?fmtDateTime(next.scheduled_date):'Sin programar'}</b></div>
      <div class="prod2-stat"><span>Tomas pendientes</span><b>${activeShots.length}</b></div>
      <div class="prod2-stat"><span>Última producción</span><b>${last?fmtDateTime(last.actual_date||last.scheduled_date):'—'}</b></div>
      <div class="prod2-stat"><span>Piezas pendientes</span><b>${pieces}</b></div>
    </div>
    <div class="prod2-primary"><button class="btn primary" onclick="prod2Go('new')">+ Nueva producción</button><button class="btn ghost" onclick="prod2Go('plan')">Generar plan semanal</button></div>
    ${alerts.length?`<div class="card"><div class="section-title">Prioridades y alertas</div>${alerts.map(a=>`<div class="prod2-alert ${a.level}"><b>${a.icon} ${safe(a.title)}</b><small>${safe(a.detail)}</small></div>`).join('')}</div>`:''}
    <div class="card"><div class="section-title">Próximas producciones</div>${future.length?future.slice(0,6).map(sessionRow).join(''):'<div class="empty">No hay producciones próximas.</div>'}</div>
    <div class="card"><div class="section-title">Últimas producciones</div>${d.sessions.length?d.sessions.slice(0,8).map(sessionRow).join(''):'<div class="empty">Todavía no hay producciones.</div>'}</div>`;
  }

  function buildAlerts(d){
    const alerts=[]; const now=new Date(); const end=new Date(now); end.setDate(end.getDate()+7);
    const upcoming=d.sessions.filter(s=>s.scheduled_date && new Date(s.scheduled_date)>=now && new Date(s.scheduled_date)<=end && !['completed','cancelled','delivered_to_editing'].includes(s.status));
    if(!upcoming.length) alerts.push({level:'high',icon:'⚠️',title:'No hay producción programada para los próximos 7 días',detail:'Crea una sesión o genera el plan semanal.'});
    const repeat=d.sessions.flatMap(s=>s.production_shots||[]).filter(x=>x.status==='repeat').length;
    if(repeat) alerts.push({level:'high',icon:'🔁',title:`Hay ${repeat} toma${repeat===1?'':'s'} para repetir`,detail:'Conviene incluirlas en la próxima sesión.'});
    const emptySessions=d.sessions.filter(s=>['planned','confirmed'].includes(s.status)&&(s.production_shots||[]).length===0);
    if(emptySessions.length) alerts.push({level:'medium',icon:'📋',title:'Hay sesiones sin lista de tomas',detail:'Completa el checklist antes de ir al cliente.'});
    const cutoff=new Date(); cutoff.setDate(cutoff.getDate()-30);
    const recentSubjects=new Set(d.sessions.filter(s=>new Date(s.actual_date||s.scheduled_date||s.created_at)>=cutoff).flatMap(s=>s.production_shots||[]).filter(x=>x.status==='recorded'||x.completed).map(x=>normalize(x.subject_name)));
    const stale=d.products.filter(p=>p.client_wants_to_push&&!recentSubjects.has(normalize(p.name)));
    if(stale.length) alerts.push({level:'medium',icon:'🎯',title:'Falta material reciente de productos prioritarios',detail:stale.slice(0,3).map(x=>x.name).join(', ')});
    const raw=d.onboarding?.raw_answers||{};
    if(text(raw.scheduled_events).trim() && !d.media.some(x=>new Date(x.created_at)>=cutoff)) alerts.push({level:'medium',icon:'📣',title:'Hay eventos/promociones registrados y poco material reciente',detail:'Revisa el calendario antes de la próxima producción.'});
    return alerts;
  }

  function sessionRow(s){
    const shots=s.production_shots||[], recorded=shots.filter(x=>(x.status==='recorded'||x.completed)).length, pending=shots.filter(x=>['pending','repeat'].includes(x.status||'pending')).length;
    return `<button class="prod2-session-row" onclick="prod2OpenSession('${s.id}')"><div><b>${safe(s.production_goal||'Producción')}</b><small>${fmtDateTime(s.scheduled_date)} · ${typeLabel(s.production_type)} · ${recorded}/${shots.length} grabadas${pending?` · ${pending} pendientes`:''}</small></div><span class="prod2-badge">${safe(statusLabel(s.status))}</span></button>`;
  }

  function newSessionHtml(d){
    const c=activeClient(), loc=mainLoc(c);
    const products=d.products||[];
    const warnings=P2.tempWarnings||[];
    return `<div class="card"><div class="section-title">Nueva producción</div><div class="form-grid">
      <div><label class="field-label">Fecha y hora</label><input id="p2Date" type="datetime-local" onchange="prod2PreviewWarnings()"></div>
      <div><label class="field-label">Lugar</label><select id="p2Location"><option value="${loc?.id||''}">Local principal${loc?.address?' · '+safe(loc.address):''}</option><option value="other">Otra ubicación</option></select></div>
      <div><label class="field-label">Tipo de producción</label><select id="p2Type"><option value="photo">Foto</option><option value="video">Video</option><option value="photo_video" selected>Foto + video</option></select></div>
      <div><label class="field-label">Estado inicial</label><select id="p2Status"><option value="planned">Planificada</option><option value="confirmed">Confirmada</option></select></div>
      <div class="wide"><label class="field-label">Objetivo de la sesión</label><input id="p2Goal" placeholder="Ej: impulsar almuerzos de lunes a jueves"></div>
      <div class="wide"><label class="field-label">Qué queremos producir</label><div class="prod2-checks">${['Reels','Stories','Fotos Instagram','Google Business Profile','Anuncios','Menú / web'].map(x=>`<label><input type="checkbox" name="p2Output" value="${x}"> ${x}</label>`).join('')}</div></div>
      <div><label class="field-label">Responsable de grabación</label><input id="p2Recording" placeholder="Nombre"></div>
      <div><label class="field-label">Fotografía</label><input id="p2Photo" placeholder="Nombre"></div>
      <div><label class="field-label">Edición</label><input id="p2Editing" placeholder="Pendiente / nombre"></div>
      <div><label class="field-label">Asistente</label><input id="p2Assistant" placeholder="Opcional"></div>
      <div class="wide"><label class="field-label">Notas</label><textarea id="p2Notes" placeholder="Equipo, productos, indicaciones del cliente…"></textarea></div>
    </div></div>
    <div id="p2Warnings">${warningHtml(warnings)}</div>
    <div class="card"><div class="section-title">Lista exacta de tomas</div><div class="form-grid">
      <div><label class="field-label">Producto / plato</label><input id="p2Subject" list="p2Products" placeholder="Ej: Pizza especial"><datalist id="p2Products">${products.map(p=>`<option value="${safe(p.name)}"></option>`).join('')}</datalist></div>
      <div><label class="field-label">Tipo</label><select id="p2ShotType"><option>Producto</option><option>Ambiente</option><option>Proceso</option><option>Testimonio</option><option>Promoción</option><option>Equipo</option></select></div>
      <div class="wide"><label class="field-label">Descripción de la toma</label><input id="p2Desc" placeholder="Ej: close-up saliendo del horno"></div>
      <div><label class="field-label">Formato</label><select id="p2Orientation"><option value="9:16">9:16</option><option value="4:5">4:5</option><option value="1:1">1:1</option><option value="16:9">16:9</option></select></div>
      <div><label class="field-label">Uso previsto</label><select id="p2Use"><option>Reel</option><option>Story</option><option>Google</option><option>Anuncio</option><option>Menú / web</option><option>Otro</option></select></div>
      <div><label class="field-label">Prioridad</label><select id="p2Priority"><option value="high">Alta</option><option value="medium" selected>Media</option><option value="low">Baja</option></select></div>
      <div><label class="field-label">Asignada a</label><input id="p2Assignee" placeholder="Opcional"></div>
    </div><div class="prod2-primary"><button class="btn ghost" onclick="prod2AddDraftShot()">+ Agregar toma</button></div><div id="p2Draft">${draftShotsHtml()}</div></div>
    <div class="prod2-sticky"><button class="btn primary" onclick="prod2SaveSession()">Guardar producción</button></div>`;
  }

  function warningHtml(w){
    return w?.length?`<div class="card"><div class="section-title">Validación antes de programar</div>${w.map(x=>`<div class="prod2-alert ${x.level||'medium'}"><b>⚠️ ${safe(x.title)}</b><small>${safe(x.detail||'')}</small></div>`).join('')}</div>`:'';
  }

  function draftShotsHtml(){
    if(!P2.draftShots.length) return '<div class="empty">Agrega las tomas que no pueden faltar.</div>';
    return P2.draftShots.map((s,i)=>`<div class="prod2-draft"><div><b>${safe(s.subject_name||s.shot_type)} · ${safe(s.orientation)}</b><small>${safe(s.description)} · ${safe(s.planned_use)} · Prioridad ${safe(prioLabel(s.priority))}</small></div><button class="mini-btn" onclick="prod2RemoveDraftShot(${i})">Quitar</button></div>`).join('');
  }

  function validateDraft(dateValue,d){
    const warnings=[]; const raw=d.onboarding?.raw_answers||{};
    if(dateValue){
      const dt=new Date(dateValue); const day=dayNames[dt.getDay()];
      const avoidDays=normalize(raw.visit_avoid_days);
      if(avoidDays.includes(normalize(day))) warnings.push({level:'high',title:`${day.charAt(0).toUpperCase()+day.slice(1)} figura como día a evitar`,detail:'El Inicio de Cliente recomienda no realizar visitas este día.'});
      const avoidTimes=normalize(raw.visit_avoid_times);
      if(avoidTimes){ warnings.push({level:'medium',title:'Hay horarios que el cliente pidió evitar',detail:text(raw.visit_avoid_times)}); }
      const matching=d.slots.filter(x=>Number(x.day_of_week)===dt.getDay());
      if(matching.some(x=>['high','very_high','saturated'].includes(normalize(x.demand_level)))) warnings.push({level:'medium',title:'Ese día tiene franjas de alta demanda',detail:'Revisa la hora para no interferir con la operación.'});
    }
    if(text(raw.saturation).trim()) warnings.push({level:'medium',title:'Hay horarios/áreas de saturación registrados',detail:text(raw.saturation)});
    if(text(raw.recording_restrictions).trim()) warnings.push({level:'medium',title:'Existen restricciones de grabación',detail:text(raw.recording_restrictions)});
    if(text(raw.no_record_areas).trim()) warnings.push({level:'medium',title:'Hay zonas donde no se debe grabar',detail:text(raw.no_record_areas)});
    if(text(raw.dont_promote).trim()) warnings.push({level:'medium',title:'Hay productos que no conviene promocionar',detail:text(raw.dont_promote)});
    if(text(raw.constraints).trim()) warnings.push({level:'low',title:'Limitaciones operativas registradas',detail:text(raw.constraints)});
    return warnings.slice(0,8);
  }

  function planHtml(d){
    const existing=d.plans?.[0];
    const plan=P2.currentPlan || existing;
    return `<div class="card"><div class="section-title">Plan semanal automático</div><p class="hint">Usa productos prioritarios, datos del Inicio de Cliente, pendientes de sesiones anteriores y actividad reciente para proponer qué grabar.</p><div class="prod2-primary"><button class="btn primary" onclick="prod2GeneratePlan()">Generar / actualizar plan</button></div></div>
      ${plan?renderPlan(plan):'<div class="card"><div class="empty">Todavía no hay un plan semanal.</div></div>'}`;
  }

  function renderPlan(plan){
    const priorities=arr(plan.priorities);
    return `<div class="card"><div class="section-title">Semana del ${safe(plan.week_start||weekStart())}</div><h3 style="margin:0 0 14px">${safe(plan.objective||'Plan semanal de producción')}</h3>${priorities.map((p,i)=>`<div class="prod2-plan-item"><b>${i+1}. ${safe(p.subject||p.title||'Prioridad')}</b><small>${safe(p.reason||'Prioridad de contenido')}</small><div class="prod2-chiprow">${arr(p.outputs).map(x=>`<span>${safe(x)}</span>`).join('')}</div><div class="prod2-plan-shots">${arr(p.shots).map(x=>`<div>• ${safe(x.description||x)}</div>`).join('')}</div></div>`).join('')}<div class="prod2-primary"><button class="btn primary" onclick="prod2CreateSessionFromPlan('${plan.id||''}')">Crear sesión con este plan</button></div></div>`;
  }

  function extractSubjectsFromOnboarding(raw){
    const out=[];
    const keys=['top_sellers','top_products','products_detail','products_notes','most_profitable_products'];
    for(const k of keys){
      const v=raw?.[k];
      if(Array.isArray(v)) v.forEach(x=>{ if(typeof x==='string') out.push(x); else if(x?.name) out.push(x.name); else if(x?.product) out.push(x.product); });
      else if(typeof v==='string') v.split(/\n|,/).map(x=>x.trim()).filter(Boolean).forEach(x=>out.push(x));
    }
    return [...new Set(out)].slice(0,8);
  }

  function buildAutomaticPlan(d){
    const raw=d.onboarding?.raw_answers||{};
    const subjects=[];
    d.products.filter(p=>p.client_wants_to_push).forEach(p=>subjects.push({name:p.name,reason:'Producto marcado para impulsar'}));
    d.products.filter(p=>normalize(p.profitability_level).includes('high')||normalize(p.profitability_level).includes('alta')).forEach(p=>subjects.push({name:p.name,reason:'Alta rentabilidad'}));
    extractSubjectsFromOnboarding(raw).forEach(name=>subjects.push({name,reason:'Producto destacado en Inicio de Cliente'}));
    const pending=d.sessions.flatMap(s=>s.production_shots||[]).filter(x=>['pending','repeat'].includes(x.status)).slice(0,8);
    pending.forEach(x=>subjects.unshift({name:x.subject_name||'Pendiente anterior',reason:x.status==='repeat'?'Toma pendiente de repetir':'Toma pendiente de sesión anterior',carry:x}));
    const uniq=[]; const seen=new Set();
    for(const s of subjects){ const k=normalize(s.name); if(k&&!seen.has(k)){seen.add(k);uniq.push(s);} }
    if(!uniq.length) uniq.push({name:'Producto / servicio prioritario',reason:'Completar material comercial de la semana'});
    const chosen=uniq.slice(0,4);
    const priorities=chosen.map((s,i)=>({
      subject:s.name,
      reason:s.reason,
      outputs:i===0?['1 Reel','3 Stories','Fotos']:['Stories','Fotos'],
      shots:s.carry?[{description:s.carry.description,shot_type:s.carry.shot_type||'Producto',orientation:s.carry.orientation||'9:16',planned_use:s.carry.planned_use||'Reel',priority:'high'}]:[
        {description:`Plano general de ${s.name}`,shot_type:'Producto',orientation:'9:16',planned_use:'Reel',priority:i===0?'high':'medium'},
        {description:`Close-up / detalle de ${s.name}`,shot_type:'Producto',orientation:'9:16',planned_use:'Story',priority:i===0?'high':'medium'},
        {description:`Proceso o preparación de ${s.name}`,shot_type:'Proceso',orientation:'9:16',planned_use:'Reel',priority:'medium'}
      ]
    }));
    const weak=text(raw.weak_dayparts||raw.fill_dayparts||raw.weak_days);
    const objective=weak?`Crear material para impulsar ${weak}`:'Crear material comercial prioritario de la semana';
    return {week_start:weekStart(),objective,priorities,source_context:{weak_periods:weak,products_used:chosen.map(x=>x.name),pending_count:pending.length,onboarding_id:d.onboarding?.id||null}};
  }

  function agendaHtml(sessions){
    const sorted=[...sessions].filter(s=>s.scheduled_date).sort((a,b)=>new Date(a.scheduled_date)-new Date(b.scheduled_date));
    const conflicts=new Set();
    for(let i=0;i<sorted.length;i++) for(let j=i+1;j<sorted.length;j++){
      const a=new Date(sorted[i].scheduled_date),b=new Date(sorted[j].scheduled_date); if(b-a>2*3600000) break; if(sorted[i].id!==sorted[j].id){conflicts.add(sorted[i].id);conflicts.add(sorted[j].id);}
    }
    return `<div class="card"><div class="section-title">Agenda general de producción</div>${sorted.length?sorted.map(s=>`<button class="prod2-session-row" onclick="prod2OpenAgendaSession('${s.client_id}','${s.id}')"><div><b>${safe(s.clients?.business_name||'Cliente')} · ${safe(s.production_goal||'Producción')}</b><small>${fmtDateTime(s.scheduled_date)} · ${(s.production_shots||[]).length} tomas${(s.production_shots||[]).length===0?' · ⚠️ sin checklist':''}${conflicts.has(s.id)?' · ⚠️ posible superposición':''}</small></div><span class="prod2-badge">${safe(statusLabel(s.status))}</span></button>`).join(''):'<div class="empty">No hay sesiones programadas.</div>'}</div>`;
  }

  function historyHtml(d){
    const list=[...d.sessions].sort((a,b)=>new Date(b.actual_date||b.scheduled_date||b.created_at)-new Date(a.actual_date||a.scheduled_date||a.created_at));
    return `<div class="card"><div class="section-title">Historial de producción</div>${list.length?list.map(s=>{const sh=s.production_shots||[],rec=sh.filter(x=>x.status==='recorded'||x.completed).length,pend=sh.filter(x=>['pending','repeat'].includes(x.status)).length;return `<div class="prod2-history"><button onclick="prod2OpenSession('${s.id}')"><b>${safe(s.production_goal||'Producción')}</b><small>${fmtDateTime(s.actual_date||s.scheduled_date)} · ${rec}/${sh.length} grabadas${pend?` · ${pend} pendientes`:''} · ${safe(statusLabel(s.status))}</small></button><button class="mini-btn" onclick="prod2DuplicateSession('${s.id}')">Duplicar</button></div>`}).join(''):'<div class="empty">Todavía no hay historial.</div>'}</div>`;
  }

  function materialHtml(d){
    const recorded=d.sessions.flatMap(s=>(s.production_shots||[]).filter(x=>x.status==='recorded'||x.completed).map(x=>({...x,_session:s})));
    const mediaByShot={}; d.media.forEach(m=>(mediaByShot[m.production_shot_id] ||= []).push(m));
    return `<div class="card"><div class="section-title">Material producido</div>${recorded.length?recorded.map(x=>{const files=mediaByShot[x.id]||[];return `<div class="prod2-material"><div><b>${safe(x.subject_name||x.description)}</b><small>${safe(x.description)} · ${safe(x.orientation||'')} · ${safe(x.planned_use||'')} · ${files.length} archivo${files.length===1?'':'s'}</small><div class="prod2-chiprow">${files.map(f=>`<button onclick="prod2OpenMedia('${f.id}')">📎 ${safe(f.file_name)}</button>`).join('')}</div></div><select onchange="prod2SetEditStatus('${x.id}',this.value)"><option value="pending_edit" ${x.edit_status==='pending_edit'?'selected':''}>Pendiente de editar</option><option value="editing" ${x.edit_status==='editing'?'selected':''}>En edición</option><option value="edited" ${x.edit_status==='edited'?'selected':''}>Editado</option><option value="do_not_use" ${x.edit_status==='do_not_use'?'selected':''}>No usar</option></select></div>`}).join(''):'<div class="empty">Todavía no hay tomas grabadas.</div>'}</div>`;
  }

  async function sessionDetailHtml(sessionId){
    const {data:s,error}=await sb.from('production_sessions').select('id,client_id,location_id,scheduled_date,actual_date,production_goal,status,notes,production_type,desired_outputs,responsibles,plan_context,validation_warnings,carryover_policy,finalized_at,production_shots(id,product_id,subject_name,shot_type,description,orientation,priority,planned_use,completed,completed_at,notes,status,assignee,edit_status,position,metadata)').eq('id',sessionId).single();
    if(error) throw error;
    const {data:media}=await sb.from('production_media').select('id,production_shot_id,file_name,storage_path,edit_status,created_at').eq('production_session_id',sessionId).order('created_at');
    const {data:content}=await sb.from('content_items').select('id,title,content_type,status,product_id,publications(id,platform,status,published_at)').eq('production_session_id',sessionId).limit(50);
    let metrics=[];
    try{ const r=await sb.from('metrics').select('metric_key,metric_value,source,period_start,metadata').eq('client_id',s.client_id).contains('metadata',{production_session_id:sessionId}).limit(20); metrics=r.data||[]; }catch(e){}
    const shots=(s.production_shots||[]).sort((a,b)=>(a.position||0)-(b.position||0));
    const statusOf=x=>x.status|| (x.completed?'recorded':'pending');
    const filtered=P2.filter==='all'?shots:shots.filter(x=>statusOf(x)===P2.filter);
    const counts={all:shots.length,pending:shots.filter(x=>statusOf(x)==='pending').length,recorded:shots.filter(x=>statusOf(x)==='recorded').length,repeat:shots.filter(x=>statusOf(x)==='repeat').length,discarded:shots.filter(x=>statusOf(x)==='discarded').length};
    const filesByShot={}; (media||[]).forEach(f=>(filesByShot[f.production_shot_id] ||= []).push(f));
    const resp=s.responsibles||{};
    const progress=shots.length?Math.round(counts.recorded/shots.length*100):0;
    return `<div class="prod2-session-head"><div><span>${safe(statusLabel(s.status))}</span><h2>${safe(s.production_goal||'Producción')}</h2><small>${fmtDateTime(s.scheduled_date)} · ${safe(typeLabel(s.production_type))}</small></div><b>${counts.recorded}/${shots.length}</b></div>
      <div class="prod2-progress"><i style="width:${progress}%"></i></div>
      ${arr(s.validation_warnings).length?warningHtml(arr(s.validation_warnings)):''}
      <div class="card"><div class="section-title">Responsables</div><div class="prod2-resp"><span>Grabación: <b>${safe(resp.recording||'—')}</b></span><span>Foto: <b>${safe(resp.photo||'—')}</b></span><span>Edición: <b>${safe(resp.editing||'Pendiente')}</b></span><span>Asistente: <b>${safe(resp.assistant||'—')}</b></span></div><div class="prod2-primary"><button class="mini-btn" onclick="prod2SetSessionStatus('${s.id}','confirmed')">Confirmar</button><button class="mini-btn" onclick="prod2SetSessionStatus('${s.id}','in_production')">Iniciar producción</button></div></div>
      <div class="prod2-filters">${[['all','Todas'],['pending','Pendientes'],['recorded','Grabadas'],['repeat','Repetir'],['discarded','Descartadas']].map(([k,l])=>`<button class="${P2.filter===k?'active':''}" onclick="prod2Filter('${k}')">${l} · ${counts[k]}</button>`).join('')}</div>
      <div class="prod2-shotlist">${filtered.length?filtered.map(x=>shotCard(x,filesByShot[x.id]||[])).join(''):'<div class="card"><div class="empty">No hay tomas en este filtro.</div></div>'}</div>
      <div class="card"><div class="section-title">Resultados vinculados</div><div class="prod2-resp"><span>Contenidos: <b>${content?.length||0}</b></span><span>Publicaciones: <b>${(content||[]).reduce((n,x)=>n+(x.publications?.length||0),0)}</b></span><span>Métricas vinculadas: <b>${metrics.length}</b></span></div>${metrics.length?`<div class="prod2-chiprow">${metrics.slice(0,6).map(x=>`<span>${safe(x.metric_key)}: ${safe(x.metric_value)}</span>`).join('')}</div>`:'<p class="hint">Cuando Resultados guarde métricas vinculadas a esta producción, aparecerán aquí.</p>'}</div>
      <div class="prod2-sticky"><button class="btn primary" onclick="prod2ShowFinalize('${s.id}')">Finalizar producción</button></div>`;
  }

  function shotCard(x,files){
    const st=x.status|| (x.completed?'recorded':'pending');
    return `<div class="prod2-shot ${st}"><div class="prod2-shot-top"><div><span class="prod2-badge">${safe(prioLabel(x.priority))}</span><h3>${safe(x.subject_name||x.shot_type||'Toma')}</h3><p>${safe(x.description)}</p><small>${safe(x.orientation||'')} · ${safe(x.planned_use||'')} ${x.assignee?'· '+safe(x.assignee):''}</small></div><b>${safe(shotStatusLabel(st))}</b></div>
      <div class="prod2-shot-actions"><button onclick="prod2SetShotStatus('${x.id}','recorded')">✅ Grabada</button><button onclick="prod2SetShotStatus('${x.id}','repeat')">🔁 Repetir</button><button onclick="prod2SetShotStatus('${x.id}','pending')">⏭ Pendiente</button><button onclick="prod2SetShotStatus('${x.id}','discarded')">🗑 Descartar</button></div>
      <div class="prod2-files"><label class="mini-btn">📎 Agregar archivo<input type="file" accept="image/*,video/*" multiple onchange="prod2UploadFiles('${x.id}',this.files)" hidden></label>${files.map(f=>`<button class="mini-btn" onclick="prod2OpenMedia('${f.id}')">${safe(f.file_name)}</button>`).join('')}</div></div>`;
  }

  function finalizeDialogHtml(s){
    const shots=s.production_shots||[], rec=shots.filter(x=>x.status==='recorded'||x.completed).length, rep=shots.filter(x=>x.status==='repeat').length, pend=shots.filter(x=>x.status==='pending'||(!x.status&&!x.completed)).length, disc=shots.filter(x=>x.status==='discarded').length;
    return `<div class="prod2-modal"><div class="prod2-modal-card"><h2>Finalizar producción</h2><div class="prod2-stats"><div class="prod2-stat"><span>Planificadas</span><b>${shots.length}</b></div><div class="prod2-stat"><span>Grabadas</span><b>${rec}</b></div><div class="prod2-stat"><span>Repetir</span><b>${rep}</b></div><div class="prod2-stat"><span>Pendientes</span><b>${pend}</b></div></div><p class="hint">Descartadas: ${disc}</p><label class="field-label">Qué hacer con lo pendiente</label><select id="p2Carry"><option value="next">Pasar a próxima producción</option><option value="close">Cerrar sin reprogramar</option></select><div class="prod2-primary"><button class="btn ghost" onclick="prod2CloseModal()">Cancelar</button><button class="btn primary" onclick="prod2Finalize('${s.id}')">Finalizar</button></div></div></div>`;
  }

  async function renderProductionV2(m){
    try{
      await ensureClient();
      if(!P2.clientId){
        P2.view='dashboard';
        m.innerHTML=productionShell(clientChooser()); return;
      }
      P2.data=await loadClientData(P2.clientId);
      let inner='';
      if(P2.view==='dashboard') inner=dashboardHtml(P2.data);
      else if(P2.view==='new') inner=newSessionHtml(P2.data);
      else if(P2.view==='plan') inner=planHtml(P2.data);
      else if(P2.view==='history') inner=historyHtml(P2.data);
      else if(P2.view==='material') inner=materialHtml(P2.data);
      else if(P2.view==='agenda'){
        const {data,error}=await sb.from('production_sessions').select('id,client_id,scheduled_date,production_goal,status,clients(business_name),production_shots(id,status)').not('scheduled_date','is',null).order('scheduled_date',{ascending:true}).limit(100); if(error) throw error; inner=agendaHtml(data||[]);
      }
      else if(P2.view==='session') inner=await sessionDetailHtml(P2.currentSessionId);
      m.innerHTML=productionShell(inner,P2.view==='session'?'🎬 Producción de hoy':'🎬 Producción');
    }catch(e){ console.error(e); workspaceError(m,e); }
  }

  window.renderProduction = renderProductionV2;

  window.prod2Go = async view => { P2.view=view; if(view!=='session') P2.currentSessionId=''; if(view==='new'){P2.draftShots=[];P2.tempWarnings=[];} await renderProductionV2(main()); window.scrollTo({top:0,behavior:'smooth'}); };
  window.prod2SelectClient = async id => { setWorkspaceActiveClient(id); P2.clientId=id; P2.view='dashboard'; await renderProductionV2(main()); };
  window.prod2AddDraftShot = () => {
    const desc=$('p2Desc')?.value.trim(); if(!desc) return toast('Describe la toma primero');
    P2.draftShots.push({subject_name:$('p2Subject')?.value.trim()||null,shot_type:$('p2ShotType')?.value||'Producto',description:desc,orientation:$('p2Orientation')?.value||'9:16',planned_use:$('p2Use')?.value||'Reel',priority:$('p2Priority')?.value||'medium',assignee:$('p2Assignee')?.value.trim()||null,status:'pending',edit_status:'pending_edit',position:P2.draftShots.length});
    $('p2Desc').value=''; $('p2Subject').value=''; const h=$('p2Draft'); if(h)h.innerHTML=draftShotsHtml();
  };
  window.prod2RemoveDraftShot = i => { P2.draftShots.splice(i,1); P2.draftShots.forEach((x,n)=>x.position=n); if($('p2Draft'))$('p2Draft').innerHTML=draftShotsHtml(); };
  window.prod2PreviewWarnings = () => { if(!P2.data)return; P2.tempWarnings=validateDraft($('p2Date')?.value,P2.data); if($('p2Warnings'))$('p2Warnings').innerHTML=warningHtml(P2.tempWarnings); };

  window.prod2SaveSession = async () => {
    try{
      const goal=$('p2Goal')?.value.trim(); if(!goal) throw new Error('Escribe el objetivo de la sesión.');
      if(!P2.draftShots.length) throw new Error('Agrega al menos una toma.');
      const scheduled=$('p2Date')?.value; const warnings=validateDraft(scheduled,P2.data);
      const outputs=qsa('input[name="p2Output"]:checked').map(x=>x.value);
      const resp={recording:$('p2Recording')?.value.trim()||'',photo:$('p2Photo')?.value.trim()||'',editing:$('p2Editing')?.value.trim()||'',assistant:$('p2Assistant')?.value.trim()||''};
      const locValue=$('p2Location')?.value; const loc=locValue&&locValue!=='other'?locValue:null;
      const {data:s,error}=await sb.from('production_sessions').insert({client_id:P2.clientId,location_id:loc,scheduled_date:scheduled?new Date(scheduled).toISOString():null,production_goal:goal,status:$('p2Status')?.value||'planned',notes:$('p2Notes')?.value.trim()||null,production_type:$('p2Type')?.value||'photo_video',desired_outputs:outputs,responsibles:resp,validation_warnings:warnings}).select('id').single(); if(error) throw error;
      const rows=P2.draftShots.map((x,i)=>({...x,production_session_id:s.id,position:i,completed:false}));
      const ins=await sb.from('production_shots').insert(rows); if(ins.error) throw ins.error;
      P2.draftShots=[]; P2.currentSessionId=s.id; P2.view='session'; toast('Producción guardada ✓'); await renderProductionV2(main());
    }catch(e){ console.error(e); toast('Error: '+(e.message||'no se pudo guardar')); }
  };

  window.prod2GeneratePlan = async () => {
    try{
      const draft=buildAutomaticPlan(P2.data);
      const old=P2.data.plans.find(x=>x.week_start===draft.week_start&&x.status==='draft');
      let plan;
      if(old){ const r=await sb.from('production_plans').update({objective:draft.objective,source_context:draft.source_context,priorities:draft.priorities,updated_at:nowIso()}).eq('id',old.id).select('*').single(); if(r.error)throw r.error; plan=r.data; }
      else { const r=await sb.from('production_plans').insert({client_id:P2.clientId,...draft,status:'draft'}).select('*').single(); if(r.error)throw r.error; plan=r.data; }
      P2.currentPlan=plan; P2.data=await loadClientData(P2.clientId); toast('Plan semanal generado ✓'); await renderProductionV2(main());
    }catch(e){ console.error(e); toast('Error al generar plan'); }
  };

  window.prod2CreateSessionFromPlan = async id => {
    try{
      let plan=P2.currentPlan || P2.data.plans.find(x=>x.id===id) || P2.data.plans[0]; if(!plan) throw new Error('Genera primero un plan.');
      const priorities=arr(plan.priorities), shots=[];
      priorities.forEach(p=>arr(p.shots).forEach(x=>shots.push({subject_name:p.subject||null,shot_type:x.shot_type||'Producto',description:x.description||String(x),orientation:x.orientation||'9:16',priority:x.priority||'medium',planned_use:x.planned_use||'Reel',status:'pending',edit_status:'pending_edit',position:shots.length}))); if(!shots.length) throw new Error('El plan no tiene tomas.');
      const next=new Date(); next.setDate(next.getDate()+1); next.setHours(15,0,0,0);
      const {data:s,error}=await sb.from('production_sessions').insert({client_id:P2.clientId,location_id:mainLoc()?.id||null,scheduled_date:next.toISOString(),production_goal:plan.objective||'Plan semanal',status:'planned',production_type:'photo_video',desired_outputs:[...new Set(priorities.flatMap(p=>arr(p.outputs)))],plan_context:{production_plan_id:plan.id,source_context:plan.source_context||{}},validation_warnings:validateDraft(next.toISOString().slice(0,16),P2.data)}).select('id').single(); if(error)throw error;
      const r=await sb.from('production_shots').insert(shots.map(x=>({...x,production_session_id:s.id,completed:false}))); if(r.error)throw r.error;
      if(plan.id) await sb.from('production_plans').update({status:'converted',converted_session_id:s.id,updated_at:nowIso()}).eq('id',plan.id);
      P2.currentSessionId=s.id; P2.view='session'; toast('Sesión creada desde el plan ✓'); await renderProductionV2(main());
    }catch(e){console.error(e);toast('Error: '+(e.message||'no se pudo crear la sesión'));}
  };

  window.prod2OpenSession = async id => { P2.currentSessionId=id; P2.view='session'; P2.filter='all'; await renderProductionV2(main()); window.scrollTo({top:0,behavior:'smooth'}); };
  window.prod2OpenAgendaSession = async (clientId,id) => { setWorkspaceActiveClient(clientId); P2.clientId=clientId; P2.currentSessionId=id; P2.view='session'; P2.filter='all'; await renderProductionV2(main()); };
  window.prod2Filter = async f => { P2.filter=f; await renderProductionV2(main()); };

  window.prod2SetSessionStatus = async (id,status) => {
    try{ const patch={status,updated_at:nowIso()}; if(status==='in_production') patch.actual_date=nowIso(); const r=await sb.from('production_sessions').update(patch).eq('id',id); if(r.error)throw r.error; toast(status==='in_production'?'Producción iniciada ✓':'Estado actualizado ✓'); await renderProductionV2(main()); }catch(e){toast('No se pudo actualizar');}
  };
  window.prod2SetShotStatus = async (id,status) => {
    try{ const completed=status==='recorded'; const patch={status,completed,completed_at:completed?nowIso():null}; const r=await sb.from('production_shots').update(patch).eq('id',id); if(r.error)throw r.error; await renderProductionV2(main()); }catch(e){console.error(e);toast('No se pudo actualizar la toma');}
  };
  window.prod2SetEditStatus = async (id,status) => { const r=await sb.from('production_shots').update({edit_status:status}).eq('id',id); if(r.error)toast('No se pudo actualizar'); else toast('Estado de edición actualizado ✓'); };

  window.prod2UploadFiles = async (shotId,fileList) => {
    const files=Array.from(fileList||[]); if(!files.length)return;
    try{
      const sessionId=P2.currentSessionId; let ok=0;
      for(const f of files){
        const clean=(f.name||'archivo').replace(/[^a-zA-Z0-9._-]+/g,'_'); const path=`${P2.clientId}/production/${sessionId}/${shotId}/${Date.now()}-${clean}`;
        const up=await sb.storage.from('mb360-assets').upload(path,f,{upsert:false,contentType:f.type||undefined}); if(up.error)throw up.error;
        const row=await sb.from('production_media').insert({client_id:P2.clientId,production_session_id:sessionId,production_shot_id:shotId,storage_path:path,file_name:f.name||clean,mime_type:f.type||null,file_size:f.size||null,media_status:'linked',edit_status:'pending_edit'}); if(row.error)throw row.error; ok++;
      }
      toast(`${ok} archivo${ok===1?'':'s'} vinculado${ok===1?'':'s'} ✓`); await renderProductionV2(main());
    }catch(e){console.error(e);toast('Error al subir archivo: '+(e.message||''));}
  };

  window.prod2OpenMedia = async id => {
    try{ const {data,error}=await sb.from('production_media').select('storage_path').eq('id',id).single(); if(error)throw error; const r=await sb.storage.from('mb360-assets').createSignedUrl(data.storage_path,120); if(r.error)throw r.error; window.open(r.data.signedUrl,'_blank'); }catch(e){toast('No se pudo abrir el archivo');}
  };

  window.prod2ShowFinalize = async id => {
    try{ const {data,error}=await sb.from('production_sessions').select('id,production_shots(id,status,completed)').eq('id',id).single(); if(error)throw error; document.body.insertAdjacentHTML('beforeend',finalizeDialogHtml(data)); }catch(e){toast('No se pudo preparar el cierre');}
  };
  window.prod2CloseModal = () => document.querySelector('.prod2-modal')?.remove();
  window.prod2Finalize = async id => {
    try{
      const carry=$('p2Carry')?.value||'next';
      const {data:s,error}=await sb.from('production_sessions').select('id,client_id,location_id,scheduled_date,production_goal,production_type,desired_outputs,responsibles,production_shots(id,product_id,subject_name,shot_type,description,orientation,priority,planned_use,status,assignee,edit_status)').eq('id',id).single(); if(error)throw error;
      const pending=(s.production_shots||[]).filter(x=>['pending','repeat'].includes(x.status)); let nextId=null;
      if(carry==='next'&&pending.length){ const nextDate=s.scheduled_date?new Date(s.scheduled_date):new Date(); nextDate.setDate(nextDate.getDate()+7); const nr=await sb.from('production_sessions').insert({client_id:s.client_id,location_id:s.location_id,scheduled_date:nextDate.toISOString(),production_goal:`Continuación · ${s.production_goal||'Producción'}`,status:'planned',production_type:s.production_type,desired_outputs:s.desired_outputs,responsibles:s.responsibles,plan_context:{carryover_from_session:id}}).select('id').single(); if(nr.error)throw nr.error; nextId=nr.data.id; const rows=pending.map((x,i)=>({production_session_id:nextId,product_id:x.product_id,subject_name:x.subject_name,shot_type:x.shot_type,description:x.description,orientation:x.orientation,priority:x.priority,planned_use:x.planned_use,status:'pending',assignee:x.assignee,edit_status:'pending_edit',source_shot_id:x.id,position:i,completed:false})); const ir=await sb.from('production_shots').insert(rows); if(ir.error)throw ir.error; }
      const ur=await sb.from('production_sessions').update({status:'completed',actual_date:nowIso(),finalized_at:nowIso(),carryover_policy:carry,updated_at:nowIso()}).eq('id',id); if(ur.error)throw ur.error;
      prod2CloseModal(); toast(nextId?'Producción finalizada y pendientes reprogramadas ✓':'Producción finalizada ✓'); P2.view='dashboard';P2.currentSessionId='';await renderProductionV2(main());
    }catch(e){console.error(e);toast('Error al finalizar: '+(e.message||''));}
  };

  window.prod2DuplicateSession = async id => {
    try{
      const {data:s,error}=await sb.from('production_sessions').select('client_id,location_id,scheduled_date,production_goal,production_type,desired_outputs,responsibles,notes,production_shots(product_id,subject_name,shot_type,description,orientation,priority,planned_use,assignee)').eq('id',id).single(); if(error)throw error;
      const dt=s.scheduled_date?new Date(s.scheduled_date):new Date(); dt.setDate(dt.getDate()+7);
      const nr=await sb.from('production_sessions').insert({client_id:s.client_id,location_id:s.location_id,scheduled_date:dt.toISOString(),production_goal:`Copia · ${s.production_goal||'Producción'}`,production_type:s.production_type,desired_outputs:s.desired_outputs,responsibles:s.responsibles,notes:s.notes,status:'planned',plan_context:{duplicated_from_session:id}}).select('id').single(); if(nr.error)throw nr.error;
      const shots=(s.production_shots||[]).map((x,i)=>({...x,production_session_id:nr.data.id,status:'pending',edit_status:'pending_edit',position:i,completed:false})); if(shots.length){const ir=await sb.from('production_shots').insert(shots);if(ir.error)throw ir.error;}
      toast('Producción duplicada ✓'); P2.currentSessionId=nr.data.id;P2.view='session';await renderProductionV2(main());
    }catch(e){console.error(e);toast('No se pudo duplicar');}
  };
})();
