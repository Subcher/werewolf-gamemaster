// Minimal SPA logic for managing players and distributing roles
const players = [];
let roles = []; // to be provided later; for now we'll use placeholders

const el = {
  addForm: document.getElementById('addPlayerForm'),
  nameInput: document.getElementById('playerName'),
  addBtn: document.getElementById('addBtn'),
  playersContainer: document.getElementById('playersContainer'),
  shuffleBtn: document.getElementById('shuffleBtn'),
  exportBtn: document.getElementById('exportBtn'),
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
  const container = el.playersContainer;
  container.innerHTML = '';
  const n = players.length;
  if(n===0) return;
  const rect = container.getBoundingClientRect();
  // if rect width/height are zero (initial render), try to use parent size
  const px = container.parentElement.getBoundingClientRect();
  const cx = (rect.width||px.width)/2;
  const cy = (rect.height||px.height)/2;
  const radius = Math.min(cx,cy) - 40;
  players.forEach((p,i)=>{
    const angle = (i / n) * Math.PI * 2 - Math.PI/2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    const div = document.createElement('div');
    div.className = 'player';
    div.style.left = `${x}px`;
    div.style.top = `${y}px`;
    div.innerHTML = `<div class="chip"><div class="name">${escapeHtml(p.name)}</div><div class="index">#${i+1}</div></div>`;
    div.addEventListener('click', ()=>{
      if(confirm(`Supprimer ${p.name} ?`)) removePlayer(p.id);
    });
    container.appendChild(div);
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

el.shuffleBtn.addEventListener('click', ()=>{
  if(players.length===0){alert('Ajoutez des joueurs avant de distribuer.');return}
  // use placeholder roles if none provided
  const usedRoles = roles.length>=players.length ? roles.slice() : Array.from({length:players.length},(_,i)=>`Rôle ${i+1}`);
  shuffleArray(usedRoles);
  // reveal roles one by one
  revealQueue = players.map((p,i)=>({player:p,role:usedRoles[i]}));
  revealIndex = 0;
  showNextReveal();
});

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

el.exportBtn.addEventListener('click', ()=>{
  const out = players.map((p,i)=>({id:p.id, name:p.name, index:i+1}));
  const blob = new Blob([JSON.stringify(out, null, 2)],{type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'players.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});

// initial sample for dev
players.length = 0; // clear initial adds
addPlayer('Alice');addPlayer('Bob');addPlayer('Claire');

// handle resize to re-render positions
window.addEventListener('resize', ()=>{renderPlayers()});

// small utility: wait until container has size before initial render
setTimeout(()=>renderPlayers(),150);
