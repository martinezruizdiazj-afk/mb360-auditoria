/* MB360 · auth UI hardening · 2026-08 */
(() => {
  function applyAuthHardening(){
    const signupBtn = document.querySelector('[onclick="signupMB360()"]');
    if(signupBtn) signupBtn.remove();

    const actions = document.querySelector('.auth-actions');
    if(actions){
      actions.style.gridTemplateColumns = '1fr';
    }

    window.signupMB360 = function(){
      if(typeof authMessage === 'function'){
        authMessage('Las altas públicas están deshabilitadas. El acceso a MB360 es solo por invitación de un administrador.', true);
      }
      return false;
    };
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', applyAuthHardening, {once:true});
  }else{
    applyAuthHardening();
  }

  window.addEventListener('load', applyAuthHardening, {once:true});
})();
