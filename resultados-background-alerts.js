/* MB360 · Resultados background alerts UI · 2026-08 */
(() => {
  const WRAPPED = '_mb360BackgroundAlertsWrapped';
  const CARD_ID = 'mb360BackgroundAlertsCard';
  let installAttempts = 0;

  const escHtml = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const fmtDate = v => {
    if (!v) return '—';
    const d = new Date(String(v).length === 10 ? v + 'T12:00:00' : v);
    return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('es-US',{day:'numeric',month:'short'});
  };
  const sevOrder = {critical:0,high:1,medium:2,low:3};
  const sevLabel = {critical:'Crítica',high:'Alta',medium:'Media',low:'Baja'};

  async function loadOpenAlerts(){
    const cid = window.activeWorkspaceClientId || '';
    if (!cid || !window.sb) return [];
    const {data,error} = await window.sb.from('result_alerts')
      .select('id,client_id,task_id,alert_type,severity,title,detail,metric_key,current_value,previous_value,change_percent,window_start,window_end,status,last_detected_at,metadata')
      .eq('client_id',cid)
      .eq('status','open')
      .order('last_detected_at',{ascending:false})
      .limit(20);
    if (error) throw error;
    return (data || []).sort((a,b)=>(sevOrder[a.severity]??9)-(sevOrder[b.severity]??9));
  }

  function alertRow(a){
    const icon = a.severity === 'critical' ? '⛔' : a.severity === 'high' ? '⚠️' : '🟡';
    const change = a.change_percent == null ? '' : ` · ${Number(a.change_percent).toFixed(1)}%`;
    const period = a.window_start && a.window_end ? `${fmtDate(a.window_start)} – ${fmtDate(a.window_end)}` : 'Monitoreo automático';
    const task = a.task_id
      ? '<span class="res2-pill ok">Tarea creada</span>'
      : `<button class="mini-btn" onclick="mb360ResultAlertTask('${escHtml(a.id)}')">Crear tarea</button>`;
    return `<div class="res2-alert ${a.severity === 'critical' || a.severity === 'high' ? 'high' : 'medium'}" style="margin-top:8px">
      <b>${icon} ${escHtml(a.title)}</b>
      <small>${escHtml(a.detail || '')}<br>${escHtml(period)}${escHtml(change)} · Prioridad ${escHtml(sevLabel[a.severity] || a.severity)}</small>
      ${task}
    </div>`;
  }

  async function inject(){
    const main = document.getElementById('main');
    if (!main) return;
    const old = document.getElementById(CARD_ID);
    if (old) old.remove();
    if (!main.querySelector('.res2-kpis')) return;
    try {
      const alerts = await loadOpenAlerts();
      if (!alerts.length) return;
      const card = document.createElement('div');
      card.id = CARD_ID;
      card.className = 'card';
      card.innerHTML = `<div class="res2-section-title"><b>Monitoreo 24/7 · Alertas activas</b><span class="res2-pill warn">${alerts.length}</span></div>${alerts.map(alertRow).join('')}`;
      const actions = main.querySelector('.res2-actions');
      if (actions) actions.insertAdjacentElement('afterend', card);
      else main.querySelector('.res2-kpis')?.insertAdjacentElement('afterend', card);
    } catch (e) {
      console.error('Background result alerts', e);
    }
  }

  window.mb360ResultAlertTask = async function(id){
    try {
      if (!window.sb) throw new Error('Supabase no disponible');
      const cid = window.activeWorkspaceClientId || '';
      if (!cid) throw new Error('Selecciona un cliente');
      const {data:a,error:ae} = await window.sb.from('result_alerts').select('*').eq('id',id).eq('client_id',cid).single();
      if (ae) throw ae;
      if (a.task_id) {
        if (typeof window.toast === 'function') window.toast('Esta alerta ya tiene una tarea');
        return;
      }
      const priority = a.severity === 'critical' ? 'critical' : a.severity === 'high' ? 'high' : 'medium';
      const impact = ['critical','high'].includes(a.severity) ? 'high' : 'medium';
      const {data:t,error:te} = await window.sb.from('tasks').insert({
        client_id:cid,
        title:`Atender alerta: ${a.title}`,
        description:a.detail || 'Alerta detectada automáticamente por Resultados.',
        priority,
        expected_profit_impact:impact,
        status:'pending',
        task_type:'sales',
        origin:'results',
        origin_ref_type:'result_alert',
        origin_ref_id:a.id,
        metadata:{result_alert_id:a.id,alert_type:a.alert_type,background_monitor:true}
      }).select('id').single();
      if (te) throw te;
      const {error:ue} = await window.sb.from('result_alerts').update({task_id:t.id,status:'acknowledged'}).eq('id',a.id).eq('client_id',cid);
      if (ue) throw ue;
      if (typeof window.toast === 'function') window.toast('Tarea creada desde la alerta ✓');
      await inject();
    } catch (e) {
      console.error(e);
      if (typeof window.toast === 'function') window.toast('Error: ' + (e.message || 'no se pudo crear la tarea'));
    }
  };

  function wrap(){
    const fn = window.renderMetrics;
    if (typeof fn !== 'function' || fn[WRAPPED]) return false;
    const wrapped = async function(...args){
      const out = await fn.apply(this,args);
      setTimeout(inject,0);
      return out;
    };
    wrapped[WRAPPED] = true;
    window.renderMetrics = wrapped;
    return true;
  }

  function install(){
    installAttempts++;
    if (!wrap() && installAttempts < 40) setTimeout(install,250);
  }

  if (document.readyState === 'complete') install();
  else window.addEventListener('load', install, {once:true});
})();
