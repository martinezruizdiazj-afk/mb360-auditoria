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
      addNote(main, '<b>⏱️ Programación actual:</b> los borradores vencidos se crean cuando abres <b>Reportes</b>. Aún no existe ejecución 24/7 en segundo plano.');
    } else if (kind === 'production') {
      main.querySelectorAll('.section-title').forEach(x => {
        if ((x.textContent || '').trim() === 'Plan semanal automático') x.textContent = 'Plan semanal asistido';
      });
      addNote(main, '<b>🧩 Producción asistida:</b> el plan semanal se genera cuando tocas el botón. Usa reglas y datos guardados; no se ejecuta solo cada semana ni usa una IA externa.');
    } else if (kind === 'metrics') {
      addNote(main, '<b>📊 Análisis actual:</b> las alertas y “Preguntar a Resultados” se calculan al abrir el módulo con reglas JavaScript. No hay monitoreo 24/7 ni un LLM conectado todavía.');
    } else if (kind === 'tasks') {
      addNote(main, '<b>🔄 Sincronización actual:</b> las tareas sugeridas desde otras áreas se revisan al abrir/seleccionar el cliente. Las tareas recurrentes sí se crean al completar la tarea anterior.');
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
