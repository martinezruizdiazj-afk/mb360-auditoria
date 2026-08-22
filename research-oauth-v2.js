/* MB360 Research OAuth · return handler only. Connector UI lives in research-google-v2.js */
(() => {
  function handleOAuthReturn(){
    const u=new URL(location.href),status=u.searchParams.get('mb360_oauth');
    if(!status)return;
    const provider=u.searchParams.get('mb360_oauth_provider')||'oauth';
    const message=u.searchParams.get('mb360_oauth_message')||(status==='success'?'Conexión completada':'No se pudo completar la conexión');
    u.searchParams.delete('mb360_oauth');u.searchParams.delete('mb360_oauth_provider');u.searchParams.delete('mb360_oauth_message');
    history.replaceState({},'',u.pathname+u.search+u.hash);
    setTimeout(()=>{
      if(typeof toast==='function')toast(message);
      if(activeWorkspaceClientId&&typeof openTool==='function')openTool('research',true);
      window.dispatchEvent(new CustomEvent('mb360-oauth-return',{detail:{provider,status}}));
    },250);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',handleOAuthReturn);else handleOAuthReturn();
})();
