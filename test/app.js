// Основной скрипт сайта с исправленными ссылками

const APPS_SCRIPT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyUL_F_2aLAE_LCFgO4-Z25TVwwceSloceTVtksiiE-PjOMO4DdhFggygoFOI5s1nbk/exec";

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

function showRosterModal(teamName) {
    document.getElementById('roster-modal-team').innerText = teamName.toUpperCase();
    const listEl = document.getElementById('roster-modal-list'); listEl.innerHTML = '';
    const roster = db.players2026.filter(p => p.team.toUpperCase() === teamName.toUpperCase());
    if (roster.length === 0) {
        listEl.innerHTML = `<div class="text-center italic text-zinc-600 py-4">Состав команды не внесен</div>`;
    } else {
        roster.forEach((p, idx) => {
            listEl.innerHTML += `<div class="flex items-center gap-3 py-1"><span class="text-zinc-600 font-bold text-[10px] w-4">${idx+1}.</span><span class="text-zinc-200 font-semibold uppercase tracking-wide">${p.name}</span></div>`;
        });
    }
    document.getElementById('roster-modal').classList.remove('hidden');
}

function closeRosterModal() { document.getElementById('roster-modal').classList.add('hidden'); }

function renderTeamStatistics() {
    const team = document.getElementById('stats-team').value; const gender = document.getElementById('stats-gender').value;
    if (!team) return;
    let isMen = (gender === 'Мужчины'); document.getElementById('stats-team-title').innerText = team;
    document.getElementById('stats-team-logo').src = getGitHubLogoUrl(team);
    document.getElementById('stats-team-geo').innerHTML = getTeamGeoHtml(team, isMen);
    const btnContainer = document.getElementById('roster-btn-container');
    const hasRoster = db.players2026.some(p => p.team.toUpperCase() === team.toUpperCase());
    if (hasRoster) {
        btnContainer.innerHTML = `<button onclick="showRosterModal('${team}')" class="w-full sm:w-auto px-6 py-3 rounded-2xl bg-neon/10 border border-neon/30 text-neon font-black uppercase text-[10px] tracking-widest hover:bg-neon hover:text-black transition-all shadow-[0_0_15px_rgba(0,230,118,0.15)] mb-2">Актуальный состав</button>`;
    } else { btnContainer.innerHTML = ''; }
    let participations = new Set(); let games = 0, w = 0, d = 0, l = 0, gf = 0, ga = 0;
    let historyMatches = []; let activeArchiveYears = new Set();
    let bestStagesMap = {};

    function processMatch(m, yearStr) {
        let t1Norm = normalizeTeamName(m.t1); let t2Norm = normalizeTeamName(m.t2);
        if (t1Norm !== team && t2Norm !== team) return;
        if (!t1Norm || t1Norm === '-' || t1Norm === '' || !t2Norm || t2Norm === '-' || t2Norm === '') return;
        participations.add(yearStr); if (yearStr !== '2026') { activeArchiveYears.add(yearStr); } games++;
        let isT1 = t1Norm === team; let teamScore = isT1 ? m.s1 : m.s2; let oppScore = isT1 ? m.s2 : m.s1;
        let teamPen = isT1 ? m.p1 : m.p2; let oppPen = isT1 ? m.p2 : m.p1;
        if(teamScore !== null && oppScore !== null) { gf += teamScore; ga += oppScore; }
        let isWin = false, isLoss = false;
        if (teamScore > oppScore) isWin = true; else if (teamScore < oppScore) isLoss = true;
        else if (teamPen !== null && oppPen !== null) { if (teamPen > oppPen) isWin = true; else isLoss = true; }
        if (isWin) w++; else if (isLoss) l++; else d++;
        let currentStage = m.stage || 'Групповой этап';
        if (m.group && m.group.toLowerCase().includes('группа')) currentStage = 'Групповой этап';
        let label = currentStage.toUpperCase();
        if (currentStage.toLowerCase().includes('финал') && !currentStage.toLowerCase().includes('3-е')) { label = isWin ? '1 МЕСТО 🏆' : '2 МЕСТО 🥈'; } 
        else if (currentStage.toLowerCase().includes('3-е место')) { label = isWin ? '3 МЕСТО 🥉' : '4 МЕСТО'; }
        if(!bestStagesMap[label]) bestStagesMap[label] = [];
        if(!bestStagesMap[label].includes(yearStr)) bestStagesMap[label].push(yearStr);
        historyMatches.push({ year: yearStr, stage: currentStage.toLowerCase().includes('группа') ? 'Групповой этап' : currentStage, opponent: isT1 ? t2Norm : t1Norm, scoreText: (teamScore !== null ? `${teamScore}:${oppScore}` : '-:-') + (teamPen !== null ? ` (${teamPen}:${oppPen} пен)` : ''), isWin: isWin, isLoss: isLoss });
    }
    db.archive.forEach(m => { if (m.tournament.trim().toLowerCase() === gender.trim().toLowerCase()) processMatch(m, m.year); });
    if (gender === 'Мужчины' || gender === 'Женщины') { db.matches2026.forEach(m => { if (m.status === 'past') processMatch(m, '2026'); }); }
    const stageWeight = { '1 МЕСТО 🏆': 10, '2 МЕСТО 🥈': 9, '3 МЕСТО 🥉': 8, '4 МЕСТО': 7, '1/2': 6, '1/4': 5, '1/8': 4, '1/16': 3, '1/32': 2, 'ГРУППОВОЙ ЭТАП': 1 };
    let bestLabel = '--'; let bestWeight = -1;
    Object.keys(bestStagesMap).forEach(lbl => {
        let wKey = Object.keys(stageWeight).find(k => lbl.includes(k)) || 'ГРУППОВОЙ ЭТАП';
        if(stageWeight[wKey] > bestWeight) { bestWeight = stageWeight[wKey]; bestLabel = lbl; }
    });
    document.getElementById('stat-box-participations').innerText = participations.size;
    document.getElementById('stat-box-result').className = "text-[10px] font-black text-white uppercase tracking-tight whitespace-nowrap";
    document.getElementById('stat-box-result').innerHTML = bestLabel;
    document.getElementById('stat-box-result-year').innerText = bestLabel !== '--' ? bestStagesMap[bestLabel].sort((a,b)=>b-a).join(', ') : '';
    document.getElementById('stat-box-games').innerText = games;
    document.getElementById('stat-box-w').innerText = w; document.getElementById('stat-box-d').innerText = d; document.getElementById('stat-box-l').innerText = l;
    document.getElementById('stat-box-gf').innerText = gf; document.getElementById('stat-box-ga').innerText = ga;
    const badgesContainer = document.getElementById('stats-team-badges'); const mainCardEl = document.getElementById('stats-team-card');
    badgesContainer.innerHTML = ''; let badgesHtml = '';
    
    // ПУНКТ 1: Исправлено отображение Хозяев и Ветеранов на основе корректного текстового мэтчинга стадий
    if (bestStagesMap['1 МЕСТО 🏆']) { badgesHtml += `<div class="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full text-amber-400 text-[10px] font-black">🥇 <span class="opacity-70 font-bold">х</span>${bestStagesMap['1 МЕСТО 🏆'].length}</div>`; }
    if (bestStagesMap['2 МЕСТО 🥈']) { badgesHtml += `<div class="flex items-center gap-1 bg-slate-400/10 border border-slate-400/30 px-2.5 py-1 rounded-full text-slate-300 text-[10px] font-black">🥈 <span class="opacity-70 font-bold">х</span>${bestStagesMap['2 МЕСТО 🥈'].length}</div>`; }
    if (bestStagesMap['3 МЕСТО 🥉']) { badgesHtml += `<div class="flex items-center gap-1 bg-amber-700/10 border border-amber-700/30 px-2.5 py-1 rounded-full text-amber-600 text-[10px] font-black">🥉 <span class="opacity-70 font-bold">х</span>${bestStagesMap['3 МЕСТО 🥉'].length}</div>`; }
    
    let isHost = team.trim().toUpperCase().includes('КУТУЕВО');
    let requiredYears = ['2019', '2020', '2021', '2022', '2023', '2024', '2025'];
    let isVeteran = requiredYears.every(y => activeArchiveYears.has(y));
    if (isVeteran) { badgesHtml += `<span class="px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide border border-neon/40 bg-neon/10 text-neon">💎 ВЕТЕРАН</span>`; }
    if (isHost) { badgesHtml += `<span class="px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide border border-white/20 bg-white/5 text-white">🏠 ХОЗЯЕВА</span>`; }
    badgesContainer.innerHTML = badgesHtml;

    mainCardEl.className = mainCardEl.className.replace(/\s(before:bg-[^\s]+|border-[^\s]+|shadow-[^\s]+)/g, '');
    if (bestStagesMap['1 МЕСТО 🏆']) { mainCardEl.style.borderColor = 'rgba(234, 179, 8, 0.25)'; mainCardEl.style.boxShadow = '0 30px 60px -15px rgba(234, 179, 8, 0.12)'; mainCardEl.style.backgroundImage = 'radial-gradient(ellipse 70% 70% at 0% 0%, rgba(234, 179, 8, 0.12) 0%, rgba(0, 0, 0, 0) 100%)'; }
    else { mainCardEl.style.borderColor = 'rgba(63, 63, 70, 0.4)'; mainCardEl.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.5)'; mainCardEl.style.backgroundImage = 'radial-gradient(ellipse 70% 70% at 0% 0%, rgba(255, 255, 255, 0.04) 0%, rgba(0, 0, 0, 0) 100%)'; }
    historyMatches.sort((a, b) => b.year - a.year); let matchesByYear = {};
    historyMatches.forEach(m => { if (!matchesByYear[m.year]) matchesByYear[m.year] = []; matchesByYear[m.year].push(m); });
    const yearsContainer = document.getElementById('stats-years-container');
    if (historyMatches.length === 0) { yearsContainer.innerHTML = `<div class="text-zinc-600 text-xs text-center py-6 italic">Матчи не найдены</div>`; }
    else {
        yearsContainer.innerHTML = Object.keys(matchesByYear).sort((a, b) => b - a).map(year => {
            let matchesHtml = matchesByYear[year].map(m => {
                let resColor = m.isWin ? 'text-neon' : (m.isLoss ? 'text-red-500' : 'text-zinc-400');
                return `<div class="bg-zinc-card/30 border border-zinc-900/60 p-3 rounded-xl flex justify-between text-[10px] sm:text-[11px] font-bold uppercase items-center w-full"><div class="space-y-0.5 flex-1 min-w-0 pr-2"><div class="text-zinc-500 text-[9px] font-bold">${m.stage}</div><div class="flex items-center text-white truncate font-medium"><span class="text-zinc-500 font-bold mr-1.5">vs</span><img src="${getGitHubLogoUrl(m.opponent)}" class="team-logo mr-1.5" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'"><span class="truncate text-zinc-300 font-bold">${smartTeamName(m.opponent)}</span></div></div><div class="text-right font-black shrink-0 ${resColor} text-xs sm:text-sm tracking-wide pl-2">${m.scoreText}</div></div>`;
            }).join('');
            return `<div class="bg-zinc-card/60 border border-zinc-800/80 rounded-[24px] p-3 flex flex-col gap-2"><div class="text-neon font-black text-xs sm:text-sm tracking-wider px-1 py-0.5 border-b border-zinc-800/50 pb-1.5 flex items-center justify-between"><span>${year} ГОД</span><span class="text-[9px] text-zinc-500 font-bold">${matchesByYear[year].length} МАТЧ(ЕЙ)</span></div><div class="flex flex-col gap-1.5">${matchesHtml}</div></div>`;
        }).join('');
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
        if (!m.group && (t1Name === 'КОМАНДА' || t1Name === '---' || !t1Name)) { t1Name = getPlayoffFallbackLabel(m.id, 't1'); t2Name = getPlayoffFallbackLabel(m.id, 't2'); }
        let isMock1 = t1Name.includes('КОМАНДА') || t1Name.includes('ПОБЕДИТЕЛЬ') || t1Name.includes('ПАРА') || t1Name.includes('ФИНАЛИСТ');
        let isMock2 = t2Name.includes('КОМАНДА') || t2Name.includes('ПОБЕДИТЕЛЬ') || t2Name.includes('ПАРА') || t2Name.includes('ФИНАЛИСТ');
        let rightSideContent = isPast ? `<div class="text-right shrink-0 select-none"><div class="text-[9px] font-bold tracking-widest text-zinc-500">СЫГРАН</div><div class="text-[9px] text-zinc-600 font-bold uppercase tracking-tight mt-0.5">${m.date || '---'}</div></div>` : `<div class="text-right shrink-0 select-none"><div class="text-sm font-black tracking-wide text-white">${m.time}</div><div class="text-[9px] text-zinc-500 font-bold uppercase tracking-tight mt-0.5">${m.date || '---'}</div></div>`;
        return `<div class="bg-zinc-card border border-zinc-900 rounded-2xl p-4 flex justify-between items-center gap-4 transition-all hover:border-zinc-800/80 ${isPast ? 'opacity-60' : ''}"><div class="w-24 shrink-0 border-r border-zinc-800/60 pr-2 text-left"><div class="text-[10px] font-black text-neon truncate uppercase tracking-wider">${stageLabel}</div><div class="text-[9px] text-zinc-500 font-bold uppercase mt-0.5">ПОЛЕ #${m.field || '1'}</div></div><div class="flex-grow flex flex-col gap-2.5 min-w-0"><div class="flex items-center text-[11px] sm:text-xs font-bold text-white uppercase truncate gap-2"><img src="${getGitHubLogoUrl(t1Name)}" class="w-4 h-4 object-contain shrink-0" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'"><span class="truncate ${isMock1 ? 'text-zinc-600 font-semibold' : ''}">${smartTeamName(t1Name)}</span></div><div class="flex items-center text-[11px] sm:text-xs font-bold text-white uppercase truncate gap-2"><img src="${getGitHubLogoUrl(t2Name)}" class="w-4 h-4 object-contain shrink-0" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'"><span class="truncate ${isMock2 ? 'text-zinc-600 font-semibold' : ''}">${smartTeamName(t2Name)}</span></div></div>${rightSideContent}</div>`;
    }).join('');
}

function getPlayoffFallbackLabel(matchId, side) {
    let id = parseInt(matchId);
    if (id >= 101 && id <= 116) {
        const pairs = [[1, 32], [13, 20], [5, 28], [9, 24], [3, 30], [15, 18], [7, 26], [11, 22], [2, 31], [14, 19], [6, 27], [10, 23], [4, 29], [16, 17], [8, 25], [12, 21]];
        let p = pairs[id - 101]; return side === 't1' ? `ПАРА СЕТКИ #${p[0]}` : `ПАРА СЕТКИ #${p[1]}`;
    }
    if (id >= 201 && id <= 208) { let base = (id - 201) * 2; return side === 't1' ? `ПОБЕДИТЕЛЬ 1/16 #${base + 1}` : `ПОБЕДИТЕЛЬ 1/16 #${base + 2}`; }
    if (id >= 301 && id <= 304) { let base = (id - 301) * 2; return side === 't1' ? `ПОБЕДИТЕЛЬ 1/8 #${base + 1}` : `ПОБЕДИТЕЛЬ 1/8 #${base + 2}`; }
    if (id === 401 || id === 402) { let base = (id - 401) * 2; return side === 't1' ? `ПОБЕДИТЕЛЬ 1/4 #${base + 1}` : `ПОБЕДИТЕЛЬ 1/4 #${base + 2}`; }
    if (id === 501) return side === 't1' ? 'ФИНАЛИСТ #1' : 'ФИНАЛИСТ #2';
    if (id === 502) return side === 't1' ? 'ПРОИГРАВШИЙ 1/2 #1' : 'ПРОИГРАВШИЙ 1/2 #2';
    return 'КОМАНДА';
}

function getStandingsArray() {
    const groupMatches = db.matches2026.filter(m => m.group && m.group.toLowerCase().includes('группа'));
    const groups = [...new Set(groupMatches.map(m => m.group))].sort();
    let ranksMap = {};
    groups.forEach(g => {
        calculateGroupStats(groupMatches.filter(m => m.group === g), g).forEach((tStats, rankIdx) => {
            let currentRank = rankIdx + 1; if (!ranksMap[currentRank]) ranksMap[currentRank] = []; ranksMap[currentRank].push(tStats);
        });
    });
    let finalStandings = [];
    Object.keys(ranksMap).sort((a,b) => a - b).forEach(rank => {
        let layer = ranksMap[rank];
        layer.sort((a, b) => {
            if (b.pts !== a.pts) return b.pts - a.pts;
            if ((b.gf - b.ga) !== (a.gf - a.ga)) return (b.gf - b.ga) - (a.gf - a.ga);
            if (b.gf !== a.gf) return b.gf - a.gf;
            if (db.loats && db.loats['overall']) {
                let order = db.loats['overall']; let idxA = order.indexOf(a.name.toUpperCase()); let idxB = order.indexOf(b.name.toUpperCase());
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            }
            return 0;
        });
        finalStandings = finalStandings.concat(layer);
    });
    return finalStandings;
}

function render2026OverallStandings() {
    const tbody = document.querySelector('#overall-table tbody'); if(!tbody) return; tbody.innerHTML = '';
    let sm = getStandingsArray(); if(sm.length === 0) { tbody.innerHTML = `<tr><td colspan="7" class="text-zinc-600 text-xs text-center py-10 italic">Нет данных</td></tr>`; return; }
    tbody.innerHTML = sm.map((t, i) => `<tr class="hover:bg-zinc-900/30 transition-colors border-b border-zinc-900/20 last:border-none"><td class="text-left font-bold py-3 text-[10px] sm:text-xs max-w-[150px] truncate ${i < 32 ? 'green-bar' : 'red-bar'}"><span class="inline-block text-zinc-500 font-bold mr-1 w-4 shrink-0">${i+1}.</span><img src="${getGitHubLogoUrl(t.name)}" class="team-logo mr-1.5" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'"><span>${smartTeamName(t.name)}</span></td><td>${t.games}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td><td>${t.gf}-${t.ga}</td><td class="text-neon font-black">${t.pts}</td></tr>`).join('');
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

function renderArchiveCore() {
    if (!archiveYear || !archiveTournament) return;
    const mArch = db.archive.filter(m => m.year === archiveYear && m.tournament === archiveTournament);
    const gContainer = document.getElementById('archive-groups'); const pContainer = document.getElementById('archive-playoffs'); const rContainer = document.getElementById('archive-results'); const bContainer = document.getElementById('archive-best'); const rInfo = document.getElementById('archive-rules-info');
    [gContainer, pContainer, rContainer, bContainer, rInfo].forEach(c => c?.classList.add('hidden'));
    const isSupercup = archiveTournament.toUpperCase().includes('СУПЕРКУБОК');
    if(activeArchiveTab === 'groups') {
        gContainer.classList.remove('hidden'); gContainer.innerHTML = ''; rInfo.classList.remove('hidden');
        rInfo.innerHTML = `<h4 class="text-[10px] font-black text-neon uppercase tracking-wider mb-2 select-none">Расшифровка зон таблицы</h4><div class="flex flex-wrap gap-4 items-center mb-3 text-[10px] font-bold uppercase tracking-tight"><div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 bg-[#00E676] rounded-sm shadow-[0_0_8px_rgba(0,230,118,0.4)]"></span> Плей-офф</div><div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 bg-[#EAB308] rounded-sm shadow-[0_0_8px_rgba(234,179,8,0.4)]"></span> Плей-ин</div><div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 bg-[#EF4444] rounded-sm shadow-[0_0_8px_rgba(239,68,68,0.4)]"></span> Вылет</div></div><div class="text-[9px] text-zinc-500 font-semibold leading-relaxed border-t border-zinc-800/60 pt-2">ПРАВИЛА ПРИ РАВЕНСТВЕ ОЧКОВ: 1. ЛИЧНЫЕ ВСТРЕЧИ; 2. РАЗНИЦА МЯЧЕЙ; 3. ЗАБИТЫЕ ГОЛЫ.</div>`;
        if (isSupercup) { gContainer.innerHTML = `<div class="text-zinc-500 text-xs text-center py-12 italic">Групповой этап не проводился</div>`; return; }
        const groupM = mArch.filter(m => m.stage.toLowerCase().includes('группа')); const groups = [...new Set(groupM.map(m => m.stage))].sort();
        if(groups.length === 0) { gContainer.innerHTML = `<div class="text-zinc-600 text-xs text-center py-10 italic">Групповой этап не найден.</div>`; return; }
        const playoffTeams = new Set(mArch.filter(m => !m.stage.toLowerCase().includes('группа')).flatMap(m => [m.t1, m.t2]).filter(Boolean));
        groups.forEach(g => {
            const sorted = calculateGroupStats(groupM.filter(m => m.stage === g));
            let html = `<div class="group-card"><table><thead><tr><th>${g}</th><th class="col-stat">В</th><th class="col-stat">Н</th><th class="col-stat">П</th><th class="col-score">М</th><th class="col-stat">О</th></tr></thead><tbody>`;
            sorted.forEach((t, idx) => {
                let bar = playoffTeams.has(t.name) ? 'green-bar' : 'red-bar'; if (archiveYear === '2023') bar = idx === 0 ? 'green-bar' : (idx === 1 || idx === 2 ? 'lime-bar' : 'red-bar');
                html += `<tr><td class="${bar} max-w-[140px] truncate"><img src="${getGitHubLogoUrl(t.name)}" class="team-logo mr-1.5" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'">${smartTeamName(t.name)}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td><td>${t.gf}-${t.ga}</td><td class="text-neon font-black">${t.pts}</td></tr>`;
            });
            gContainer.innerHTML += html + `</tbody></table></div>`;
        });
    }
    if(activeArchiveTab === 'playoffs') {
        pContainer.classList.remove('hidden'); const playM = mArch.filter(m => !m.stage.toLowerCase().includes('группа'));
        let stages = [...new Set(playM.map(m => m.stage))].filter(s => s && !s.toLowerCase().includes('3-е место'));
        const order = ['1/32', '1/16', '1/8', '1/4', '1/2', 'Финал']; stages.sort((a, b) => order.findIndex(o => a.toLowerCase().includes(o.toLowerCase())) - order.findIndex(o => b.toLowerCase().includes(o.toLowerCase())));
        if(stages.length === 0) { document.getElementById('archive-playoff-matches').innerHTML = `<div class="text-zinc-600 text-xs text-center py-10 italic">Плей-офф отсутствует</div>`; return; }
        if(!currentPlayoffStageArchive || !stages.includes(currentPlayoffStageArchive)) currentPlayoffStageArchive = stages[0];
        document.getElementById('archive-playoff-nav').innerHTML = stages.map(s => `<button class="playoff-stage-btn flex-1 text-[10px] !py-2.5 ${currentPlayoffStageArchive === s ? 'active' : ''}" onclick="setPlayoffStageArchive('${s}')">${s}</button>`).join('');
        let matchesHtml = ''; let stageMatches = playM.filter(m => m.stage === currentPlayoffStageArchive);
        if(currentPlayoffStageArchive.toLowerCase().includes('финал')) { const tm = playM.find(m => m.stage.toLowerCase().includes('3-е место')); if(tm) stageMatches.push(tm); }
        stageMatches.forEach(m => { matchesHtml += renderPlayoffCard(m, m.t1, m.t2); });
        document.getElementById('archive-playoff-matches').innerHTML = matchesHtml;
    }
    if(activeArchiveTab === 'results') {
        rContainer.classList.remove('hidden'); rContainer.innerHTML = ''; const stages = [...new Set(mArch.map(m => m.stage))];
        if(stages.length === 0) { rContainer.innerHTML = `<div class="text-zinc-600 text-xs text-center py-10 italic">Матчи отсутствуют</div>`; return; }
        rContainer.innerHTML = stages.map(stg => {
            let ml = mArch.filter(m => m.stage === stg).map(m => {
                let scores = getScoreDisplay(m);
                return `<div class="bg-zinc-card/40 border border-zinc-900 p-3 rounded-xl flex justify-between text-[10px] sm:text-[11px] font-bold uppercase items-center w-full"><div class="space-y-1 flex-1 min-w-0 pr-2"><div class="flex items-center truncate"><img src="${getGitHubLogoUrl(m.t1)}" class="team-logo mr-2" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'">${smartTeamName(m.t1)}</div><div class="flex items-center truncate"><img src="${getGitHubLogoUrl(m.t2)}" class="team-logo mr-2" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'">${smartTeamName(m.t2)}</div></div><div class="text-right text-neon font-black space-y-1 shrink-0"><div>${scores.s1}</div><div>${scores.s2}</div></div></div>`;
            }).join('');
            return `<div class="mb-4"><h4 class="text-xs font-black text-neon uppercase tracking-wider mb-2">${stg}</h4><div class="flex flex-col gap-2.5 w-full">${ml}</div></div>`;
        }).join('');
    }
    if(activeArchiveTab === 'best') { bContainer.classList.remove('hidden'); loadFilteredBestPlayers(); }
}

function setGlobalMode(mode) {
    currentGlobalMode = mode;
    const view2026 = document.getElementById('view-2026'); const viewArch = document.getElementById('view-archive'); const viewStats = document.getElementById('view-stats');
    const tabs2026 = document.getElementById('nav-2026-tabs').parentElement; const ctrlsArch = document.getElementById('archive-controls');
    [view2026, viewArch, viewStats].forEach(v => v.classList.add('hidden'));
    ['mode-btn-2026', 'mode-btn-stats', 'mode-btn-archive'].forEach(id => { document.getElementById(id).className = "flex flex-col items-center justify-center w-1/3 py-2 text-gray-500 hover:text-white transition-colors outline-none cursor-pointer"; });
    if(mode === '2026') {
        view2026.classList.remove('hidden'); tabs2026.classList.remove('hidden'); ctrlsArch.classList.add('hidden');
        document.getElementById('mode-btn-2026').className = "flex flex-col items-center justify-center w-1/3 py-2 text-neon transition-colors outline-none cursor-pointer";
        render2026Core();
    } else if (mode === 'archive') {
        viewArch.classList.remove('hidden'); tabs2026.classList.add('hidden'); ctrlsArch.classList.remove('hidden');
        document.getElementById('mode-btn-archive').className = "flex flex-col items-center justify-center w-1/3 py-2 text-neon transition-colors outline-none cursor-pointer";
        renderArchiveCore();
    } else if (mode === 'stats') {
        viewStats.classList.remove('hidden'); tabs2026.classList.add('hidden'); ctrlsArch.classList.add('hidden');
        document.getElementById('mode-btn-stats').className = "flex flex-col items-center justify-center w-1/3 py-2 text-neon transition-colors outline-none cursor-pointer";
        renderTeamStatistics();
    }
}

init();