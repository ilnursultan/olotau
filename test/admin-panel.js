// Панель управления организатора

const APPS_SCRIPT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxBzGlyyqMKlqNwW3-8LaQMQswAgBBXeehO0rXRS1rWOyI5cTxOJG6ca9XdhV4t05LT/exec";

function switchAdminTab(type) {
    activeAdminTab = type;
    document.getElementById('admin-tab-btn-group').className = type === 'group' ? "flex-1 py-2 text-[10px] font-black uppercase text-center rounded-xl bg-white text-black" : "flex-1 py-2 text-[10px] font-black uppercase text-center rounded-xl text-zinc-400";
    document.getElementById('admin-tab-btn-playoff').className = type === 'playoff' ? "flex-grow py-2 text-[10px] font-black uppercase text-center rounded-xl bg-white text-black" : "flex-grow py-2 text-[10px] font-black uppercase text-center rounded-xl text-zinc-400";
    renderAdminPanel();
}

function renderAdminPanel() {
    const container = document.getElementById('admin-matches-container'); container.innerHTML = '';
    const groupMatches = db.matches2026.filter(m => m.group && m.group.toLowerCase().includes('группа'));
    const anyGroupFuture = groupMatches.some(m => m.status === 'future');
    
    checkAndRenderAdminLoats(anyGroupFuture);

    let targetMatches = (activeAdminTab === 'group') ? groupMatches : db.matches2026.filter(m => !m.group || !m.group.toLowerCase().includes('группа'));
    if (targetMatches.length === 0) { container.innerHTML = `<div class="text-center italic text-zinc-600 py-10 text-xs">Матчи отсутствуют</div>`; return; }

    targetMatches.forEach(m => {
        let isPast = m.status === 'past';
        let stageLabel = m.group && m.group.toLowerCase().includes('группа') ? m.group : m.stage;

        let html = `
            <div id="admin-card-${m.id}" class="bg-zinc-card border border-zinc-800 rounded-3xl p-3 flex flex-col gap-3">
                <div class="flex justify-between items-center text-[9px] font-black uppercase text-zinc-500 border-b border-zinc-900 pb-1.5">
                    <span>ID: ${m.id} — ${stageLabel}</span>
                    <span id="ok-badge-${m.id}" class="${isPast ? '' : 'hidden'} text-neon">✓ СОХРАНЕНО</span>
                </div>
                <div class="grid grid-cols-12 gap-1 items-center font-bold text-xs">
                    <div class="col-span-4 text-left truncate uppercase text-white tracking-tight">${smartTeamName(m.t1)}</div>
                    <div class="col-span-4 flex justify-center gap-1">
                        <select id="score1-${m.id}" onchange="handleScoreSelectChange('${m.id}', '${m.t1}', '${m.t2}')" class="bg-zinc-900 border border-zinc-800 text-white rounded-xl p-2 font-black text-center text-xs outline-none focus:border-neon">
                            <option value="-">-</option>
                            ${[0,1,2,3,4,5,6,7,8,9].map(v => `<option value="${v}" ${m.s1 === v && isPast ? 'selected' : ''}>${v}</option>`).join('')}
                            <option value="10+" ${m.s1 >= 10 && isPast ? 'selected' : ''}>10+</option>
                        </select>
                        <select id="score2-${m.id}" onchange="handleScoreSelectChange('${m.id}', '${m.t1}', '${m.t2}')" class="bg-zinc-900 border border-zinc-800 text-white rounded-xl p-2 font-black text-center text-xs outline-none focus:border-neon">
                            <option value="-">-</option>
                            ${[0,1,2,3,4,5,6,7,8,9].map(v => `<option value="${v}" ${m.s2 === v && isPast ? 'selected' : ''}>${v}</option>`).join('')}
                            <option value="10+" ${m.s2 >= 10 && isPast ? 'selected' : ''}>10+</option>
                        </select>
                    </div>
                    <div class="col-span-4 text-right truncate uppercase text-white tracking-tight">${smartTeamName(m.t2)}</div>
                </div>
                <div id="extra-scores-${m.id}" class="hidden grid grid-cols-2 gap-3">
                    <input type="number" id="inp-score1-${m.id}" value="${m.s1 || 0}" class="bg-zinc-900 border border-zinc-800 text-white p-2 rounded-xl text-center text-xs">
                    <input type="number" id="inp-score2-${m.id}" value="${m.s2 || 0}" class="bg-zinc-900 border border-zinc-800 text-white p-2 rounded-xl text-center text-xs">
                </div>
                <div id="playoff-penalties-${m.id}" class="hidden bg-red-500/5 border border-red-500/10 rounded-2xl p-2.5 flex flex-col gap-2">
                    <div class="text-center font-black uppercase text-[8px] text-red-400 tracking-wider">Основное время ничья. Серия пенальти:</div>
                    <div class="flex justify-center gap-4">
                        <input type="number" id="pen1-${m.id}" value="${m.p1 || ''}" placeholder="Пенальти" class="bg-zinc-900 border border-zinc-800 text-white text-center p-2 rounded-xl text-xs w-24">
                        <input type="number" id="pen2-${m.id}" value="${m.p2 || ''}" placeholder="Пенальти" class="bg-zinc-900 border border-zinc-800 text-white text-center p-2 rounded-xl text-xs w-24">
                    </div>
                </div>
                <div id="goals-block-${m.id}" class="hidden grid grid-cols-2 gap-4 border-t border-zinc-900 pt-3">
                    <div id="goals-left-${m.id}" class="flex flex-col gap-2"></div>
                    <div id="goals-right-${m.id}" class="flex flex-col gap-2 text-right"></div>
                </div>
                <div class="mt-1 flex justify-end">
                    <button id="send-btn-${m.id}" onclick="saveAdminMatch('${m.id}', '${m.t1}', '${m.t2}')" class="px-5 py-2.5 bg-zinc-900 border border-zinc-800 text-white hover:text-neon rounded-xl text-[10px] font-black uppercase tracking-wider">${isPast ? 'Редактировать' : 'Отправить результат в БД'}</button>
                </div>
            </div>`;
        container.innerHTML += html;
        if(isPast) {
            checkPlayoffPenaltyField(m.id);
            if (m.s1 >= 10 || m.s2 >= 10) document.getElementById(`extra-scores-${m.id}`).classList.remove('hidden');
            rebuildGoalsBlocks(m.id, m.t1, m.t2, true);
            document.getElementById(`goals-block-${m.id}`).classList.add('hidden');
        }
    });
}

function handleScoreSelectChange(matchId, t1, t2) {
    let s1 = document.getElementById(`score1-${matchId}`).value; let s2 = document.getElementById(`score2-${matchId}`).value;
    let extraBlock = document.getElementById(`extra-scores-${matchId}`);
    if (s1 === '10+' || s2 === '10+') extraBlock.classList.remove('hidden'); else extraBlock.classList.add('hidden');
    checkPlayoffPenaltyField(matchId);
    if (s1 === '-' || s2 === '-') { document.getElementById(`goals-block-${matchId}`).classList.add('hidden'); return; }
    document.getElementById(`goals-block-${matchId}`).classList.remove('hidden');
    rebuildGoalsBlocks(matchId, t1, t2, false);
}

function checkPlayoffPenaltyField(matchId) {
    let pBlock = document.getElementById(`playoff-penalties-${matchId}`); if(!pBlock) return;
    let s1 = document.getElementById(`score1-${matchId}`).value; let s2 = document.getElementById(`score2-${matchId}`).value;
    if (s1 === '10+') s1 = parseInt(document.getElementById(`inp-score1-${matchId}`).value) || 0;
    if (s2 === '10+') s2 = parseInt(document.getElementById(`inp-score2-${matchId}`).value) || 0;
    if (activeAdminTab === 'playoff' && s1 !== '-' && s2 !== '-' && parseInt(s1) === parseInt(s2)) pBlock.classList.remove('hidden'); else pBlock.classList.add('hidden');
}

function rebuildGoalsBlocks(matchId, t1, t2, useSavedData) {
    let s1 = document.getElementById(`score1-${matchId}`).value; let s2 = document.getElementById(`score2-${matchId}`).value;
    if (s1 === '10+') s1 = parseInt(document.getElementById(`inp-score1-${matchId}`).value) || 0;
    if (s2 === '10+') s2 = parseInt(document.getElementById(`inp-score2-${matchId}`).value) || 0;
    let cnt1 = (s1 === '-') ? 0 : parseInt(s1); let cnt2 = (s2 === '-') ? 0 : parseInt(s2);
    let leftBox = document.getElementById(`goals-left-${matchId}`); let rightBox = document.getElementById(`goals-right-${matchId}`);
    leftBox.innerHTML = ''; rightBox.innerHTML = '';
    let savedEvents = db.goals2026.filter(e => e.match_id == matchId);
    for (let i = 0; i < cnt1; i++) leftBox.innerHTML += generateGoalRowHtml(matchId, t1, 't1', i, (useSavedData ? savedEvents[i] : null));
    let t2Events = savedEvents.filter(e => e.team.toUpperCase() === t2.toUpperCase());
    for (let j = 0; j < cnt2; j++) rightBox.innerHTML += generateGoalRowHtml(matchId, t2, 't2', j, (useSavedData ? t2Events[j] : null));
}

function generateGoalRowHtml(matchId, teamName, side, idx, savedEvent) {
    const players = db.players2026.filter(p => p.team.toUpperCase() === teamName.toUpperCase());
    let pOptions = `<option value="Автогол" ${savedEvent && savedEvent.player === 'Автогол' ? 'selected' : ''}>⚽ АВТОГОЛ</option>` + players.map(p => `<option value="${p.name}" ${savedEvent && savedEvent.player === p.name ? 'selected' : ''}>${p.name.toUpperCase()}</option>`).join('');
    let aOptions = `<option value="" ${!savedEvent || !savedEvent.assistant ? 'selected' : ''}>БЕЗ АССИСТА</option>` + players.map(p => `<option value="${p.name}" ${savedEvent && savedEvent.assistant === p.name ? 'selected' : ''}>${p.name.toUpperCase()}</option>`).join('');
    let mOptions = ''; for(let m = 1; m <= 20; m++) mOptions += `<option value="${m}" ${savedEvent && savedEvent.minute === m ? 'selected' : (m === 10 && !savedEvent ? 'selected' : '')}>${m} МИН</option>`;
    return `<div class="bg-black/20 border border-zinc-900 p-2 rounded-xl flex flex-col gap-1.5 text-left text-[10px]"><select id="goal-p-${side}-${matchId}-${idx}" class="bg-zinc-900 text-white rounded p-1 text-[10px] font-bold outline-none">${pOptions}</select><select id="goal-a-${side}-${matchId}-${idx}" class="bg-zinc-900 text-zinc-500 rounded p-1 text-[10px] font-bold outline-none">${aOptions}</select><select id="goal-m-${side}-${matchId}-${idx}" class="bg-zinc-900 text-neon rounded p-1 text-[10px] font-bold outline-none">${mOptions}</select></div>`;
}

// ПУНКТ 5: Исправленный авто-селектор жребия. Исключена ошибка соединения
function checkAndRenderAdminLoats(anyGroupFuture) {
    const loatNotif = document.getElementById('admin-loat-notification'); const loatList = document.getElementById('admin-loat-list');
    loatNotif.classList.add('hidden'); loatList.innerHTML = '';
    const groupMatches = db.matches2026.filter(m => m.group && m.group.toLowerCase().includes('группа'));
    const groups = [...new Set(groupMatches.map(m => m.group))].sort();

    groups.forEach(gName => {
        const mInGroup = groupMatches.filter(m => m.group === gName);
        if (mInGroup.length > 0 && mInGroup.every(m => m.status === 'past')) {
            let sorted = calculateGroupStats(mInGroup, "");
            let equalTeams = [];
            for(let i=0; i<sorted.length-1; i++) {
                if (sorted[i].pts === sorted[i+1].pts && (sorted[i].gf - sorted[i].ga) === (sorted[i+1].gf - sorted[i+1].ga) && sorted[i].gf === sorted[i+1].gf) {
                    if(!equalTeams.includes(sorted[i].name)) equalTeams.push(sorted[i].name);
                    if(!equalTeams.includes(sorted[i+1].name)) equalTeams.push(sorted[i+1].name);
                }
            }
            if (equalTeams.length > 0) { loatNotif.classList.remove('hidden'); renderLoatSelectorMarkup(loatList, gName, equalTeams); }
        }
    });
}

function renderLoatSelectorMarkup(container, targetName, equalTeams) {
    let saved = (db.loats && db.loats[targetName]) ? db.loats[targetName].join(', ') : 'НЕ ВЫБРАН';
    let options = equalTeams.map(t => `<option value="${t}">${t.toUpperCase()}</option>`).join('');
    container.innerHTML += `
        <div class="bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-[10px] font-bold">
            <div class="text-white uppercase mb-1">Группа: <span class="text-neon">${targetName}</span></div>
            <div class="text-zinc-500 uppercase mb-2 text-[9px]">Фиксация: <span class="text-yellow-500">${saved}</span></div>
            <div class="flex items-center gap-2">
                <select id="loat-sel-1-${targetName}" class="bg-zinc-900 border border-zinc-800 p-1.5 rounded-lg text-white text-[10px]">${options}</select>
                <span class="text-zinc-500">выше чем</span>
                <select id="loat-sel-2-${targetName}" class="bg-zinc-900 border border-zinc-800 p-1.5 rounded-lg text-white text-[10px]">${options}</select>
                <button onclick="saveAdminSelectLoat('${targetName}')" class="px-3 py-1.5 bg-yellow-500 text-black uppercase font-black rounded-lg text-[9px] ml-auto cursor-pointer">ОК</button>
            </div>
        </div>`;
}

async function saveAdminSelectLoat(targetName) {
    let t1 = document.getElementById(`loat-sel-1-${targetName}`).value;
    let t2 = document.getElementById(`loat-sel-2-${targetName}`).value;
    if(t1 === t2) { alert("Выберите разные команды!"); return; }
    
    // ПУНКТ 5: Преобразуем массив строго в плоский строковый формат CSV перед отправкой в Apps Script
    let orderVal = `${t1},${t2}`;
    try {
        let res = await fetch(APPS_SCRIPT_WEB_APP_URL, { method: 'POST', body: JSON.stringify({ action: 'saveLoat', target: targetName, resolvedOrder: orderVal }) }).then(r => r.json());
        if (res.status === 'success') { 
            alert("Жребий успешно зафиксирован!"); 
            db.loats[targetName] = [t1.toUpperCase(), t2.toUpperCase()];
            renderAdminPanel();
        } else { alert("Ошибка сохранения жребия на стороне Google"); }
    } catch(e) { alert("Ошибка соединения. Проверьте Apps Script."); }
}

async function saveAdminMatch(matchId, t1, t2) {
    let s1 = document.getElementById(`score1-${matchId}`).value; let s2 = document.getElementById(`score2-${matchId}`).value;
    if (s1 === '-' || s2 === '-') { alert("Выберите счет!"); return; }
    if (s1 === '10+') s1 = parseInt(document.getElementById(`inp-score1-${matchId}`).value) || 0;
    if (s2 === '10+') s2 = parseInt(document.getElementById(`inp-score2-${matchId}`).value) || 0;
    let pen1 = null, pen2 = null;
    let pBlock = document.getElementById(`playoff-penalties-${matchId}`);
    if (pBlock && !pBlock.classList.contains('hidden')) {
        let p1Val = document.getElementById(`pen1-${matchId}`).value; let p2Val = document.getElementById(`pen2-${matchId}`).value;
        if (p1Val === '' || p2Val === '') { alert("Введите серию пенальти!"); return; }
        pen1 = parseInt(p1Val); pen2 = parseInt(p2Val);
    }
    let goals = [];
    for (let i = 0; i < parseInt(s1); i++) goals.push({ team: t1, player: document.getElementById(`goal-p-t1-${matchId}-${i}`).value, assistant: document.getElementById(`goal-a-t1-${matchId}-${i}`).value, minute: parseInt(document.getElementById(`goal-m-t1-${matchId}-${i}`).value) });
    for (let j = 0; j < parseInt(s2); j++) goals.push({ team: t2, player: document.getElementById(`goal-p-t2-${matchId}-${j}`).value, assistant: document.getElementById(`goal-a-t2-${matchId}-${j}`).value, minute: parseInt(document.getElementById(`goal-m-t2-${matchId}-${j}`).value) });
    
    document.getElementById(`send-btn-${matchId}`).innerText = "ОБНОВЛЕНИЕ...";
    try {
        let res = await fetch(APPS_SCRIPT_WEB_APP_URL, { method: 'POST', body: JSON.stringify({ action: 'saveMatch', matchId: matchId, t1: t1, t2: t2, score1: s1, score2: s2, pen1: pen1, pen2: pen2, goals: goals, status: 'past' }) }).then(r => r.json());
        if (res.status === 'success') { alert("Матч сохранен!"); location.reload(); }
    } catch(e) { alert("Ошибка сохранения"); }
}

async function triggerBuildGrid() {
    if (!confirm("Сгенерировать сетку 1/16 плей-офф на базе Общего зачета?")) return;
    let standings = getStandingsArray().map(x => x.name);
    const pairs = [[1, 32], [13, 20], [5, 28], [9, 24], [3, 30], [15, 18], [7, 26], [11, 22], [2, 31], [14, 19], [6, 27], [10, 23], [4, 29], [16, 17], [8, 25], [12, 21]];
    let gridMatches = pairs.map((p, idx) => ({ id: (101 + idx), t1: standings[p[0] - 1] || "---", t2: standings[p[1] - 1] || "---" }));
    try {
        let res = await fetch(APPS_SCRIPT_WEB_APP_URL, { method: 'POST', body: JSON.stringify({action: 'buildPlayoff', grid: gridMatches}) }).then(r => r.json());
        if (res.status === 'success') { alert("Сетка построена!"); location.reload(); }
    } catch(e) { alert("Ошибка."); }
}

async function triggerClearAllData() {
    if (!confirm("Очистить всю базу результатов?")) return;
    try {
        let res = await fetch(APPS_SCRIPT_WEB_APP_URL, { method: 'POST', body: JSON.stringify({action: 'clearAll'}) }).then(r => r.json());
        if (res.status === 'success') location.reload();
    } catch(e) {}
}
