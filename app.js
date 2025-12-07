// Simple, focused game master JS: players management and circular display
const players = [];

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
}

// --- Roles selection (images must exist in /images) ---
const availableRoles = [
  { id: 'Ancien', name: 'Ancien', img: 'images/Ancien.jpg', camp: 'Village', count: 0 },
  { id: 'Ange', name: 'Ange', img: 'images/Ange.jpg', camp: 'Solitaire', count: 0 },
  { id: 'Assassin', name: 'Assassin', img: 'images/Assassin.jpg', camp: 'Solitaire', count: 0 },
  { id: 'Avocat', name: 'Avocat', img: 'images/Avocat.jpg', camp: 'Village', count: 0 },
  { id: 'Chasseur', name: 'Chasseur', img: 'images/Chasseur.jpg', camp: 'Village', count: 0 },
  { id: 'Chien-Loup', name: 'Chien-Loup', img: 'images/Chien-Loup.jpg', camp: 'Loup', count: 0 },
  { id: 'Citoyen', name: 'Citoyen', img: 'images/Citoyen.jpg', camp: 'Village', count: 0 },
  { id: 'Cupidon', name: 'Cupidon', img: 'images/Cupidon.jpg', camp: 'Village', count: 0 },
  { id: 'Détective', name: 'Détective', img: 'images/Détective.jpg', camp: 'Village', count: 0 },
  { id: 'Enfant Sauvage', name: 'Enfant Sauvage', img: 'images/Enfant Sauvage.jpg', camp: 'Village', count: 0 },
  { id: 'Idiot Du Village', name: 'Idiot Du Village', img: 'images/Idiot Du Village.jpg', camp: 'Village', count: 0 },
  { id: 'Infect Père Des Loups', name: 'Infect Père Des Loups', img: 'images/Infect Père Des Loups.jpg', camp: 'Loup', count: 0 },
  { id: 'Loup-Garou Amnésique', name: 'Loup-Garou Amnésique', img: 'images/Loup-Garou Amnésique.jpg', camp: 'Loup', count: 0 },
  { id: 'Loup-Garou Blanc', name: 'Loup-Garou Blanc', img: 'images/Loup-Garou Blanc.jpg', camp: 'Loup', count: 0 },
  { id: 'Loup-Garou Déloyal', name: 'Loup-Garou Déloyal', img: 'images/Loup-Garou Déloyal.jpg', camp: 'Loup', count: 0 },
  { id: 'Loup-Garou Grimeur', name: 'Loup-Garou Grimeur', img: 'images/Loup-Garou Grimeur.jpg', camp: 'Loup', count: 0 },
  { id: 'Loup-Garou', name: 'Loup-Garou', img: 'images/Loup-Garou.jpg', camp: 'Loup', count: 0 },
  { id: 'Loup-Garoup Hurleur', name: 'Loup-Garoup Hurleur', img: 'images/Loup-Garoup Hurleur.jpg', camp: 'Loup', count: 0 },
  { id: 'Montreur d\'Ours', name: 'Montreur d\'Ours', img: "images/Montreur d'Ours.jpg", camp: 'Village', count: 0 },
  { id: 'Petite Fille', name: 'Petite Fille', img: 'images/Petite Fille.jpg', camp: 'Village', count: 0 },
  { id: 'Pyromane', name: 'Pyromane', img: 'images/Pyromane.jpg', camp: 'Solitaire', count: 0 },
  { id: 'Renard', name: 'Renard', img: 'images/Renard.jpg', camp: 'Village', count: 0 },
  { id: 'Rival', name: 'Rival', img: 'images/Rival.jpg', camp: 'Village', count: 0 },
  { id: 'Salvateur', name: 'Salvateur', img: 'images/Salvateur.jpg', camp: 'Village', count: 0 },
  { id: 'Servant Dévoué', name: 'Servant Dévoué', img: 'images/Servant Dévoué.jpg', camp: 'Village', count: 0 },
  { id: 'Soeur', name: 'Soeur', img: 'images/Soeur.jpg', camp: 'Village', count: 0 },
  { id: 'Sorcière', name: 'Sorcière', img: 'images/Sorcière.jpg', camp: 'Village', count: 0 },
  { id: 'Vilain Petit Loup', name: 'Vilain Petit Loup', img: 'images/Vilain Petit Loup.jpg', camp: 'Loup', count: 0 },
  { id: 'Villagois', name: 'Villagois', img: 'images/Villagois.jpg', camp: 'Village', count: 0 },
  { id: 'Voleur', name: 'Voleur', img: 'images/Voleur.jpg', camp: 'Village', count: 0 },
  { id: 'Voyante', name: 'Voyante', img: 'images/Voyante.jpg', camp: 'Village', count: 0 }
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

  // Enforce cap: if too many roles selected (e.g., players were removed), deselect newest selections first
  let total = totalRolesSelected();
  if(total > playersCount){
    // collect selected roles with selectedAt (newest first)
    const selected = availableRoles.filter(r=>r.count).sort((a,b)=> (b.selectedAt||0) - (a.selectedAt||0));
    for(let i=0; i<selected.length && total>playersCount; i++){
      selected[i].count = 0;
      delete selected[i].selectedAt;
      total--;
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
      const li = document.createElement('li'); li.className='role-item';
      li.innerHTML = `
        <img src="${role.img}" class="role-avatar" alt="${escapeHtml(role.name)}" width="48" height="48" />
        <div class="role-meta">
          <div class="role-name">${escapeHtml(role.name)}</div>
        </div>
        <div class="role-controls">
          <label class="switch">
            <input type="checkbox" class="role-switch" aria-checked="${role.count? 'true':'false'}" ${role.count? 'checked':''} />
            <span class="slider"></span>
          </label>
        </div>
      `;

      // reflect initial visual state
      if(role.count){ li.classList.add('role-selected'); }

      // wire switch (checkbox)
      const sw = li.querySelector('.role-switch');
      sw.addEventListener('change', ()=>{
        const totalNow = totalRolesSelected();
        if(sw.checked){
          // trying to select
          if(totalNow >= playersCount){
            // revert
            sw.checked = false;
            alert('Le total des rôles ne peut pas dépasser le nombre de joueurs ('+playersCount+').');
            return;
          }
          role.count = 1;
          role.selectedAt = Date.now();
          sw.setAttribute('aria-checked','true');
          li.classList.add('role-selected');
        } else {
          // deselect
          role.count = 0;
          delete role.selectedAt;
          sw.setAttribute('aria-checked','false');
          li.classList.remove('role-selected');
        }
        updateRolesTotal();
      });

      ul.appendChild(li);
    });
  });

  updateRolesTotal();
}

// bind filter
const rolesCampFilter = document.getElementById('rolesCampFilter');
if(rolesCampFilter) rolesCampFilter.addEventListener('change', renderRoles);

// call on load
document.addEventListener('DOMContentLoaded', ()=>{ if(typeof renderRoles === 'function') renderRoles(); updateRolesTotal(); });

// --- Player list (menu) ---
function renderPlayerList(){
  const ul = document.getElementById('playerList'); if(!ul) return;
  ul.innerHTML = '';
  players.forEach(p=>{
    const li = document.createElement('li');
    li.className = 'player-list-item';
    li.dataset.id = p.id;
    li.innerHTML = `<span class="label">${escapeHtml(p.name)}</span><span class="handle">⇅</span>`;
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
      }
    });
  }
}

// --- Circular layout ---
function renderPlayerCircle(){
  const container = document.getElementById('playerCircle'); if(!container) return;
  container.innerHTML = '';
  const n = players.length;
  if(n===0) return;

  // compute radius based on parent area
  const area = container.closest('.circle-area') || container;
  const rect = area.getBoundingClientRect();
  const size = Math.min(rect.width || 300, rect.height || 300) || 300;
  const radius = Math.max(60, Math.floor(size/2) - 40);

  // create items around the circle (no player in the center)
  players.forEach((p)=>{
    const li = document.createElement('li');
    li.className = 'circle-item player';
    li.dataset.id = p.id;
    li.innerHTML = `<div class="chip"><div class="name">${escapeHtml(p.name)}</div></div>`;
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
const game = { running:false, night:0 };
function startGame(){ if(players.length===0){ alert('Ajoutez des joueurs avant de démarrer.'); return; } game.running=true; game.night=1; alert('Partie démarrée (simulation)'); }
function resetGame(){ game.running=false; game.night=0; players.length=0; renderPlayerList(); renderPlayerCircle(); }

// wire basic controls when DOM ready
document.addEventListener('DOMContentLoaded', ()=>{
  bindPlayerForm();
  renderPlayerList();
  renderPlayerCircle();
  // wire game control buttons if present
  const s = document.getElementById('startGameBtn'); if(s) s.addEventListener('click', startGame);
  const r = document.getElementById('resetGameBtn'); if(r) r.addEventListener('click', ()=>{ if(confirm('Réinitialiser la partie ?')) resetGame(); });
});

// ensure binding on SPA navigation
document.addEventListener('pageChanged', (e)=>{
  if(e.detail === 'playersPage'){
    bindPlayerForm(); renderPlayerList(); renderPlayerCircle();
  }
});

// keep small sample players for dev convenience
players.length = 0; addPlayer('Alice'); addPlayer('Bob'); addPlayer('Claire');
