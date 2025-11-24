// nav.js: gère le burger menu et la navigation entre pages (players/game/roles/settings)
(function(){
  function q(sel){return document.querySelector(sel)}
  function qa(sel){return Array.from(document.querySelectorAll(sel))}
  const burger = q('#burger');
  const sidebar = q('#sidebar');
  if(!burger || !sidebar) return;
  const links = Array.from(sidebar.querySelectorAll('a[data-page]'));
  const pages = qa('section.page');

  // create backdrop element to detect outside clicks (and dim content)
  let backdrop = q('#sidebarBackdrop');
  if(!backdrop){
    backdrop = document.createElement('div');
    backdrop.id = 'sidebarBackdrop';
    backdrop.className = 'sidebar-backdrop hidden';
    document.body.appendChild(backdrop);
  }

  function showBackdrop(){ backdrop.classList.remove('hidden'); }
  function hideBackdrop(){ backdrop.classList.add('hidden'); }

  function closeSidebar(){ sidebar.classList.add('hidden'); hideBackdrop(); }
  function openSidebar(){ sidebar.classList.remove('hidden'); showBackdrop(); }
  function toggleSidebar(){ if(sidebar.classList.contains('hidden')) openSidebar(); else closeSidebar(); }

  burger.addEventListener('click', ()=> toggleSidebar());

  // clicking on backdrop (outside) closes the sidebar
  backdrop.addEventListener('click', ()=>{ closeSidebar(); });

  // also close on Escape key
  document.addEventListener('keydown', (ev)=>{ if(ev.key === 'Escape' || ev.key === 'Esc'){ if(!sidebar.classList.contains('hidden')) closeSidebar(); }});

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
