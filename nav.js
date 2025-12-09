// nav.js: gère le burger menu et la navigation entre pages (players/game/roles/settings)
(function(){
  function q(sel){return document.querySelector(sel)}
  function qa(sel){return Array.from(document.querySelectorAll(sel))}
  const burger = q('#burger');
  const sidebar = q('#sidebar');
  if(!burger || !sidebar) return;
  const links = Array.from(sidebar.querySelectorAll('a[data-page]'));
  const pages = qa('section.page');
  function closeSidebar(){ sidebar.classList.add('hidden'); }
  function toggleSidebar(){ sidebar.classList.toggle('hidden'); }
  burger.addEventListener('click', ()=> toggleSidebar());

  links.forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    const id = a.dataset.page;
    pages.forEach(p => p.id===id ? p.classList.remove('hidden') : p.classList.add('hidden'));
    // dispatch event so app.js can react (e.g., renderPlayers)
    document.dispatchEvent(new CustomEvent('pageChanged', { detail: id }));
    closeSidebar();
  }));
  // default to players page
  pages.forEach(p => p.id==='playersPage' ? p.classList.remove('hidden') : p.classList.add('hidden'));
  document.dispatchEvent(new CustomEvent('pageChanged', { detail: 'playersPage' }));
})();