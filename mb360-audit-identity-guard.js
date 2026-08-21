/* MB360 audit identity guard: never infer client identity from business name. */
(() => {
  function installAuditIdentityGuard(){
    if (typeof window.ensureCentralRecords !== 'function') return;
    window.ensureCentralRecords = async function(){
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
        } else {
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
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',installAuditIdentityGuard,{once:true});
  }else{
    installAuditIdentityGuard();
  }
})();
