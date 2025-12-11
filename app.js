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
    try{ const btn = document.getElementById('distributeRolesBtn'); if(btn){ const hasAssigned = players.some(p=>p.role); if(hasAssigned) btn.style.display = 'none'; else btn.style.display = ''; } }catch(e){}
    try{ const hintEl = document.getElementById('distributeHint'); if(hintEl){ const hasAssigned = players.some(p=>p.role); hintEl.style.display = hasAssigned ? 'none' : ''; } }catch(e){}
  }catch(e){ console.warn('loadState failed', e); }
}

function uid(){ return Math.random().toString(36).slice(2,9); }
function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

// helper: remove any inline `display: none` from an element's style attribute
function removeInlineDisplayNone(el){
  if(!el) return;
  try{
    // preferred: remove the display property via the style object
    try{ el.style.removeProperty('display'); }catch(e){}
    try{ el.style.removeProperty('visibility'); }catch(e){}
    // also remove any hidden attribute or hidden class
    try{ el.removeAttribute('hidden'); }catch(e){}
    try{ el.classList && el.classList.remove('hidden'); }catch(e){}
    // clean up the inline style string if it contains display:none text
    const raw = el.getAttribute('style') || '';
    const cleaned = raw.replace(/display\s*:\s*none;?/ig, '').trim();
    if(cleaned === '') el.removeAttribute('style'); else el.setAttribute('style', cleaned);
    // ensure element is not forcibly hidden via inline style
    el.style.display = '';
    el.style.visibility = '';
  }catch(e){/* ignore */}
}

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
          try{ const hintEl = document.getElementById('distributeHint'); if(hintEl){ const hasAssigned = players.some(p=>p.role); hintEl.style.display = hasAssigned ? 'none' : ''; } }catch(e){}
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

    // add per-item click handler: clicking the line (except the handle) will remove the player
    li.addEventListener('click', (ev) => {
      // ignore clicks starting from the handle (drag)
      if(ev.target && ev.target.closest && ev.target.closest('.handle')) return;
      const id = li.dataset.id;
      if(!id) return;
      const idx = players.findIndex(p=>p.id === id);
      if(idx === -1) return;
      const pname = players[idx].name || 'joueur';
      if(!confirm(`Supprimer le joueur "${pname}" ?`)) return;
      players.splice(idx, 1);
      // re-render and persist
      renderPlayerList(); renderPlayerCircle(); if(typeof renderRoles === 'function') renderRoles(); if(typeof updateRolesTotal === 'function') updateRolesTotal();
      saveState();
    });
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

  // suppression gérée par les handlers par-élément (plus fiable)
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
  // hide the hint text as well
  const hint = document.getElementById('distributeHint'); if(hint) hint.style.display = 'none';
  showToast('Rôles distribués', 'success');

  // initialize game state and show status UI
  try{
    console.log('[MJ] distributeRoles: initializing game UI');
    game.phase = 'night'; game.night = 1; game.substep = 0; game.running = true;

    // ensure Game page is visible (in case distribution called from elsewhere)
    try{
      const gp = document.getElementById('gamePage'); if(gp) gp.classList.remove('hidden');
      document.dispatchEvent(new CustomEvent('pageChanged', { detail: 'gamePage' }));
    }catch(e){/* ignore */}

    const line = document.getElementById('calendarLine');
    const cur = document.getElementById('currentAction');
    const nextBtn = document.getElementById('nextActionBtn');

    // ensure any inline `display:none` is removed before applying new styles
    removeInlineDisplayNone(line);
    removeInlineDisplayNone(cur);
    removeInlineDisplayNone(nextBtn);

    if(line){
      line.style.display = 'block';
      line.style.padding = '6px 10px';
      line.style.borderRadius = '8px';
      line.style.background = 'rgba(255,255,255,0.02)';
      line.style.fontSize = '16px';
      line.style.textAlign = 'center';
      // ensure visible color and stacking
      line.style.color = '#ffffff';
      line.style.zIndex = 30;
    }
    if(cur){
      cur.style.display = 'block';
      cur.style.padding = '4px 8px';
      cur.style.background = 'transparent';
      cur.style.fontSize = '14px';
      cur.style.color = '#e6e6e6';
      cur.style.zIndex = 30;
      // show the first action
      try{ cur.textContent = "Le village s'endort"; }catch(e){}
    }
    if(nextBtn){ nextBtn.style.display = 'inline-block'; }

    // Removed auto-start of Cupidon selection here so the first action remains "Le village s'endort"
    // Cupidon selection will be triggered by the 'Prochaine action' button via advanceAction()
  }catch(e){ console.warn('distributeRoles: UI init failed', e); }
}

// hook the distribute button
document.addEventListener('DOMContentLoaded', ()=>{
  const btn = document.getElementById('distributeRolesBtn'); if(btn) btn.addEventListener('click', distributeRoles);
  const resetState = document.getElementById('resetStateBtn');
  if(resetState){
    resetState.addEventListener('click', ()=>{
      if(!confirm('Voulez-vous vraiment réinitialiser l\'état local ? Cela supprimera les joueurs et rôles sauvegardés.')) return;
      try{
        localStorage.removeItem(STORAGE_KEY);
      }catch(e){/* ignore */}
      // clear in-memory state
      players.length = 0;
      // reset role counts
      availableRoles.forEach(r=>{ r.count = 0; delete r.selectedAt; });
      // re-render
      renderPlayerList(); renderPlayerCircle(); if(typeof renderRoles === 'function') renderRoles(); if(typeof updateRolesTotal === 'function') updateRolesTotal();
      // show distribute button again
      const distBtn = document.getElementById('distributeRolesBtn'); if(distBtn) distBtn.style.display = '';
      showToast('État local réinitialisé', 'success');
    });
  }
});

// --- Circular layout ---
function renderPlayerCircle(){
  const container = document.getElementById('playerCircle'); if(!container) return;
  container.innerHTML = '';
  const n = players.length;
  if(n===0) return;

  // compute radius based on parent area
  const area = container.closest('.circle-area') || container;
  const rect = area.getBoundingClientRect();
  const size = Math.min(rect.width || 400, rect.height || 400) || 400;
  const radius = Math.max(60, Math.floor(size/2) - 40);

  // create items around the circle (no player in the center)
  players.forEach((p)=>{
    const li = document.createElement('li');
    li.className = 'circle-item player';
    li.dataset.id = p.id;
    const roleObj = p.role ? availableRoles.find(r=>r.id === p.role) : null;
    const roleImg = roleObj ? `<img src="${roleObj.img}" class="role-avatar-chip" alt="${escapeHtml(roleObj.name)}" width="40" height="40">` : '';
    li.innerHTML = `<div class="chip">${roleImg}<div class="name">${escapeHtml(p.name)}</div></div>`;
    li.style.position = 'absolute';
    li.style.left = '50%'; li.style.top = '50%';
    li.style.transform = 'translate(-50%,-50%)';
    container.appendChild(li);
  });

  const elems = Array.from(container.children);
  const slice = 360 / elems.length;
  const start = -90; // start at top
  elems.forEach((el, idx)=>{
    const angle = slice * idx + start;
    const rot = `rotate(${angle}deg)`;
    const rev = `rotate(${-angle}deg)`;
    el.style.transform = `translate(-50%,-50%) ${rot} translate(${radius}px) ${rev}`;
    el.style.transformOrigin = 'center center';
  });
}

// --- Game controls (minimal placeholders) ---
const game = { running:false, night:0, cupidonDone:false };
function startGame(){ if(players.length===0){ showToast('Ajoutez des joueurs avant de démarrer.', 'error'); return; } game.running=true; game.night=1; showToast('Partie démarrée (simulation)'); }
function resetGame(){ game.running=false; game.night=0; players.length=0; renderPlayerList(); renderPlayerCircle();
  saveState();
  // show the distribute button again (fresh start)
  const btn = document.getElementById('distributeRolesBtn'); if(btn) btn.style.display = '';
}

// Advance the in-night action sequence. On first call after distribution, show Cupidon selection if Cupidon exists.
function advanceAction(){
  const cur = document.getElementById('currentAction'); if(!cur) return;
  // if cupidon already done for this night, just show placeholder
  if(game.cupidonDone){ cur.textContent = 'Aucune action définie pour l\'instant'; return; }
  // if Cupidon is present among assigned roles, start selection
  const cup = players.find(p=>p.role === 'Cupidon');
  if(cup){
    // start interactive selection: instruct the user to click two players in the circle
    game.cupidonDone = true;
    game.awaitingCupidon = true;
    game.cupidonId = cup.id;
    game.couple = [];
    cur.textContent = "Cupidon : sélectionnez 2 joueurs pour former un couple (cliquez sur leurs noms)";
    showToast('Sélection Cupidon active — cliquez 2 joueurs dans le cercle', 'info', 6000);
    // the circle click handlers will use game.awaitingCupidon to toggle selection
    renderPlayerCircle();
    return;
  }
  // otherwise no cupidon, mark as done and show default message
  game.cupidonDone = true;
  cur.textContent = 'Le village s\'endort';
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
  const nextBtn = document.getElementById('nextActionBtn'); if(nextBtn) nextBtn.addEventListener('click', advanceAction);
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