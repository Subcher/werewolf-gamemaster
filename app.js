// Simple, focused game master JS: players management and circular display
const players = [];
// options globales (sauvegardées)
const options = { villageType: 'simple' };

// Persistance simple (localStorage)
const STORAGE_KEY = 'werewolf_state';
function saveState(){
  try{
    const rolesState = availableRoles ? availableRoles.map(r=>({ id: r.id, count: r.count || 0, selectedAt: r.selectedAt || null })) : [];
    // Save players with assigned roles so distribution persists
    const state = { players: players.map(p=>({ id: p.id, name: p.name, role: p.role || null })), roles: rolesState, options };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    console.log('[MJ] État sauvegardé');
  }catch(e){ console.warn('saveState failed', e); }
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return;
    const st = JSON.parse(raw);
    if(st.players && Array.isArray(st.players)){
      players.length = 0; st.players.forEach(p=>{ if(p && p.id && p.name) players.push({ id: String(p.id), name: String(p.name), role: p.role || null }); });
    }
    if(st.roles && Array.isArray(st.roles) && availableRoles){
      st.roles.forEach(rs=>{ const r = availableRoles.find(x=>x.id === rs.id); if(r) r.count = typeof rs.count === 'number' ? rs.count : 0; });
    }
    if(st.options && typeof st.options === 'object') Object.assign(options, st.options);
    console.log('[MJ] État chargé');
    // reflect loaded state in the UI
    try{ renderPlayerList(); renderPlayerCircle(); if(typeof renderRoles === 'function') renderRoles(); if(typeof updateRolesTotal === 'function') updateRolesTotal(); }catch(e){/* ignore if DOM not ready */}
    // hide distribute button if players already have roles assigned
    try{
      const btn = document.getElementById('distributeRolesBtn');
      const hint = document.getElementById('distributeHint');
      const nextBtn = document.getElementById('nextActionBtn');
      const hasAssigned = players.some(p=>p.role);
      if(btn){ btn.style.display = hasAssigned ? 'none' : ''; }
      if(hint){ hint.style.display = hasAssigned ? 'none' : ''; }
      if(nextBtn){ nextBtn.style.display = hasAssigned ? '' : 'none'; }
      if(hasAssigned){
        // initialize game action if roles are present
        game.phase = 'night'; game.night = 1; game.substep = 0;
        setCurrentAction("Le village s'endort.");
        updateCalendar();
      }
    }catch(e){}
  }catch(e){ console.warn('loadState failed', e); }
}

function uid(){ return Math.random().toString(36).slice(2,9); }
function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

// --- DOM bindings ---
function bindPlayerForm(){
  const form = document.getElementById('addPlayerForm');
  const input = document.getElementById('playerName');
  const btn = document.getElementById('addBtn');
  if(!form || !input) return;
  try{ form.removeEventListener && form.removeEventListener('submit', onAddPlayer); }catch(e){}
  form.addEventListener('submit', onAddPlayer);
  if(btn){
    try{ btn.removeEventListener && btn.removeEventListener('click', onAddPlayer); }catch(e){}
    btn.addEventListener('click', (ev)=>{ ev.preventDefault(); onAddPlayer(ev); });
  }
  console.log('[MJ] bindPlayerForm attached');
}

function onAddPlayer(e){
  if(e && e.preventDefault) e.preventDefault();
  const input = document.getElementById('playerName');
  if(!input) return;
  const name = (input.value || '').trim();
  if(!name) return;
  addPlayer(name);
  input.value = '';
}

function addPlayer(name){
  const p = { id: uid(), name: name };
  players.push(p);
  renderPlayerList();
  renderPlayerCircle();
  // mettre à jour l'UI des rôles (limite totale, etc.)
  if(typeof renderRoles === 'function') renderRoles();
  saveState();
}

// --- Roles selection (images must exist in /images, now in WebP) ---
const availableRoles = [
  { id: 'Ancien', name: 'Ancien', img: 'images/Ancien.webp', camp: 'Village', count: 0 },
  { id: 'Ange', name: 'Ange', img: 'images/Ange.webp', camp: 'Solitaire', count: 0 },
  { id: 'Assassin', name: 'Assassin', img: 'images/Assassin.webp', camp: 'Solitaire', count: 0 },
  { id: 'Avocat', name: 'Avocat', img: 'images/Avocat.webp', camp: 'Village', count: 0 },
  { id: 'Chasseur', name: 'Chasseur', img: 'images/Chasseur.webp', camp: 'Village', count: 0 },
  { id: 'Chien-Loup', name: 'Chien-Loup', img: 'images/Chien-Loup.webp', camp: 'Loup', count: 0 },
  { id: 'Citoyen', name: 'Citoyen', img: 'images/Citoyen.webp', camp: 'Village', count: 0 },
  { id: 'Cupidon', name: 'Cupidon', img: 'images/Cupidon.webp', camp: 'Village', count: 0 },
  { id: 'Détective', name: 'Détective', img: 'images/Détective.webp', camp: 'Village', count: 0 },
  { id: 'Enfant Sauvage', name: 'Enfant Sauvage', img: 'images/Enfant Sauvage.webp', camp: 'Village', count: 0 },
  { id: 'Idiot Du Village', name: 'Idiot Du Village', img: 'images/Idiot Du Village.webp', camp: 'Village', count: 0 },
  { id: 'Infect Père Des Loups', name: 'Infect Père Des Loups', img: 'images/Infect Père Des Loups.webp', camp: 'Loup', count: 0 },
  { id: 'Loup-Garou Amnésique', name: 'Loup-Garou Amnésique', img: 'images/Loup-Garou Amnésique.webp', camp: 'Loup', count: 0 },
  { id: 'Loup-Garou Blanc', name: 'Loup-Garou Blanc', img: 'images/Loup-Garou Blanc.webp', camp: 'Loup', count: 0 },
  { id: 'Loup-Garou Déloyal', name: 'Loup-Garou Déloyal', img: 'images/Loup-Garou Déloyal.webp', camp: 'Loup', count: 0 },
  { id: 'Loup-Garou Grimeur', name: 'Loup-Garou Grimeur', img: 'images/Loup-Garou Grimeur.webp', camp: 'Loup', count: 0 },
  // Loup-Garou multiple: par défaut 3, max 3
  { id: 'Loup-Garou', name: 'Loup-Garou', img: 'images/Loup-Garou.webp', camp: 'Loup', count: 0, multiple: true, unit: 1, max: 3 },
  { id: 'Loup-Garou Hurleur', name: 'Loup-Garou Hurleur', img: 'images/Loup-Garou Hurleur.webp', camp: 'Loup', count: 0 },
  //Le Maire est un rôle unique qui peut être attribué à un joueur du village durant la partie et ne peut donc être sélectionné ici
  { id: 'Montreur d\'Ours', name: 'Montreur d\'Ours', img: "images/Montreur dOurs.webp", camp: 'Village', count: 0 },
  { id: 'Petite Fille', name: 'Petite Fille', img: 'images/Petite Fille.webp', camp: 'Village', count: 0 },
  { id: 'Pyromane', name: 'Pyromane', img: 'images/Pyromane.webp', camp: 'Solitaire', count: 0 },
  { id: 'Renard', name: 'Renard', img: 'images/Renard.webp', camp: 'Village', count: 0 },
  { id: 'Rival', name: 'Rival', img: 'images/Rival.webp', camp: 'Village', count: 0 },
  { id: 'Salvateur', name: 'Salvateur', img: 'images/Salvateur.webp', camp: 'Village', count: 0 },
  { id: 'Servant Dévoué', name: 'Servant Dévoué', img: 'images/Servant Dévoué.webp', camp: 'Village', count: 0 },
  // Soeur: si choisie, compte pour 2 joueurs (max 2)
  { id: 'Soeur', name: 'Soeur', img: 'images/Soeur.webp', camp: 'Village', count: 0, multiple: true, unit: 2, max: 2 },
  { id: 'Sorcière', name: 'Sorcière', img: 'images/Sorcière.webp', camp: 'Village', count: 0 },
  { id: 'Vilain Petit Loup', name: 'Vilain Petit Loup', img: 'images/Vilain Petit Loup.webp', camp: 'Loup', count: 0 },
  // Villageois with +/- default 2 and max 2
  { id: 'Villageois', name: 'Villageois', img: 'images/Villageois.webp', camp: 'Village', count: 0, multiple: true, unit: 1, max: 2 },
  { id: 'Voleur', name: 'Voleur', img: 'images/Voleur.webp', camp: 'Village', count: 0 },
  { id: 'Voyante', name: 'Voyante', img: 'images/Voyante.webp', camp: 'Village', count: 0 }
];

function totalRolesSelected(){ return availableRoles.reduce((s,r)=>s + (r.count||0), 0); }

function updateRolesTotal(){
  const elTotal = document.getElementById('rolesTotal');
  if(!elTotal) return;
  const total = totalRolesSelected();
  const max = Math.max(0, players.length);
  elTotal.textContent = `${total} / ${max}`;
}

function renderRoles(){
  const ul = document.getElementById('rolesList'); if(!ul) return;
  ul.innerHTML = '';
  const playersCount = Math.max(0, players.length);

  // Ensure counts respect per-role max
  availableRoles.forEach(r=>{ if(r.max && r.count>r.max) r.count = r.max; });

  // Enforce cap: if too many roles selected (e.g., players were removed), deselect newest selections first
  let total = totalRolesSelected();
  if(total > playersCount){
    // Reduce overflow by reducing counts from most-recently selected roles first
    let overflow = total - playersCount;
    const selected = availableRoles.filter(r=>r.count>0).sort((a,b)=> (b.selectedAt||0) - (a.selectedAt||0));
    for(let i=0;i<selected.length && overflow>0;i++){
      const r = selected[i];
      // Si le rôle a une unité supérieure à 1, on réduit par paquets d'unité
      if(r.unit && r.unit>1){
        const unitsToRemove = Math.min(Math.ceil(overflow / r.unit), Math.ceil(r.count / r.unit));
        const amount = unitsToRemove * r.unit;
        r.count = Math.max(0, r.count - amount);
        overflow = Math.max(0, overflow - amount);
      } else {
        const amount = Math.min(overflow, r.count);
        r.count = Math.max(0, r.count - amount);
        overflow -= amount;
      }
      if(r.count===0) delete r.selectedAt;
    }
  }

  const filter = document.getElementById('rolesCampFilter') ? document.getElementById('rolesCampFilter').value : 'All';

  const grouped = {};
  availableRoles.forEach(r=>{ grouped[r.camp] = grouped[r.camp] || []; grouped[r.camp].push(r); });
  const order = ['Village','Loup','Solitaire'];
  const sections = (filter==='All') ? order : [filter];

  sections.forEach(sec=>{
    if(!grouped[sec]) return;
    const hdr = document.createElement('li'); hdr.className='roles-section'; hdr.innerHTML = `<strong>${sec}</strong>`;
    ul.appendChild(hdr);
    grouped[sec].forEach(role=>{
      const li = document.createElement('li'); li.className='role-item'; li.dataset.roleId = role.id;

      // determine Rival disabled reason
      const cupidon = availableRoles.find(r => r.id === 'Cupidon' && (r.count || 0) > 0);
      const isRivalDisabled = (role.id === 'Rival' && !cupidon);
      if(isRivalDisabled){
        li.classList.add('disabled');
        li.setAttribute('aria-disabled','true');
        li.title = 'Le Rival nécessite Cupidon';
        // ensure Rival is not counted when Cupidon absent
        if(role.count && role.count > 0){ role.count = 0; delete role.selectedAt; }
      } else {
        // remove disabled state fully so controls become interactive
        if(li.classList.contains('disabled')) li.classList.remove('disabled');
        if(li.title) li.removeAttribute('title');
        if(li.getAttribute('aria-disabled')) li.removeAttribute('aria-disabled');
      }

      if(role.multiple){
        if(role.unit && role.unit > 1){
          // binary multiple (e.g. Soeurs) - use a switch that sets count = unit when checked
          li.innerHTML = `
            <img src="${role.img}" class="role-avatar" alt="${escapeHtml(role.name)}" width="56" height="56" decoding="async" />
            <div class="role-meta">
              <div class="role-name">${escapeHtml(role.name)}</div>
              ${isRivalDisabled ? '<div class="role-hint">Le Rival nécessite Cupidon</div>' : ''}
            </div>
            <div class="role-controls">
              <div class="role-count" style="margin-left:8px">${role.count}</div>
              <label class="switch">
                <input type="checkbox" class="role-switch-binary" ${isRivalDisabled ? 'disabled aria-disabled="true"' : ''} aria-checked="${role.count? 'true':'false'}" ${role.count? 'checked':''} />
                <span class="slider"></span>
              </label>
            </div>
          `;

          const sw = li.querySelector('.role-switch-binary');
          const display = li.querySelector('.role-count');
          sw.addEventListener('change', ()=>{
            const totalNow = totalRolesSelected();
            const unit = role.unit || 1;
            // enforce per-role max if present
            if(role.max && unit > role.max){ sw.checked = false; showToast('Impossible : limite pour ce rôle atteinte.', 'error'); return }
            if(sw.checked){
              if(totalNow + unit > playersCount){ sw.checked = false; showToast('Le total des rôles ne peut pas dépasser le nombre de joueurs ('+playersCount+').', 'error'); return }
              role.count = unit; role.selectedAt = Date.now();
              li.classList.add('role-selected');
            } else {
              role.count = 0; delete role.selectedAt; li.classList.remove('role-selected');
            }
            display.textContent = role.count;
            updateRolesTotal(); renderRoles();
          });

        } else {
          // render +/- controls for multi roles with unit == 1 (e.g. Villageois, multiple wolves)
          li.innerHTML = `
            <img src="${role.img}" class="role-avatar" alt="${escapeHtml(role.name)}" width="56" height="56" decoding="async" />
            <div class="role-meta">
              <div class="role-name">${escapeHtml(role.name)}</div>
              ${isRivalDisabled ? '<div class="role-hint">Le Rival nécessite Cupidon</div>' : ''}
            </div>
            <div class="role-controls">
              <button class="dec" ${isRivalDisabled ? 'disabled':''}>−</button>
              <div class="role-count">${role.count}</div>
              <button class="inc" ${isRivalDisabled ? 'disabled':''}>+</button>
            </div>
          `;

          const btnInc = li.querySelector('.inc');
          const btnDec = li.querySelector('.dec');
          const display = li.querySelector('.role-count');

          btnInc.addEventListener('click', ()=>{
            const totalNow = totalRolesSelected();
            const step = role.unit || 1;
            // enforce per-role max
            if(role.max && ((role.count||0) + step) > role.max){ showToast('Le nombre maximum pour ce rôle est de ' + role.max + '.','error'); return }
            if(totalNow + step > playersCount){ showToast('Le total des rôles ne peut pas dépasser le nombre de joueurs ('+playersCount+').', 'error'); return }
            role.count = (role.count||0) + step;
            role.selectedAt = Date.now();
            display.textContent = role.count;
            updateRolesTotal(); renderRoles();
          });
          btnDec.addEventListener('click', ()=>{
            const step = role.unit || 1;
            role.count = Math.max(0, (role.count||0) - step);
            if(role.count===0) delete role.selectedAt;
            display.textContent = role.count;
            updateRolesTotal(); renderRoles();
          });
        }

      } else {
        // single toggle (checkbox)
        li.innerHTML = `
          <img src="${role.img}" class="role-avatar" alt="${escapeHtml(role.name)}" width="56" height="56" decoding="async" />
          <div class="role-meta">
            <div class="role-name">${escapeHtml(role.name)}</div>
            ${isRivalDisabled ? '<div class="role-hint">Le Rival nécessite Cupidon</div>' : ''}
          </div>
          <div class="role-controls">
            <label class="switch">
              <input type="checkbox" class="role-switch" ${isRivalDisabled ? 'disabled aria-disabled="true"' : ''} aria-checked="${role.count? 'true':'false'}" ${role.count? 'checked':''} />
              <span class="slider"></span>
            </label>
          </div>
        `;
        const sw = li.querySelector('.role-switch');
        sw.addEventListener('change', ()=>{
          const totalNow = totalRolesSelected();
          if(sw.checked){
            if(totalNow >= playersCount){ sw.checked = false; showToast('Le total des rôles ne peut pas dépasser le nombre de joueurs ('+playersCount+').', 'error'); return }
            role.count = 1; role.selectedAt = Date.now(); li.classList.add('role-selected');
          } else { role.count = 0; delete role.selectedAt; li.classList.remove('role-selected'); }
          updateRolesTotal(); renderRoles();
        });
      }

      if(role.count) li.classList.add('role-selected');
      ul.appendChild(li);
    });
  });

  updateRolesTotal();
  // ensure Rival DOM state matches Cupidon selection immediately
  try{ updateRivalState(); }catch(e){}
}

// Force-enable/disable Rival DOM based on Cupidon selection (useful for mobile/fast toggles)
function updateRivalState(){
  const cup = availableRoles.find(r=>r.id==='Cupidon' && (r.count||0)>0);
  const rivalLi = document.querySelector('.role-item[data-role-id="Rival"]');
  const roleObj = availableRoles.find(r=>r.id==='Rival');
  if(!rivalLi) return;
  if(!cup){
    rivalLi.classList.add('disabled');
    rivalLi.setAttribute('aria-disabled','true');
    rivalLi.title = 'Le Rival nécessite Cupidon';
    rivalLi.querySelectorAll('input,button').forEach(el=> el.disabled = true);
    if(roleObj && roleObj.count>0){ roleObj.count = 0; delete roleObj.selectedAt; }
    const countEl = rivalLi.querySelector('.role-count'); if(countEl) countEl.textContent = 0;
  } else {
    rivalLi.classList.remove('disabled');
    if(rivalLi.title) rivalLi.removeAttribute('title');
    if(rivalLi.getAttribute('aria-disabled')) rivalLi.removeAttribute('aria-disabled');
    rivalLi.querySelectorAll('input,button').forEach(el=> el.disabled = false);
  }
}

// bind filter
const rolesCampFilter = document.getElementById('rolesCampFilter');
if(rolesCampFilter) rolesCampFilter.addEventListener('change', renderRoles);

// call on load
document.addEventListener('DOMContentLoaded', ()=>{
  // Only render roles now if players already exist (prevents showing 0 players before loadState runs)
  if(players.length > 0 && typeof renderRoles === 'function') renderRoles();
  if(typeof updateRolesTotal === 'function') updateRolesTotal();
});

// --- Import / Export handlers for the settings page ---
function buildExportPayload(){
  const rolesState = availableRoles.map(r=>({ id: r.id, count: r.count || 0, selectedAt: r.selectedAt || null }));
  // include players' assigned role (if any) in export
  return { players: players.map(p=>({ id: p.id, name: p.name, role: p.role || null })), roles: rolesState, options };
}

document.addEventListener('DOMContentLoaded', ()=>{
  const exportBtn = document.getElementById('exportJsonBtn');
  const importInput = document.getElementById('importJsonInputPage');

  if(exportBtn){
    exportBtn.addEventListener('click', ()=>{
      try{
        const payload = buildExportPayload();
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'werewolf_export.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        showToast('Export JSON téléchargé', 'success');
      }catch(e){ showToast('Erreur lors de l\'export', 'error'); console.error(e); }
    });
  }

  if(importInput){
    importInput.addEventListener('change', (ev)=>{
      const f = ev.target.files && ev.target.files[0];
      if(!f) return;
      const reader = new FileReader();
      reader.onload = ()=>{
        try{
          const parsed = JSON.parse(String(reader.result));
          // basic validation
          if(!parsed || typeof parsed !== 'object') { showToast('Import JSON : format invalide', 'error'); return; }
          if(!Array.isArray(parsed.players) || !Array.isArray(parsed.roles) || typeof parsed.options !== 'object') { showToast('Import JSON : structure manquante', 'error'); return; }
          // apply players (include role if present)
          players.length = 0; parsed.players.forEach(p=>{ if(p && p.id && p.name) players.push({ id: String(p.id), name: String(p.name), role: p.role || null }); });
          // apply roles
          parsed.roles.forEach(rs=>{ const r = availableRoles.find(x=>x.id === rs.id); if(r) r.count = typeof rs.count === 'number' ? rs.count : 0; });
          // apply options
          Object.assign(options, parsed.options || {});
          // re-render
          renderPlayerList(); renderPlayerCircle(); renderRoles(); updateRolesTotal();
          saveState();
          // hide distribute button if roles already assigned
          try{ const btn = document.getElementById('distributeRolesBtn'); if(btn){ const hasAssigned = players.some(p=>p.role); btn.style.display = hasAssigned ? 'none' : ''; } }catch(e){}
          // hide distribute hint
          try{ const hint = document.getElementById('distributeHint'); if(hint){ const hasAssigned = players.some(p=>p.role); hint.style.display = hasAssigned ? 'none' : ''; } }catch(e){}
          // show next action button
          try{ const nextBtn = document.getElementById('nextActionBtn'); if(nextBtn){ const hasAssigned = players.some(p=>p.role); nextBtn.style.display = hasAssigned ? '' : 'none'; } }catch(e){}
          // initialize game action state: first action is 'Le village s'endort.' at Nuit 1
          game.phase = 'night'; game.night = 1; game.substep = 0;
          setCurrentAction("Le village s'endort.");
          updateCalendar();
          showToast('Import réussi', 'success');
        }catch(err){ showToast('Import JSON invalide', 'error'); console.error(err); }
        importInput.value = '';
      };
      reader.readAsText(f);
    });
  }
});

// --- Player list (menu) ---
function renderPlayerList(){
  const ul = document.getElementById('playerList'); if(!ul) return;
  ul.innerHTML = '';
  players.forEach(p=>{
    const li = document.createElement('li');
    li.className = 'player-list-item';
    li.dataset.id = p.id;
    const roleObj = p.role ? availableRoles.find(r=>r.id === p.role) : null;
    const roleImgHtml = roleObj ? `<img src="${roleObj.img}" class="player-role-small" alt="${escapeHtml(roleObj.name)}" width="40" height="40">` : '';
    // player-meta stacks role image (if any) above the player's name
    const meta = `<div class="player-meta">${roleImgHtml}<div class="player-name">${escapeHtml(p.name)}</div></div>`;
    const roleBadge = roleObj ? `<span class="role-badge">${escapeHtml(roleObj.name)}</span>` : '';
    li.innerHTML = `${meta}${roleBadge}<span class="handle">⇅</span>`;
    ul.appendChild(li);
  });
  // init sortable
  if(window.Sortable){
    if(ul._sortable){ try{ ul._sortable.destroy(); }catch(e){} }
    ul._sortable = Sortable.create(ul, {
      animation: 150,
      handle: '.handle',
      onEnd: ()=>{
        const ids = Array.from(ul.children).map(li=>li.dataset.id);
        const ordered = ids.map(id => players.find(p=>p.id===id)).filter(Boolean);
        players.length = 0; players.push(...ordered);
        renderPlayerCircle();
        saveState();
      }
    });
  }
}

// utility : shuffle array in-place (Fisher-Yates)
function shuffle(array){
  for(let i = array.length -1; i>0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Distribute roles randomly to players (must match counts)
function distributeRoles(){
  const n = players.length;
  if(n === 0){ showToast('Ajoutez des joueurs avant de distribuer.', 'error'); return; }
  const total = totalRolesSelected();
  if(total !== n){ showToast(`Le total des rôles sélectionnés (${total}) doit être égal au nombre de joueurs (${n}).`, 'error'); return; }

  // build pool of role ids expanded by count
  const pool = [];
  availableRoles.forEach(r=>{
    const c = r.count || 0;
    for(let i=0;i<c;i++) pool.push(r.id);
  });

  if(pool.length !== n){ showToast('Erreur interne : pool de rôles incohérent.', 'error'); return; }
  shuffle(pool);

  // assign
  players.forEach((p, idx)=>{ p.role = pool[idx]; });

  renderPlayerList(); renderPlayerCircle(); saveState();
  // hide distribute button now that roles are assigned
  const btn = document.getElementById('distributeRolesBtn'); if(btn) btn.style.display = 'none';
  // hide distribute hint
  const hint = document.getElementById('distributeHint'); if(hint) hint.style.display = 'none';
  // show next action button
  const nextBtn = document.getElementById('nextActionBtn'); if(nextBtn) nextBtn.style.display = '';
  // initialize game action state: first action is 'Le village s'endort.' at Nuit 1
  game.phase = 'night'; game.night = 1; game.substep = 0;
  setCurrentAction("Le village s'endort.");
  updateCalendar();
  showToast('Rôles distribués', 'success');
}

// --- Game controls (minimal placeholders) ---
// game state: running, night counter, phase = 'night'|'day'|null
const game = { running:false, night:0, phase: null };
function startGame(){
  if(players.length===0){ showToast('Ajoutez des joueurs avant de démarrer.', 'error'); return; }
  game.running = true; game.night = Math.max(1, game.night || 1); game.phase = game.phase || 'night';
  setCurrentAction(game.phase === 'night' ? `Nuit ${game.night}` : `Jour ${game.night}`);
  showToast('Partie démarrée (simulation)');
}
function resetGame(){
  game.running=false; game.night=0; game.phase = null; players.length=0; renderPlayerList(); renderPlayerCircle();
  setCurrentAction('Aucune');
}

// Set the action label in the UI
function setCurrentAction(text){
  const el = document.getElementById('currentAction'); if(!el) return; el.textContent = text || 'Aucune';
}

// Update calendar display (Nuit X / Jour X)
function updateCalendar(){
  const el = document.getElementById('calendar'); if(!el) return;
  if(game.phase === 'night') el.textContent = `Nuit ${game.night || 1}`;
  else if(game.phase === 'day') el.textContent = `Jour ${game.night || 1}`;
  else el.textContent = '—';
}

// --- Reset helper (extracted) ---
let _resetInProgress = false;
function resetLocalState(confirmPrompt = true){
  if(_resetInProgress) { console.log('[MJ] reset already in progress'); return; }
  if(confirmPrompt && !confirm("Voulez-vous vraiment réinitialiser l'état local ? Cela supprimera les joueurs et rôles sauvegardés.")) return;
  _resetInProgress = true;
  console.log('[MJ] resetLocalState called');
  try{ localStorage.removeItem(STORAGE_KEY); }catch(e){/* ignore */}
  // clear in-memory state
  players.length = 0;
  // reset role counts
  availableRoles.forEach(r=>{ r.count = 0; delete r.selectedAt; });
  // re-render
  try{ renderPlayerList(); renderPlayerCircle(); if(typeof renderRoles === 'function') renderRoles(); if(typeof updateRolesTotal === 'function') updateRolesTotal(); }catch(e){console.warn('render after reset failed', e)}
  // reset game action
  try{ game.phase = null; game.night = 0; game.substep = 0; setCurrentAction('Aucune'); updateCalendar(); }catch(e){/* ignore if game undefined */}
  // show distribute hint and button again
  const distBtn = document.getElementById('distributeRolesBtn'); if(distBtn) distBtn.style.display = '';
  const hint = document.getElementById('distributeHint'); if(hint) hint.style.display = '';
  const nextBtn = document.getElementById('nextActionBtn'); if(nextBtn) nextBtn.style.display = 'none';
  saveState();
  showToast('État local réinitialisé', 'success');
  // small debounce to avoid accidental double-run
  setTimeout(()=>{ _resetInProgress = false; }, 600);
}

// wire basic controls when DOM ready
document.addEventListener('DOMContentLoaded', ()=>{
  // restore saved state first
  if(typeof loadState === 'function') loadState();
  bindPlayerForm();
  renderPlayerList();
  renderPlayerCircle();
  // ensure roles UI reflects restored state
  if(typeof renderRoles === 'function') renderRoles();
  if(typeof updateRolesTotal === 'function') updateRolesTotal();
  // wire game control buttons if present
  const s = document.getElementById('startGameBtn'); if(s) s.addEventListener('click', startGame);
  const r = document.getElementById('resetGameBtn'); if(r) r.addEventListener('click', ()=>{ if(confirm('Réinitialiser la partie ?')) resetGame(); });
  // hook the distribute button
  const btn = document.getElementById('distributeRolesBtn'); if(btn) btn.addEventListener('click', distributeRoles);
  const resetState = document.getElementById('resetStateBtn');
  if(resetState){
    resetState.addEventListener('click', ()=> resetLocalState(true));
    console.log('[MJ] resetStateBtn listener attached');
  }
  // delegated fallback (in case of dynamic DOM differences)
  document.addEventListener('click', (ev)=>{
    const t = ev.target || ev.srcElement;
    if(!t) return;
    if(t.id === 'resetStateBtn'){
      // small protection: if direct handler already ran, resetLocalState handles _resetInProgress
      resetLocalState(true);
    }
  });
  // next action button (game flow)
  const nextBtn = document.getElementById('nextActionBtn'); if(nextBtn) nextBtn.addEventListener('click', ()=>{
    nextAction();
  });
});

// ensure binding on SPA navigation
document.addEventListener('pageChanged', (e)=>{
  if(e.detail === 'playersPage'){
    bindPlayerForm(); renderPlayerList(); renderPlayerCircle();
  }
  if(e.detail === 'rolesPage'){
    // when navigating to Roles page, ensure UI reflects current players restored from storage
    if(typeof renderRoles === 'function') renderRoles();
    if(typeof updateRolesTotal === 'function') updateRolesTotal();
  }
});

// no sample players: start with an empty list (state will be restored from localStorage if present)
// players will be populated via the UI or by importing a JSON / loadState()

// Simple toast helper (non bloquant)
function showToast(message, type='info', duration=3500){
  let container = document.querySelector('.toast-container');
  if(!container){ container = document.createElement('div'); container.className = 'toast-container'; document.body.appendChild(container); }
  const t = document.createElement('div'); t.className = 'toast '+(type||'info'); t.textContent = message;
  container.appendChild(t);
  // force reflow to allow transition
  requestAnimationFrame(()=> t.classList.add('show'));
  setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=> t.remove(), 220); }, duration);
}

// expose resetLocalState for debugging in console
try{ window.resetLocalState = resetLocalState; }catch(e){}
// immediate attach (in case DOMContentLoaded already fired)
try{
  const immediateResetBtn = document.getElementById('resetStateBtn');
  if(immediateResetBtn){
    immediateResetBtn.addEventListener('click', ()=> resetLocalState(true));
    // also set onclick and pointerup to be extra robust in environments où click may be intercepted
    immediateResetBtn.onclick = ()=> resetLocalState(true);
    immediateResetBtn.addEventListener && immediateResetBtn.addEventListener('pointerup', ()=> resetLocalState(true));
    console.log('[MJ] immediate resetStateBtn listener attached');
  } else {
    console.log('[MJ] resetStateBtn not found during immediate attach');
  }
}catch(e){ console.warn('attach immediate reset failed', e); }
