// Minimal SPA logic for managing players and distributing roles
const players = [];
let roles = []; // to be provided later; for now we'll use placeholders

const el = {
  addForm: document.getElementById('addPlayerForm'),
  nameInput: document.getElementById('playerName'),
  addBtn: document.getElementById('addBtn'),
  playersContainer: document.getElementById('playersContainer'),
  roleModal: document.getElementById('roleModal'),
  roleText: document.getElementById('roleText'),
  nextReveal: document.getElementById('nextReveal'),
  closeModal: document.getElementById('closeModal'),
  playerList: document.getElementById('playerList')
};

function uid(){return Math.random().toString(36).slice(2,9)}

el.addForm.addEventListener('submit', e =>{
  e.preventDefault();
  const name = el.nameInput.value.trim();
  if(!name) return;
  addPlayer(name);
  el.nameInput.value = '';
});

function addPlayer(name){
  const p = {id: uid(), name};
  players.push(p);
  renderPlayers();
  renderPlayerList();
}

function removePlayer(id){
  const idx = players.findIndex(p=>p.id===id);
  if(idx>=0){players.splice(idx,1);renderPlayers();renderPlayerList();}
}

function renderPlayers(){
  // Render players as a circular list (ul/li) using CSS transforms
  const container = document.getElementById('playerCircle');
  if(!container) return;
  container.innerHTML = '';
  const n = players.length;
  if(n===0) return;

  // ensure container behaves like a positioned square to compute radius
  // look for a parent that can provide dimensions (.circle-area or .circle-wrap)
  const area = container.closest('.circle-area') || container.closest('.circle-wrap') || container;
  const rect = area.getBoundingClientRect();
  const size = Math.min(rect.width || 300, rect.height || 300);
  const radius = Math.max(40, Math.floor(size / 2) - 40); // px

  // create center + items directly inside the provided #playerCircle (container is the ul)
  // first player becomes the center item (if exists)
  players.forEach((p, idx) => {
    const li = document.createElement('li');
    li.dataset.id = p.id;
    if(idx === 0){
      li.className = 'center-item';
      li.innerHTML = `<div class="chip center-chip"><div class="name">${escapeHtml(p.name)}</div></div>`;
      // center positioned via css (left:50% top:50% translate(-50%,-50%))
    } else {
      li.className = 'circle-item player';
      li.innerHTML = `<div class="chip"><div class="name">${escapeHtml(p.name)}</div></div>`;
      // initial positioning at center; we'll transform them around the circle next
    }
    container.appendChild(li);
  });

  // now compute transforms only for non-center items inside this container
  const elements = container.querySelectorAll('li:not(.center-item)');
  const type = 1; // full circle
  const numberOfElements = (type === 1) ? elements.length : elements.length - 1;
  // guard against division by zero
  const slice = numberOfElements > 0 ? (360 * type) / numberOfElements : 360;
  const start = -90; // start at top

  elements.forEach((elItem, i) => {
    const rotate = slice * i + start;
    const rotateReverse = -rotate;
    // use px radius computed from container size
    // include translate(-50%,-50%) so the element remains centered before rotation/translation
    elItem.style.transform = `translate(-50%,-50%) rotate(${rotate}deg) translate(${radius}px) rotate(${rotateReverse}deg)`;
    // ensure transform-origin is center so rotation/translation look right
    elItem.style.transformOrigin = 'center center';
  });
}

// --- Player list (draggable) ---
function renderPlayerList(){
  const ul = el.playerList;
  ul.innerHTML = '';
  players.forEach((p)=>{
    const li = document.createElement('li');
    li.draggable = true;
    li.dataset.id = p.id;
    li.innerHTML = `<span class="label">${escapeHtml(p.name)}</span><span class="handle">⇅</span>`;
    li.addEventListener('click', ()=>{
      // focus player on map (optional): scroll or highlight
    });
    ul.appendChild(li);
  });
}

// replace manual drag handlers with SortableJS initialization (mobile-friendly)
if(window.Sortable && el.playerList){
  Sortable.create(el.playerList, {
    animation: 150,
    handle: '.handle',
    onEnd: ()=>{
      const ids = Array.from(el.playerList.children).map(li=>li.dataset.id);
      const newPlayers = ids.map(id => players.find(p=>p.id===id)).filter(Boolean);
      players.length = 0; players.push(...newPlayers);
      renderPlayers();
      renderPlayerList();
    }
  });
}

// remove manual dragover/drop listeners if present (no-op if not attached)
try{ el.playerList.removeEventListener && el.playerList.removeEventListener('dragover', ()=>{}); }catch(e){}
try{ el.playerList.removeEventListener && el.playerList.removeEventListener('drop', ()=>{}); }catch(e){}

function escapeHtml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}

function shuffleArray(a){
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
}

// removed direct el.shuffleBtn listener — the shuffle/export buttons live removed from players page

let revealQueue = [];
let revealIndex = 0;

function showNextReveal(){
  if(revealIndex>=revealQueue.length){
    hideModal();
    return;
  }
  const item = revealQueue[revealIndex];
  el.roleText.textContent = `${item.player.name} → ${item.role}`;
  showModal();
  revealIndex++;
}

el.nextReveal.addEventListener('click', ()=>{
  showNextReveal();
});

el.closeModal.addEventListener('click', ()=>{
  hideModal();
});

function showModal(){el.roleModal.classList.remove('hidden')}
function hideModal(){el.roleModal.classList.add('hidden')}

// --- Game engine: phases, action queue, resolution ---
const game = {
  running: false,
  night: 0,
  phase: 'idle',
  actionsQueue: [],
  currentActionIndex: 0,
  pendingActions: [], // {role, actorId, targetId, extra}
  lastProtectedId: null
};

const elGame = {
  currentPhase: document.getElementById('currentPhase'),
  currentActor: document.getElementById('currentActor'),
  actionArea: document.getElementById('actionArea'),
  startBtn: document.getElementById('startGameBtn'),
  nextBtn: document.getElementById('nextActionBtn'),
  resetBtn: document.getElementById('resetGameBtn')
};

function getAlivePlayers(){return players.filter(p=>p.alive!==false)}
function getPlayersWithRole(role){return players.filter(p=>p.role===role && p.alive!==false)}

function assignRolesToPlayers(){
  // if roles array provided and sufficient, use it; else assign default Villageois placeholders
  const pool = roles.length>=players.length ? roles.slice() : Array.from({length:players.length}).map(()=> 'Villageois');
  shuffleArray(pool);
  players.forEach((p,i)=>{ p.role = pool[i]; p.alive = true; p.protected = false; p.infected = false; p.transformed = false; p.potions = {life:true, death:true}; p.pyroMarked = false; p.silenced=false;});
  renderPlayerList(); renderPlayers();
}

function buildActionQueueForNight(n){
  const queue = [];
  // Night 1 special: Cupidon first
  if(n===1){ if(getPlayersWithRole('Cupidon').length) queue.push({role:'Cupidon'}); }
  // Voleur on night 2
  if(n===2 && getPlayersWithRole('Voleur').length) queue.push({role:'Voleur'});
  // common nightly actions in an order (note: order matters for who knows what)
  const nightlyOrder = ['Soeur','Salvateur','Detective','Voyante','Renard','Loup-garou','Infect Père des Loups','Sorciere','Loup-garou Blanc','Assassin','Pyromane'];
  nightlyOrder.forEach(r=>{ if(getPlayersWithRole(r).length) {
    // Loup-garou Blanc acts every 2 nights
    if(r==='Loup-garou Blanc' && (n % 2 !== 0)) return;
    queue.push({role:r});
  }});
  // Enfant Sauvage should choose model on night 1
  if(n===1 && getPlayersWithRole('Enfant Sauvage').length) queue.push({role:'Enfant Sauvage'});
  return queue;
}

// helper: target specs per role
const roleTargetSpec = {
  'Salvateur':1,
  'Loup-garou':1,
  'Assassin':1,
  'Sorciere':1,
  'Infect Père des Loups':1,
  'Voyante':1,
  'Detective':2,
  'Renard':3,
  'Cupidon':2,
  'Enfant Sauvage':1,
  'Pyromane':2,
  'Voleur':1
};

function isWolfSideForInfo(p){
  if(!p) return false;
  // rules approximated from spec
  if(p.role && p.role.includes('Loup')) return true; // any 'Loup' in role name
  if(p.role==='Enfant Sauvage') return true; // considered wolf-side for info
  // Loup-garou Grimeur appears as Village for info
  if(p.role==='Loup-Garou Grimeur') return false;
  // Chien-Loup handling not implemented specifically; assume dog role name contains 'Chien-Loup'
  if(p.role==='Chien-Loup' && p.chienSide==='village') return true;
  return false;
}

function renderActionArea(){
  const area = elGame.actionArea; area.innerHTML='';
  const current = game.actionsQueue[game.currentActionIndex];
  if(!current){ area.textContent = 'Aucune action en cours. Cliquez "Action suivante" pour résoudre la nuit.'; return }
  const role = current.role;
  const actors = getPlayersWithRole(role);
  const label = document.createElement('div'); label.innerHTML = `<strong>${role}</strong>`;
  area.appendChild(label);

  if(actors.length>1){
    const ainfo = document.createElement('div'); ainfo.textContent = 'Acteurs : ' + actors.map(a=>a.name).join(', '); area.appendChild(ainfo);
  }

  const targetCount = roleTargetSpec[role] || 0;
  if(targetCount>0){
    const info = document.createElement('div'); info.style.marginTop='6px';
    if(role==='Sorciere'){
      // show wolves' victim if present
      const wolfActs = game.pendingActions.filter(a=>a.role==='Loup-garou' && a.targetId);
      if(wolfActs.length){ info.innerHTML = `<em>MJ: Victime(s) présumée(s) des Loups: ${wolfActs.map(a=>getNameById(a.targetId)).join(', ')}</em>`; }
    }
    area.appendChild(info);

    const list = document.createElement('div'); list.style.display='flex'; list.style.flexWrap='wrap'; list.style.gap='6px'; list.style.marginTop='8px';
    const alive = getAlivePlayers();
    alive.forEach(p=>{
      const btn = document.createElement('button'); btn.textContent = p.name; btn.style.padding='6px 8px'; btn.style.borderRadius='8px';
      // Salvateur cannot protect same person twice
      if(role==='Salvateur' && game.lastProtectedId && p.id===game.lastProtectedId) btn.disabled = true;
      btn.addEventListener('click', ()=>{
        game._selectedTargets = game._selectedTargets || [];
        // toggle selection
        const idx = game._selectedTargets.indexOf(p.id);
        if(idx>=0) game._selectedTargets.splice(idx,1);
        else if(game._selectedTargets.length < targetCount) game._selectedTargets.push(p.id);
        // update visuals
        Array.from(list.querySelectorAll('button')).forEach(b=>b.style.outline='');
        game._selectedTargets.forEach(id=>{ const b = Array.from(list.querySelectorAll('button')).find(x=>x.textContent===getNameById(id)); if(b) b.style.outline='2px solid var(--accent)'; });
      });
      list.appendChild(btn);
    });
    area.appendChild(list);

    const confirm = document.createElement('div'); confirm.style.marginTop='8px';
    const btnConfirm = document.createElement('button'); btnConfirm.textContent='Valider cible(s)'; btnConfirm.addEventListener('click', ()=>{
      const sel = game._selectedTargets || [];
      if(sel.length < targetCount){ alert('Choisissez '+targetCount+' cible(s).'); return }
      // record action
      if(role==='Cupidon'){
        // form couple
        const [a,b] = sel;
        const pA = players.find(x=>x.id===a); const pB = players.find(x=>x.id===b);
        if(pA && pB){ pA.coupleWith = pB.id; pB.coupleWith = pA.id; pA.couple=true; pB.couple=true; }
        game.pendingActions.push({role:role, actorId:null, targets:sel});
      } else if(role==='Voleur'){
        // voleur exchanges role with target immediately
        const voleur = actors[0]; const t = players.find(x=>x.id===sel[0]); if(voleur && t){ voleur.role = t.role; t.role = 'Villageois'; resultsLog('Voleur a volé le rôle de '+t.name); renderPlayerList(); renderPlayers(); }
        game.pendingActions.push({role:role, actorId:actors[0]?.id, targets:sel});
      } else if(role==='Enfant Sauvage'){
        // store model for each enfant sauvage
        players.forEach(pp=>{ if(pp.role==='Enfant Sauvage'){ pp.modelId = sel[0]; }});
        game.pendingActions.push({role:role, actorId:null, targets:sel});
      } else {
        // default single or multi-target action
        game.pendingActions.push({role:role, actorId:null, targets:sel});
      }
      game._selectedTargets = [];
      nextAction();
    });
    confirm.appendChild(btnConfirm); area.appendChild(confirm);
  } else {
    const btn = document.createElement('button'); btn.textContent='Aucune cible à choisir — Valider action'; btn.addEventListener('click', ()=>{ game.pendingActions.push({role:role}); nextAction(); }); area.appendChild(btn);
  }
}

function resultsLog(msg){ console.log('[MJ]', msg); }

function resolveNight(){
  // reset per-night flags
  players.forEach(p=>{ p.protected = false; });
  const results = {toDie:[], notes:[]};

  // Build quick lookup for pending actions by role
  const byRole = {};
  game.pendingActions.forEach(a=>{ byRole[a.role] = byRole[a.role] || []; byRole[a.role].push(a); });

  // Salvateur protections
  (byRole['Salvateur']||[]).forEach(a=>{
    const tid = a.targets && a.targets[0]; if(tid){ const p = players.find(x=>x.id===tid); if(p){ p.protected = true; game.lastProtectedId = tid; results.notes.push('Salvateur protège '+getNameById(tid)); }}
  });

  // Loups: collect chosen victim(s) (take most common target)
  let wolfTarget = null;
  const wolfActs = (byRole['Loup-garou']||[]).map(a=>a.targets && a.targets[0]).filter(Boolean);
  if(wolfActs.length){
    // choose most voted target
    const freq = {}; wolfActs.forEach(id=>freq[id]=(freq[id]||0)+1);
    wolfTarget = Object.keys(freq).reduce((a,b)=> freq[a]>freq[b]?a:b);
  }

  if(wolfTarget){ const victim = players.find(p=>p.id===wolfTarget); if(victim && !victim.protected) results.toDie.push({id:victim.id, by:'loups'}); else results.notes.push('Loups ont été empêchés de tuer '+getNameById(wolfTarget)); }

  // Assassin
  (byRole['Assassin']||[]).forEach(a=>{ const tid = a.targets && a.targets[0]; if(tid){ const v=players.find(p=>p.id===tid); if(v && !v.protected) results.toDie.push({id:v.id, by:'assassin'}); else results.notes.push('Assassin échoue sur '+getNameById(tid)); }});

  // Infect Père des Loups: infect chosen target (one-time use not enforced)
  (byRole['Infect Père des Loups']||[]).forEach(a=>{ const tid = a.targets && a.targets[0]; if(tid){ const v=players.find(p=>p.id===tid); if(v) { v.infected = true; results.notes.push(getNameById(tid)+' est infecté'); } }});

  // Sorcière: handle save of wolf victim and possible kill
  (byRole['Sorciere']||[]).forEach(a=>{
    const sorcierePlayer = players.find(p=>p.role==='Sorciere');
    if(!sorcierePlayer) return;
    const tid = a.targets && a.targets[0];
    // If sorciere targets someone to kill
    if(tid && sorcierePlayer.potions && sorcierePlayer.potions.death){ const v=players.find(p=>p.id===tid); if(v && !v.protected) { results.toDie.push({id:v.id, by:'sorciere'}); sorcierePlayer.potions.death=false; results.notes.push('Sorcière tue '+getNameById(tid)); } }
    // Save: if sorciere chose to save (we assume she selects the wolf victim as target to save) -> if wolfTarget matched and life potion available
    if(wolfTarget && sorcierePlayer.potions && sorcierePlayer.potions.life){
      // if Sorciere selected the wolf victim earlier (or if she selected save action represented differently)
      // For simplicity, if sorciere action included the wolfTarget as target, she saves it
      if(a.targets && a.targets.includes(wolfTarget)){
        // remove wolfTarget from deaths
        // results.toDie may include it; filter
        results.toDie = results.toDie.filter(d=>d.id!==wolfTarget);
        sorcierePlayer.potions.life = false; results.notes.push('Sorcière sauve '+getNameById(wolfTarget));
      }
    }
  });

  // Detective: compare two players
  (byRole['Detective']||[]).forEach(a=>{
    const t = a.targets || [];
    if(t.length>=2){ const [id1,id2]=t; const p1=players.find(x=>x.id===id1); const p2=players.find(x=>x.id===id2);
      // same side = pouce levé
      const sameSide = (isWolfSideForInfo(p1) && isWolfSideForInfo(p2)) || (!isWolfSideForInfo(p1) && !isWolfSideForInfo(p2));
      results.notes.push('Détective: comparaison '+getNameById(id1)+' & '+getNameById(id2)+' → '+(sameSide? 'Pouce levé' : 'Pouce baissé'));
    }
  });

  // Voyante: reveal role (to MJ)
  (byRole['Voyante']||[]).forEach(a=>{
    const tid = a.targets && a.targets[0]; if(tid){ const v=players.find(p=>p.id===tid); if(v){ results.notes.push('Voyante voit la carte de '+getNameById(tid)+': '+(v.role||'inconnue')); }}
  });

  // Renard: count number of wolf-side among 3 selected
  (byRole['Renard']||[]).forEach(a=>{
    const t = a.targets || []; if(t.length){ const count = t.reduce((c,id)=>{ const p=players.find(x=>x.id===id); return c + (isWolfSideForInfo(p)?1:0); },0); results.notes.push('Renard: parmi '+t.map(getNameById).join(', ')+' il y a '+count+' loups'); }
  });

  // Cupidon: couples already set at action time; add note
  (byRole['Cupidon']||[]).forEach(a=>{
    const t = a.targets || []; if(t.length>=2){ results.notes.push('Cupidon forme le couple: '+t.map(getNameById).join(' & ')); }
  });

  // TODO: Rival logic, Petite fille, Loup-garou Blanc cadence, Pyromane full flow, Serviteur Dévoué, Avocat, etc.

  // Voleur handled immediately at action time (roles swapped)

  // Apply deaths
  const uniqueDeaths = Array.from(new Map(results.toDie.map(d=>[d.id,d])).values());
  const deathNames = [];
  uniqueDeaths.forEach(d=>{
    const p = players.find(pp=>pp.id===d.id);
    if(p && p.alive!==false){ p.alive=false; deathNames.push(p.name);
      // Enfant Sauvage transformation: if model died and there's an Enfant Sauvage
      players.forEach(pp=>{ if(pp.role==='Enfant Sauvage' && pp.alive!==false && !pp.transformed){ if(pp.modelId===d.id){ pp.role='Loup-garou'; pp.transformed=true; results.notes.push(pp.name+' devient Loup-garou (Enfant Sauvage)'); } }});
    }
  });

  // Montreur d'ours: at dawn, check neighbors for wolves and add grognement note
  players.forEach((p, idx)=>{
    if(p.role==='Montreur d\'ours' && p.alive!==false){
      // find nearest alive to left and right
      const n = players.length;
      let left = null; for(let i=1;i<n;i++){ const cand = players[(idx - i + n)%n]; if(cand.alive!==false){ left = cand; break }}
      let right = null; for(let i=1;i<n;i++){ const cand = players[(idx + i)%n]; if(cand.alive!==false){ right = cand; break }}
      if((isWolfSideForInfo(left) || isWolfSideForInfo(right))){ results.notes.push(p.name+' : grognement détecté (Montreur d\'ours)'); }
    }
  });

  // Show summary to MJ
  const summary = document.createElement('div'); summary.innerHTML = `<strong>Résolution Nuit ${game.night}</strong><div>Morts: ${deathNames.join(', ') || 'Aucun'}</div>`;
  if(results.notes.length) summary.innerHTML += `<div>Notes: ${results.notes.join('; ')}</div>`;
  elGame.actionArea.innerHTML=''; elGame.actionArea.appendChild(summary);

  // prepare next night/day cycle: increment night and rebuild queue
  game.night++;
  game.actionsQueue = buildActionQueueForNight(game.night);
  game.currentActionIndex = 0; game.pendingActions=[];
  updateGameUI();
}

// Day phase logic: lynch/vote
const elDay = { startDayBtn: document.getElementById('startDayBtn'), lynchArea: document.getElementById('lynchArea') };

function startDay(){
  game.phase = 'day';
  renderLynchArea();
  updateGameUI();
}

function renderLynchArea(){
  const area = elDay.lynchArea; area.innerHTML = '';
  const alive = getAlivePlayers();
  if(alive.length<=1){ area.textContent = 'Trop peu de joueurs vivants.'; return }
  const info = document.createElement('div'); info.textContent = 'Vote du village: sélectionnez le ou les joueurs à lyncher (majorité à gérer manuellement)'; area.appendChild(info);
  const list = document.createElement('div'); list.style.display='flex'; list.style.flexWrap='wrap'; list.style.gap='6px'; list.style.marginTop='8px';
  alive.forEach(p=>{ const b=document.createElement('button'); b.textContent=p.name; b.addEventListener('click', ()=>{ elDay.lynchArea.querySelectorAll('button').forEach(x=>x.style.outline=''); b.style.outline='2px solid var(--accent)'; elDay.lynchArea.dataset.selected = p.id; }); list.appendChild(b); });
  area.appendChild(list);
  const btn = document.createElement('button'); btn.textContent='Valider lynchage'; btn.style.marginTop='8px'; btn.addEventListener('click', ()=>{ const sel = elDay.lynchArea.dataset.selected; if(!sel){ alert('Choisissez une personne à lyncher'); return } resolveDayLynch(sel); }); area.appendChild(btn);
}

function resolveDayLynch(selectedId){
  const p = players.find(x=>x.id===selectedId);
  if(!p) return;
  // Idiot du Village: s'il est lynché, il révèle et ne meurt
  if(p.role==='Idiot du Village'){ p.revealed = true; renderPlayerList(); renderPlayers(); elDay.lynchArea.innerHTML = `<div>${p.name} (Idiot) a été lynché mais révèle son rôle et survit.</div>`; // no death
    // if Ange conditions (not handled here)
  } else {
    // normal death
    p.alive = false;
    // Chasseur: if dead, allow choose a target to kill
    if(p.role==='Chasseur'){ const shootArea = document.createElement('div'); shootArea.innerHTML = `<div>${p.name} (Chasseur) meurt: choisissez sa victime</div>`; const alive = getAlivePlayers(); alive.forEach(pp=>{ const bb=document.createElement('button'); bb.textContent=pp.name; bb.addEventListener('click', ()=>{ pp.alive=false; renderPlayerList(); renderPlayers(); elDay.lynchArea.innerHTML = `<div>Le Chasseur a tué ${pp.name}</div>`; proceedToNight(); }); shootArea.appendChild(bb); }); elDay.lynchArea.appendChild(shootArea); return; }
    // Ange: if died on first vote (turn 1), angel wins (not fully implemented)
    if(p.role==='Ange' && game.night<=1){ elDay.lynchArea.innerHTML=`<div>L'Ange est mort au vote — Ange gagne la partie.</div>`; game.running=false; return; }
    renderPlayerList(); renderPlayers(); elDay.lynchArea.innerHTML = `<div>${p.name} a été lynché et est mort.</div>`;
  }
  // proceed to night after a small delay
  setTimeout(()=>{ proceedToNight(); }, 1200);
}

function proceedToNight(){
  // prepare next night
  game.phase='night';
  game.actionsQueue = buildActionQueueForNight(game.night);
  game.currentActionIndex = 0; game.pendingActions=[];
  updateGameUI();
}

elDay.startDayBtn.addEventListener('click', ()=>{ startDay(); });

// initial sample for dev
players.length = 0; // clear initial adds
addPlayer('Alice');addPlayer('Bob');addPlayer('Claire');

// handle resize to re-render positions
window.addEventListener('resize', ()=>{renderPlayers()});

// small utility: wait until container has size before initial render
setTimeout(()=>renderPlayers(),150);

// Ensure listeners are attached after DOM is ready — rebind critical controls if needed
document.addEventListener('DOMContentLoaded', ()=>{
  // game controls
  const sStart = document.getElementById('startGameBtn'); if(sStart){ sStart.removeEventListener && sStart.removeEventListener('click', startGame); sStart.addEventListener('click', startGame); }
  const sNext = document.getElementById('nextActionBtn'); if(sNext){ sNext.removeEventListener && sNext.removeEventListener('click', nextAction); sNext.addEventListener('click', nextAction); }
  const sReset = document.getElementById('resetGameBtn'); if(sReset){ sReset.removeEventListener && sReset.removeEventListener('click', resetGame); sReset.addEventListener('click', ()=>{ if(confirm('Réinitialiser la partie ?')) resetGame(); }); }
  const sStartDay = document.getElementById('startDayBtn'); if(sStartDay){ sStartDay.removeEventListener && sStartDay.removeEventListener('click', startDay); sStartDay.addEventListener('click', startDay); }

  // players controls
});

// react to page changes (nav.js dispatches pageChanged)
document.addEventListener('pageChanged', (e)=>{
  const page = e.detail;
  if(page==='gamePage'){
    // ensure players are rendered and controls bound
    renderPlayers();
    // rebind game controls
    const sStart = document.getElementById('startGameBtn'); if(sStart){ sStart.removeEventListener && sStart.removeEventListener('click', startGame); sStart.addEventListener('click', startGame); }
    const sNext = document.getElementById('nextActionBtn'); if(sNext){ sNext.removeEventListener && sNext.removeEventListener('click', nextAction); sNext.addEventListener('click', nextAction); }
    const sReset = document.getElementById('resetGameBtn'); if(sReset){ sReset.removeEventListener && sReset.removeEventListener('click', resetGame); sReset.addEventListener('click', ()=>{ if(confirm('Réinitialiser la partie ?')) resetGame(); }); }
    const sStartDay = document.getElementById('startDayBtn'); if(sStartDay){ sStartDay.removeEventListener && sStartDay.removeEventListener('click', startDay); sStartDay.addEventListener('click', startDay); }
  }
});

// helper utilities and missing functions (added to avoid runtime errors)
function getNameById(id){
  const p = players.find(x=>x.id===id); return p? p.name : 'Inconnu';
}

function updateGameUI(){
  if(elGame.currentPhase) elGame.currentPhase.textContent = (game.phase || 'idle');
  // current actor: show role of current action or -
  const current = game.actionsQueue && game.actionsQueue[game.currentActionIndex];
  if(elGame.currentActor) elGame.currentActor.textContent = current ? (current.role || '-') : '-';
  // enable/disable buttons simply
  if(elGame.startBtn) elGame.startBtn.disabled = game.running;
  if(elGame.nextBtn) elGame.nextBtn.disabled = !(game.actionsQueue && game.actionsQueue.length>0);
}

function startGame(){
  if(players.length===0){ alert('Ajoutez des joueurs avant de démarrer la partie.'); return }
  assignRolesToPlayers();
  game.running = true;
  game.night = 1;
  game.phase = 'night';
  game.actionsQueue = buildActionQueueForNight(game.night);
  game.currentActionIndex = 0;
  game.pendingActions = [];
  renderPlayers();
  renderPlayerList();
  renderActionArea();
  updateGameUI();
}

function nextAction(){
  // move to next action slot; when finished, resolve night
  if(!game.actionsQueue || game.actionsQueue.length===0){ resolveNight(); return }
  // advance index
  game.currentActionIndex++;
  if(game.currentActionIndex >= game.actionsQueue.length){
    // all actions processed: resolve night
    resolveNight();
  } else {
    renderActionArea();
    updateGameUI();
  }
}

function resetGame(){
  // clear roles and states but keep players list
  players.forEach(p=>{ delete p.role; p.alive = true; p.protected = false; p.infected = false; p.transformed = false; p.couple = false; p.coupleWith = null; p.potions = {life:true,death:true}; });
  game.running = false;
  game.night = 0;
  game.phase = 'idle';
  game.actionsQueue = [];
  game.currentActionIndex = 0;
  game.pendingActions = [];
  renderPlayerList(); renderPlayers(); updateGameUI();
}
