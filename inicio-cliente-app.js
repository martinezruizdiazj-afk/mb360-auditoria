/* MB360 · Inicio de Cliente Maestro — módulo nativo del Centro de Operaciones.
   NO crea cliente Supabase propio: reutiliza la instancia `sb` de index.html vía mount(container, sb).
   Namespace único: window.MB360Onboarding (sin globales sueltos, sin redeclarar `sb`). */
(function(){
"use strict";
const LS_KEY="mb360_inicio_cliente_v1";
const QUALITY=[["confirmed","✓ Confirmado"],["estimated","≈ Estimado"],["unknown","? No sabe"],["not_shared","— No quiere compartir"]];
const E=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));

const O={
  sb:null, root:null, mounted:false,
  cur:0, state:{}, quality:{}, clients:[], onboardingId:null,

  get SECTIONS(){ return window.MB360_SECTIONS||[]; },

  /* ---------- persistencia local ---------- */
  persist(){ try{localStorage.setItem(LS_KEY,JSON.stringify({cur:this.cur,state:this.state,quality:this.quality,onboardingId:this.onboardingId}));}catch(e){} },
  restore(){ try{const x=JSON.parse(localStorage.getItem(LS_KEY)||"{}");this.cur=x.cur||0;this.state=x.state||{};this.quality=x.quality||{};this.onboardingId=x.onboardingId||null;}catch(e){this.cur=0;this.state={};this.quality={};this.onboardingId=null;} },

  /* ---------- estado de respuestas ---------- */
  setv(id,v){ this.state[id]=v; this.persist(); },
  setvR(id,v){ this.setv(id,v); this.render(); },
  toggle(id,v){ const a=Array.isArray(this.state[id])?[...this.state[id]]:[]; const i=a.indexOf(v); i>=0?a.splice(i,1):a.push(v); this.state[id]=a; this.persist(); this.render(); },
  setq(id,v){ this.quality[id]=v; this.persist(); this.render(); },

  /* ---------- controles ---------- */
  qhtml(id){ return `<div class="qual"><div class="label">Calidad/origen del dato</div><div class="chips">${QUALITY.map(([v,l])=>`<button type="button" class="chip ${this.quality[id]===v?"active":""}" onclick="MB360Onboarding.setq('${id}','${v}')">${l}</button>`).join("")}</div></div>`; },
  control(q){
    const v=this.state[q.id]??(q.type==="multi"?[]:"");
    if(q.type==="text"||q.type==="number") return `<input class="input" ${q.type==="number"?'type="number" inputmode="decimal" step="any"':'type="text"'} value="${E(v)}" oninput="MB360Onboarding.setv('${q.id}',this.value)">`;
    if(q.type==="textarea") return `<textarea oninput="MB360Onboarding.setv('${q.id}',this.value)">${E(v)}</textarea>`;
    if(q.type==="single") return `<div class="chips">${q.options.map(o=>`<button type="button" class="chip ${v===o?"active":""}" onclick='MB360Onboarding.setvR("${q.id}",${JSON.stringify(o)})'>${E(o)}</button>`).join("")}</div>`+(q.other&&v==="Otro"?`<input class="input" style="margin-top:9px" placeholder="Especificar..." value="${E(this.state[q.id+"_other"]||"")}" oninput="MB360Onboarding.setv('${q.id}_other',this.value)">`:"");
    if(q.type==="multi") return `<div class="chips">${q.options.map(o=>`<button type="button" class="chip ${(v||[]).includes(o)?"active":""}" onclick='MB360Onboarding.toggle("${q.id}",${JSON.stringify(o)})'>${E(o)}</button>`).join("")}</div>`+(q.other&&(v||[]).includes("Otro")?`<input class="input" style="margin-top:9px" placeholder="Especificar otro..." value="${E(this.state[q.id+"_other"]||"")}" oninput="MB360Onboarding.setv('${q.id}_other',this.value)">`:"");
    if(q.type==="repeater") return this.repeater(q);
    if(q.type==="products") return this.products();
    return "";
  },

  /* ---------- repetidores genéricos ---------- */
  repeater(q){
    const a=Array.isArray(this.state[q.id])?this.state[q.id]:[];
    return `<div class="rep">${a.map((it,i)=>`<div class="rep-card"><div class="rep-head"><strong>${E(q.label)} ${i+1}</strong><button type="button" class="rm" onclick="MB360Onboarding.rr('${q.id}',${i})">Eliminar</button></div>${q.fields.map(([k,l])=>`<div class="q" style="padding:7px 0"><label class="ttl">${E(l)}</label><input class="input" value="${E(it[k]||"")}" oninput="MB360Onboarding.ur('${q.id}',${i},'${k}',this.value)"></div>`).join("")}</div>`).join("")}</div><button type="button" class="add" onclick="MB360Onboarding.ar('${q.id}')">+ Agregar</button>`;
  },
  ar(id){ const q=this.SECTIONS.flatMap(s=>s.questions).find(x=>x.id===id); const a=[...(this.state[id]||[])],o={}; q.fields.forEach(([k])=>o[k]=""); a.push(o); this.state[id]=a; this.persist(); this.render(); },
  ur(id,i,k,v){ const a=[...(this.state[id]||[])]; a[i]={...(a[i]||{}),[k]:v}; this.state[id]=a; this.persist(); },
  rr(id,i){ const a=[...(this.state[id]||[])]; a.splice(i,1); this.state[id]=a; this.persist(); this.render(); },

  /* ---------- repetidor de productos ---------- */
  products(){
    const a=Array.isArray(this.state.products_detail)?this.state.products_detail:[];
    return `<div class="rep">${a.map((p,i)=>`<div class="rep-card"><div class="rep-head"><strong>Producto ${i+1}</strong><button type="button" class="rm" onclick="MB360Onboarding.rp(${i})">Eliminar</button></div><div class="q" style="padding:7px 0"><label class="ttl">Nombre</label><input class="input" value="${E(p.name||"")}" oninput="MB360Onboarding.up(${i},'name',this.value)"></div><div class="row"><div class="q" style="padding:7px 0"><label class="ttl">Precio</label><input class="input" type="number" inputmode="decimal" value="${E(p.price||"")}" oninput="MB360Onboarding.up(${i},'price',this.value)"></div><div class="q" style="padding:7px 0"><label class="ttl">Costo aprox.</label><input class="input" type="number" inputmode="decimal" value="${E(p.cost||"")}" oninput="MB360Onboarding.up(${i},'cost',this.value)"></div></div><div class="chips" style="margin:8px 0">${["Más vendido","Mayor margen","Quiere impulsar","No impulsar","Representativo","Visualmente fuerte","Bueno delivery","Problema delivery"].map(t=>`<button type="button" class="chip ${(p.tags||[]).includes(t)?"active":""}" onclick='MB360Onboarding.tpt(${i},${JSON.stringify(t)})'>${t}</button>`).join("")}</div><div class="row"><div class="q" style="padding:7px 0"><label class="ttl">Tiempo de preparación</label><input class="input" value="${E(p.prep_time||"")}" oninput="MB360Onboarding.up(${i},'prep_time',this.value)"></div><div class="q" style="padding:7px 0"><label class="ttl">Dificultad operativa</label><input class="input" value="${E(p.difficulty||"")}" oninput="MB360Onboarding.up(${i},'difficulty',this.value)"></div></div><div class="q" style="padding:7px 0"><label class="ttl">Detalle / inventario / disponibilidad</label><textarea oninput="MB360Onboarding.up(${i},'notes',this.value)">${E(p.notes||"")}</textarea></div><div class="qual"><div class="label">Calidad del precio/costo informado</div><div class="chips">${QUALITY.map(([v,l])=>`<button type="button" class="chip ${p.quality===v?"active":""}" onclick="MB360Onboarding.upR(${i},'quality','${v}')">${l}</button>`).join("")}</div></div></div>`).join("")}</div><button type="button" class="add" onclick="MB360Onboarding.ap()">+ Agregar producto/plato</button>`;
  },
  ap(){ const a=[...(this.state.products_detail||[])]; a.push({name:"",price:"",cost:"",tags:[],prep_time:"",difficulty:"",notes:"",quality:""}); this.state.products_detail=a; this.persist(); this.render(); },
  up(i,k,v){ const a=[...(this.state.products_detail||[])]; a[i]={...(a[i]||{}),[k]:v}; this.state.products_detail=a; this.persist(); },
  upR(i,k,v){ this.up(i,k,v); this.render(); },
  tpt(i,t){ const a=[...(this.state.products_detail||[])],p={...(a[i]||{})},tags=[...(p.tags||[])],x=tags.indexOf(t); x>=0?tags.splice(x,1):tags.push(t); p.tags=tags; a[i]=p; this.state.products_detail=a; this.persist(); this.render(); },
  rp(i){ const a=[...(this.state.products_detail||[])]; a.splice(i,1); this.state.products_detail=a; this.persist(); this.render(); },

  /* ---------- render de sección ---------- */
  $(id){ return this.root?this.root.querySelector("#"+id):null; },
  render(){
    if(!this.mounted) return;
    const S=this.SECTIONS; if(!S.length){ this.$("obForm").innerHTML='<div class="card"><p>No se pudo cargar la configuración del formulario (MB360_SECTIONS).</p></div>'; return; }
    if(this.cur>=S.length) this.cur=S.length-1;
    const s=S[this.cur];
    this.$("obForm").innerHTML=`<section class="card"><div class="head"><div class="num">${String(this.cur+1).padStart(2,"0")}</div><div><h2>${E(s.title)}</h2><p>${E(s.desc)}</p></div></div>${s.questions.map(q=>`<div class="q"><label class="ttl ${q.required?"req":""}">${E(q.label)}</label>${q.help?`<div class="help">${E(q.help)}</div>`:""}${this.control(q)}${q.quality?this.qhtml(q.id):""}</div>`).join("")}<div class="q"><label class="ttl">Notas adicionales de esta sección</label><textarea oninput="MB360Onboarding.setv('${s.id}_section_notes',this.value)">${E(this.state[s.id+"_section_notes"]||"")}</textarea></div></section>`;
    this.$("obBar").style.width=((this.cur+1)/S.length*100)+"%";
    this.$("obPt").textContent=`Sección ${this.cur+1} de ${S.length}`;
    this.$("obPrev").disabled=this.cur===0;
    this.$("obNext").textContent=this.cur===S.length-1?"Revisar →":"Siguiente →";
    this.$("obReview").classList.add("hidden");
    window.scrollTo({top:0,behavior:"smooth"});
  },
  prev(){ if(this.cur>0){this.cur--;this.persist();this.render();} },
  next(){ if(this.cur<this.SECTIONS.length-1){this.cur++;this.persist();this.render();} else this.review(); },

  /* ---------- revisión final ---------- */
  review(){
    const st=this.state,miss=[];
    if(!st.business_name)miss.push("Nombre comercial");
    if(!st.business_type)miss.push("Tipo de negocio");
    this.$("obForm").innerHTML="";
    this.$("obSum").textContent=`Negocio: ${st.business_name||"—"}\nTipo: ${st.business_type||"—"}\nObjetivo principal: ${st.primary_goal||"—"}\nObjetivos: ${(st.goals||[]).join(", ")||"—"}\nDías flojos: ${(st.weak_days||[]).join(", ")||"—"}\nHorarios flojos: ${(st.weak_dayparts||[]).join(", ")||"—"}\nProductos registrados: ${(st.products_detail||[]).length}\nPlataformas: ${(st.systems_used||[]).join(", ")||"—"}\nObligatorios faltantes: ${miss.length?miss.join(", "):"Ninguno"}`;
    this.$("obReview").classList.remove("hidden");
    this.$("obBar").style.width="100%";
    this.$("obPt").textContent="Revisión final";
  },

  /* ---------- salidas derivadas ---------- */
  outputs(){
    const missing=[];
    Object.entries(this.quality).forEach(([k,v])=>{ if(v==="unknown")missing.push({field:k,reason:"no_sabe"}); if(v==="not_shared")missing.push({field:k,reason:"no_quiere_compartir"}); });
    const st=this.state,sys=st.systems_used||[],later=[];
    if(sys.includes("Google Search Console"))later.push("Google Search Console");
    if(sys.includes("Google Analytics"))later.push("Google Analytics");
    if(sys.some(x=>["Instagram","Facebook"].includes(x)))later.push("Meta / Instagram Insights");
    if(sys.includes("TikTok"))later.push("TikTok Analytics");
    if(sys.includes("POS"))later.push("POS / ventas internas");
    if(sys.includes("Sistema de reservas"))later.push("Reservas");
    if(sys.some(x=>["DoorDash","Uber Eats","Grubhub","Otra plataforma delivery"].includes(x)))later.push("Delivery apps");
    return {missing,
      priorities:[...(st.primary_goal?[{priority:"alta",area:"objetivo_principal",detail:st.primary_goal}]:[]),...((st.weak_days||[]).length?[{priority:"alta",area:"dias_flojos",detail:st.weak_days}]:[]),...((st.weak_dayparts||[]).length?[{priority:"alta",area:"horarios_flojos",detail:st.weak_dayparts}]:[])],
      research:{public_now:["Google Maps/GBP público y reseñas","Instagram/Facebook/TikTok públicos","Sitio web y SEO visible","Competidores cercanos y referentes fuertes","Precios, ofertas y contenido público"],with_access_later:later}};
  },

  /* ---------- Supabase (instancia sb del Centro) ---------- */
  async ensureClient(){
    const sel=this.$("obClient"),id=sel?sel.value:"";
    if(id) return id;
    if(!this.state.business_name||!this.state.business_type) throw new Error("Completa nombre comercial y tipo de negocio.");
    const bt=this.state.business_type==="Otro"?(this.state.business_type_other||"Otro"):this.state.business_type;
    const r=await this.sb.from("clients").insert({business_name:this.state.business_name,business_type:bt,status:"onboarding",timezone:"America/New_York"}).select("id").single();
    if(r.error)throw r.error;
    return r.data.id;
  },
  async save(finalize){
    const st=this.$("obSaveSt"); st.textContent="Guardando..."; st.className="status";
    try{
      const clientId=await this.ensureClient(),o=this.outputs();
      const payload={client_id:clientId,onboarding_date:new Date().toISOString(),form_version:"inicio_cliente_master_1.0",raw_answers:this.state,answer_quality:this.quality,summary:null,missing_information:o.missing,preliminary_priorities:o.priorities,research_brief:o.research,status:finalize?"completed":"draft"};
      let r;
      if(this.onboardingId) r=await this.sb.from("onboardings").update(payload).eq("id",this.onboardingId).select("id").single();
      else r=await this.sb.from("onboardings").insert(payload).select("id").single();
      if(r.error)throw r.error;
      this.onboardingId=r.data.id;
      if(finalize){ localStorage.removeItem(LS_KEY); this.onboardingId=null; }
      else this.persist();
      st.textContent=finalize?"Inicio de Cliente finalizado y guardado en la Base Central MB360.":"Borrador guardado en Supabase.";
      st.className="status ok";
    }catch(e){ st.textContent=e.message||String(e); st.className="status err"; }
  },
  async loadClients(){
    const r=await this.sb.from("clients").select("id,business_name,business_type,status").order("business_name");
    if(r.error){ console.warn("MB360Onboarding loadClients:",r.error.message); return; }
    this.clients=r.data||[];
    const sel=this.$("obClient");
    if(sel) sel.innerHTML='<option value="">— Nuevo cliente —</option>'+this.clients.map(c=>`<option value="${c.id}">${E(c.business_name)} · ${E(c.status)}</option>`).join("");
  },
  pickClient(id){
    const c=this.clients.find(x=>x.id===id);
    if(c){ this.state.business_name=c.business_name; this.state.business_type=c.business_type; this.persist(); if(this.cur===0)this.render(); }
  },

  /* ---------- ciclo de vida ---------- */
  mount(container,sb){
    if(!sb) throw new Error("MB360Onboarding.mount requiere la instancia sb del Centro de Operaciones.");
    this.sb=sb; this.root=container; this.mounted=true;
    container.innerHTML=`<div id="mb360ob">
      <div class="obtop">
        <div class="prog"><i id="obBar"></i></div>
        <div id="obPt" class="mini"></div>
      </div>
      <div class="picker">
        <label class="ttl">Vincular con cliente/prospecto existente</label>
        <select id="obClient"><option value="">— Nuevo cliente —</option></select>
        <div class="help">Auditoría e Inicio de Cliente quedan vinculados a la misma ficha central.</div>
      </div>
      <form id="obForm" onsubmit="return false"></form>
      <div id="obReview" class="card hidden">
        <div class="head"><div class="num">✓</div><div><h2>Revisión final</h2><p>Comprueba lo esencial antes de guardar.</p></div></div>
        <div id="obSum" class="summary"></div>
        <div class="row" style="margin-top:12px">
          <button type="button" id="obDraft" class="btn2 sec2">Guardar borrador</button>
          <button type="button" id="obFinal" class="btn2 pri2">Finalizar Inicio de Cliente</button>
        </div>
        <div id="obSaveSt" class="status"></div>
      </div>
      <div class="obnav">
        <button type="button" id="obPrev" class="btn2 sec2">← Anterior</button>
        <button type="button" id="obNext" class="btn2 pri2">Siguiente →</button>
      </div>
    </div>`;
    this.$("obClient").onchange=e=>this.pickClient(e.target.value);
    this.$("obPrev").onclick=()=>this.prev();
    this.$("obNext").onclick=()=>this.next();
    this.$("obDraft").onclick=()=>this.save(false);
    this.$("obFinal").onclick=()=>this.save(true);
    this.restore();
    this.render();
    this.loadClients();
  },
  unmount(){ this.mounted=false; this.root=null; }
};

window.MB360Onboarding=O;
})();
