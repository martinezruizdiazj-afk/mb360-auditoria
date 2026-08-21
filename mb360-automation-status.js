/* MB360 · automation runtime truth labels · 2026-08 */
(() => {
  const WRAP_FLAG = '_mb360AutomationStatusWrapped';
  const NOTE_CLASS = 'mb360-auto-runtime-note';
  let attempts = 0;

  function removeOld(main){
    main.querySelectorAll('.' + NOTE_CLASS).forEach(x => x.remove());
  }

  function addNote(main, text){
    removeOld(main);
    const el = document.createElement('div');
    el.className = 'notice ' + NOTE_CLASS;
    el.setAttribute('role','note');
    el.style.marginBottom = '14px';
    el.innerHTML = text;
    const banner = main.querySelector('.active-client-banner');
    if (banner && banner.parentNode) banner.insertAdjacentElement('afterend', el);
    else {
      const page = main.querySelector('.pagebar');
      if (page && page.parentNode) page.insertAdjacentElement('afterend', el);
      else main.prepend(el);
    }
  }

  function decorate(kind){
    const main = document.getElementById('main');
    if (!main) return;
    if (kind === 'reports') {
      addNote(main, '<b>⏱️ Programación real activa:</b> Supabase revisa cada hora las plantillas vencidas y crea el borrador aunque MB360 esté cerrado. Nunca se envía automáticamente: siempre requiere revisión antes de compartir.');
    } else if (kind === 'production') {
      main.querySelectorAll('.section-title').forEach(x => {
        if ((x.textContent || '').trim() === 'Plan semanal automático') x.textContent = 'Plan semanal asistido';
      });
      addNote(main, '<b>🧩 Producción asistida:</b> el plan semanal se genera cuando tocas el botón. Usa reglas y datos guardados; no se ejecuta solo cada semana ni usa una IA externa.');
    } else if (kind === 'metrics') {
      addNote(main, '<b>📊 Monitoreo real activo:</b> Supabase revisa cada hora caídas y problemas de conversión usando días completos y datos confiables. “Preguntar a Resultados” sigue siendo análisis por reglas JavaScript; todavía no utiliza un LLM externo.');
    } else if (kind === 'tasks') {
      addNote(main, '<b>🔄 Sincronización real activa:</b> Supabase revisa cada hora Auditoría, Inicio de Cliente, Investigación, Revisión semanal, Producción y alertas críticas de Resultados para crear tareas pendientes aunque MB360 esté cerrado. La apertura del módulo queda como respaldo y no duplica el mismo origen.');
    }
  }

  function wrap(name, kind){
    const fn = window[name];
    if (typeof fn !== 'function' || fn[WRAP_FLAG]) return false;
    const wrapped = async function(...args){
      const out = await fn.apply(this,args);
      setTimeout(() => decorate(kind), 0);
      return out;
    };
    wrapped[WRAP_FLAG] = true;
    window[name] = wrapped;
    return true;
  }

  function install(){
    attempts++;
    const ok = [
      wrap('renderReports','reports'),
      wrap('renderProduction','production'),
      wrap('renderMetrics','metrics'),
      wrap('renderTasks','tasks')
    ];
    if (ok.some(v => !v) && attempts < 40) setTimeout(install, 250);
  }

  if (document.readyState === 'complete') install();
  else window.addEventListener('load', install, {once:true});
})();
