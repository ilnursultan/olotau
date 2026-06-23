// ==========================================
// Основной скрипт сайта: app.js
// ==========================================

const APPS_SCRIPT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycby6mozWlrzpn5FPKbumhi-KRjpYeCkQRsGIHAbHK9LETdIUkA7whdEabqZmyK530FE/exec";

let db = { matches2026: [], goals2026: [], players2026: [], archive: [], geo: {}, bestPlayers: [], groups2026: [], loats: {} };
let currentGlobalMode = '2026'; let active2026Tab = 'tables'; let activeArchiveTab = 'groups';
let archiveYear = ''; let archiveTournament = ''; let currentPlayoffStage2026 = '1/16'; let currentPlayoffStageArchive = '';
let animId = null; let adminSecretClicks = 0; let adminClicksTimeout = null;

function handleAdminSecretClick() {
    adminSecretClicks++; clearTimeout(adminClicksTimeout);
    adminClicksTimeout = setTimeout(() => { adminSecretClicks = 0; }, 2000);
    if (adminSecretClicks >= 5) { adminSecretClicks = 0; window.location.href = 'admin.html'; }
}

function getGitHubLogoUrl(teamName) {
    let clean = normalizeTeamName(teamName).trim();
    if (!clean || clean === '' || clean === '---' || clean.toUpperCase() === 'КОМАНДА' || clean.toUpperCase().includes('ПОБЕДИТЕЛЬ') || clean.toUpperCase().includes('ФИНАЛИСТ') || clean.toUpperCase().includes('ПРОИГРАВШИЙ') || clean.toUpperCase().includes('ПАРА')) {
        return 'https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png';
    }
    if (clean.toLowerCase().includes('standart.png')) {
        return 'https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png';
    }
    return `https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/${clean}.png`;
}

async function initApp() {
    showMainLoader();
    try {
        let res = await fetch(APPS_SCRIPT_WEB_APP_URL).then(r => r.json());
        mapServerData(res);
        hideMainLoader();
        document.getElementById('mode-btn-2026').click();
    } catch(e) {
        document.getElementById('loader-text').innerText = "Ошибка загрузки данных. Пожалуйста, обновите страницу.";
    }
}

function mapServerData(data) {
    if(!data) return;
    db.matches2026 = data.matches2026 || [];
    db.goals2026 = data.goals2026 || [];
    db.players2026 = data.players2026 || [];
    db.archive = data.archive || [];
    db.bestPlayers = data.bestPlayers || [];
    db.groups2026 = data.groups2026 || [];
    db.loats = data.loats || {};
    
    if(data.geo) {
        data.geo.forEach(item => {
            if(item.team) {
                let k = item.team.toString().trim().toUpperCase();
                db.geo[k] = { raion: item.raion || '', selysovet: item.selysovet || '', naspunkt: item.naspunkt || '' };
            }
        });
    }
}

function showMainLoader() {
    const l = document.getElementById('loader'); if(l) l.style.display = 'block';
    const c = document.getElementById('view-2026'); if(c) c.classList.add('hidden');
}
function hideMainLoader() {
    const l = document.getElementById('loader'); if(l) l.style.display = 'none';
    const c = document.getElementById('view-2026'); if(c) c.classList.remove('hidden');
}

function setGlobalMode(mode) {
    currentGlobalMode = mode;
    ['2026', 'archive', 'stats'].forEach(m => {
        const btn = document.getElementById(`mode-btn-${m}`);
        if(btn) {
            if(m === mode) {
                btn.classList.add('text-neon'); btn.classList.remove('text-gray-500');
            } else {
                btn.classList.remove('text-neon'); btn.classList.add('text-gray-500');
            }
        }
    });
    
    document.getElementById('view-2026').classList.toggle('hidden', mode !== '2026');
    document.getElementById('view-archive').classList.toggle('hidden', mode !== 'archive');
    document.getElementById('view-stats').classList.toggle('hidden', mode !== 'stats');
    
    if(mode === '2026') switch2026Tab(active2026Tab, document.querySelector(`.tab-btn-top`));
    else if(mode === 'archive') initArchiveScreen();
    else if(mode === 'stats') renderStatsTab();
}

function switch2026Tab(tab, btn) {
    active2026Tab = tab;
    document.querySelectorAll('#nav-2026-tabs .tab-btn-top').forEach(el => el.classList.remove('active'));
    if (btn) btn.classList.add('active');
    
    document.getElementById('sub-2026-tables').classList.toggle('hidden', tab !== 'tables');
    document.getElementById('sub-2026-schedule').classList.toggle('hidden', tab !== 'schedule');
    document.getElementById('sub-2026-standings').classList.toggle('hidden', tab !== 'standings');
    document.getElementById('sub-2026-playoffs').classList.toggle('hidden', tab !== 'playoffs');
    document.getElementById('sub-2026-scorers').classList.toggle('hidden', tab !== 'scorers');
    document.getElementById('sub-2026-assistants').classList.toggle('hidden', tab !== 'assistants');
    
    if(tab === 'tables') render2026Tables();
    else if(tab === 'playoffs') render2026Playoffs();
    else if(tab === 'scorers') render2026StatList('scorers');
    else if(tab === 'assistants') render2026StatList('assistants');
}

function render2026Tables() {
    const container = document.getElementById('sub-2026-tables'); if(!container) return; container.innerHTML = '';
    let mGroup = db.matches2026.filter(m => m.stage === 'Групповой этап');
    let groups = [...new Set(mGroup.map(m => m.group))].filter(Boolean).sort();
    
    if(groups.length === 0) {
        container.innerHTML = `<div class="text-zinc-600 text-xs text-center py-10 italic col-span-2">Нет данных группового этапа.</div>`; return;
    }
    
    groups.forEach(gName => {
        let rows = calculateGroupStats(mGroup.filter(m => m.group === gName), gName);
        let html = `
        <div class="group-card">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr>
                        <th>Группа ${gName}</th>
                        <th class="col-stat">И</th>
                        <th class="col-stat">В</th>
                        <th class="col-stat">Н</th>
                        <th class="col-stat">П</th>
                        <th class="col-score">М</th>
                        <th class="col-stat">О</th>
                    </tr>
                </thead>
                <tbody>`;
        
        rows.forEach((r, idx) => {
            html += `
            <tr>
                <td class="green-bar max-w-[130px] truncate">
                    <img src="${getGitHubLogoUrl(r.name)}" class="team-logo mr-1.5" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'">
                    <span>${smartTeamName(r.name)}</span>
                </td>
                <td>${r.g}</td>
                <td>${r.w}</td>
                <td>${r.d}</td>
                <td>${r.l}</td>
                <td>${r.gf}-${r.ga}</td>
                <td class="text-neon font-black">${r.pts}</td>
            </tr>`;
        });
        
        html += `</tbody></table></div>`;
        container.innerHTML += html;
    });
}

function render2026StatList(type) {
    const listContainer = document.getElementById(type === 'scorers' ? 'scorers-list' : 'assistants-list'); if(!listContainer) return; listContainer.innerHTML = '';
    let statsMap = {};
    db.goals2026.forEach(g => {
        let pName = type === 'scorers' ? g.player : g.assistant; if(!pName || pName.toLowerCase() === 'автогол' || pName === '') return;
        let key = pName + '|||' + g.team; if(!statsMap[key]) statsMap[key] = { name: pName, team: g.team, count: 0 }; statsMap[key].count++;
    });
    let sorted = Object.values(statsMap).sort((a,b) => b.count - a.count);
    if(sorted.length === 0) { listContainer.innerHTML = `<div class="text-zinc-600 text-xs text-center py-4 italic">Нет данных результатов</div>`; return; }
    listContainer.innerHTML = sorted.map((p, idx) => `
        <div class="grid grid-cols-12 text-xs font-bold items-center p-2.5 text-left uppercase hover:bg-zinc-900/10 transition-colors">
            <div class="col-span-1 text-left text-zinc-500 font-extrabold text-[10px] pl-1">${idx+1}</div>
            <div class="col-span-9 text-left text-white truncate flex items-center gap-3">
                <img src="${getGitHubLogoUrl(p.team)}" class="w-7 h-7 object-contain shrink-0" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'">
                <div class="min-w-0 flex-1 leading-tight">
                    <div class="truncate text-white font-bold tracking-wide">${p.name}</div>
                    <div class="truncate text-zinc-500 text-[9px] font-normal mt-0.5 tracking-tight">${smartTeamName(p.team)}</div>
                </div>
            </div>
            <div class="col-span-2 text-right pr-2 text-neon font-black text-sm">${p.count}</div>
        </div>`).join('');
}

function render2026Playoffs() {
    const nav = document.getElementById('playoff-stages-nav-2026'); const container = document.getElementById('playoff-matches-2026');
    if(!container || !nav) return; container.innerHTML = '';
    const pMatches = db.matches2026.filter(m => m.stage !== 'Групповой этап'); let stages = ['1/16', '1/8', '1/4', '1/2', 'Финал'];
    if(!stages.includes(currentPlayoffStage2026)) currentPlayoffStage2026 = stages[0];
    nav.innerHTML = stages.map(s => `<button class="playoff-stage-btn flex-1 ${currentPlayoffStage2026 === s ? 'active' : ''}" onclick="setPlayoffStage2026('${s}')">${s}</button>`).join('');

    let matchesHtml = ''; let stageMatches = pMatches.filter(m => m.stage === currentPlayoffStage2026);

    if (currentPlayoffStage2026 === '1/16') {
        const pairs = [[1, 32], [13, 20], [5, 28], [9, 24], [3, 30], [15, 18], [7, 26], [11, 22], [2, 31], [14, 19], [6, 27], [10, 23], [4, 29], [16, 17], [8, 25], [12, 21]];
        pairs.forEach((p, idx) => {
            let currentId = (101 + idx).toString(); let realMatch = stageMatches.find(m => m.id === currentId);
            let t1 = (realMatch && realMatch.t1 && realMatch.t1 !== 'КОМАНДА' && realMatch.t1 !== '---') ? realMatch.t1 : `КОМАНДА #${p[0]}`;
            let t2 = (realMatch && realMatch.t2 && realMatch.t2 !== 'КОМАНДА' && realMatch.t2 !== '---') ? realMatch.t2 : `КОМАНДА #${p[1]}`;
            matchesHtml += renderPlayoffCardLive(realMatch, t1, t2, p[0], p[1], currentId);
        });
    } else if (currentPlayoffStage2026 === 'Финал') {
        const realFinal = stageMatches.find(m => m.id === '601'); matchesHtml += renderPlayoffCardLive(realFinal, 'ФИНАЛИСТ #1', 'ФИНАЛИСТ #2', '-', '-', '601');
        const real3rd = pMatches.find(m => m.id === '501'); matchesHtml += `<div class="mt-1.5 pt-2"><div class="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1 pl-1">Матч за 3-е место</div></div>` + renderPlayoffCardLive(real3rd, 'ПРОИГРАВШИЙ 1/2 #1', 'ПРОИГРАВШИЙ 1/2 #2', '-', '-', '501');
    } else {
        let slots = currentPlayoffStage2026 === '1/8' ? 8 : (currentPlayoffStage2026 === '1/4' ? 4 : 2);
        let startId = currentPlayoffStage2026 === '1/8' ? 201 : (currentPlayoffStage2026 === '1/4' ? 301 : 401);
        let prevLabel = currentPlayoffStage2026 === '1/8' ? '1/16' : (currentPlayoffStage2026 === '1/4' ? '1/8' : '1/4');
        for(let i = 0; i < slots; i++) {
            let currentId = (startId + i).toString(); let realMatch = stageMatches.find(m => m.id === currentId);
            let t1 = (realMatch && realMatch.t1 && realMatch.t1 !== '---') ? realMatch.t1 : `ПОБЕДИТЕЛЬ ${prevLabel} #${i * 2 + 1}`;
            let t2 = (realMatch && realMatch.t2 && realMatch.t2 !== '---') ? realMatch.t2 : `ПОБЕДИТЕЛЬ ${prevLabel} #${i * 2 + 2}`;
            matchesHtml += renderPlayoffCardLive(realMatch, t1, t2, '-', '-', currentId);
        }
    }
    container.innerHTML = matchesHtml;
}

function renderPlayoffCardLive(m, t1Fallback, t2Fallback, gridPos1, gridPos2, fallbackId) {
    let matchId = m ? m.id : fallbackId;
    let t1Name = (m && m.t1 && m.t1 !== '---') ? m.t1 : t1Fallback;
    let t2Name = (m && m.t2 && m.t2 !== '---') ? m.t2 : t2Fallback;
    let isMock1 = t1Name.includes('КОМАНДА') || t1Name.includes('ПОБЕДИТЕЛЬ') || t1Name.includes('ФИНАЛИСТ') || t1Name.includes('ПРОИГРАВШИЙ');
    let isMock2 = t2Name.includes('КОМАНДА') || t2Name.includes('ПОБЕДИТЕЛЬ') || t2Name.includes('ФИНАЛИСТ') || t2Name.includes('ПРОИГРАВШИЙ');
    let isPast = m && m.status === 'past';
    let isLive = m && m.status === 'live';
    
    let medal1 = ""; let medal2 = "";
    if (isPast && m.s1 !== null && m.s2 !== null) {
        if (m.id === '601') {
            if (m.s1 > m.s2 || (m.s1 === m.s2 && m.p1 > m.p2)) { medal1 = " 🥇"; medal2 = " 🥈"; }
            else { medal1 = " 🥈"; medal2 = " 🥇"; }
        } else if (m.id === '501') {
            if (m.s1 > m.s2 || (m.s1 === m.s2 && m.p1 > m.p2)) { medal1 = " 🥉"; }
            else { medal2 = " 🥉"; }
        }
    }
    
    let s1 = (isPast || isLive) ? m.s1 : '-';
    let s2 = (isPast || isLive) ? m.s2 : '-';
    let p1 = (isPast && m.p1 !== null) ? `<span class="text-white text-[10px] font-normal ml-1.5">${m.p1}</span>` : '';
    let p2 = (isPast && m.p2 !== null) ? `<span class="text-white text-[10px] font-normal ml-1.5">${m.p2}</span>` : '';

    let gridBadge1 = gridPos1 !== '-' ? `<span class="text-zinc-500 font-extrabold text-[10px] w-4 shrink-0 text-center mr-1">${gridPos1}</span>` : '';
    let gridBadge2 = gridPos2 !== '-' ? `<span class="text-zinc-500 font-extrabold text-[10px] w-4 shrink-0 text-center mr-1">${gridPos2}</span>` : '';

    let inlineStyle = "";
    if (m && m.id === '601') {
        inlineStyle = `style="border-color: rgba(255, 215, 0, 0.35); box-shadow: 0 0 20px rgba(255, 215, 0, 0.15);"`;
    } else if (m && m.id === '501') {
        inlineStyle = `style="border-color: rgba(205, 127, 50, 0.35); box-shadow: 0 0 20px rgba(205, 127, 50, 0.15);"`;
    }

    let clickHandler = `onclick="openPlayoffMatchModal('${matchId}', '${t1Name.replace(/'/g, "\\'")}', '${t2Name.replace(/'/g, "\\\'")}')"`;

    return `
    <div ${inlineStyle} ${clickHandler} class="bg-zinc-card border border-zinc-900 rounded-2xl p-3 flex flex-col w-full relative overflow-hidden transition-all hover:border-zinc-700 cursor-pointer active:scale-[0.99]">
        <div class="flex justify-between items-center w-full">
            <div class="flex-1 space-y-2 min-w-0 pr-2 z-10">
                <div class="flex items-center truncate text-[11px] sm:text-xs font-bold text-white uppercase">
                    ${gridBadge1}
                    <img src="${getGitHubLogoUrl(t1Name)}" class="team-logo mr-2" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'">
                    <span class="truncate ${isMock1 ? 'text-zinc-500 font-bold' : ''}">${smartTeamName(t1Name)}${medal1}</span>
                </div>
                <div class="flex items-center truncate text-[11px] sm:text-xs font-bold text-white uppercase">
                    ${gridBadge2}
                    <img src="${getGitHubLogoUrl(t2Name)}" class="team-logo mr-2" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'">
                    <span class="truncate ${isMock2 ? 'text-zinc-500 font-bold' : ''}">${smartTeamName(t2Name)}${medal2}</span>
                </div>
            </div>
            <div class="flex items-center shrink-0 z-10 font-black text-xs sm:text-sm text-neon">
                <div class="flex flex-col gap-1.5 items-end justify-center">
                    <div class="flex items-center">${s1}${p1}</div>
                    <div class="flex items-center">${s2}${p2}</div>
                </div>
                <span class="text-zinc-600 text-[10px] ml-2.5">▶</span>
            </div>
        </div>
    </div>`;
}

function openPlayoffMatchModal(matchId, fallbackT1, fallbackT2) {
    let m = db.matches2026.find(match => match.id === matchId);
    let t1Name = (m && m.t1 && m.t1 !== '---') ? m.t1 : fallbackT1;
    let t2Name = (m && m.t2 && m.t2 !== '---') ? m.t2 : fallbackT2;
    
    let isPast = m && m.status === 'past';
    let isLive = m && m.status === 'live';
    let s1 = (isPast || isLive) ? m.s1 : '-';
    let s2 = (isPast || isLive) ? m.s2 : '-';
    let p1 = (isPast && m.p1 !== null) ? ` (${m.p1})` : '';
    let p2 = (isPast && m.p2 !== null) ? ` (${m.p2})` : '';

    let modal = document.createElement('div');
    modal.className = "fixed inset-0 bg-black/80 backdrop-blur-md z-[30000000] flex items-center justify-center p-4 animate-fade-in";
    modal.id = "playoff-match-modal";
    
    let goalsHtml = "";
    if (m && (isPast || isLive)) {
        let goals = db.goals2026.filter(g => g.match_id === m.id).sort((a,b) => parseInt(a.minute || 0) - parseInt(b.minute || 0));
        if (goals.length > 0) {
            goalsHtml = goals.map(g => {
                let isT1 = normalizeTeamName(g.team) === normalizeTeamName(t1Name);
                let assistStr = g.assistant ? `<span class="text-zinc-500 font-medium lowercase"> (пас: ${g.assistant})</span>` : '';
                let sideClass = isT1 ? "text-left" : "text-right";
                
                return `
                <div class="w-full flex items-center justify-between border-b border-zinc-900/40 py-2 text-[11px] text-zinc-300 font-bold">
                    ${isT1 ? `
                        <div class="text-left flex-1 truncate"><span class="text-white font-extrabold mr-1">${g.minute}'</span> ⚽ ${g.player}${assistStr}</div>
                        <div class="flex-1"></div>
                    ` : `
                        <div class="flex-1"></div>
                        <div class="text-right flex-1 truncate">${g.player}${assistStr} ⚽ <span class="text-white font-extrabold ml-1">${g.minute}'</span></div>
                    `}
                </div>`;
            }).join('');
        } else {
            goalsHtml = `<div class="text-zinc-600 italic text-[11px] text-center py-4">Голов забито не было</div>`;
        }
    } else {
        goalsHtml = `<div class="text-zinc-600 italic text-[11px] text-center py-4">События матча появятся после начала игры</div>`;
    }

    modal.innerHTML = `
    <div class="bg-zinc-card border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl animate-scale-up">
        <div class="p-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/20">
            <span class="text-[9px] font-black uppercase tracking-wider text-zinc-500">${m ? m.stage : 'ПЛЕЙ-ОФФ'} • ДЕТАЛИ МАТЧА</span>
            <button onclick="closePlayoffMatchModal()" class="w-6 h-6 rounded-full bg-zinc-900 text-zinc-400 hover:text-white font-black text-xs flex items-center justify-center outline-none">×</button>
        </div>
        
        <div class="p-6 flex flex-col items-center justify-center bg-gradient-to-b from-zinc-900/10 to-transparent">
            <div class="flex items-center justify-between w-full max-w-xs gap-4">
                <div class="flex flex-col items-center text-center flex-1 min-w-0">
                    <img src="${getGitHubLogoUrl(t1Name)}" class="w-14 h-14 object-contain mb-2 drop-shadow-md" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'">
                    <span class="text-white font-black uppercase text-xs truncate w-full">${smartTeamName(t1Name)}</span>
                </div>
                
                <div class="flex flex-col items-center justify-center text-center px-2 shrink-0">
                    <div class="text-2xl font-black text-neon tracking-tight flex items-center gap-1">
                        <span>${s1}${p1}</span>
                        <span class="text-zinc-700 text-lg">:</span>
                        <span>${s2}${p2}</span>
                    </div>
                    <span class="text-[8px] bg-zinc-900 px-2 py-0.5 rounded text-zinc-500 font-extrabold uppercase mt-1 tracking-wider">${m ? (m.time || '00:00') : 'ОЖИДАНИЕ'}</span>
                </div>
                
                <div class="flex flex-col items-center text-center flex-1 min-w-0">
                    <img src="${getGitHubLogoUrl(t2Name)}" class="w-14 h-14 object-contain mb-2 drop-shadow-md" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'">
                    <span class="text-white font-black uppercase text-xs truncate w-full">${smartTeamName(t2Name)}</span>
                </div>
            </div>
        </div>

        <div class="px-6 pb-2 flex justify-center">
            <div class="text-[9px] font-black uppercase tracking-widest text-zinc-500 bg-zinc-900/30 border border-zinc-900 px-3 py-1 rounded-full">Поле: ${m ? (m.field || '1') : '1'}</div>
        </div>
        
        <div class="p-4 flex-1 overflow-y-auto max-h-[250px]">
            <div class="text-[9px] font-black uppercase text-zinc-500 tracking-wider mb-2 border-b border-zinc-900/60 pb-1">Хронология голов</div>
            <div class="flex flex-col gap-1">
                ${goalsHtml}
            </div>
        </div>

        <div class="p-3 bg-zinc-900/40 border-t border-zinc-900 flex justify-end">
            <button onclick="closePlayoffMatchModal()" class="px-4 py-2 bg-zinc-900 border border-zinc-800 text-[10px] text-white font-black uppercase rounded-xl hover:bg-zinc-800 transition-colors">Закрыть</button>
        </div>
    </div>`;
    
    document.body.appendChild(modal);
}

function closePlayoffMatchModal() {
    const modal = document.getElementById('playoff-match-modal');
    if(modal) modal.remove();
}

function setPlayoffStage2026(st) {
    currentPlayoffStage2026 = st; render2026Playoffs();
}

function calculateGroupStats(matches, gName) {
    let stats = {};
    matches.forEach(m => {
        if(m.status !== 'past' || m.s1 === null || m.s2 === null) return;
        let t1Norm = normalizeTeamName(m.t1); let t2Norm = normalizeTeamName(m.t2);
        
        if(!stats[t1Norm]) stats[t1Norm] = { name: m.t1, g: 0, pts: 0, gf: 0, ga: 0, w: 0, d: 0, l: 0 };
        if(!stats[t2Norm]) stats[t2Norm] = { name: m.t2, g: 0, pts: 0, gf: 0, ga: 0, w: 0, d: 0, l: 0 };
        
        stats[t1Norm].g++; stats[t1Norm].gf += m.s1; stats[t1Norm].ga += m.s2;
        stats[t2Norm].g++; stats[t2Norm].gf += m.s2; stats[t2Norm].ga += m.s1;
        
        if(m.s1 > m.s2) {
            stats[t1Norm].pts += 3; stats[t1Norm].w++; stats[t2Norm].l++;
        } else if(m.s1 < m.s2) {
            stats[t2Norm].pts += 3; stats[t2Norm].w++; stats[t1Norm].l++;
        } else {
            stats[t1Norm].pts += 1; stats[t1Norm].d++;
            stats[t2Norm].pts += 1; stats[t2Norm].d++;
        }
    });
    
    let rows = Object.values(stats);
    rows.sort((a,b) => {
        if(b.pts !== a.pts) return b.pts - a.pts;
        let diffB = b.gf - b.ga; let diffA = a.gf - a.ga;
        if(diffB !== diffA) return diffB - diffA;
        if(b.gf !== a.gf) return b.gf - a.gf;
        return 0;
    });
    return rows;
}

function initArchiveScreen() {
    const selector = document.getElementById('archive-year'); if(!selector) return;
    let years = [...new Set(db.archive.map(x => x.year))].sort((a,b) => b - a);
    if(years.length === 0) return;
    
    if(!archiveYear) archiveYear = years[0];
    selector.value = archiveYear;
    switchArchiveTab(activeArchiveTab);
}

function switchArchiveTab(tab, btn) {
    activeArchiveTab = tab;
    document.querySelectorAll('#archive-tabs-nav .tab-btn-top').forEach(el => el.classList.remove('active'));
    if (btn) btn.classList.add('active');
    
    document.getElementById('archive-groups').classList.toggle('hidden', tab !== 'groups');
    document.getElementById('archive-playoffs').classList.toggle('hidden', tab !== 'playoffs');
    document.getElementById('archive-best').classList.toggle('hidden', tab !== 'best');
    
    if(tab === 'groups') loadFilteredArchiveGroups();
    else if(tab === 'playoffs') loadFilteredArchivePlayoffs();
    else if(tab === 'best') loadFilteredBestPlayers();
}

function loadFilteredArchiveGroups() {
    const container = document.getElementById('archive-groups'); if(!container) return; container.innerHTML = '';
    let groupM = db.archive.filter(m => m.year === archiveYear && m.tournament.toLowerCase() === archiveTournament.toLowerCase() && m.stage === 'Групповой этап');
    let groups = [...new Set(groupM.map(m => m.group))].filter(Boolean).sort();
    
    if(groups.length === 0) {
        container.innerHTML = `<div class="text-zinc-600 text-xs text-center py-10 italic col-span-2">Групповой этап не найден.</div>`; return;
    }
    
    groups.forEach(g => {
        const sorted = calculateGroupStats(groupM.filter(m => m.group === g), g);
        let html = `<div class="group-card"><table><thead><tr><th>${g}</th><th class="col-stat">В</th><th class="col-stat">Н</th><th class="col-stat">П</th><th class="col-score">М</th><th class="col-stat">О</th></tr></thead><tbody>`;
        sorted.forEach((t) => {
            html += `<tr><td class="green-bar max-w-[140px] truncate"><img src="${getGitHubLogoUrl(t.name)}" class="team-logo mr-1.5" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'">${smartTeamName(t.name)}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td><td>${t.gf}-${t.ga}</td><td class="text-neon font-black">${t.pts}</td></tr>`;
        });
        container.innerHTML += html + `</tbody></table></div>`;
    });
}

function loadFilteredArchivePlayoffs() {
    const container = document.getElementById('archive-playoff-matches'); if(!container) return; container.innerHTML = '';
    let playM = db.archive.filter(m => m.year === archiveYear && m.tournament.toLowerCase() === archiveTournament.toLowerCase() && m.stage !== 'Групповой этап');
    let stages = [...new Set(playM.map(m => m.stage))].filter(Boolean);
    
    if(!currentPlayoffStageArchive || !stages.includes(currentPlayoffStageArchive)) currentPlayoffStageArchive = stages[0] || '';
    document.getElementById('archive-playoff-nav').innerHTML = stages.map(s => `<button class="playoff-stage-btn flex-1 text-[10px] !py-2.5 ${currentPlayoffStageArchive === s ? 'active' : ''}" onclick="setPlayoffStageArchive('${s}')">${s}</button>`).join('');
    
    let stageMatches = playM.filter(m => m.stage === currentPlayoffStageArchive);
    container.innerHTML = stageMatches.map(m => {
        let s1 = m.s1 !== null ? m.s1 : '-'; let s2 = m.s2 !== null ? m.s2 : '-';
        return `
        <div class="bg-zinc-card border border-zinc-900 rounded-2xl p-3 flex justify-between items-center w-full relative overflow-hidden">
            <div class="flex-1 space-y-2 min-w-0 pr-2 z-10">
                <div class="flex items-center truncate text-[11px] sm:text-xs font-bold text-white uppercase"><img src="${getGitHubLogoUrl(m.t1)}" class="team-logo mr-2" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'"><span class="truncate">${smartTeamName(m.t1)}</span></div>
                <div class="flex items-center truncate text-[11px] sm:text-xs font-bold text-white uppercase"><img src="${getGitHubLogoUrl(m.t2)}" class="team-logo mr-2" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'"><span class="truncate">${smartTeamName(m.t2)}</span></div>
            </div>
            <div class="flex flex-col gap-1.5 items-end justify-center shrink-0 z-10 font-black text-[11px] sm:text-xs text-neon">
                <div>${s1}</div><div>${s2}</div>
            </div>
        </div>`;
    }).join('');
}

function setPlayoffStageArchive(st) {
    currentPlayoffStageArchive = st; loadFilteredArchivePlayoffs();
}

function renderStatsTab() {
    const gender = document.getElementById('stats-gender').value;
    const teamSelect = document.getElementById('stats-team');
    if(teamSelect) teamSelect.innerHTML = `<option value="">Выберите команду</option>`;
    renderTeamStatistics();
}

function renderTeamStatistics() {
    const team = document.getElementById('stats-team').value;
    if(!team) return;
    document.getElementById('stats-team-title').innerText = team;
    document.getElementById('stats-team-logo').src = getGitHubLogoUrl(team);
}

function loadFilteredBestPlayers() {
    const bContainer = document.getElementById('best-players-list'); if(!bContainer) return;
    let best = db.bestPlayers.filter(b => b.year === archiveYear && b.sex.toLowerCase() === archiveTournament.toLowerCase());
    if(best.length === 0) { bContainer.innerHTML = `<div class="text-zinc-600 text-xs text-center py-4 italic">Нет данных о лучших игроках</div>`; return; }
    bContainer.innerHTML = best.map(b => `
        <div class="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-3 flex items-center justify-between mb-2 hover:bg-zinc-900/60 transition-colors">
            <div class="flex items-center gap-3">
                <img src="${getGitHubLogoUrl(b.team)}" class="w-10 h-10 object-contain drop-shadow-md" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'">
                <div class="flex flex-col gap-0.5">
                    <span class="text-white font-bold text-xs uppercase">${b.name}</span>
                    <span class="text-zinc-500 text-[10px] font-medium uppercase">${b.team}</span>
                </div>
            </div>
            <div class="px-2.5 py-1 bg-zinc-900 border border-zinc-800/60 rounded-xl text-zinc-400 font-black text-[9px] uppercase tracking-wider">${b.nomination}</div>
        </div>`).join('');
}

initApp();