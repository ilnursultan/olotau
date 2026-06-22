// Ядро клиентского интерфейса сайта

const APPS_SCRIPT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbw3ZFpu3v52mQswK2Ztg_MWk2mP6lsDLElZ8ZmHDzugUNdJlosgdBVvO8YVP5k2j6H8/exec";

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
    return `https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/${clean}.png`;
}

function updateLiveDateStrings() {
    let playedMatches = db.matches2026.filter(m => m.status === 'past');
    let dateText = playedMatches.length > 0 ? `ОБНОВЛЕНО: ${playedMatches[playedMatches.length - 1].date || '15 ИЮНЯ'}, ${playedMatches[playedMatches.length - 1].time || '18:00'}` : 'ОБНОВЛЕНО: 15 ИЮНЯ, 18:00';
    const sDate = document.getElementById('standings-date-node'); const pDate = document.getElementById('playoffs-date-node');
    if(sDate) sDate.innerText = dateText.toUpperCase(); if(pDate) pDate.innerText = dateText.toUpperCase();
}

function startLoaderAnimation() {
    const word = "ОЛОТАУ "; const secondWord = "ЙЫЙЫНЫ"; const el = document.getElementById('text-anim-loader'); let idx = 0; if(!el) return null; el.innerHTML = "";
    const interval = setInterval(() => {
        if(idx < word.length) { el.innerHTML = `<span class="text-neon">${word.substring(0, idx + 1)}</span>`; idx++; }
        else if (idx < word.length + secondWord.length) { el.innerHTML = `<span class="text-neon">${word}</span><span class="text-white">${secondWord.substring(0, idx - word.length + 1)}</span>`; idx++; }
        else { el.innerHTML = ""; idx = 0; }
    }, 150);
    return interval;
}

async function init() {
    animId = startLoaderAnimation();
    try {
        // Скачиваем всю структуру за один быстрый безопасный запрос напрямую из Apps Script
        let res = await fetch(APPS_SCRIPT_WEB_APP_URL).then(r => r.json());
        mapServerData(res);
        
        if (animId) clearInterval(animId); 
        document.getElementById('loader').style.display = 'none'; document.getElementById('mode-container').classList.remove('hidden');
        setupFiltersAndSelectors(); setupStatsSelectors(); setGlobalMode('2026');
    } catch (err) {
        if (animId) clearInterval(animId); 
        document.getElementById('loader').innerHTML = `<div class="text-red-500 font-bold text-sm">Ошибка синхронизации данных.</div>`;
    }
}

function setupFiltersAndSelectors() {
    const tArch = [...new Set(db.archive.map(m => m.tournament))].filter(Boolean);
    document.getElementById('archive-tournament').innerHTML = tArch.map(t => `<option value="${t}">${t}</option>`).join('');
    if(tArch.length > 0) archiveTournament = tArch[0];
    document.getElementById('archive-tournament').addEventListener('change', (e) => { archiveTournament = e.target.value; toggleSupercupBanner(archiveTournament); currentPlayoffStageArchive = ''; updateArchiveYears(); });
    document.getElementById('archive-year').addEventListener('change', (e) => { archiveYear = e.target.value; currentPlayoffStageArchive = ''; renderArchiveCore(); });

    const teams = [...new Set(db.matches2026.flatMap(m => [m.t1, m.t2]))].filter(t => t && !t.includes('КОМАНДА') && !t.includes('ПОБЕДИТЕЛЬ') && !t.includes('ПАРА')).sort();
    document.getElementById('filter-teams').innerHTML = '<option value="all">Все команды</option>' + teams.map(t => `<option value="${t}">${t}</option>`).join('');
    document.getElementById('filter-stages').innerHTML = '<option value="all">Все стадии</option><option value="Групповой этап">Групповой этап</option><option value="Плей-офф">Плей-офф</option>';
    ['filter-teams', 'filter-stages', 'filter-status'].forEach(id => { document.getElementById(id).addEventListener('change', render2026Schedule); });
    updateArchiveYears();
}

function updateArchiveYears() {
    if (!archiveTournament) return;
    const dynamicYears = [...new Set(db.archive.filter(m => m.tournament === archiveTournament).map(m => m.year))].sort((a,b)=>b-a);
    document.getElementById('archive-year').innerHTML = dynamicYears.map(y => `<option value="${y}">${y} ГОД</option>`).join('');
    archiveYear = dynamicYears[0] || '';
    switchArchiveTab(archiveTournament.toUpperCase().includes('СУПЕРКУБОК') ? 'playoffs' : 'groups', document.getElementById(archiveTournament.toUpperCase().includes('СУПЕРКУБОК') ? 'arch-tab-playoffs' : 'arch-tab-groups'));
}

function toggleSupercupBanner(tournamentName) {
    const banner = document.getElementById('supercup-banner');
    if(banner) tournamentName?.toUpperCase().includes('СУПЕРКУБОК') ? banner.classList.remove('hidden') : banner.classList.add('hidden');
}

function shortenPlayerName(fullName) {
    if (!fullName) return ''; let parts = fullName.trim().split(/\s+/);
    return parts.length >= 2 ? `${parts[0]} ${parts[1].substring(0, 1).toUpperCase()}.` : fullName;
}

function setupStatsSelectors() {
    document.getElementById('stats-gender').innerHTML = `<option value="Мужчины">МУЖЧИНЫ</option><option value="Женщины">ЖЕНЩИНЫ</option>`;
    document.getElementById('stats-gender').addEventListener('change', updateStatsTeamsList);
    document.getElementById('stats-team').addEventListener('change', renderTeamStatistics);
    updateStatsTeamsList();
}

function updateStatsTeamsList() {
    const gender = document.getElementById('stats-gender').value; let allTeams = new Set();
    db.archive.forEach(m => {
        if (m.tournament.trim().toLowerCase() === gender.trim().toLowerCase()) {
            if(m.t1 && m.t1 !== '-' && m.t1 !== '') allTeams.add(normalizeTeamName(m.t1));
            if(m.t2 && m.t2 !== '-' && m.t2 !== '') allTeams.add(normalizeTeamName(m.t2));
        }
    });
    if (gender === 'Мужчины') {
        db.matches2026.forEach(m => {
            if(m.t1 && m.t1 !== '-' && m.t1 !== '' && !m.t1.includes('КОМАНДА') && !m.t1.includes('ПАРА')) allTeams.add(normalizeTeamName(m.t1));
            if(m.t2 && m.t2 !== '-' && m.t2 !== '' && !m.t2.includes('КОМАНДА') && !m.t2.includes('ПАРА')) allTeams.add(normalizeTeamName(m.t2));
        });
    }
    const sortedTeams = [...allTeams].sort(); const teamSelect = document.getElementById('stats-team');
    if (sortedTeams.length > 0) {
        teamSelect.innerHTML = sortedTeams.map(t => `<option value="${t}">${t.toUpperCase()}</option>`).join('');
        document.getElementById('stats-content').classList.remove('hidden'); renderTeamStatistics();
    } else {
        teamSelect.innerHTML = '<option value="">Нет команд</option>'; document.getElementById('stats-content').classList.add('hidden');
    }
}

function render2026Tables() {
    const container = document.getElementById('sub-2026-tables'); container.innerHTML = '';
    const groupMatches = db.matches2026.filter(m => m.group && m.group.toLowerCase().includes('группа'));
    const groups = [...new Set(groupMatches.map(m => m.group))].sort();
    if(groups.length === 0) { container.innerHTML = `<div class="text-zinc-600 text-xs text-center py-10 italic col-span-2">Матчи группового этапа 2026 не найдены.</div>`; return; }

    let overallStandings = getStandingsArray(); let playoffTeams2026 = overallStandings.slice(0, 32).map(x => x.name.trim().toUpperCase());
    groups.forEach(gName => {
        const mInGroup = groupMatches.filter(m => m.group === gName); const sortedTeams = calculateGroupStats(mInGroup, gName);
        let html = `<div class="group-card"><table><thead><tr><th>${gName}</th><th class="col-stat">В</th><th class="col-stat">Н</th><th class="col-stat">П</th><th class="col-score">М</th><th class="col-stat">О</th></tr></thead><tbody>`;
        sortedTeams.forEach((t) => {
            let barColor = playoffTeams2026.includes(t.name.trim().toUpperCase()) ? 'green-bar' : 'red-bar';
            html += `<tr><td class="${barColor} max-w-[130px] truncate"><img src="${getGitHubLogoUrl(t.name)}" class="team-logo mr-1.5" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'">${smartTeamName(t.name)}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td><td>${t.gf}-${t.ga}</td><td class="text-neon font-black">${t.pts}</td></tr>`;
        });
        html += `</tbody></table><div class="mt-3 border-t border-zinc-800/60 pt-1.5 space-y-1.5">`;
        mInGroup.forEach(m => {
            const isPast = m.status === 'past'; let scores = getScoreDisplay(m);
            let arrowIcon = isPast ? `<span class="arrow-indicator text-neon text-[9px] ml-2 select-none">▼</span>` : '';
            let scoreBadge = isPast ? `<div class="text-neon font-black text-[11px] bg-zinc-900/80 px-2 py-0.5 rounded flex items-center shrink-0 select-none">${scores.s1} : ${scores.s2} ${arrowIcon}</div>` : `<div class="text-zinc-500 text-[11px] bg-zinc-900/30 px-2 py-0.5 rounded shrink-0 select-none">- : -</div>`;
            html += `<div class="match-row clickable-match" onclick="toggleDetails('det-2026-${m.id}', this)"><div class="flex justify-between items-center text-[10px] sm:text-[11px] font-bold uppercase gap-2 w-full"><div class="flex-1 min-w-0 truncate flex items-center pr-1"><img src="${getGitHubLogoUrl(m.t1)}" class="team-logo mr-1.5" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'"><span class="truncate">${smartTeamName(m.t1)}</span></div>${scoreBadge}<div class="flex-1 min-w-0 text-right truncate flex items-center justify-end pl-1"><span class="truncate">${smartTeamName(m.t2)}</span><img src="${getGitHubLogoUrl(m.t2)}" class="team-logo ml-1.5" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'"></div></div><div id="det-2026-${m.id}" class="details-container text-[11px] text-zinc-400"><div class="pt-2 border-t border-zinc-900/60 space-y-2 mt-2">${renderEventsInline(m.id, isPast)}</div></div></div>`;
        });
        container.innerHTML += html + `</div></div>`;
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

function render2026Schedule() {
    const container = document.getElementById('schedule-list'); if(!container) return;
    const tFilter = document.getElementById('filter-teams').value; const sFilter = document.getElementById('filter-stages').value; const statusFilter = document.getElementById('filter-status').value;
    
    let filtered = db.matches2026.filter(m => {
        if(tFilter !== 'all' && m.t1 !== tFilter && m.t2 !== tFilter) return false;
        if(sFilter !== 'all') {
            if(sFilter === 'Групповой этап' && (!m.group || !m.group.toLowerCase().includes('группа'))) return false;
            if(sFilter === 'Плей-офф' && m.group && m.group.toLowerCase().includes('группа')) return false;
        }
        if(statusFilter === 'future' && m.status !== 'future') return false;
        if(statusFilter === 'past' && m.status !== 'past') return false;
        return true;
    });

    if(filtered.length === 0) { container.innerHTML = `<div class="text-zinc-600 text-xs text-center py-10 italic">Матчи не найдены</div>`; return; }
    
    container.innerHTML = filtered.map((m) => {
        let stageLabel = m.group && m.group.toLowerCase().includes('группа') ? m.group : m.stage;
        let isPast = m.status === 'past';
        let t1Name = m.t1; let t2Name = m.t2;
        if (!m.group && (t1Name === 'КОМАНДА' || t1Name === '---' || !t1Name)) {
            t1Name = getPlayoffFallbackLabel(m.id, 't1'); t2Name = getPlayoffFallbackLabel(m.id, 't2');
        }
        let isMock1 = t1Name.includes('КОМАНДА') || t1Name.includes('ПОБЕДИТЕЛЬ') || t1Name.includes('ПАРА') || t1Name.includes('ФИНАЛИСТ');
        let isMock2 = t2Name.includes('КОМАНДА') || t2Name.includes('ПОБЕДИТЕЛЬ') || t2Name.includes('ПАРА') || t2Name.includes('ФИНАЛИСТ');

        let rightSideContent = isPast ? 
            `<div class="text-right shrink-0 select-none"><div class="text-[9px] font-bold tracking-widest text-zinc-500">СЫГРАН</div><div class="text-[9px] text-zinc-600 font-bold uppercase tracking-tight mt-0.5">${m.date || '---'}</div></div>` : 
            `<div class="text-right shrink-0 select-none"><div class="text-sm font-black tracking-wide text-white">${m.time}</div><div class="text-[9px] text-zinc-500 font-bold uppercase tracking-tight mt-0.5">${m.date || '---'}</div></div>`;

        return `<div class="bg-zinc-card border border-zinc-900 rounded-2xl p-4 flex justify-between items-center gap-4 transition-all hover:border-zinc-800/80 ${isPast ? 'opacity-60' : ''}"><div class="w-24 shrink-0 border-r border-zinc-800/60 pr-2 text-left"><div class="text-[10px] font-black text-neon truncate uppercase tracking-wider">${stageLabel}</div><div class="text-[9px] text-zinc-500 font-bold uppercase mt-0.5">ПОЛЕ #${m.field || '1'}</div></div><div class="flex-grow flex flex-col gap-2.5 min-w-0"><div class="flex items-center text-[11px] sm:text-xs font-bold text-white uppercase truncate gap-2"><img src="${getGitHubLogoUrl(t1Name)}" class="w-4 h-4 object-contain shrink-0" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'"><span class="truncate ${isMock1 ? 'text-zinc-600 font-semibold' : ''}">${smartTeamName(t1Name)}</span></div><div class="flex items-center text-[11px] sm:text-xs font-bold text-white uppercase truncate gap-2"><img src="${getGitHubLogoUrl(t2Name)}" class="w-4 h-4 object-contain shrink-0" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'"><span class="truncate ${isMock2 ? 'text-zinc-600 font-semibold' : ''}">${smartTeamName(t2Name)}</span></div></div>${rightSideContent}</div>`;
    }).join('');
}

function setPlayoffStage2026(stage) { currentPlayoffStage2026 = stage; render2026Playoffs(); }

function render2026Playoffs() {
    const nav = document.getElementById('playoff-stages-nav-2026'); const container = document.getElementById('playoff-matches-2026');
    if(!container || !nav) return; container.innerHTML = '';
    const pMatches = db.matches2026.filter(m => !m.group || !m.group.toLowerCase().includes('группа')); let stages = ['1/16', '1/8', '1/4', '1/2', 'Финал'];
    if(!stages.includes(currentPlayoffStage2026)) currentPlayoffStage2026 = stages[0];
    nav.innerHTML = stages.map(s => `<button class="playoff-stage-btn flex-1 ${currentPlayoffStage2026 === s ? 'active' : ''}" onclick="setPlayoffStage2026('${s}')">${s}</button>`).join('');

    let matchesHtml = ''; let stageMatches = pMatches.filter(m => m.stage === currentPlayoffStage2026);

    if (currentPlayoffStage2026 === '1/16') {
        const pairs = [[1, 32], [13, 20], [5, 28], [9, 24], [3, 30], [15, 18], [7, 26], [11, 22], [2, 31], [14, 19], [6, 27], [10, 23], [4, 29], [16, 17], [8, 25], [12, 21]];
        pairs.forEach((p, idx) => {
            let currentId = (101 + idx).toString(); let realMatch = stageMatches.find(m => m.id === currentId);
            let t1 = (realMatch && realMatch.t1 && realMatch.t1 !== 'КОМАНДА' && realMatch.t1 !== '---') ? realMatch.t1 : `ПАРА СЕТКИ #${p[0]}`;
            let t2 = (realMatch && realMatch.t2 && realMatch.t2 !== 'КОМАНДА' && realMatch.t2 !== '---') ? realMatch.t2 : `ПАРА СЕТКИ #${p[1]}`;
            matchesHtml += renderPlayoffCardLive(realMatch, t1, t2, p[0], p[1]);
        });
    } else if (currentPlayoffStage2026 === 'Финал') {
        const realFinal = stageMatches.find(m => m.id === '501'); matchesHtml += renderPlayoffCardLive(realFinal, 'ФИНАЛИСТ #1', 'ФИНАЛИСТ #2', '-', '-');
        const real3rd = pMatches.find(m => m.id === '502'); matchesHtml += `<div class="mt-1.5 pt-2"><div class="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1 pl-1">Матч за 3-е место</div></div>` + renderPlayoffCardLive(real3rd, 'ПРОИГРАВШИЙ 1/2 #1', 'ПРОИГРАВШИЙ 1/2 #2', '-', '-');
    } else {
        let slots = currentPlayoffStage2026 === '1/8' ? 8 : (currentPlayoffStage2026 === '1/4' ? 4 : 2);
        let startId = currentPlayoffStage2026 === '1/8' ? 201 : (currentPlayoffStage2026 === '1/4' ? 301 : 401);
        let prevLabel = currentPlayoffStage2026 === '1/8' ? '1/16' : (currentPlayoffStage2026 === '1/4' ? '1/8' : '1/4');
        for(let i = 0; i < slots; i++) {
            let currentId = (startId + i).toString(); let realMatch = stageMatches.find(m => m.id === currentId);
            let t1 = (realMatch && realMatch.t1 && realMatch.t1 !== '---') ? realMatch.t1 : `ПОБЕДИТЕЛЬ ${prevLabel} #${i * 2 + 1}`;
            let t2 = (realMatch && realMatch.t2 && realMatch.t2 !== '---') ? realMatch.t2 : `ПОБЕДИТЕЛЬ ${prevLabel} #${i * 2 + 2}`;
            matchesHtml += renderPlayoffCardLive(realMatch, t1, t2, '-', '-');
        }
    }
    container.innerHTML = matchesHtml;
}

// Все остальные сопутствующие функции... (по типу renderArchiveCore, и т.д. остаются нетронутыми из прошлой версии)
init();
