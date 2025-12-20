// Simple, focused game master JS: players management and circular display
const players = [];
// options globales (sauvegardées)
const options = {villageType: 'simple'};

// Persistence removed: keep state in-memory only (no localStorage)
function saveState() {
    // persistence intentionally disabled — state is volatile and lives only in memory
    // calls to saveState remain for compatibility but do nothing now
}

function loadState() {
    // persistence intentionally disabled — nothing to load
}

function uid() {
    return Math.random().toString(36).slice(2, 9);
}

function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// expose for console debugging
try { if (typeof window !== 'undefined') window.traceLog = traceLog; } catch (e) {}

// utilitaire: retourner vrai si un rôle est présent parmi les joueurs assignés
function isRoleInGame(roleId) {
    return players.some(p => p.role === roleId);
}

try {
    if (typeof window !== 'undefined') window.isRoleInGame = isRoleInGame;
} catch (e) {
}

// Helper: vue des rôles pour les rôles d'information (Voyante, Détective, ...)
// - L'Enfant Sauvage est considéré côté Loup pour les rôles à information, même s'il n'est pas encore transformé.
// - Si l'Enfant s'est transformé en Loup-Garou (au décès de son modèle), on garde son rôle effectif
//   mais on n'expose jamais l'information "précédent rôle" lorsqu'on révèle son rôle à la mort.
function getInformerViewOfPlayer(player) {
    if (!player) return {roleId: null, camp: null};
    const rid = player.role || null;
    // If the original role is Enfant Sauvage, informers see it as a Loup-Garou/camp Loup
    if (rid === 'Enfant Sauvage') return {roleId: 'Loup-Garou', camp: 'Loup'};
    // If the player used to be an Enfant Sauvage but is now a Loup-Garou, informers still see Loup
    if (player.previousRole === 'Enfant Sauvage' && rid === 'Loup-Garou') return {roleId: 'Loup-Garou', camp: 'Loup'};
    const roleObj = availableRoles.find(r => r.id === rid);
    if (roleObj) return {roleId: roleObj.id, camp: roleObj.camp || null};
    return {roleId: rid, camp: null};
}

try {
    if (typeof window !== 'undefined') window.getInformerViewOfPlayer = getInformerViewOfPlayer;
} catch (e) {
}

// Helper: small guard used by any action to verify que le rôle est présent dans la partie
function ensureRolePresent(roleId) {
    if (!isRoleInGame(roleId)) {
        console.warn(`[MJ] Action ignorée : rôle "${roleId}" absent dans la partie.`);
        return false;
    }
    return true;
}

try {
    if (typeof window !== 'undefined') window.ensureRolePresent = ensureRolePresent;
} catch (e) {
}

// helper: remove any inline `display: none` from an element's style attribute
function removeInlineDisplayNone(el) {
    if (!el) return;
    try {
        // preferred: remove the display property via the style object
        try {
            el.style.removeProperty('display');
        } catch (e) {
        }
        try {
            el.style.removeProperty('visibility');
        } catch (e) {
        }
        // also remove any hidden attribute or hidden class
        try {
            el.removeAttribute('hidden');
        } catch (e) {
        }
        try {
            el.classList && el.classList.remove('hidden');
        } catch (e) {
        }
        // clean up the inline style string if it contains display:none text
        const raw = el.getAttribute('style') || '';
        const cleaned = raw.replace(/display\s*:\s*none;?/ig, '').trim();
        if (cleaned === '') el.removeAttribute('style'); else el.setAttribute('style', cleaned);
        // ensure element is not forcibly hidden via inline style
        el.style.display = '';
        el.style.visibility = '';
    } catch (e) {/* ignore */
    }
}

// Utility: clear selection classes for any action and reset selection arrays
function clearActionSelections() {
    try {
        document.querySelectorAll('.selected-for-cupidon, .selected-for-detective, .selected-for-voyante, .detective-unselectable').forEach(el => {
            el.classList.remove('selected-for-cupidon', 'selected-for-detective', 'selected-for-voyante', 'detective-unselectable');
        });
    } catch (e) {}
    try { if (game) game.detectiveSelections = []; } catch (e) {}
    try { if (game) game.cupidonSelections = []; } catch (e) {}
    try { if (game) game.voyanteSelection = null; } catch (e) {}
}

// Utility: show a large player card (for Voyante) so the MJ can show the phone to the player
function showLargePlayerCard(player) {
    try {
        if (!player) return;
        // Voyante should see the actual current role of the player (no informer transformation)
        try { traceLog('Voyante.overlay.open', {playerId: player.id, role: player.role}); } catch (e) {}
        const roleObj = availableRoles.find(r => r.id === player.role) || {id: player.role, name: player.role || 'Inconnu', img: 'images/Voyante.webp'};

        // remove any existing overlay
        const existing = document.getElementById('voyanteOverlay');
        if (existing) existing.remove();

        const ov = document.createElement('div');
        ov.id = 'voyanteOverlay';
        ov.style.position = 'fixed';
        ov.style.left = '0';
        ov.style.top = '0';
        ov.style.right = '0';
        ov.style.bottom = '0';
        ov.style.zIndex = 9999;
        ov.style.display = 'flex';
        ov.style.alignItems = 'center';
        ov.style.justifyContent = 'center';
        ov.style.background = 'rgba(14,23,39,0.99)';
        ov.style.padding = '20px';

        const card = document.createElement('div');
        card.style.background = '#fff';
        card.style.borderRadius = '12px';
        card.style.padding = '18px';
        card.style.maxWidth = '420px';
        card.style.width = '100%';
        card.style.textAlign = 'center';
        card.style.boxShadow = '0 8px 30px rgba(0,0,0,0.6)';
        card.innerHTML = `
            <div style="font-size:14px;color:#666;margin-bottom:8px">Voyante — carte de ${escapeHtml(player.name)}</div>
            <img src="${roleObj.img}" alt="${escapeHtml(roleObj.name)}" style="max-width:320px;width:80%;height:auto;border-radius:8px;display:block;margin:0 auto 12px" />
            <div style="font-size:20px;font-weight:700;color:#222;margin-bottom:6px">${escapeHtml(roleObj.name)}</div>
            <div style="font-size:13px;color:#444;margin-bottom:12px">${escapeHtml(player.name)}</div>
            <button class="voyante-close" style="padding:10px 16px;border-radius:8px;border:none;background:#2d8cf0;color:#fff;font-weight:600;cursor:pointer">OK</button>
        `;
        ov.appendChild(card);
        document.body.appendChild(ov);

        // temporarily block clicks to avoid click-through
        try { game.clickLock = true; setTimeout(() => { if (game) game.clickLock = false; }, 350); } catch (e) {}

        const btn = ov.querySelector('.voyante-close');
        if (btn) btn.addEventListener('click', () => {
            try { traceLog('Voyante.overlay.close', {playerId: player.id, role: player.role}); } catch (e) {}
            try { ov.remove(); } catch (e) {}
            try {
                finishNightAction('Voyante');
            } catch (err) {
                game.voyanteDone = true;
                game.awaitingVoyante = false;
            }
        });
    } catch (e) {
        console.warn('showLargePlayerCard error', e);
    }
}

// --- DOM bindings ---
function bindPlayerForm() {
    const form = document.getElementById('addPlayerForm');
    const input = document.getElementById('playerName');
    const btn = document.getElementById('addBtn');
    if (!form || !input) return;
    try {
        form.removeEventListener && form.removeEventListener('submit', onAddPlayer);
    } catch (e) {
    }
    form.addEventListener('submit', onAddPlayer);
    if (btn) {
        try {
            btn.removeEventListener && btn.removeEventListener('click', onAddPlayer);
        } catch (e) {
        }
        btn.addEventListener('click', (ev) => {
            ev.preventDefault();
            onAddPlayer(ev);
        });
    }
    console.log('[MJ] bindPlayerForm attached');
}

function onAddPlayer(e) {
    if (e && e.preventDefault) e.preventDefault();
    const input = document.getElementById('playerName');
    if (!input) return;
    const name = (input.value || '').trim();
    if (!name) return;
    addPlayer(name);
    input.value = '';
}

function addPlayer(name) {
    const p = {id: uid(), name: name};
    players.push(p);
    renderPlayerList();
    renderPlayerCircle();
    // mettre à jour l'UI des rôles (limite totale, etc.)
    if (typeof renderRoles === 'function') renderRoles();
    saveState();
}

// --- Roles selection (images must exist in /images, now in WebP) ---
const availableRoles = [
    {id: 'Ancien', name: 'Ancien', img: 'images/Ancien.webp', camp: 'Village', count: 0},
    {id: 'Ange', name: 'Ange', img: 'images/Ange.webp', camp: 'Solitaire', count: 0},
    {id: 'Assassin', name: 'Assassin', img: 'images/Assassin.webp', camp: 'Solitaire', count: 0},
    {id: 'Avocat', name: 'Avocat', img: 'images/Avocat.webp', camp: 'Village', count: 0},
    {id: 'Chasseur', name: 'Chasseur', img: 'images/Chasseur.webp', camp: 'Village', count: 0},
    {id: 'Chien-Loup', name: 'Chien-Loup', img: 'images/Chien-Loup.webp', camp: 'Loup', count: 0},
    {id: 'Citoyen', name: 'Citoyen', img: 'images/Citoyen.webp', camp: 'Village', count: 0},
    {id: 'Cupidon', name: 'Cupidon', img: 'images/Cupidon.webp', camp: 'Village', count: 0},
    {id: 'Détective', name: 'Détective', img: 'images/Détective.webp', camp: 'Village', count: 0},
    {id: 'Enfant Sauvage', name: 'Enfant Sauvage', img: 'images/Enfant Sauvage.webp', camp: 'Village', count: 0},
    {id: 'Idiot Du Village', name: 'Idiot Du Village', img: 'images/Idiot Du Village.webp', camp: 'Village', count: 0},
    {
        id: 'Infect Père Des Loups',
        name: 'Infect Père Des Loups',
        img: 'images/Infect Père Des Loups.webp',
        camp: 'Loup',
        count: 0
    },
    {
        id: 'Loup-Garou Amnésique',
        name: 'Loup-Garou Amnésique',
        img: 'images/Loup-Garou Amnésique.webp',
        camp: 'Loup',
        count: 0
    },
    {id: 'Loup-Garou Blanc', name: 'Loup-Garou Blanc', img: 'images/Loup-Garou Blanc.webp', camp: 'Loup', count: 0},
    {
        id: 'Loup-Garou Déloyal',
        name: 'Loup-Garou Déloyal',
        img: 'images/Loup-Garou Déloyal.webp',
        camp: 'Loup',
        count: 0
    },
    {
        id: 'Loup-Garou Grimeur',
        name: 'Loup-Garou Grimeur',
        img: 'images/Loup-Garou Grimeur.webp',
        camp: 'Loup',
        count: 0
    },
    // Loup-Garou multiple: par défaut 3, max 3
    {
        id: 'Loup-Garou',
        name: 'Loup-Garou',
        img: 'images/Loup-Garou.webp',
        camp: 'Loup',
        count: 0,
        multiple: true,
        unit: 1,
        max: 3
    },
    {
        id: 'Loup-Garou Hurleur',
        name: 'Loup-Garou Hurleur',
        img: 'images/Loup-Garou Hurleur.webp',
        camp: 'Loup',
        count: 0
    },
    //Le Maire est un rôle unique qui peut être attribué à un joueur du village durant la partie et ne peut donc être sélectionné ici
    {id: 'Montreur d\'Ours', name: 'Montreur d\'Ours', img: "images/Montreur dOurs.webp", camp: 'Village', count: 0},
    {id: 'Petite Fille', name: 'Petite Fille', img: 'images/Petite Fille.webp', camp: 'Village', count: 0},
    {id: 'Pyromane', name: 'Pyromane', img: 'images/Pyromane.webp', camp: 'Solitaire', count: 0},
    {id: 'Renard', name: 'Renard', img: 'images/Renard.webp', camp: 'Village', count: 0},
    {id: 'Rival', name: 'Rival', img: 'images/Rival.webp', camp: 'Village', count: 0},
    {id: 'Salvateur', name: 'Salvateur', img: 'images/Salvateur.webp', camp: 'Village', count: 0},
    {id: 'Servant Dévoué', name: 'Servant Dévoué', img: 'images/Servant Dévoué.webp', camp: 'Village', count: 0},
    // Soeur: si choisie, compte pour 2 joueurs (max 2)
    {id: 'Soeur', name: 'Soeur', img: 'images/Soeur.webp', camp: 'Village', count: 0, multiple: true, unit: 2, max: 2},
    {id: 'Sorcière', name: 'Sorcière', img: 'images/Sorcière.webp', camp: 'Village', count: 0},
    {id: 'Vilain Petit Loup', name: 'Vilain Petit Loup', img: 'images/Vilain Petit Loup.webp', camp: 'Loup', count: 0},
    // Villageois with +/- default 2 and max 2
    {
        id: 'Villageois',
        name: 'Villageois',
        img: 'images/Villageois.webp',
        camp: 'Village',
        count: 0,
        multiple: true,
        unit: 1,
        max: 2
    },
    {id: 'Voleur', name: 'Voleur', img: 'images/Voleur.webp', camp: 'Village', count: 0},
    {id: 'Voyante', name: 'Voyante', img: 'images/Voyante.webp', camp: 'Village', count: 0}
];

function totalRolesSelected() {
    return availableRoles.reduce((s, r) => s + (r.count || 0), 0);
}

function updateRolesTotal() {
    const elTotal = document.getElementById('rolesTotal');
    if (!elTotal) return;
    const total = totalRolesSelected();
    const max = Math.max(0, players.length);
    elTotal.textContent = `${total} / ${max}`;
}

function renderRoles() {
    const ul = document.getElementById('rolesList');
    if (!ul) return;
    ul.innerHTML = '';
    const playersCount = Math.max(0, players.length);

    // Ensure counts respect per-role max
    availableRoles.forEach(r => {
        if (r.max && r.count > r.max) r.count = r.max;
    });

    // Enforce Soeurs consistency (0 or unit)
    ensureSoeursConsistency();

    // Enforce cap: if too many roles selected (e.g., players were removed), deselect newest selections first
    let total = totalRolesSelected();
    if (total > playersCount) {
        // Reduce overflow by reducing counts from most-recently selected roles first
        let overflow = total - playersCount;
        const selected = availableRoles.filter(r => r.count > 0).sort((a, b) => (b.selectedAt || 0) - (a.selectedAt || 0));
        for (let i = 0; i < selected.length && overflow > 0; i++) {
            const r = selected[i];
            // Si le rôle a une unité supérieure à 1, on réduit par paquets d'unité
            if (r.unit && r.unit > 1) {
                const unitsToRemove = Math.min(Math.ceil(overflow / r.unit), Math.ceil(r.count / r.unit));
                const amount = unitsToRemove * r.unit;
                r.count = Math.max(0, r.count - amount);
                overflow = Math.max(0, overflow - amount);
            } else {
                const amount = Math.min(overflow, r.count);
                r.count = Math.max(0, r.count - amount);
                overflow -= amount;
            }
            if (r.count === 0) delete r.selectedAt;
        }
    }

    const filter = document.getElementById('rolesCampFilter') ? document.getElementById('rolesCampFilter').value : 'All';

    const grouped = {};
    availableRoles.forEach(r => {
        grouped[r.camp] = grouped[r.camp] || [];
        grouped[r.camp].push(r);
    });
    const order = ['Village', 'Loup', 'Solitaire'];
    const sections = (filter === 'All') ? order : [filter];

    sections.forEach(sec => {
        if (!grouped[sec]) return;
        const hdr = document.createElement('li');
        hdr.className = 'roles-section';
        hdr.innerHTML = `<strong>${sec}</strong>`;
        ul.appendChild(hdr);
        grouped[sec].forEach(role => {
            const li = document.createElement('li');
            li.className = 'role-item';
            li.dataset.roleId = role.id;

            // determine Rival disabled reason
            const cupidon = availableRoles.find(r => r.id === 'Cupidon' && (r.count || 0) > 0);
            const isRivalDisabled = (role.id === 'Rival' && !cupidon);
            if (isRivalDisabled) {
                li.classList.add('disabled');
                li.setAttribute('aria-disabled', 'true');
                li.title = 'Le Rival nécessite Cupidon';
                // ensure Rival is not counted when Cupidon absent
                if (role.count && role.count > 0) {
                    role.count = 0;
                    delete role.selectedAt;
                }
            } else {
                // remove disabled state fully so controls become interactive
                if (li.classList.contains('disabled')) li.classList.remove('disabled');
                if (li.title) li.removeAttribute('title');
                if (li.getAttribute('aria-disabled')) li.removeAttribute('aria-disabled');
            }

            if (role.multiple) {
                if (role.unit && role.unit > 1) {
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
                <input type="checkbox" class="role-switch-binary" ${isRivalDisabled ? 'disabled aria-disabled="true"' : ''} aria-checked="${role.count ? 'true' : 'false'}" ${role.count ? 'checked' : ''} />
                <span class="slider"></span>
              </label>
            </div>
          `;

                    const sw = li.querySelector('.role-switch-binary');
                    const display = li.querySelector('.role-count');
                    sw.addEventListener('change', () => {
                        const totalNow = totalRolesSelected();
                        const unit = role.unit || 1;
                        // enforce per-role max if present
                        if (role.max && unit > role.max) {
                            sw.checked = false;
                            showToast('Impossible : limite pour ce rôle atteinte.', 'error');
                            return
                        }
                        if (sw.checked) {
                            if (totalNow + unit > playersCount) {
                                sw.checked = false;
                                showToast('Le total des rôles ne peut pas dépasser le nombre de joueurs (' + playersCount + ').', 'error');
                                return
                            }
                            role.count = unit;
                            role.selectedAt = Date.now();
                            li.classList.add('role-selected');
                        } else {
                            role.count = 0;
                            delete role.selectedAt;
                            li.classList.remove('role-selected');
                        }
                        display.textContent = role.count;
                        updateRolesTotal();
                        renderRoles();
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
              <button class="dec" ${isRivalDisabled ? 'disabled' : ''}>−</button>
              <div class="role-count">${role.count}</div>
              <button class="inc" ${isRivalDisabled ? 'disabled' : ''}>+</button>
            </div>
          `;

                    const btnInc = li.querySelector('.inc');
                    const btnDec = li.querySelector('.dec');
                    const display = li.querySelector('.role-count');

                    btnInc.addEventListener('click', () => {
                        const totalNow = totalRolesSelected();
                        const step = role.unit || 1;
                        // enforce per-role max
                        if (role.max && ((role.count || 0) + step) > role.max) {
                            showToast('Le nombre maximum pour ce rôle est de ' + role.max + '.', 'error');
                            return
                        }
                        if (totalNow + step > playersCount) {
                            showToast('Le total des rôles ne peut pas dépasser le nombre de joueurs (' + playersCount + ').', 'error');
                            return
                        }
                        role.count = (role.count || 0) + step;
                        role.selectedAt = Date.now();
                        display.textContent = role.count;
                        updateRolesTotal();
                        renderRoles();
                    });
                    btnDec.addEventListener('click', () => {
                        const step = role.unit || 1;
                        role.count = Math.max(0, (role.count || 0) - step);
                        if (role.count === 0) delete role.selectedAt;
                        display.textContent = role.count;
                        updateRolesTotal();
                        renderRoles();
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
              <input type="checkbox" class="role-switch" ${isRivalDisabled ? 'disabled aria-disabled="true"' : ''} aria-checked="${role.count ? 'true' : 'false'}" ${role.count ? 'checked' : ''} />
              <span class="slider"></span>
            </label>
          </div>
        `;
                const sw = li.querySelector('.role-switch');
                sw.addEventListener('change', () => {
                    const totalNow = totalRolesSelected();
                    if (sw.checked) {
                        if (totalNow >= playersCount) {
                            sw.checked = false;
                            showToast('Le total des rôles ne peut pas dépasser le nombre de joueurs (' + playersCount + ').', 'error');
                            return
                        }
                        role.count = 1;
                        role.selectedAt = Date.now();
                        li.classList.add('role-selected');
                    } else {
                        role.count = 0;
                        delete role.selectedAt;
                        li.classList.remove('role-selected');
                    }
                    updateRolesTotal();
                    renderRoles();
                });
            }

            if (role.count) li.classList.add('role-selected');
            ul.appendChild(li);
        });
    });

    updateRolesTotal();
    // ensure Rival DOM state matches Cupidon selection immediately
    try {
        updateRivalState();
    } catch (e) {
    }
}

// Force-enable/disable Rival DOM based on Cupidon selection (useful for mobile/fast toggles)
function updateRivalState() {
    const cup = availableRoles.find(r => r.id === 'Cupidon' && (r.count || 0) > 0);
    const rivalLi = document.querySelector('.role-item[data-role-id="Rival"]');
    const roleObj = availableRoles.find(r => r.id === 'Rival');
    if (!rivalLi) return;
    if (!cup) {
        rivalLi.classList.add('disabled');
        rivalLi.setAttribute('aria-disabled', 'true');
        rivalLi.title = 'Le Rival nécessite Cupidon';
        rivalLi.querySelectorAll('input,button').forEach(el => el.disabled = true);
        if (roleObj && roleObj.count > 0) {
            roleObj.count = 0;
            delete roleObj.selectedAt;
        }
        const countEl = rivalLi.querySelector('.role-count');
        if (countEl) countEl.textContent = 0;
    } else {
        rivalLi.classList.remove('disabled');
        if (rivalLi.title) rivalLi.removeAttribute('title');
        if (rivalLi.getAttribute('aria-disabled')) rivalLi.removeAttribute('aria-disabled');
        rivalLi.querySelectorAll('input,button').forEach(el => el.disabled = false);
    }
}

// bind filter
const rolesCampFilter = document.getElementById('rolesCampFilter');
if (rolesCampFilter) rolesCampFilter.addEventListener('change', renderRoles);

// call on load
document.addEventListener('DOMContentLoaded', () => {
    // Only render roles now if players already exist (prevents showing 0 players before loadState runs)
    if (players.length > 0 && typeof renderRoles === 'function') renderRoles();
    if (typeof updateRolesTotal === 'function') updateRolesTotal();
});

// --- Import / Export handlers for the settings page ---
function buildExportPayload() {
    const rolesState = availableRoles.map(r => ({id: r.id, count: r.count || 0, selectedAt: r.selectedAt || null}));
    // include players' assigned role (if any) in export
    return {players: players.map(p => ({id: p.id, name: p.name, role: p.role || null})), roles: rolesState, options};
}

document.addEventListener('DOMContentLoaded', () => {
    const exportBtn = document.getElementById('exportJsonBtn');
    const importInput = document.getElementById('importJsonInputPage');

    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            try {
                const payload = buildExportPayload();
                const blob = new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'werewolf_export.json';
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                showToast('Export JSON téléchargé', 'success');
            } catch (e) {
                showToast('Erreur lors de l\'export', 'error');
                console.error(e);
            }
        });
    }

    if (importInput) {
        importInput.addEventListener('change', (ev) => {
            const f = ev.target.files && ev.target.files[0];
            if (!f) return;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const parsed = JSON.parse(String(reader.result));
                    // basic validation
                    if (!parsed || typeof parsed !== 'object') {
                        showToast('Import JSON : format invalide', 'error');
                        return;
                    }
                    if (!Array.isArray(parsed.players) || !Array.isArray(parsed.roles) || typeof parsed.options !== 'object') {
                        showToast('Import JSON : structure manquante', 'error');
                        return;
                    }
                    // apply players (include role if present)
                    players.length = 0;
                    parsed.players.forEach(p => {
                        if (p && p.id && p.name) players.push({
                            id: String(p.id),
                            name: String(p.name),
                            role: p.role || null
                        });
                    });
                    // apply roles
                    parsed.roles.forEach(rs => {
                        const r = availableRoles.find(x => x.id === rs.id);
                        if (r) r.count = typeof rs.count === 'number' ? rs.count : 0;
                    });
                    // Ensure Soeurs consistency after import
                    ensureSoeursConsistency();
                    // apply options
                    Object.assign(options, parsed.options || {});
                    // re-render
                    renderPlayerList();
                    renderPlayerCircle();
                    renderRoles();
                    updateRolesTotal();
                    saveState();
                    // hide distribute button if roles already assigned
                    try {
                        const btn = document.getElementById('distributeRolesBtn');
                        if (btn) {
                            const hasAssigned = players.some(p => p.role);
                            btn.style.display = hasAssigned ? 'none' : '';
                        }
                    } catch (e) {
                    }
                    try {
                        const hintEl = document.getElementById('distributeHint');
                        if (hintEl) {
                            const hasAssigned = players.some(p => p.role);
                            hintEl.style.display = hasAssigned ? 'none' : '';
                        }
                    } catch (e) {
                    }
                    showToast('Import réussi', 'success');
                } catch (err) {
                    showToast('Import JSON invalide', 'error');
                    console.error(err);
                }
                importInput.value = '';
            };
            reader.readAsText(f);
        });
    }
});

// --- Player list (menu) ---
function renderPlayerList() {
    const ul = document.getElementById('playerList');
    if (!ul) return;
    ul.innerHTML = '';
    players.forEach(p => {
        const li = document.createElement('li');
        li.className = 'player-list-item';
        li.dataset.id = p.id;
        const roleObj = p.role ? availableRoles.find(r => r.id === p.role) : null;
        const roleImgHtml = roleObj ? `<img src="${roleObj.img}" class="player-role-small" alt="${escapeHtml(roleObj.name)}" width="40" height="40">` : '';
        // show a heart if the player is in a couple
        const heartHtml = p.coupleWith ? `<span class="couple-heart" style="color:#e25555;margin-left:6px">❤</span>` : '';
        // player-meta stacks role image (if any) above the player's name
        const meta = `<div class="player-meta">${roleImgHtml}<div class="player-name">${escapeHtml(p.name)}${heartHtml}</div></div>`;
        const roleBadge = roleObj ? `<span class="role-badge">${escapeHtml(roleObj.name)}</span>` : '';
        li.innerHTML = `${meta}${roleBadge}<span class="handle">⇅</span>`;
        ul.appendChild(li);

        // add per-item click handler: clicking the line (except the handle) will remove the player
        li.addEventListener('click', (ev) => {
            // if Cupidon selection is active, clicks in the list should not remove players
            if (game && game.awaitingCupidon) {
                showToast('Sélection Cupidon active — cliquez 2 joueurs dans le cercle pour former un couple.', 'info');
                return;
            }
            // ignore clicks starting from the handle (drag)
            if (ev.target && ev.target.closest && ev.target.closest('.handle')) return;
            const id = li.dataset.id;
            if (!id) return;
            const idx = players.findIndex(p => p.id === id);
            if (idx === -1) return;
            const pname = players[idx].name || 'joueur';
            if (!confirm(`Supprimer le joueur "${pname}" ?`)) return;

            // Before removing a player from the list, treat it as a death for mechanics (e.g. Enfant Sauvage)
            try {
                transformEnfantIfModelDied(id);
            } catch (e) {
            }

            players.splice(idx, 1);
            // re-render and persist
            renderPlayerList();
            renderPlayerCircle();
            if (typeof renderRoles === 'function') renderRoles();
            if (typeof updateRolesTotal === 'function') updateRolesTotal();
            saveState();
        });
    });
    // init sortable
    if (window.Sortable) {
        if (ul._sortable) {
            try {
                ul._sortable.destroy();
            } catch (e) {
            }
        }
        ul._sortable = Sortable.create(ul, {
            animation: 150,
            handle: '.handle',
            onEnd: () => {
                const ids = Array.from(ul.children).map(li => li.dataset.id);
                const ordered = ids.map(id => players.find(p => p.id === id)).filter(Boolean);
                players.length = 0;
                players.push(...ordered);
                renderPlayerCircle();
                saveState();
            }
        });
    }

    // suppression gérée par les handlers par-élément (plus fiable)
}

// utility : shuffle array in-place (Fisher-Yates)
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Distribute roles randomly to players (must match counts)
function distributeRoles() {
    const n = players.length;
    if (n === 0) {
        showToast('Ajoutez des joueurs avant de distribuer.', 'error');
        return;
    }
    const total = totalRolesSelected();
    if (total !== n) {
        showToast(`Le total des rôles sélectionnés (${total}) doit être égal au nombre de joueurs (${n}).`, 'error');
        return;
    }

    // Normalize Soeurs before building the pool
    ensureSoeursConsistency();

    // build pool of role ids expanded by count
    const pool = [];
    availableRoles.forEach(r => {
        const c = r.count || 0;
        for (let i = 0; i < c; i++) pool.push(r.id);
    });

    if (pool.length !== n) {
        showToast('Erreur interne : pool de rôles incohérent.', 'error');
        return;
    }
    shuffle(pool);

    // clear any previous couple state and Cupidon flags
    players.forEach(p => {
        delete p.coupleWith;
        delete p.modelId;
        delete p.transformed;
    });
    game.cupidonDone = false;
    game.awaitingCupidon = false;
    game.cupidonSelections = [];
    // clear Enfant Sauvage state
    game.enfantSauvageDone = false;
    game.awaitingEnfantSauvage = false;
    game.enfantSauvageSelection = null;
    // clear Salvateur state
    game.salvateurDone = false;
    game.awaitingSalvateur = false; // last protected kept across nights
    // clear Détective state
    game.detectiveDone = false;
    game.awaitingDetective = false;
    game.detectiveSelections = [];
    game.detectivePlayerId = null;
    // clear Voyante state
    game.voyanteDone = false;
    game.awaitingVoyante = false;
    game.voyanteSelection = null;

    // assign
    players.forEach((p, idx) => {
        p.role = pool[idx];
    });

    // initialize game state: start at Day 1 (we don't start in night)
    game.phase = 'day';
    game.day = 1;
    game.night = 0;
    game.running = true;
    game.readyToWake = false;
    game.sleeping = false;
    game.pendingNightActions = [];

    renderPlayerList();
    renderPlayerCircle();
    saveState();
    // hide distribute button now that roles are assigned
    const btn = document.getElementById('distributeRolesBtn');
    if (btn) btn.style.display = 'none';
    // hide the hint text as well
    const hint = document.getElementById('distributeHint');
    if (hint) hint.style.display = 'none';
    showToast('Rôles distribués', 'success');

    // initialize game UI
    try {
        console.log('[MJ] distributeRoles: initializing game UI');

        // ensure Game page is visible (in case distribution called from elsewhere)
        try {
            const gp = document.getElementById('gamePage');
            if (gp) gp.classList.remove('hidden');
            document.dispatchEvent(new CustomEvent('pageChanged', {detail: 'gamePage'}));
        } catch (e) {/* ignore */
        }

        const line = document.getElementById('calendarLine');
        const cur = document.getElementById('currentAction');
        const nextBtn = document.getElementById('nextActionBtn');

        // ensure any inline `display:none` is removed before applying new styles
        removeInlineDisplayNone(line);
        removeInlineDisplayNone(cur);
        removeInlineDisplayNone(nextBtn);

        // update calendar display to show "Jour 1"
        updateCalendarDisplay();

        if (line) {
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
        if (cur) {
            cur.style.display = 'block';
            cur.style.padding = '4px 8px';
            cur.style.background = 'transparent';
            cur.style.fontSize = '14px';
            cur.style.color = '#e6e6e6';
            cur.style.zIndex = 30;
            // show the first action: day start
            try {
                cur.textContent = "Le village est réveillé";
            } catch (e) {
            }
        }
        if (nextBtn) {
            nextBtn.style.display = 'inline-block';
        }

    } catch (e) {
        console.warn('distributeRoles: UI init failed', e);
    }
}

// --- Game helpers: calendar and night action flow ---
function updateCalendarDisplay() {
    const cal = document.getElementById('calendarLine');
    if (!cal) return;
    if (game.phase === 'day') cal.textContent = `Jour ${game.day || 1}`;
    else cal.textContent = `Nuit ${game.night || 0}`;
}

function startNight() {
    // increment night counter and prepare night actions
    game.night = (game.night || 0) + 1;
    game.phase = 'night';
    game.readyToWake = false;
    game.pendingNightActions = [];
    // Cupidon plays on night 1 only
    if (isRoleInGame('Cupidon') && game.night === 1 && !game.cupidonDone) {
        game.pendingNightActions.push('Cupidon');
    }
    // Enfant Sauvage chooses a model on night 1
    if (isRoleInGame('Enfant Sauvage') && game.night === 1 && !game.enfantSauvageDone) {
        game.pendingNightActions.push('EnfantSauvage');
    }
    // Soeurs se reconnaissent la nuit 1
    if (isRoleInGame('Soeur') && game.night === 1 && !game.soeursDone) {
        game.pendingNightActions.push('Soeurs');
    }
    // Salvateur joue toutes les nuits s'il est présent
    if (isRoleInGame('Salvateur')) {
        game.pendingNightActions.push('Salvateur');
    }
    // Détective joue toutes les nuits s'il est présent
    if (isRoleInGame('Détective')) {
        game.pendingNightActions.push('Detective');
    }
    // Voyante joue toutes les nuits s'il est présent
    if (isRoleInGame('Voyante')) {
        game.pendingNightActions.push('Voyante');
    }
    // TODO: push other night actions here based on roles present (Loups, Voyante, Salvateur...)

    updateCalendarDisplay();

    // trace pending actions
    try { traceLog('startNight.pendingActions', {night: game.night, pending: game.pendingNightActions}); } catch (e) {}

    // start first night action if present
    if (game.pendingNightActions.length > 0) {
        const next = game.pendingNightActions[0];
        const cur = document.getElementById('currentAction');
        if (next === 'Cupidon') {
            game.awaitingCupidon = true;
            if (cur) cur.textContent = "Cupidon : sélectionnez 2 joueurs pour former un couple (cliquez sur leurs noms dans le cercle)";
            showToast('Sélection Cupidon active — cliquez 2 joueurs dans le cercle', 'info', 6000);
            renderPlayerCircle();
        } else if (next === 'Enfant Sauvage') {
            game.awaitingEnfantSauvage = true;
            if (cur) cur.textContent = "Enfant Sauvage : sélectionnez un modèle (cliquez sur un joueur dans le cercle, l'Enfant ne peut pas se choisir lui-même)";
            showToast('Sélection Enfant Sauvage active — cliquez un joueur dans le cercle (sauf l\'Enfant)', 'info', 6000);
            renderPlayerCircle();
        } else if (next === 'Soeurs') {
            // Do not auto-run recognition here. Wait for the MJ to press "prochaine action".
            game.awaitingSoeurs = true;
            if (cur) cur.textContent = "Soeurs : reconnaissance (appuyez sur Prochaine action pour appeler les Soeurs)";
            // show circle so the MJ sees players (no automatic action)
            renderPlayerCircle();
        } else if (next === 'Detective') {
            // interactive: Détective choisit deux joueurs à comparer
            if (!isRoleInGame('Détective')) {
                finishNightAction('Detective');
            } else {
                game.awaitingDetective = true;
                game.detectiveSelections = [];
                // record the detecting player's id so we reliably prevent self-selection
                const detPlayer = players.find(pl => pl.role === 'Détective');
                game.detectivePlayerId = detPlayer ? detPlayer.id : null;
                if (cur) cur.textContent = "Détective : comparez le camp de 2 joueurs (cliquez sur deux joueurs dans le cercle)";
                showToast('Sélection Détective active — cliquez 2 joueurs dans le cercle', 'info', 6000);
                renderPlayerCircle();
            }
        } else if (next === 'Salvateur') {
            // interactive: Salvateur chooses someone to protect for this night
            if (!isRoleInGame('Salvateur')) {
                finishNightAction('Salvateur');
            } else {
                game.awaitingSalvateur = true;
                if (cur) cur.textContent = "Salvateur : sélectionnez un joueur à protéger cette nuit (peut se protéger lui-même, pas la même personne deux nuits de suite)";
                showToast('Sélection Salvateur active — cliquez sur un joueur dans le cercle', 'info', 6000);
                renderPlayerCircle();
            }
        } else if (next === 'Voyante') {
            // defensive cleanup: ensure no lingering detective selections/classes remain
            try { game.detectiveSelections = []; game.voyanteSelection = null; clearActionSelections(); } catch (e) {}
            // interactive: Voyante choisit un joueur pour voir son rôle
            game.awaitingVoyante = true;
            game.voyanteSelection = null;
            if (cur) cur.textContent = "Voyante : cliquez sur un joueur pour voir son rôle (le rôle sera révélé au MJ)";
            renderPlayerCircle();
        } else {
            // nothing to do, wake immediately
            const cur = document.getElementById('currentAction');
            if (next === 'Cupidon') {
                game.awaitingCupidon = true;
                if (cur) cur.textContent = "Cupidon : sélectionnez 2 joueurs pour former un couple (cliquez sur leurs noms dans le cercle)";
                renderPlayerCircle();
            } else if (next === 'EnfantSauvage') {
                game.awaitingEnfantSauvage = true;
                if (cur) cur.textContent = "Enfant Sauvage : sélectionnez un modèle (cliquez sur un joueur dans le cercle, l'Enfant ne peut pas se choisir lui-même)";
                renderPlayerCircle();
            } else if (next === 'Soeurs') {
                // Do not auto-run recognition here. Wait for the MJ to press "prochaine action".
                game.awaitingSoeurs = true;
                if (cur) cur.textContent = "Soeurs : reconnaissance (appuyez sur Prochaine action pour appeler les Soeurs)";
                // show circle so the MJ sees players (no automatic action)
                renderPlayerCircle();
            } else if (next === 'Salvateur') {
                game.awaitingSalvateur = true;
                if (cur) cur.textContent = "Salvateur : sélectionnez un joueur à protéger cette nuit (peut se protéger lui-même, pas la même personne deux nuits de suite)";
                renderPlayerCircle();
            } else if (next === 'Detective') {
                // interactive: Détective choisit deux joueurs à comparer
                game.awaitingDetective = true;
                game.detectiveSelections = [];
                if (cur) cur.textContent = "Détective : comparez le camp de 2 joueurs (cliquez sur deux joueurs dans le cercle)";
                renderPlayerCircle();
            } else if (next === 'Voyante') {
                // interactive: Voyante choisit un joueur pour voir son rôle
                game.awaitingVoyante = true;
                game.voyanteSelection = null;
                if (cur) cur.textContent = "Voyante : cliquez sur un joueur pour voir son rôle (le rôle sera révélé au MJ)";
                renderPlayerCircle();
            }
        }
    }
}

function finishNightAction(actionId) {
    // short click lock to prevent immediate click-through from the previous action
    try { game.clickLock = true; setTimeout(() => { if (game) game.clickLock = false; }, 350); } catch (e) {}

    // trace start of finish
    try { traceLog('finishNightAction.start', {actionId: actionId, pendingBefore: (Array.isArray(game.pendingNightActions)? [...game.pendingNightActions] : game.pendingNightActions), clickLock: !!game.clickLock, justFinishedAction: game.justFinishedAction || null}); } catch (e) {}

    if (actionId === 'Cupidon') {
        game.cupidonDone = true;
        game.awaitingCupidon = false;
    }
    if (actionId === 'EnfantSauvage') {
        game.enfantSauvageDone = true;
        game.awaitingEnfantSauvage = false;
    }
    if (actionId === 'Soeurs') {
        game.soeursDone = true;
        game.awaitingSoeurs = false;
    }
    if (actionId === 'Salvateur') {
        game.salvateurDone = true;
        game.awaitingSalvateur = false;
    }
    if (actionId === 'Detective') {
        game.detectiveDone = true;
        game.awaitingDetective = false;
        game.detectivePlayerId = null;
        // defensive cleanup: ensure no lingering selections or classes remain which could leak into Voyante
        try {
            game.detectiveSelections = [];
            // prevent immediate click-through to the next action (e.g., Voyante)
            try { game.clickLock = true; } catch (e) {}
            try { game.justFinishedAction = 'Detective'; } catch (e) {}
            setTimeout(() => { try { if (game) game.clickLock = false; } catch (e) {} }, 350);
            setTimeout(() => { try { if (game && game.justFinishedAction === 'Detective') game.justFinishedAction = null; } catch (e) {} }, 450);
            // remove visual selection classes from DOM
            try { clearActionSelections(); } catch (e) {}
            try { traceLog && traceLog('finishNightAction.detectiveCleanup', {}); } catch (e) {}
        } catch (e) {}
    }
    if (actionId === 'Voyante') {
        game.voyanteDone = true;
        game.awaitingVoyante = false;
        game.voyanteSelection = null;
    }
    if (Array.isArray(game.pendingNightActions)) {
        const idx = game.pendingNightActions.indexOf(actionId);
        if (idx !== -1) game.pendingNightActions.splice(idx, 1);
    }

    // proceed to next action or prepare wake
    if (game.pendingNightActions && game.pendingNightActions.length > 0) {
        const next = game.pendingNightActions[0];
        // trace the next action
        try { traceLog('finishNightAction.next', {next: next, pendingAfter: [...game.pendingNightActions]}); } catch (e) {}
        const cur = document.getElementById('currentAction');
        if (next === 'Cupidon') {
            game.awaitingCupidon = true;
            if (cur) cur.textContent = "Cupidon : sélectionnez 2 joueurs pour former un couple (cliquez sur leurs noms dans le cercle)";
            renderPlayerCircle();
        } else if (next === 'EnfantSauvage') {
            game.awaitingEnfantSauvage = true;
            if (cur) cur.textContent = "Enfant Sauvage : sélectionnez un modèle (cliquez sur un joueur dans le cercle, l'Enfant ne peut pas se choisir lui-même)";
            renderPlayerCircle();
        } else if (next === 'Soeurs') {
            // Do not auto-run recognition here. Wait for the MJ to press "prochaine action".
            game.awaitingSoeurs = true;
            if (cur) cur.textContent = "Soeurs : reconnaissance (appuyez sur Prochaine action pour appeler les Soeurs)";
            // show circle so the MJ sees players (no automatic action)
            renderPlayerCircle();
        } else if (next === 'Salvateur') {
            game.awaitingSalvateur = true;
            if (cur) cur.textContent = "Salvateur : sélectionnez un joueur à protéger cette nuit (peut se protéger lui-même, pas la même personne deux nuits de suite)";
            renderPlayerCircle();
        } else if (next === 'Detective') {
            // interactive: Détective choisit deux joueurs à comparer
            game.awaitingDetective = true;
            game.detectiveSelections = [];
            if (cur) cur.textContent = "Détective : comparez le camp de 2 joueurs (cliquez sur deux joueurs dans le cercle)";
            renderPlayerCircle();
        } else if (next === 'Voyante') {
            // defensive cleanup: ensure no lingering detective selections/classes remain
            try { game.detectiveSelections = []; game.voyanteSelection = null; clearActionSelections(); } catch (e) {}
            // interactive: Voyante choisit un joueur pour voir son rôle
            game.awaitingVoyante = true;
            game.voyanteSelection = null;
            if (cur) cur.textContent = "Voyante : cliquez sur un joueur pour voir son rôle (le rôle sera révélé au MJ)";
            renderPlayerCircle();
        }
    } else {
        const cur = document.getElementById('currentAction');
        if (cur) cur.textContent = 'Le village se réveille';
        game.readyToWake = true;
    }
    renderPlayerList();
    renderPlayerCircle();
}

// --- Couple management (Cupidon) ---
// replace in-circle finalization to call finishNightAction('Cupidon')
function renderPlayerCircle() {
    // clean any residual visual selections before re-rendering
    try { clearActionSelections(); } catch (e) {}

    try { traceLog('renderPlayerCircle.start', {night: game.night, awaitingCupidon: !!game.awaitingCupidon, awaitingEnfantSauvage: !!game.awaitingEnfantSauvage, awaitingSalvateur: !!game.awaitingSalvateur, awaitingDetective: !!game.awaitingDetective, awaitingVoyante: !!game.awaitingVoyante, pending: Array.isArray(game.pendingNightActions)? [...game.pendingNightActions] : game.pendingNightActions}); } catch (e) {}

    const container = document.getElementById('playerCircle');
    if (!container) return;
    container.innerHTML = '';
    const n = players.length;
    if (n === 0) return;

    // compute radius based on parent area
    const area = container.closest('.circle-area') || container;
    const rect = area.getBoundingClientRect();
    const size = Math.min(rect.width || 400, rect.height || 400) || 400;
    const radius = Math.max(60, Math.floor(size / 2) - 40);

    // create items around the circle (no player in the center)
    players.forEach((p) => {
        const li = document.createElement('li');
        li.className = 'circle-item player';
        li.dataset.id = p.id;
        const roleObj = p.role ? availableRoles.find(r => r.id === p.role) : null;
        const roleImg = roleObj ? `<img src="${roleObj.img}" class="role-avatar-chip" alt="${escapeHtml(roleObj.name)}" width="40" height="40">` : '';
        // add a small heart marker to the chip if player is coupled
        const coupleHeartHtml = p.coupleWith ? `<span class="couple-heart" style="position:absolute;top:6px;right:8px;color:#e25555;font-size:18px">❤</span>` : '';
        // no visual marker for Enfant's model (spec: ne pas afficher d'étoile)
        const modelMarkerHtml = '';
        li.innerHTML = `<div class="chip" style="position:relative">${roleImg}${coupleHeartHtml}${modelMarkerHtml}<div class="name">${escapeHtml(p.name)}</div></div>`;
        li.style.position = 'absolute';
        li.style.left = '50%';
        li.style.top = '50%';
        li.style.transform = 'translate(-50%,-50%)';
        container.appendChild(li);

        // If awaiting Cupidon selection, allow clicking players in the circle to select couple
        li.addEventListener('click', (ev) => {
            // log every click attempt on circle with current state
            try { traceLog('playerCircle.clickAttempt', {playerId: p.id, playerName: p.name, night: game.night, awaitingCupidon: !!game.awaitingCupidon, awaitingEnfantSauvage: !!game.awaitingEnfantSauvage, awaitingSalvateur: !!game.awaitingSalvateur, awaitingDetective: !!game.awaitingDetective, awaitingVoyante: !!game.awaitingVoyante, clickLock: !!game.clickLock, justFinishedAction: game.justFinishedAction || null}); } catch(e) {}

            // global click guard: ignore clicks while temporary clickLock is active
            if (game && game.clickLock) {
                ev.stopPropagation(); ev.preventDefault();
                try { traceLog('playerCircle.clickBlocked', {reason: 'clickLock', playerId: p.id}); } catch (e) {}
                return;
            }
            // consume a residual click that comes immediately after Salvateur selection
            if (game && (game.justFinishedAction === 'Salvateur' || game.justFinishedAction === 'Detective')) {
                const prev = game.justFinishedAction;
                game.justFinishedAction = null;
                ev.stopPropagation(); ev.preventDefault();
                try { traceLog('playerCircle.clickConsumed', {reason: `justFinishedAction==${prev}`, playerId: p.id}); } catch (e) {}
                showToast('Clic ignoré (résidu de la sélection précédente). Re-sélectionnez.', 'info');
                return;
            }
            // Cupidon flow
            if (game && game.awaitingCupidon) {
                ev.stopPropagation();
                ev.preventDefault();
                // prevent selecting the Cupidon themself
                const cup = players.find(pl => pl.role === 'Cupidon');
                if (cup && cup.id === p.id) {
                    showToast('Cupidon ne peut pas être choisi.', 'error');
                    return;
                }

                game.cupidonSelections = game.cupidonSelections || [];
                // toggle selection
                const idx = game.cupidonSelections.indexOf(p.id);
                if (idx !== -1) {
                    // already selected -> unselect
                    game.cupidonSelections.splice(idx, 1);
                    li.classList.remove('selected-for-cupidon');
                    return;
                }
                if (game.cupidonSelections.length >= 2) {
                    showToast('Vous avez déjà sélectionné 2 joueurs.', 'info');
                    return;
                }
                game.cupidonSelections.push(p.id);
                li.classList.add('selected-for-cupidon');

                // if two selected, finalize couple
                if (game.cupidonSelections.length === 2) {
                    const [idA, idB] = game.cupidonSelections;
                    const pa = players.find(x => x.id === idA);
                    const pb = players.find(x => x.id === idB);
                    if (!pa || !pb) {
                        showToast('Sélection invalide', 'error');
                        game.cupidonSelections = [];
                        renderPlayerCircle();
                        return;
                    }
                    // record couple in the players data
                    pa.coupleWith = pb.id;
                    pb.coupleWith = pa.id;
                    // finalize via finishNightAction to continue night sequence
                    try {
                        finishNightAction('Cupidon');
                    } catch (e) {
                        // fallback if finishNightAction not defined
                        game.awaitingCupidon = false;
                        game.cupidonDone = true;
                        game.cupidonSelections = [];
                    }
                    // clear temporary selections
                    game.cupidonSelections = [];
                    showToast(`Couple formé : ${pa.name} ❤ ${pb.name}`, 'success');
                    // re-render lists and circle to show hearts and remove selection styles
                    renderPlayerList();
                    renderPlayerCircle();
                }
                return;
            }

            // Enfant Sauvage flow
            if (game && game.awaitingEnfantSauvage) {
                ev.stopPropagation();
                ev.preventDefault();
                const enfant = players.find(pl => pl.role === 'Enfant Sauvage');
                if (!enfant) {
                    showToast('Aucun Enfant Sauvage présent.', 'error');
                    finishNightAction('EnfantSauvage');
                    return;
                }
                // cannot select the Enfant themselves as model
                if (enfant.id === p.id) {
                    showToast('L\'Enfant Sauvage ne peut pas se choisir lui-même.', 'error');
                    return;
                }

                // record the selected model on the Enfant player object
                enfant.modelId = p.id;
                // Do NOT mark the model visually (specifically requested)

                // Defensive: clear awaiting flag and remove pending action (robustify flow)
                try {
                    game.awaitingEnfantSauvage = false;
                    game.enfantSauvageDone = true;
                    if (Array.isArray(game.pendingNightActions)) {
                        game.pendingNightActions = game.pendingNightActions.filter(a => a !== 'EnfantSauvage');
                    }
                } catch (e) {/* ignore */
                }

                // finalize the Enfant action
                try {
                    finishNightAction('EnfantSauvage');
                } catch (e) {
                    game.enfantSauvageDone = true;
                    game.awaitingEnfantSauvage = false;
                }
                game.enfantSauvageSelection = {enfantId: enfant.id, modelId: p.id};
                showToast(`Enfant Sauvage : ${enfant.name} a choisi comme modèle ${p.name}`, 'success');
                renderPlayerList();
                renderPlayerCircle();
            }

            // Salvateur flow
            if (game && game.awaitingSalvateur) {
                // consume and neutralize the click immediately to avoid it falling through to the next action
                try { ev.stopImmediatePropagation && ev.stopImmediatePropagation(); } catch (e) {}
                ev.stopPropagation();
                ev.preventDefault();
                try { traceLog('Salvateur.selection.start', {playerId: p.id, playerName: p.name, clickLock: !!game.clickLock}); } catch (e) {}

                // Find the Salvateur player (must exist)
                const salv = players.find(pl => pl.role === 'Salvateur');
                if (!salv) {
                    showToast('Aucun Salvateur présent.', 'error');
                    finishNightAction('Salvateur');
                    return;
                }
                // The Salvateur cannot choose the same person as last night
                const last = game.salvateurLastProtected || null;
                if (last && last === p.id) {
                    showToast('Le Salvateur ne peut pas protéger la même personne deux nuits de suite.', 'error');
                    return;
                }
                // Record protection
                p.protectedBySalvateur = true;
                p.protectedUntilNight = game.night;
                game.salvateurLastProtected = p.id;
                // set a short click lock to prevent the same physical click falling through to next action
                try { game.clickLock = true; setTimeout(() => { if (game) game.clickLock = false; }, 350); } catch (e) {}

                // mark that Salvateur just finished BEFORE calling finishNightAction so any subsequent immediate click can be detected
                try { game.justFinishedAction = 'Salvateur'; } catch (e) {}
                try { traceLog('Salvateur.justFinishedSet', {justFinishedAction: game.justFinishedAction}); } catch (e) {}

                // finalize asynchronously so the current click event completes and cannot fall through to next action
                try {
                    setTimeout(() => {
                        try {
                            finishNightAction('Salvateur');
                        } catch (e) {
                            try { game.salvateurDone = true; game.awaitingSalvateur = false; } catch (err) {}
                        }
                    }, 8);
                } catch (e) {}
                 // clear the justFinishedAction shortly after to allow future clicks
                 try { setTimeout(() => { if (game && game.justFinishedAction === 'Salvateur') game.justFinishedAction = null; }, 450); } catch (e) {}

                // Defensive cleanup: ensure no lingering selections/classes remain which could block the next action
                try {
                    game.awaitingSalvateur = false;
                    game.detectiveSelections = [];
                    game.cupidonSelections = [];
                    game.voyanteSelection = null;
                    // clear any visual selection classes left on DOM
                    clearActionSelections();
                    try { traceLog('Salvateur.selection.finishedCleanup', {playerId: p.id}); } catch (e) {}
                } catch (e) {}

                showToast(`Salvateur : ${p.name} est protégé cette nuit.`, 'success');
                renderPlayerList();
                renderPlayerCircle();
            }

            // Détective flow
            if (game && game.awaitingDetective) {
                ev.stopPropagation();
                ev.preventDefault();
                // determine detective id (use stored id if present)
                const detId = game.detectivePlayerId || (players.find(pl => pl.role === 'Détective') || {}).id;
                try { traceLog('Detective.selection.attempt', {clickedPlayerId: p.id, clickedPlayerName: p.name, detectiveId: detId, night: game.night, pending: Array.isArray(game.pendingNightActions)? [...game.pendingNightActions] : game.pendingNightActions}); } catch (e) {}
                // ensure there is a Detective in the game
                if (!detId) {
                    showToast('Aucun Détective présent.', 'error');
                    try { traceLog('Detective.selection.noDetective', {}); } catch (e) {}
                    finishNightAction('Detective');
                    return;
                }
                // Prevent selecting the Detective themself
                if (p.id === detId) {
                    showToast('Le Détective ne peut pas être testé. Choisissez deux autres joueurs.', 'error');
                    // visually mark the detective as non-selectable
                    li.classList.add('detective-unselectable');
                    try { traceLog('Detective.selection.blockedSelf', {playerId: p.id, playerName: p.name}); } catch (e) {}
                    return;
                }

                game.detectiveSelections = game.detectiveSelections || [];
                // toggle selection (but never allow selecting the Detective)
                const idx = game.detectiveSelections.indexOf(p.id);
                if (idx !== -1) {
                    game.detectiveSelections.splice(idx, 1);
                    li.classList.remove('selected-for-detective');
                    try { traceLog('Detective.selection.removed', {playerId: p.id, remaining: [...game.detectiveSelections]}); } catch (e) {}
                    return;
                }
                if (game.detectiveSelections.length >= 2) {
                    showToast('Vous avez déjà sélectionné 2 joueurs.', 'info');
                    try { traceLog('Detective.selection.tooMany', {selections: [...game.detectiveSelections]}); } catch (e) {}
                    return;
                }
                // Prevent selecting the same player twice (defensive)
                if (game.detectiveSelections.includes(p.id)) {
                    showToast('Ce joueur est déjà sélectionné.', 'info');
                    return;
                }
                // push selection
                game.detectiveSelections.push(p.id);
                li.classList.add('selected-for-detective');
                try { traceLog('Detective.selection.added', {playerId: p.id, selections: [...game.detectiveSelections]}); } catch (e) {}

                // If only one other non-detective player exists, warn
                const nonDetCount = players.filter(x => x.id !== detId).length;
                if (nonDetCount < 2) {
                    showToast('Impossible : pas assez de joueurs non-Détective à comparer.', 'error');
                    game.detectiveSelections = [];
                    renderPlayerCircle();
                    try { traceLog('Detective.selection.notEnoughPlayers', {nonDetCount}); } catch (e) {}
                    return;
                }

                if (game.detectiveSelections.length === 2) {
                    const [idA, idB] = game.detectiveSelections;
                    if (idA === idB) {
                        showToast('Sélection invalide : choisissez deux joueurs distincts.', 'error');
                        game.detectiveSelections = [];
                        renderPlayerCircle();
                        try { traceLog('Detective.selection.samePlayer', {}); } catch (e) {}
                        return;
                    }
                    const pa = players.find(x => x.id === idA);
                    const pb = players.find(x => x.id === idB);
                    if (!pa || !pb) {
                        showToast('Sélection invalide', 'error');
                        game.detectiveSelections = [];
                        renderPlayerCircle();
                        try { traceLog('Detective.selection.invalidPlayers', {idA, idB}); } catch (e) {}
                        return;
                    }
                    // Safety: ensure neither selected player is the Detective
                    if (pa.id === detId || pb.id === detId) {
                        showToast('Le Détective ne peut pas être testé. Choisissez deux joueurs différents du Détective.', 'error');
                        game.detectiveSelections = [];
                        renderPlayerCircle();
                        try { traceLog('Detective.selection.includedDetective', {detId, pa: pa.id, pb: pb.id}); } catch (e) {}
                        return;
                    }
                    // determine detective view camps
                    const campA = getDetectiveViewOfPlayer(pa);
                    const campB = getDetectiveViewOfPlayer(pb);
                    // Normalize camps to main categories: 'Village', 'Loup', 'Solitaire' (null -> unknown)
                    const same = (campA && campB && campA === campB);
                    try { traceLog('Detective.selection.result', {playerA: {id: pa.id, name: pa.name, camp: campA}, playerB: {id: pb.id, name: pb.name, camp: campB}, same}); } catch (e) {}
                    if (same) {
                        showToast(`Détective : mêmes camps (${campA}) 👍`, 'success', 5000);
                    } else {
                        showToast(`Détective : camps différents (${campA || 'inconnu'} / ${campB || 'inconnu'}) 👎`, 'info', 6000);
                    }
                    // finalize
                    try {
                        finishNightAction('Detective');
                    } catch (e) {
                        game.detectiveDone = true;
                        game.awaitingDetective = false;
                    }
                    game.detectiveSelections = [];
                    renderPlayerList();
                    renderPlayerCircle();
                }
                // selection handled; exit handler
            }

            // Voyante flow
            if (game && game.awaitingVoyante) {
                ev.stopPropagation();
                ev.preventDefault();
                // determine voyante id (use stored id if present)
                const voyanteId = players.find(pl => pl.role === 'Voyante')?.id;
                // ensure there is a Voyante in the game
                if (!voyanteId) {
                    showToast('Aucune Voyante présente.', 'error');
                    finishNightAction('Voyante');
                    return;
                }
                // Prevent selecting the Voyante themself
                if (p.id === voyanteId) {
                    showToast('La Voyante ne peut pas tester son propre rôle.', 'error');
                    return;
                }

                game.voyanteSelection = p.id;
                li.classList.add('selected-for-voyante');

                // show the large player card overlay; Voyante must see the actual role (not informer view)
                try { traceLog('Voyante.selection', {playerId: p.id, playerName: p.name, role: p.role}); } catch (e) {}
                showLargePlayerCard(p);

                // selection handled; exit handler
                return;
            }

        });

    });

    const elems = Array.from(container.children);
    const slice = elems.length ? (360 / elems.length) : 360;
    const start = -90; // start at top
    elems.forEach((el, idx) => {
        const angle = slice * idx + start;
        const rot = `rotate(${angle}deg)`;
        const rev = `rotate(${-angle}deg)`;
        el.style.transform = `translate(-50%,-50%) ${rot} translate(${radius}px) ${rev}`;
        el.style.transformOrigin = 'center center';
    });
}

// --- Game controls (minimal placeholders) ---
const game = {
    running: false, night: 0, cupidonDone: false, awaitingCupidon: false, cupidonSelections: [], // Enfant Sauvage flags
    enfantSauvageDone: false, awaitingEnfantSauvage: false, enfantSauvageSelection: null,
    salvateurDone: false, awaitingSalvateur: false, salvateurLastProtected: null,
    detectiveDone: false, awaitingDetective: false, detectiveSelections: [], detectivePlayerId: null,
    voyanteDone: false, awaitingVoyante: false, voyanteSelection: null
};

function startGame() {
    if (players.length === 0) {
        showToast('Ajoutez des joueurs avant de démarrer.', 'error');
        return;
    }
    game.running = true;
    game.night = 1;
    showToast('Partie démarrée (simulation)');
}

function resetGame() {
    game.running = false;
    game.night = 0;
    players.length = 0;
    renderPlayerList();
    renderPlayerCircle();
    saveState();
    // show the distribute button again (fresh start)
    const btn = document.getElementById('distributeRolesBtn');
    if (btn) btn.style.display = '';
}

// Advance the in-night action sequence and day/night transitions
function advanceAction() {
    const cur = document.getElementById('currentAction');
    if (!cur) return;
    try { traceLog('advanceAction.invoked', {phase: game.phase, sleeping: !!game.sleeping, awaitingCupidon: !!game.awaitingCupidon, awaitingSalvateur: !!game.awaitingSalvateur, awaitingDetective: !!game.awaitingDetective, awaitingVoyante: !!game.awaitingVoyante}); } catch (e) {}

    // If we are in day phase
    if (game.phase === 'day') {
        // first press: village s'endort message
        if (!game.sleeping) {
            game.sleeping = true;
            cur.textContent = 'Le village s\'endort';
            return;
        }
        // second press: actually enter the night and start night actions
        if (game.sleeping) {
            game.sleeping = false;
            startNight();
            return;
        }
    }

    // If we are in night phase
    if (game.phase === 'night') {
        // if awaiting interactive selection (e.g., Cupidon), block advance
        if (game.awaitingCupidon) {
            showToast('Sélection Cupidon active — terminez-la avant de continuer.', 'info');
            return;
        }
        if (game.awaitingEnfantSauvage) {
            showToast('Sélection Enfant Sauvage active — terminez-la avant de continuer.', 'info');
            return;
        }
        if (game.awaitingSalvateur) {
            showToast('Sélection Salvateur active — terminez-la avant de continuer.', 'info');
            return;
        }
        if (game.awaitingVoyante) {
            showToast('Sélection Voyante active — terminez-la avant de continuer.', 'info');
            return;
        }
        // If awaiting Soeurs recognition, the MJ pressing Prochaine action must trigger it now
        if (game.awaitingSoeurs) {
            // perform recognition and return; finishNightAction will remove the action from the queue
            performSoeursRecognition();
            return;
        }
        // If awaiting Detective comparison, block advance until MJ confirms
        if (game.awaitingDetective) {
            showToast('Sélection Détective active — terminez-la avant de continuer.', 'info');
            return;
        }

        // if there are pending actions, nothing to do here (they finish via finishNightAction)
        if (Array.isArray(game.pendingNightActions) && game.pendingNightActions.length > 0) {
            // wait for actions to complete
            return;
        }

        if (game.readyToWake) {
            // perform wake -> go to next day
            game.phase = 'day';
            game.day = (game.day || 1) + 1;
            game.readyToWake = false;
            updateCalendarDisplay();
            cur.textContent = 'Le village est réveillé';
            return;
        }

        // fallback: if no pending and not readyToWake, set wake
        if ((!game.pendingNightActions || game.pendingNightActions.length === 0) && !game.readyToWake) {
            game.readyToWake = true;
            cur.textContent = 'Le village se réveille';
        }
    }
}

try {
    if (typeof window !== 'undefined') window.advanceAction = advanceAction;
} catch (e) {
}

// wire basic controls when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // restore saved state first
    if (typeof loadState === 'function') loadState();
    bindPlayerForm();
    renderPlayerList();
    renderPlayerCircle();
    // ensure roles UI reflects restored state
    if (typeof renderRoles === 'function') renderRoles();
    if (typeof updateRolesTotal === 'function') updateRolesTotal();
    // wire game control buttons if present
    const s = document.getElementById('startGameBtn');
    if (s) s.addEventListener('click', startGame);
    const r = document.getElementById('resetGameBtn');
    if (r) r.addEventListener('click', () => {
        if (confirm('Réinitialiser la partie ?')) resetGame();
    });
    const nextBtn = document.getElementById('nextActionBtn');
    if (nextBtn) nextBtn.addEventListener('click', advanceAction);
    // ensure distribute button wired
    const distBtn = document.getElementById('distributeRolesBtn');
    if (distBtn) distBtn.addEventListener('click', distributeRoles);
});

// ensure binding on SPA navigation
document.addEventListener('pageChanged', (e) => {
    if (e.detail === 'playersPage') {
        bindPlayerForm();
        renderPlayerList();
        renderPlayerCircle();
    }
    if (e.detail === 'rolesPage') {
        // when navigating to Roles page, ensure UI reflects current players restored from storage
        if (typeof renderRoles === 'function') renderRoles();
        if (typeof updateRolesTotal === 'function') updateRolesTotal();
    }
});

// no sample players: start with an empty list (state will be restored from localStorage if present)
// players will be populated via the UI or by importing a JSON / loadState()

// Helper: détermination du rôle révélé publiquement à la mort d'un joueur
// - ne doit jamais indiquer qu'un Enfant Sauvage s'est transformé (aucune mention de "précédent rôle").
// - renvoie un objet { roleId, camp, note } où `note` peut être utilisé pour afficher un message narratif (ou null).
function getPublicDeathInfo(player) {
    if (!player) return {roleId: null, camp: null, note: null};
    // If player was Enfant Sauvage who got transformed, publicly show only "Loup-Garou" without mentioning previous role
    if (player.previousRole === 'Enfant Sauvage' && player.role === 'Loup-Garou') {
        return {roleId: 'Loup-Garou', camp: 'Loup', note: null};
    }
    // If the player's current role is Enfant Sauvage and they die (never transformed), reveal Enfant Sauvage normally
    if (player.role === 'Enfant Sauvage') {
        const roleObj = availableRoles.find(r => r.id === 'Enfant Sauvage');
        return {roleId: 'Enfant Sauvage', camp: roleObj ? roleObj.camp : null, note: null};
    }
    // Default: reveal current role
    const roleObj = availableRoles.find(r => r.id === player.role);
    return {roleId: roleObj ? roleObj.id : player.role, camp: roleObj ? roleObj.camp : null, note: null};
}

try {
    if (typeof window !== 'undefined') window.getPublicDeathInfo = getPublicDeathInfo;
} catch (e) {
}

// Utility: when a player dies (or is removed while a game is running), check Enfant Sauvage transformation
function transformEnfantIfModelDied(deadPlayerId) {
    try {
        if (!deadPlayerId) return;
        const enfant = players.find(p => p.role === 'Enfant Sauvage');
        if (!enfant) return;
        // if enfant already transformed, nothing to do
        if (enfant.transformed) return;
        if (enfant.modelId && enfant.modelId === deadPlayerId) {
            // transform the Enfant into a Loup-Garou
            enfant.transformed = true;
            enfant.previousRole = 'Enfant Sauvage';
            enfant.role = 'Loup-Garou';
            // ensure we don't reveal his previous role on death
            enfant.hidePreviousOnDeath = true;
            showToast(`${enfant.name} s'est transformé en Loup-Garou (modèle décédé)`, 'success');
            renderPlayerList();
            renderPlayerCircle();
        }
    } catch (e) {
        console.warn('transformEnfantIfModelDied error', e);
    }
}

// Simple toast helper (non bloquant)
function showToast(message, type = 'info', duration = 3500) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const t = document.createElement('div');
    t.className = 'toast ' + (type || 'info');
    t.textContent = message;
    container.appendChild(t);
    // force reflow to allow transition
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => {
        t.classList.remove('show');
        setTimeout(() => t.remove(), 220);
    }, duration);
}

// Ensure Soeurs count consistency: if 'Soeur' is selected it must count for exactly its unit (2), otherwise 0
function ensureSoeursConsistency() {
    const r = availableRoles.find(x => x.id === 'Soeur');
    if (!r) return;
    const unit = r.unit || 2;
    // normalize to either 0 or unit
    if (r.count && r.count > 0) r.count = unit; else r.count = 0;
}

try {
    if (typeof window !== 'undefined') window.ensureSoeursConsistency = ensureSoeursConsistency;
} catch (e) {
}

// Utility: execute Soeurs recognition and finalize the action
function performSoeursRecognition() {
    try {
        game.awaitingSoeurs = true;
        const soeurs = players.filter(p => p.role === 'Soeur');
        if (soeurs.length < 2) {
            showToast('Aucune paire de Soeurs à reconnaître.', 'info');
            // finalize
            try {
                finishNightAction('Soeurs');
            } catch (e) {
                game.soeursDone = true;
                game.awaitingSoeurs = false;
            }
            return;
        }
        const pairs = [];
        for (let i = 0; i + 1 < soeurs.length; i += 2) {
            const a = soeurs[i], b = soeurs[i + 1];
            a.soeurWith = b.id;
            b.soeurWith = a.id;
            pairs.push(`${a.name} & ${b.name}`);
        }
        showToast('Soeurs reconnues : ' + pairs.join(' ; '), 'success', 5000);
        try {
            finishNightAction('Soeurs');
        } catch (e) {
            game.soeursDone = true;
            game.awaitingSoeurs = false;
        }
    } catch (e) {
        console.warn('performSoeursRecognition error', e);
        try {
            finishNightAction('Soeurs');
        } catch (err) {
        }
    }
}

// Detective helper: determine how Détective should see a player's camp, honoring special rules
function getDetectiveViewOfPlayer(player) {
    if (!player) return null;
    // If the player's original or current role is Enfant Sauvage -> Detective sees Loup
    if (player.role === 'Enfant Sauvage' || player.previousRole === 'Enfant Sauvage') return 'Loup';
    // Loup-Garou Grimeur appears as Village
    if (player.role === 'Loup-Garou Grimeur' || player.previousRole === 'Loup-Garou Grimeur') return 'Village';
    // Chien-Loup: if there is an explicit side flag p.chienSide === 'village' or 'loup', apply inversion rules:
    // - if chienSide === 'village' (i.e. the Chien-Loup currently acts as chien/village), Detective sees as Loup
    // - if chienSide === 'loup' (i.e. Chien-Loup currently on the werewolf side), Detective sees as Village
    if (player.role === 'Chien-Loup' || player.previousRole === 'Chien-Loup') {
        const side = player.chienSide || null; // expected values: 'village' or 'loup'
        if (side === 'village') return 'Loup';
        if (side === 'loup') return 'Village';
        // fallback: use role's configured camp
    }
    // Default: use role's camp declared in availableRoles
    const r = availableRoles.find(x => x.id === player.role);
    if (r && r.camp) return r.camp;
    return null;
}

try {
    if (typeof window !== 'undefined') window.getDetectiveViewOfPlayer = getDetectiveViewOfPlayer;
} catch (e) {
}

//# sourceMappingURL=werewolf.js.map
