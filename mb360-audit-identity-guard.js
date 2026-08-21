/* MB360 audit safety guard: stable client identity + safe legacy rendering. */
(() => {
  const h=v=>typeof window.esc==='function'?window.esc(v):String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function installAuditSafetyGuard(){
    if(typeof window.ensureCentralRecords!=='function') return;

    /* Never infer client identity from business name. */
    window.ensureCentralRecords=async function(){
      const name=(D['nombre']||'').trim();
      if(!name) throw new Error('Poné el nombre del negocio primero');

      // Existing clients are only reused when the UI has already selected them
      // and currentClientId is known. A matching business name is never enough.
      if(!currentClientId){
        const {data:newClient,error}=await sb.from('clients')
          .insert({business_name:name,business_type:mapBusinessType(D['tipo']),status:'prospect'})
          .select('id').single();
        if(error) throw error;
        currentClientId=newClient.id;
        setWorkspaceActiveClient(currentClientId);
        clientCache=[];
      }

      if(!currentLocationId){
        const {data:locs,error:locErr}=await sb.from('locations')
          .select('id,address')
          .eq('client_id',currentClientId)
          .eq('is_primary',true)
          .limit(1);
        if(locErr) throw locErr;
        if(locs?.length){
          currentLocationId=locs[0].id;
        }else{
          const {data:newLoc,error}=await sb.from('locations')
            .insert({client_id:currentClientId,address:D['ubicacion']||null,is_primary:true})
            .select('id').single();
          if(error) throw error;
          currentLocationId=newLoc.id;
        }
      }

      await sb.from('clients')
        .update({business_name:name,business_type:mapBusinessType(D['tipo'])})
        .eq('id',currentClientId);
      if(D['ubicacion']){
        await sb.from('locations').update({address:D['ubicacion']}).eq('id',currentLocationId);
      }
    };

    /* Escape every value loaded from raw_answers before inserting it into legacy HTML. */
    window.renderField=function(fd){
      const v=D[fd.k];
      const sub=fd.s?`<small>${h(fd.s)}</small>`:'';
      const label=h(fd.l),placeholder=h(fd.ph||''),key=String(fd.k||'');
      if(fd.t==='text') return `<div class="field"><label class="fl">${label}${sub}</label><input type="text" value="${h(v||'')}" placeholder="${placeholder}" oninput="setD('${key}',this.value)"></div>`;
      if(fd.t==='area') return `<div class="field"><label class="fl">${label}${sub}</label><textarea oninput="setD('${key}',this.value)" placeholder="${placeholder}">${h(v||'')}</textarea></div>`;
      if(fd.t==='num') return `<div class="field"><label class="fl">${label}${sub}</label><input type="number" inputmode="decimal" value="${h(v||'')}" placeholder="${placeholder}" oninput="setD('${key}',this.value)"></div>`;
      if(fd.t==='money') return `<div class="field"><label class="fl">${label}${sub}</label><div class="money"><input type="number" inputmode="decimal" value="${h(v||'')}" oninput="setD('${key}',this.value)"></div></div>`;
      if(fd.t==='pill'||fd.t==='yn'){
        const opts=fd.t==='yn'?YESNO:fd.o;
        return `<div class="field"><label class="fl">${label}${sub}</label><div class="pills">${opts.map(o=>`<button class="${pillClass(fd,o,v===o)}" onclick="setD('${key}', D['${key}']===${JSON.stringify(o)}?undefined:${JSON.stringify(o)});render()">${h(o)}</button>`).join('')}</div></div>`;
      }
      if(fd.t==='multi'){
        const arr=Array.isArray(v)?v:[];
        return `<div class="field"><label class="fl">${label}${sub}</label><div class="pills">${fd.o.map(o=>`<button class="pill ${arr.includes(o)?'sel':''}" onclick='toggleMulti(${JSON.stringify(key)},${JSON.stringify(o)})'>${h(o)}</button>`).join('')}</div></div>`;
      }
      return '';
    };

    window.renderDiag=function(m){
      const leaks=calcLeaks();
      const total=leaks.reduce((a,l)=>a+l.v,0);
      const flags=calcFlags();
      const main=leaks.length?leaks.reduce((a,b)=>a.v>b.v?a:b):null;
      const dolor=(D['pierdeDinero']||'').trim();
      const oferta=num('ofertaPrecio');
      const nombre=h(D['nombre']||'este negocio');

      let cierre='';
      if(main){
        cierre=`<b>${nombre}</b> está perdiendo aproximadamente <b>${fmt(total)}/mes</b>`+
          `, principalmente por <b>${h(main.n.toLowerCase())}</b>`+
          (dolor?' — que coincide con lo que el dueño mismo nombró':'')+
          `. Esto se resuelve con el paquete MB360`+(oferta?` a <b>${fmt(oferta)}/mes</b>, sin contrato, cancelable a 30 días`:' (poné tu precio abajo)')+`.`;
      }else{
        cierre='Todavía no hay fugas cuantificadas. Volvé a las secciones 3, 5, 6, 7 y 12 y completá los números clave (ventas/día, ticket, comisiones, mensajes perdidos).';
      }

      m.innerHTML=`
        <div class="eyebrow" style="color:var(--leak)">Diagnóstico</div>
        <h1>🔥 Fugas de dinero</h1>
        <p class="hint internal">Girá el celular y mostrá esta pantalla al dueño. Activá "Modo cliente" para ocultar tus notas internas.</p>
        ${auditActiveClientBanner()}
        <div class="diag-total"><div class="dl">Fuga total estimada</div><div class="dv">${fmt(total)}</div><div class="dm">por mes · estimación conservadora</div></div>
        <div class="card">${leaks.length?leaks.map(l=>`<div class="leakrow"><div class="ln">${h(l.n)}<small>${h(l.d)}</small></div><div class="lv ${l.op?'op':''}">${fmt(l.v)}/mes</div></div>`).join(''):'<p class="hint" style="margin:0">Sin datos suficientes para calcular fugas.</p>'}</div>
        <div class="cierre">${cierre}</div>
        <div class="card internal"><label class="fl">Tu oferta ($/mes)<small>Se inserta en la frase de cierre</small></label><div class="money"><input type="number" inputmode="decimal" value="${h(D['ofertaPrecio']||'')}" oninput="setD('ofertaPrecio',this.value);"></div><div class="navbtns" style="margin-top:12px"><button class="btn ghost" onclick="render()">Actualizar frase</button></div></div>
        ${flags.length?`<div class="card flags internal"><label class="fl">Señales para tu pitch</label>${flags.map(f=>`<div class="fitem">▸ <span>${h(f)}</span></div>`).join('')}</div>`:''}
        <div class="exports"><button class="btn primary" onclick="saveAudit()">💾 Guardar auditoría</button><button class="btn ghost" onclick="copyResumen()">📋 Copiar resumen</button><button class="btn ghost" onclick="downloadJSON()">⬇️ Descargar datos</button><button class="btn ghost" onclick="toggleClient()" id="cmBtn">${document.body.classList.contains('clientmode')?'🔓 Salir de modo cliente':'👤 Modo cliente'}</button><button class="btn danger" onclick="resetAll()">🗑️ Nueva auditoría</button><button class="btn ghost" onclick="goTo(-1)">📂 Ver guardadas</button></div>
        <div class="navbtns"><button class="btn ghost" onclick="goTo(${SECTIONS.length-1})">← Volver al formulario</button></div>
        <p class="hint internal" style="margin-top:14px">☁️ "Guardar" envía la auditoría a la Base Central MB360. "Descargar" mantiene un JSON como respaldo local.</p>`;
    };

    /* Never put a client name from the database inside an inline event handler. */
    window.deleteAudit=async function(id){
      if(!confirm('¿Borrar esta auditoría? No se puede deshacer.')) return;
      try{
        const {error}=await sb.from('audits').delete().eq('id',id);
        if(error) throw error;
        if(currentAuditId===id) currentAuditId=null;
        toast('Auditoría borrada');
        render();
      }catch(e){
        console.error(e);
        toast('Error al borrar');
      }
    };

    window.renderSaved=async function(m){
      m.innerHTML='<div class="eyebrow">Base Central</div><h1>📂 Auditorías MB360</h1><p class="hint">Cargando…</p>';
      try{
        const {data,error}=await sb.from('audits')
          .select('id,audit_date,estimated_monthly_leak,status,clients(business_name),locations(address)')
          .order('audit_date',{ascending:false}).limit(100);
        if(error) throw error;
        const items=data||[];
        m.innerHTML=`<div class="eyebrow">Base Central</div><h1>📂 Auditorías MB360</h1><p class="hint">Tocá una auditoría para continuarla o revisar el diagnóstico.</p><div class="card">${items.length?items.map(it=>{
          const nombre=it.clients?.business_name||'Sin nombre';
          const fecha=it.audit_date?new Date(it.audit_date).toLocaleDateString('es-US',{day:'numeric',month:'short',year:'numeric'}):'';
          return `<div class="leakrow"><div class="ln" style="cursor:pointer" onclick="loadAudit('${it.id}')">${h(nombre)}<small>${h(fecha)} · ${h(it.status||'')} · fuga est. $${Math.round(it.estimated_monthly_leak||0).toLocaleString('en-US')}/mes</small></div><button class="pill" style="min-height:36px;padding:7px 12px" onclick="deleteAudit('${it.id}')">🗑️</button></div>`;
        }).join(''):'<p class="hint" style="margin:0">Todavía no hay auditorías en la Base Central.</p>'}</div><div class="navbtns"><button class="btn ghost" onclick="newCentralAudit()">+ Nueva auditoría</button><button class="btn primary" onclick="goTo(0)">Continuar actual →</button></div>`;
      }catch(e){
        console.error(e);
        m.innerHTML='<div class="eyebrow">Base Central</div><h1>📂 Auditorías MB360</h1><div class="alert warn">⚠️ <span>No se pudo leer la Base Central. Verifica que tu cuenta tenga autorización MB360.</span></div><div class="navbtns"><button class="btn primary" onclick="goTo(0)">Ir al formulario →</button></div>';
      }
    };
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',installAuditSafetyGuard,{once:true});
  }else{
    installAuditSafetyGuard();
  }
})();
