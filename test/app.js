// Основное ядро приложения, рендеринг и панель управления

const APPS_SCRIPT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxBzGlyyqMKlqNwW3-8LaQMQswAgBBXeehO0rXRS1rWOyI5cTxOJG6ca9XdhV4t05LT/exec";

const URLS_2026 = {
    archive: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRm1C8ix_HjpSlkuU3D9GdOaZy2hs8CeKdQM11SAlwseAn9X6o9Q7vw-KlOJIjTjcn_bmFidY6gQBqB/pub?gid=0&single=true&output=csv',
    matches: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRm1C8ix_HjpSlkuU3D9GdOaZy2hs8CeKdQM11SAlwseAn9X6o9Q7vw-KlOJIjTjcn_bmFidY6gQBqB/pub?gid=1442464542&single=true&output=csv',
    goals: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRm1C8ix_HjpSlkuU3D9GdOaZy2hs8CeKdQM11SAlwseAn9X6o9Q7vw-KlOJIjTjcn_bmFidY6gQBqB/pub?gid=1335071059&single=true&output=csv',
    players: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRm1C8ix_HjpSlkuU3D9GdOaZy2hs8CeKdQM11SAlwseAn9X6o9Q7vw-KlOJIjTjcn_bmFidY6gQBqB/pub?gid=559105845&single=true&output=csv',
    geo: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRm1C8ix_HjpSlkuU3D9GdOaZy2hs8CeKdQM11SAlwseAn9X6o9Q7vw-KlOJIjTjcn_bmFidY6gQBqB/pub?gid=603732331&single=true&output=csv',
    best: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRm1C8ix_HjpSlkuU3D9GdOaZy2hs8CeKdQM11SAlwseAn9X6o9Q7vw-KlOJIjTjcn_bmFidY6gQBqB/pub?gid=1220926923&single=true&output=csv',
    groups2026: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRm1C8ix_HjpSlkuU3D9GdOaZy2hs8CeKdQM11SAlwseAn9X6o9Q7vw-KlOJIjTjcn_bmFidY6gQBqB/pub?gid=174826189&single=true&output=csv',
    loats: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRm1C8ix_HjpSlkuU3D9GdOaZy2hs8CeKdQM11SAlwseAn9X6o9Q7vw-KlOJIjTjcn_bmFidY6gQBqB/pub?gid=987261895&single=true&output=csv'
};

let db = { matches2026: [], goals2026: [], players2026: [], archive: [], geo: {}, bestPlayers: [], groups2026: [], loats: {} };
let currentGlobalMode = '2026'; let active2026Tab = 'tables'; let activeArchiveTab = 'groups';
let archiveYear = ''; let archiveTournament = ''; let currentPlayoffStage2026 = '1/16'; let currentPlayoffStageArchive = '';
let animId = null; let adminSecretClicks = 0; let adminClicksTimeout = null; let activeAdminTab = 'group';

function handleAdminSecretClick() {
    adminSecretClicks++;
    clearTimeout(adminClicksTimeout);
    adminClicksTimeout = setTimeout(() => { adminSecretClicks = 0; }, 2000);
    if (adminSecretClicks >= 5) {
        adminSecretClicks = 0;
        enterAdminMode();
    }
}

function enterAdminMode() {
    document.getElementById('main-site-view').classList.add('hidden');
    document.getElementById('bottom-bar-nav').classList.add('hidden');
    document.getElementById('admin-view').classList.remove('hidden');
    renderAdminPanel();
}

function exitAdminMode() {
    document.getElementById('admin-view').classList.add('hidden');
    document.getElementById('main-site-view').classList.remove('hidden');
    document.getElementById('bottom-bar-nav').classList.remove('hidden');
    setGlobalMode(currentGlobalMode);
}

function switchAdminTab(type) {
    activeAdminTab = type;
    document.getElementById('admin-tab-btn-group').className = type === 'group' ? "flex-1 py-2 text-[10px] font-black uppercase text-center rounded-xl bg-white text-black" : "flex-1 py-2 text-[10px] font-black uppercase text-center rounded-xl text-zinc-400";
    document.getElementById('admin-tab-btn-playoff').className = type === 'playoff' ? "flex-grow py-2 text-[10px] font-black uppercase text-center rounded-xl bg-white text-black" : "flex-grow py-2 text-[10px] font-black uppercase text-center rounded-xl text-zinc-400";
    renderAdminPanel();
}

function getGitHubLogoUrl(teamName) {
    let clean = normalizeTeamName(teamName).trim();
    if (!clean || clean === '' || clean === '---' || clean.toUpperCase() === 'КОМАНДА' || clean.toUpperCase().includes('ПОБЕДИТЕЛЬ') || clean.toUpperCase().includes('ПРОИГРАВШИЙ')) {
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
        const [rM, rG, rP, rA, rGeo, rB, rGr, rL] = await Promise.all([
            fetch(URLS_2026.matches + '&cb=' + Date.now()).then(r => r.text()),
            fetch(URLS_2026.goals + '&cb=' + Date.now()).then(r => r.text()),
            fetch(URLS_2026.players + '&cb=' + Date.now()).then(r => r.text()),
            fetch(URLS_2026.archive + '&cb=' + Date.now()).then(r => r.text()),
            fetch(URLS_2026.geo + '&cb=' + Date.now()).then(r => r.text()),
            fetch(URLS_2026.best + '&cb=' + Date.now()).then(r => r.text()),
            fetch(URLS_2026.groups2026 + '&cb=' + Date.now()).then(r => r.text()),
            fetch(URLS_2026.loats + '&cb=' + Date.now()).then(r => r.text())
        ]);
        db.matches2026 = parseCoreCSV(rM, 'm'); db.goals2026 = parseCoreCSV(rG, 'g'); db.players2026 = parseCoreCSV(rP, 'p'); db.archive = parseArchiveCSV(rA);
        parseGeoCSV(rGeo); parseBestPlayersCSV(rB); parseGroups2026CSV(rGr); parseLoatsCSV(rL);
        
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

    const teams = [...new Set(db.matches2026.flatMap(m => [m.t1, m.t2]))].filter(t => t && !t.includes('КОМАНДА') && !t.includes('ПОБЕДИТЕЛЬ')).sort();
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
            if(m.t1 && m.t1 !== '-' && m.t1 !== '' && !m.t1.includes('КОМАНДА')) allTeams.add(normalizeTeamName(m.t1));
            if(m.t2 && m.t2 !== '-' && m.t2 !== '' && !m.t2.includes('КОМАНДА')) allTeams.add(normalizeTeamName(m.t2));
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
            listEl.innerHTML += `
                <div class="flex items-center gap-3 py-1">
                    <span class="text-zinc-600 font-bold text-[10px] w-4">${idx+1}.</span>
                    <span class="text-zinc-200 font-semibold uppercase tracking-wide">${p.name}</span>
                </div>`;
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

    // Добавляем красивую неоновую кнопку актуального состава, если игроки найдены в БД
    const btnContainer = document.getElementById('roster-btn-container');
    const hasRoster = db.players2026.some(p => p.team.toUpperCase() === team.toUpperCase());
    if (hasRoster) {
        btnContainer.innerHTML = `<button onclick="showRosterModal('${team}')" class="px-5 py-2 rounded-xl bg-neon/10 border border-neon/30 text-neon font-black uppercase text-[9px] tracking-widest hover:bg-neon hover:text-black transition-all shadow-[0_0_15px_rgba(0,230,118,0.15)]">Актуальный состав</button>`;
    } else { btnContainer.innerHTML = ''; }

    let participations = new Set(); let games = 0, w = 0, d = 0, l = 0, gf = 0, ga = 0;
    let historyMatches = []; let bestWeight = -1; let bestStageText = 'Групповой этап'; let bestYear = '--';
    let goldYears = [], silverYears = [], bronzeYears = []; let activeArchiveYears = new Set();

    const stageWeight = { 'Финал_Победа': 10, 'Финал_Поражение': 9, '3-е место_Победа': 8, '3-е место_Поражение': 7, '1/2': 6, '1/4': 5, '1/8': 4, '1/16': 3, '1/32': 2, 'Групповой этап': 1 };

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
        let weightKey = 'Групповой этап'; let displayText = currentStage.toLowerCase().includes('группа') ? 'ГРУППОВОЙ ЭТАП' : currentStage.toUpperCase();

        if (currentStage.toLowerCase().includes('финал') && !currentStage.toLowerCase().includes('3-е')) {
            if (isWin) { weightKey = 'Финал_Победа'; displayText = '1 МЕСТО 🏆'; goldYears.push(yearStr); } 
            else { weightKey = 'Финал_Поражение'; displayText = '2 МЕСТО 🥈'; silverYears.push(yearStr); }
        } else if (currentStage.toLowerCase().includes('3-е место')) {
            if (isWin) { weightKey = '3-е место_Победа'; displayText = '3 МЕСТО 🥉'; bronzeYears.push(yearStr); } 
            else { weightKey = '3-е место_Поражение'; displayText = '4 МЕСТО'; }
        } else { weightKey = Object.keys(stageWeight).find(k => currentStage.includes(k)) || 'Групповой этап'; }

        let currentWeight = stageWeight[weightKey] || 1;
        if (currentWeight > bestWeight) { bestWeight = currentWeight; bestStageText = displayText; bestYear = yearStr; }

        historyMatches.push({
            year: yearStr, stage: currentStage.toLowerCase().includes('группа') ? 'Групповой этап' : currentStage, opponent: isT1 ? t2Norm : t1Norm,
            scoreText: (teamScore !== null ? `${teamScore}:${oppScore}` : '-:-') + (teamPen !== null ? ` (${teamPen}:${oppPen} пен)` : ''), isWin: isWin, isLoss: isLoss
        });
    }

    db.archive.forEach(m => { if (m.tournament.trim().toLowerCase() === gender.trim().toLowerCase()) processMatch(m, m.year); });
    if (gender === 'Мужчины' || gender === 'Женщины') { db.matches2026.forEach(m => { if (m.status === 'past') processMatch(m, '2026'); }); }

    document.getElementById('stat-box-participations').innerText = participations.size;
    document.getElementById('stat-box-result').innerHTML = bestStageText === 'ГРУППОВОЙ ЭТАП' ? 'ГРУППОВОЙ<br>ЭТАП' : bestStageText;
    document.getElementById('stat-box-result-year').innerText = bestYear !== '--' ? `${bestYear} ГОД` : '';
    document.getElementById('stat-box-games').innerText = games;
    document.getElementById('stat-box-w').innerText = w; document.getElementById('stat-box-d').innerText = d; document.getElementById('stat-box-l').innerText = l;
    document.getElementById('stat-box-gf').innerText = gf; document.getElementById('stat-box-ga').innerText = ga;

    const badgesContainer = document.getElementById('stats-team-badges'); const mainCardEl = document.getElementById('stats-team-card');
    badgesContainer.innerHTML = ''; let badgesHtml = ''; let isChampion = goldYears.length > 0;
    const requiredYears = ['2019', '2020', '2021', '2022', '2023', '2024', '2025'];
    let isVeteran = requiredYears.every(y => activeArchiveYears.has(y)); let isHost = team.trim().toUpperCase().includes('КУТУЕВО');

    if (goldYears.length > 0) { badgesHtml += `<div class="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full text-amber-400 text-[10px] font-black tracking-wide shadow-[0_0_10px_rgba(234,179,8,0.15)] select-none">🥇 <span class="opacity-70 font-bold">х</span>${goldYears.length}</div>`; }
    if (silverYears.length > 0) { badgesHtml += `<div class="flex items-center gap-1 bg-slate-400/10 border border-slate-400/30 px-2.5 py-1 rounded-full text-slate-300 text-[10px] font-black tracking-wide select-none">🥈 <span class="opacity-70 font-bold">х</span>${silverYears.length}</div>`; }
    if (bronzeYears.length > 0) { badgesHtml += `<div class="flex items-center gap-1 bg-amber-700/10 border border-amber-700/30 px-2.5 py-1 rounded-full text-amber-600 text-[10px] font-black tracking-wide select-none">🥉 <span class="opacity-70 font-bold">х</span>${bronzeYears.length}</div>`; }
    if (isVeteran) { badgesHtml += `<span class="px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide uppercase border border-neon/40 bg-neon/10 text-neon select-none">💎 Ветеран турнира</span>`; }
    if (isHost) { badgesHtml += `<span class="px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide uppercase border border-white/20 bg-white/5 text-white select-none">🏠 Хозяева турнира</span>`; }
    badgesContainer.innerHTML = badgesHtml;

    mainCardEl.className = mainCardEl.className.replace(/\s(before:bg-[^\s]+|border-[^\s]+|shadow-[^\s]+)/g, '');
    if (isChampion) { mainCardEl.style.borderColor = 'rgba(234, 179, 8, 0.25)'; mainCardEl.style.boxShadow = '0 30px 60px -15px rgba(234, 179, 8, 0.12)'; mainCardEl.style.backgroundImage = 'radial-gradient(ellipse 70% 70% at 0% 0%, rgba(234, 179, 8, 0.12) 0%, rgba(0, 0, 0, 0) 100%)'; }
    else if (isVeteran || isHost) { mainCardEl.style.borderColor = 'rgba(0, 230, 118, 0.25)'; mainCardEl.style.boxShadow = '0 30px 60px -15px rgba(0, 230, 118, 0.1)'; mainCardEl.style.backgroundImage = 'radial-gradient(ellipse 70% 70% at 0% 0%, rgba(0, 230, 118, 0.12) 0%, rgba(0, 0, 0, 0) 100%)'; }
    else { mainCardEl.style.borderColor = 'rgba(63, 63, 70, 0.4)'; mainCardEl.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.5)'; mainCardEl.style.backgroundImage = 'radial-gradient(ellipse 70% 70% at 0% 0%, rgba(255, 255, 255, 0.04) 0%, rgba(0, 0, 0, 0) 100%)'; }

    historyMatches.sort((a, b) => b.year - a.year); let matchesByYear = {};
    historyMatches.forEach(m => { if (!matchesByYear[m.year]) matchesByYear[m.year] = []; matchesByYear[m.year].push(m); });

    const yearsContainer = document.getElementById('stats-years-container');
    if (historyMatches.length === 0) { yearsContainer.innerHTML = `<div class="text-zinc-600 text-xs text-center py-6 italic">Матчи не найдены</div>`; }
    else {
        yearsContainer.innerHTML = Object.keys(matchesByYear).sort((a, b) => b - a).map(year => {
            let matchesHtml = matchesByYear[year].map(m => {
                let resColor = m.isWin ? 'text-neon' : (m.isLoss ? 'text-red-500' : 'text-zinc-400');
                return `
                    <div class="bg-zinc-card/30 border border-zinc-900/60 p-3 rounded-xl flex justify-between text-[10px] sm:text-[11px] font-bold uppercase items-center w-full">
                        <div class="space-y-0.5 flex-1 min-w-0 pr-2">
                            <div class="text-zinc-500 text-[9px] font-bold">${m.stage}</div>
                            <div class="flex items-center text-white truncate font-medium">
                                <span class="text-zinc-500 font-bold mr-1.5">vs</span>
                                <img src="${getGitHubLogoUrl(m.opponent)}" class="team-logo mr-1.5" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'">
                                <span class="truncate text-zinc-300 font-bold">${smartTeamName(m.opponent)}</span>
                            </div>
                        </div>
                        <div class="text-right font-black shrink-0 ${resColor} text-xs sm:text-sm tracking-wide pl-2">${m.scoreText}</div>
                    </div>`;
            }).join('');
            return `<div class="bg-zinc-card/60 border border-zinc-800/80 rounded-[24px] p-3 flex flex-col gap-2"><div class="text-neon font-black text-xs sm:text-sm tracking-wider px-1 py-0.5 border-b border-zinc-800/50 pb-1.5 flex items-center justify-between"><span>${year} ГОД</span><span class="text-[9px] text-zinc-500 font-bold">${matchesByYear[year].length} МАТЧ(ЕЙ)</span></div><div class="flex flex-col gap-1.5">${matchesHtml}</div></div>`;
        }).join('');
    }
}

function render2026Core() {
    const tabs = ['tables', 'schedule', 'standings', 'playoffs', 'scorers', 'assistants'];
    tabs.forEach(t => { const el = document.getElementById(`sub-2026-${t}`); if(el) el.classList.add('hidden'); });
    const currentContainer = document.getElementById(`sub-2026-${active2026Tab}`); if (currentContainer) currentContainer.classList.remove('hidden');

    const groupMatchesFuture = db.matches2026.filter(m => m.group && m.group.toLowerCase().includes('группа') && m.status === 'future').length;
    const countText = `ОСТАЛОСЬ МАТЧЕЙ В ГРУППАХ: ${groupMatchesFuture}.`;
    ['standings-count-node', 'playoffs-count-node'].forEach(id => { const el = document.getElementById(id); if(el) el.innerText = countText; });

    const bStandings = document.getElementById('banner-standings-2026'); const bPlayoffs = document.getElementById('banner-playoffs-2026');
    if (groupMatchesFuture === 0) { bStandings?.classList.add('hidden'); bPlayoffs?.classList.add('hidden'); }
    else { bStandings?.classList.remove('hidden'); bPlayoffs?.classList.remove('hidden'); }
    
    updateLiveDateStrings();
    if(active2026Tab === 'tables') render2026Tables();
    else if(active2026Tab === 'schedule') render2026Schedule();
    else if(active2026Tab === 'standings') render2026OverallStandings();
    else if(active2026Tab === 'playoffs') render2026Playoffs();
    else if(active2026Tab === 'scorers' || active2026Tab === 'assistants') render2026StatList(active2026Tab);
}

function renderArchiveCore() {
    if (!archiveYear || !archiveTournament) return;
    const mArch = db.archive.filter(m => m.year === archiveYear && m.tournament === archiveTournament);
    const gContainer = document.getElementById('archive-groups'); const pContainer = document.getElementById('archive-playoffs'); const rContainer = document.getElementById('archive-results'); const bContainer = document.getElementById('archive-best'); const rInfo = document.getElementById('archive-rules-info');
    [gContainer, pContainer, rContainer, bContainer, rInfo, document.getElementById('regulations-info-archive')].forEach(c => c?.classList.add('hidden'));
    const isSupercup = archiveTournament.toUpperCase().includes('СУПЕРКУБОК');

    if(activeArchiveTab === 'groups') {
        gContainer.classList.remove('hidden'); gContainer.innerHTML = ''; rInfo.classList.remove('hidden');
        
        // Рендеринг красивой сноски правил и расшифровок плашек в Архиве
        rInfo.innerHTML = `
            <h4 class="text-[10px] font-black text-neon uppercase tracking-wider mb-2 select-none">Расшифровка зон таблицы</h4>
            <div class="flex flex-wrap gap-4 items-center mb-3 text-[10px] font-bold uppercase tracking-tight">
                <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 bg-[#00E676] rounded-sm shadow-[0_0_8px_rgba(0,230,118,0.4)]"></span> Плей-офф</div>
                <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 bg-[#EAB308] rounded-sm shadow-[0_0_8px_rgba(234,179,8,0.4)]"></span> Плей-ин</div>
                <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 bg-[#EF4444] rounded-sm shadow-[0_0_8px_rgba(239,68,68,0.4)]"></span> Вылет</div>
            </div>
            <div class="text-[9px] text-zinc-500 font-semibold leading-relaxed border-t border-zinc-800/60 pt-2">
                ПРАВИЛА ПРИ РАВЕНСТВЕ ОЧКОВ: 1. ЛИЧНЫЕ ВСТРЕЧИ; 2. РАЗНИЦА МЯЧЕЙ; 3. ЗАБИТЫЕ ГОЛЫ.
            </div>`;

        if (isSupercup) { gContainer.innerHTML = `<div class="text-zinc-500 text-xs text-center py-12 italic">Групповой этап не проводился</div>`; return; }
        const groupM = mArch.filter(m => m.stage.toLowerCase().includes('группа')); const groups = [...new Set(groupM.map(m => m.stage))].sort();
        if(groups.length === 0) { gContainer.innerHTML = `<div class="text-zinc-600 text-xs text-center py-10 italic">Групповой этап не найден.</div>`; return; }

        const playoffTeams = new Set(mArch.filter(m => !m.stage.toLowerCase().includes('группа')).flatMap(m => [m.t1, m.t2]).filter(Boolean));
        groups.forEach(g => {
            const sorted = calculateGroupStats(groupM.filter(m => m.stage === g));
            let html = `<div class="group-card"><table><thead><tr><th>${g}</th><th class="col-stat">В</th><th class="col-stat">Н</th><th class="col-stat">П</th><th class="col-score">М</th><th class="col-stat">О</th></tr></thead><tbody>`;
            sorted.forEach((t, idx) => {
                let bar = playoffTeams.has(t.name) ? 'green-bar' : 'red-bar';
                if (archiveYear === '2023') bar = idx === 0 ? 'green-bar' : (idx === 1 || idx === 2 ? 'lime-bar' : 'red-bar');
                html += `<tr><td class="${bar} max-w-[140px] truncate"><img src="${getGitHubLogoUrl(t.name)}" class="team-logo mr-1.5" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'">${smartTeamName(t.name)}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td><td>${t.gf}-${t.ga}</td><td class="text-neon font-black">${t.pts}</td></tr>`;
            });
            gContainer.innerHTML += html + `</tbody></table></div>`;
        });
    }

    if(activeArchiveTab === 'playoffs') {
        pContainer.classList.remove('hidden'); const playM = mArch.filter(m => !m.stage.toLowerCase().includes('группа'));
        let stages = [...new Set(playM.map(m => m.stage))].filter(s => s && !s.toLowerCase().includes('3-е место'));
        const order = ['1/32', '1/16', '1/8', '1/4', '1/2', 'Финал'];
        stages.sort((a, b) => order.findIndex(o => a.toLowerCase().includes(o.toLowerCase())) - order.findIndex(o => b.toLowerCase().includes(o.toLowerCase())));
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
                return `
                    <div class="bg-zinc-card/40 border border-zinc-900 p-3 rounded-xl flex justify-between text-[10px] sm:text-[11px] font-bold uppercase items-center w-full">
                        <div class="space-y-1 flex-1 min-w-0 pr-2">
                            <div class="flex items-center truncate"><img src="${getGitHubLogoUrl(m.t1)}" class="team-logo mr-2" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'">${smartTeamName(m.t1)}</div>
                            <div class="flex items-center truncate"><img src="${getGitHubLogoUrl(m.t2)}" class="team-logo mr-2" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'">${smartTeamName(m.t2)}</div>
                        </div>
                        <div class="text-right text-neon font-black space-y-1 shrink-0"><div>${scores.s1}</div><div>${scores.s2}</div></div>
                    </div>`;
            }).join('');
            return `<div class="mb-4"><h4 class="text-xs font-black text-neon uppercase tracking-wider mb-2">${stg}</h4><div class="flex flex-col gap-2 w-full">${ml}</div></div>`;
        }).join('');
    }

    if(activeArchiveTab === 'best') { bContainer.classList.remove('hidden'); loadFilteredBestPlayers(); }
}

function loadFilteredBestPlayers() {
    const container = document.getElementById('best-players-list'); container.innerHTML = '';
    const selectedTournament = document.getElementById('archive-tournament').value.trim().toLowerCase();
    const selectedYearRaw = document.getElementById('archive-year').value;
    const selectedYear = selectedYearRaw.replace(/\s*ГОД\s*/i, '').trim(); let matchCount = 0;

    db.bestPlayers.forEach(p => {
        if(p.year !== selectedYear || p.sex !== selectedTournament) return;
        matchCount++;
        container.innerHTML += `
            <div class="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-zinc-900 transition-all hover:border-zinc-800">
                <div class="flex items-center gap-3 min-w-0 flex-1">
                    <img src="${getGitHubLogoUrl(p.team)}" class="w-8 h-8 object-contain shrink-0" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'">
                    <div class="min-w-0 flex-1">
                        <div class="text-xs font-black text-white truncate">${p.name}</div>
                        <div class="text-[10px] text-zinc-500 font-bold mt-0.5 truncate uppercase">${smartTeamName(p.team)}</div>
                    </div>
                </div>
                <div class="text-right pl-2 shrink-0">
                    <span class="text-[9px] font-black uppercase tracking-wider bg-zinc-900 text-zinc-300 border border-zinc-800 px-2.5 py-1 rounded-md">${p.nomination}</span>
                </div>
            </div>`;
    });
    if(matchCount === 0) { container.innerHTML = `<div class="text-center italic text-zinc-600 text-xs py-8">Для указанного сезона лауреаты не внесены</div>`; }
}

function setPlayoffStageArchive(stage) { currentPlayoffStageArchive = stage; renderArchiveCore(); }

function renderPlayoffCard(m, defaultT1, defaultT2) {
    let s1Val = m ? m.s1 : 0; let s2Val = m ? m.s2 : 0; let p1Val = (m && m.p1 !== null) ? m.p1 : null; let p2Val = (m && m.p2 !== null) ? m.p2 : null;
    let score1 = m && m.s1 !== null ? `${s1Val}` : '-'; let score2 = m && m.s2 !== null ? `${s2Val}` : '-';
    
    if (p1Val !== null && p2Val !== null) { 
        score1 += ` <span class="text-[9px] text-white font-bold ml-1">${p1Val}</span>`;
        score2 += ` <span class="text-[9px] text-white font-bold ml-1">${p2Val}</span>`;
    }
    let medal1 = '', medal2 = '';
    if(m && m.stage) {
        let stg = m.stage.toLowerCase(); let isFin = stg.includes('финал') && !stg.includes('3-е'); let is3rd = stg.includes('3-е место');
        let t1Win = (s1Val > s2Val) || (p1Val !== null && p1Val > p2Val);
        if (isFin) { medal1 = t1Win ? '🥇' : '🥈'; medal2 = t1Win ? '🥈' : '🥇'; }
        else if (is3rd) { medal1 = t1Win ? '🥉' : ''; medal2 = t1Win ? '' : '🥉'; }
    }
    return `
        <div class="match-row !cursor-default w-full flex flex-col gap-2">
            <div class="flex justify-between text-[10px] sm:text-[11px] font-bold uppercase items-center w-full">
                <div class="flex items-center min-w-0 flex-1 truncate pr-2"><img src="${getGitHubLogoUrl(defaultT1)}" class="team-logo mr-2" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'"><span class="truncate">${smartTeamName(defaultT1)}</span><span class="ml-1">${medal1}</span></div>
                <div class="text-neon font-black shrink-0 flex items-center">${score1}</div>
            </div>
            <div class="flex justify-between text-[10px] sm:text-[11px] font-bold uppercase items-center w-full">
                <div class="flex items-center min-w-0 flex-1 truncate pr-2"><img src="${getGitHubLogoUrl(defaultT2)}" class="team-logo mr-2" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'"><span class="truncate">${smartTeamName(defaultT2)}</span><span class="ml-1">${medal2}</span></div>
                <div class="text-neon font-black shrink-0 flex items-center">${score2}</div>
            </div>
        </div>`;
}

function getScoreDisplay(m) {
    let score1 = m.s1 !== null ? `${m.s1}` : '-'; let score2 = m.s2 !== null ? `${m.s2}` : '-';
    if (m.p1 !== null && m.p2 !== null) { score1 += ` <span class="text-[8.5px] text-white font-bold ml-1">${m.p1}</span>`; score2 += ` <span class="text-[8.5px] text-white font-bold ml-1">${m.p2}</span>`; }
    return { s1: score1, s2: score2 };
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
            
            html += `
                <div class="match-row clickable-match" onclick="toggleDetails('det-2026-${m.id}', this)">
                    <div class="flex justify-between items-center text-[10px] sm:text-[11px] font-bold uppercase gap-2 w-full">
                        <div class="flex-1 min-w-0 truncate flex items-center pr-1"><img src="${getGitHubLogoUrl(m.t1)}" class="team-logo mr-1.5" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'"><span class="truncate">${smartTeamName(m.t1)}</span></div>
                        ${scoreBadge}
                        <div class="flex-1 min-w-0 text-right truncate flex items-center justify-end pl-1"><span class="truncate">${smartTeamName(m.t2)}</span><img src="${getGitHubLogoUrl(m.t2)}" class="team-logo ml-1.5" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'"></div>
                    </div>
                    <div id="det-2026-${m.id}" class="details-container text-[11px] text-zinc-400"><div class="pt-2 border-t border-zinc-900/60 space-y-2 mt-2">${renderEventsInline(m.id, isPast)}</div></div>
                </div>`;
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
    
    // Более компактный вывод: Команда пишется снизу мелким шрифтом, столбец команд удален
    listContainer.innerHTML = sorted.map((p, idx) => `
        <div class="grid grid-cols-12 text-xs font-bold items-center p-2.5 text-center uppercase hover:bg-zinc-900/10 transition-colors">
            <div class="col-span-2 text-center text-zinc-500 font-extrabold text-[10px]">${idx+1}</div>
            <div class="col-span-8 text-left text-white truncate flex items-center gap-3 pl-1">
                <img src="${getGitHubLogoUrl(p.team)}" class="w-7 h-7 object-contain shrink-0" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'">
                <div class="min-w-0 flex-1 leading-tight">
                    <div class="truncate text-white font-bold tracking-wide">${p.name}</div>
                    <div class="truncate text-zinc-500 text-[9px] font-black mt-0.5">${smartTeamName(p.team)}</div>
                </div>
            </div>
            <div class="col-span-2 text-center text-neon font-black text-sm">${p.count}</div>
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
    
    container.innerHTML = filtered.map(m => {
        let stageLabel = m.group && m.group.toLowerCase().includes('группа') ? m.group : m.stage;
        let isPast = m.status === 'past';
        let isMock1 = m.t1.includes('КОМАНДА') || m.t1.includes('ПОБЕДИТЕЛЬ');
        let isMock2 = m.t2.includes('КОМАНДА') || m.t2.includes('ПОБЕДИТЕЛЬ');

        let rightSideContent = isPast ? 
            `<div class="text-right shrink-0 select-none"><div class="text-xs font-black tracking-widest text-zinc-400">СЫГРАН</div><div class="text-[9px] text-zinc-600 font-bold uppercase tracking-tight mt-0.5">${m.date || '---'}</div></div>` : 
            `<div class="text-right shrink-0 select-none"><div class="text-sm font-black tracking-wide text-white">${m.time}</div><div class="text-[9px] text-zinc-500 font-bold uppercase tracking-tight mt-0.5">${m.date || '---'}</div></div>`;

        return `
            <div class="bg-zinc-card border border-zinc-900 rounded-2xl p-4 flex justify-between items-center gap-4 transition-all hover:border-zinc-800/80 ${isPast ? 'opacity-60' : ''}">
                <div class="w-24 shrink-0 border-r border-zinc-800/60 pr-2 text-left">
                    <div class="text-[10px] font-black text-neon truncate uppercase tracking-wider">${stageLabel}</div>
                    <div class="text-[9px] text-zinc-500 font-bold uppercase mt-0.5">ПОЛЕ #${m.field || '1'}</div>
                </div>
                <div class="flex-grow flex flex-col gap-2.5 min-w-0">
                    <div class="flex items-center text-[11px] sm:text-xs font-bold text-white uppercase truncate gap-2">
                        <img src="${getGitHubLogoUrl(m.t1)}" class="w-4 h-4 object-contain shrink-0" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'">
                        <span class="truncate ${isMock1 ? 'text-zinc-600 font-semibold' : ''}">${smartTeamName(m.t1)}</span>
                    </div>
                    <div class="flex items-center text-[11px] sm:text-xs font-bold text-white uppercase truncate gap-2">
                        <img src="${getGitHubLogoUrl(m.t2)}" class="w-4 h-4 object-contain shrink-0" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'">
                        <span class="truncate ${isMock2 ? 'text-zinc-600 font-semibold' : ''}">${smartTeamName(m.t2)}</span>
                    </div>
                </div>
                ${rightSideContent}
            </div>`;
    }).join('');
}

// Послойное построение общего зачета по местам в группах
function getStandingsArray() {
    const groupMatches = db.matches2026.filter(m => m.group && m.group.toLowerCase().includes('группа'));
    const groups = [...new Set(groupMatches.map(m => m.group))].sort();
    
    let ranksMap = {}; // Группируем команды по занятым местам внутри групп (1-е места, 2-е места)
    groups.forEach(g => {
        calculateGroupStats(groupMatches.filter(m => m.group === g), g).forEach((tStats, rankIdx) => {
            let currentRank = rankIdx + 1;
            if (!ranksMap[currentRank]) ranksMap[currentRank] = [];
            ranksMap[currentRank].push(tStats);
        });
    });

    let finalStandings = [];
    Object.keys(ranksMap).sort((a,b) => a - b).forEach(rank => {
        let layer = ranksMap[rank];
        
        // Сортировка внутри слоя (Очки -> Разница мячей -> Забитые голы)
        layer.sort((a, b) => {
            if (b.pts !== a.pts) return b.pts - a.pts;
            if ((b.gf - b.ga) !== (a.gf - a.ga)) return (b.gf - b.ga) - (a.gf - a.ga);
            if (b.gf !== a.gf) return b.gf - a.gf;
            
            // Ручной жребий общего зачета из loats
            if (db.loats && db.loats['overall']) {
                let order = db.loats['overall'];
                let idxA = order.indexOf(a.name.toUpperCase());
                let idxB = order.indexOf(b.name.toUpperCase());
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
    tbody.innerHTML = sm.map((t, i) => `
        <tr class="hover:bg-zinc-900/30 transition-colors border-b border-zinc-900/40 last:border-none">
            <td class="text-left font-bold py-3 text-[10px] sm:text-xs max-w-[150px] truncate ${i < 32 ? 'green-bar' : 'red-bar'}">
                <span class="inline-block text-zinc-500 font-bold mr-1 w-4 shrink-0">${i+1}.</span>
                <img src="${getGitHubLogoUrl(t.name)}" class="team-logo mr-1.5" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'">
                <span>${smartTeamName(t.name)}</span>
            </td>
            <td>${t.games}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td><td>${t.gf}-${t.ga}</td><td class="text-neon font-black">${t.pts}</td>
        </tr>`).join('');
}

function render2026Playoffs() {
    const nav = document.getElementById('playoff-stages-nav-2026'); const container = document.getElementById('playoff-matches-2026');
    if(!container || !nav) return; container.innerHTML = '';
    const pMatches = db.matches2026.filter(m => !m.group || !m.group.toLowerCase().includes('группа')); let stages = ['1/16', '1/8', '1/4', '1/2', 'Финал'];
    if(!stages.includes(currentPlayoffStage2026)) currentPlayoffStage2026 = stages[0];
    
    nav.innerHTML = stages.map(s => `<button class="playoff-stage-btn flex-1 ${currentPlayoffStage2026 === s ? 'active' : ''}" onclick="setPlayoffStage2026('${s}')">${s}</button>`).join('');

    let matchesHtml = ''; let standings = getStandingsArray().map(x => x.name); while(standings.length < 32) { standings.push(''); }
    let stageMatches = pMatches.filter(m => m.stage === currentPlayoffStage2026);

    if (currentPlayoffStage2026 === '1/16') {
        const pairs = [[1, 32], [13, 20], [5, 28], [9, 24], [3, 30], [15, 18], [7, 26], [11, 22], [2, 31], [14, 19], [6, 27], [10, 23], [4, 29], [16, 17], [8, 25], [12, 21]];
        pairs.forEach((p, idx) => {
            let defaultT1 = standings[p[0] - 1] || `КОМАНДА #${p[0]}`; let defaultT2 = standings[p[1] - 1] || `КОМАНДА #${p[1]}`;
            let currentId = (101 + idx).toString();
            let realMatch = stageMatches.find(m => m.id === currentId);
            matchesHtml += renderPlayoffCardLive(realMatch, defaultT1, defaultT2, p[0], p[1]);
        });
    } else if (currentPlayoffStage2026 === 'Финал') {
        const realFinal = stageMatches.find(m => m.id === '501');
        matchesHtml += renderPlayoffCardLive(realFinal, 'ФИНАЛИСТ #1', 'ФИНАЛИСТ #2', '-', '-');
        const real3rd = pMatches.find(m => m.id === '502');
        matchesHtml += `<div class="mt-1.5 pt-2"><div class="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1 pl-1">Матч за 3-е место</div></div>` + renderPlayoffCardLive(real3rd, 'ПРОИГРАВШИЙ 1/2 #1', 'ПРОИГРАВШИЙ 1/2 #2', '-', '-');
    } else {
        let slots = currentPlayoffStage2026 === '1/8' ? 8 : (currentPlayoffStage2026 === '1/4' ? 4 : 2);
        let startId = currentPlayoffStage2026 === '1/8' ? 201 : (currentPlayoffStage2026 === '1/4' ? 301 : 401);
        let prevLabel = currentPlayoffStage2026 === '1/8' ? '1/16' : (currentPlayoffStage2026 === '1/4' ? '1/8' : '1/4');
        
        for(let i = 0; i < slots; i++) {
            let currentId = (startId + i).toString();
            let realMatch = stageMatches.find(m => m.id === currentId);
            matchesHtml += renderPlayoffCardLive(realMatch, `ПОБЕДИТЕЛЬ ${prevLabel} #${i * 2 + 1}`, `ПОБЕДИТЕЛЬ ${prevLabel} #${i * 2 + 2}`, '-', '-');
        }
    }
    container.innerHTML = matchesHtml;
}

function setPlayoffStage2026(stage) { currentPlayoffStage2026 = stage; render2026Playoffs(); }

function renderPlayoffCardLive(m, defaultT1, defaultT2, rank1, rank2) {
    let s1Val = m && m.s1 !== null ? m.s1 : '-'; let s2Val = m && m.s2 !== null ? m.s2 : '-';
    let p1Val = (m && m.p1 !== null) ? m.p1 : null; let p2Val = (m && m.p2 !== null) ? m.p2 : null;
    let score1 = `${s1Val}`; let score2 = `${s2Val}`;
    if (p1Val !== null && p2Val !== null) { 
        score1 += ` <span class="text-[9px] text-neon font-bold ml-1">(${p1Val})</span>`;
        score2 += ` <span class="text-[9px] text-neon font-bold ml-1">(${p2Val})</span>`;
    }
    let t1Name = m && m.t1 ? m.t1 : defaultT1; let t2Name = m && m.t2 ? m.t2 : defaultT2;
    let isMock1 = t1Name.includes('КОМАНДА') || t1Name.includes('ПОБЕДИТЕЛЬ') || t1Name.includes('ФИНАЛИСТ') || t1Name.includes('ПРОИГРАВШИЙ');
    let isMock2 = t2Name.includes('КОМАНДА') || t2Name.includes('ПОБЕДИТЕЛЬ') || t2Name.includes('ФИНАЛИСТ') || t2Name.includes('ПРОИГРАВШИЙ');
    let isPast = m && m.status === 'past';

    return `
        <div class="bg-zinc-card border border-zinc-800 rounded-xl p-2 flex flex-col gap-1 transition-all hover:border-zinc-700 ${isPast ? 'opacity-60' : ''}">
            <div class="flex justify-between items-center text-xs uppercase font-bold w-full">
                <div class="flex items-center min-w-0 flex-1 truncate pr-2">
                    <span class="inline-block w-5 h-5 bg-zinc-900 text-zinc-500 border border-zinc-800/40 rounded text-[9px] font-black text-center leading-5 mr-2 shrink-0">${rank1}</span>
                    <img src="${getGitHubLogoUrl(t1Name)}" class="w-5 h-5 object-contain mr-2 shrink-0" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'">
                    <span class="truncate tracking-wide ${isMock1 ? 'text-zinc-600 font-semibold' : 'text-zinc-100'}">${smartTeamName(t1Name)}</span>
                </div>
                <div class="text-neon font-black shrink-0 px-2 text-right text-xs sm:text-sm">${score1}</div>
            </div>
            <div class="flex justify-between items-center text-xs uppercase font-bold w-full">
                <div class="flex items-center min-w-0 flex-1 truncate pr-2">
                    <span class="inline-block w-5 h-5 bg-zinc-900 text-zinc-500 border border-zinc-800/40 rounded text-[9px] font-black text-center leading-5 mr-2 shrink-0">${rank2}</span>
                    <img src="${getGitHubLogoUrl(t2Name)}" class="w-5 h-5 object-contain mr-2 shrink-0" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'">
                    <span class="truncate tracking-wide ${isMock2 ? 'text-zinc-600 font-semibold' : 'text-zinc-100'}">${smartTeamName(t2Name)}</span>
                </div>
                <div class="text-neon font-black shrink-0 px-2 text-right text-xs sm:text-sm">${score2}</div>
            </div>
        </div>`;
}

function setGlobalMode(mode) {
    currentGlobalMode = mode;
    const view2026 = document.getElementById('view-2026'); const viewArch = document.getElementById('view-archive'); const viewStats = document.getElementById('view-stats');
    const tabs2026 = document.getElementById('nav-2026-tabs').parentElement; const ctrlsArch = document.getElementById('archive-controls');
    [view2026, viewArch, viewStats].forEach(v => v.classList.add('hidden'));
    
    ['mode-btn-2026', 'mode-btn-stats', 'mode-btn-archive'].forEach(id => {
        document.getElementById(id).className = "flex flex-col items-center justify-center w-1/3 py-2 text-gray-500 hover:text-white transition-colors outline-none cursor-pointer";
    });

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

function switch2026Tab(tabName, btn) { active2026Tab = tabName; document.querySelectorAll('#nav-2026-tabs button').forEach(b => b.classList.remove('active')); btn.classList.add('active'); render2026Core(); }
function switchArchiveTab(tabName, btn) { activeArchiveTab = tabName; document.querySelectorAll('#archive-tabs-nav button').forEach(b => b.classList.remove('active')); if(btn) btn.classList.add('active'); renderArchiveCore(); }

function renderEventsInline(matchId, isPast) {
    if (!isPast) return `<div class="text-center italic text-zinc-500 text-[11px] py-1.5 font-medium">Матч еще не сыгран</div>`;
    const events = db.goals2026.filter(e => e.match_id == matchId); if(events.length === 0) return `<div class="text-center italic text-zinc-600 text-[10px]">Голы не зафиксированы</div>`;
    events.sort((a, b) => a.minute - b.minute);
    let s1 = 0, s2 = 0; const mo = db.matches2026.find(m => m.id == matchId); if(!mo) return '';
    return events.map(e => {
        if(e.team.trim().toUpperCase() === mo.t1.trim().toUpperCase()) { s1++; } else { s2++; }
        return `<div class="flex items-center gap-2 text-[11px] w-full text-left py-0.5"><span class="text-zinc-500 font-bold shrink-0">${e.minute}'</span><span class="bg-zinc-800/60 px-1.5 py-0.5 rounded text-neon font-black text-[10px] tracking-tighter border border-zinc-700/30 shrink-0">${s1}-${s2}</span><span class="font-medium text-zinc-300 truncate">${shortenPlayerName(e.player)}${e.assistant ? ` (${shortenPlayerName(e.assistant)})` : ''}</span></div>`;
    }).join('');
}

function toggleDetails(containerId, matchRowElement) {
    const el = document.getElementById(containerId); if (!el) return;
    if (el.classList.contains('open')) { el.classList.remove('open'); matchRowElement.classList.remove('open'); } 
    else { 
        document.querySelectorAll('.details-container.open').forEach(o => o.classList.remove('open')); 
        document.querySelectorAll('.match-row.open').forEach(r => r.classList.remove('open')); 
        el.classList.add('open'); matchRowElement.classList.add('open');
    }
}


// ==========================================
// ЛОГИКА АДМИНИСТРАТИВНОЙ ПАНЕЛИ (/ADMIN)
// ==========================================

function renderAdminPanel() {
    const container = document.getElementById('admin-matches-container'); container.innerHTML = '';
    
    // Проверка блокировки кнопки генерации сетки плей-офф
    const groupMatches = db.matches2026.filter(m => m.group && m.group.toLowerCase().includes('группа'));
    const anyGroupFuture = groupMatches.some(m => m.status === 'future');
    const buildBtn = document.getElementById('admin-build-grid-btn');
    
    if (!anyGroupFuture && groupMatches.length > 0) {
        buildBtn.disabled = false;
        buildBtn.className = "p-3 bg-neon text-black font-black uppercase text-[10px] rounded-2xl tracking-wider shadow-lg cursor-pointer";
    } else {
        buildBtn.disabled = true;
        buildBtn.className = "p-3 bg-neon text-black font-black uppercase text-[10px] rounded-2xl tracking-wider shadow-lg opacity-50 cursor-not-allowed";
    }

    // Автоматический поиск спорных мест для вывода блока Жребия
    checkAndRenderAdminLoats(anyGroupFuture);

    let targetMatches = [];
    if (activeAdminTab === 'group') {
        targetMatches = db.matches2026.filter(m => m.group && m.group.toLowerCase().includes('группа'));
    } else {
        targetMatches = db.matches2026.filter(m => !m.group || !m.group.toLowerCase().includes('группа'));
    }

    if (targetMatches.length === 0) {
        container.innerHTML = `<div class="text-center italic text-zinc-600 py-10 text-xs">Матчи отсутствуют</div>`;
        return;
    }

    targetMatches.forEach(m => {
        let isPast = m.status === 'past';
        let stageLabel = m.group && m.group.toLowerCase().includes('группа') ? m.group : m.stage;
        let isPlayoff = parseInt(m.id) >= 101;

        let html = `
            <div id="admin-card-${m.id}" class="bg-zinc-card border border-zinc-900 rounded-3xl p-3 flex flex-col gap-3 relative">
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
                    <input type="number" id="inp-score1-${m.id}" value="${m.s1 || 0}" placeholder="Голы ${smartTeamName(m.t1)}" class="bg-zinc-900 border border-zinc-800 text-white p-2 rounded-xl text-center text-xs">
                    <input type="number" id="inp-score2-${m.id}" value="${m.s2 || 0}" placeholder="Голы ${smartTeamName(m.t2)}" class="bg-zinc-900 border border-zinc-800 text-white p-2 rounded-xl text-center text-xs">
                </div>

                <div id="playoff-penalties-${m.id}" class="hidden bg-red-500/5 border border-red-500/10 rounded-2xl p-2.5 flex flex-col gap-2">
                    <div class="text-center font-black uppercase text-[8px] text-red-400 tracking-wider">Основное время ничья. Серия пенальти:</div>
                    <div class="flex justify-center gap-4">
                        <input type="number" id="pen1-${m.id}" value="${m.p1 || ''}" placeholder="Пенальти ${smartTeamName(m.t1)}" class="bg-zinc-900 border border-zinc-800 text-white text-center p-2 rounded-xl text-xs w-28">
                        <input type="number" id="pen2-${m.id}" value="${m.p2 || ''}" placeholder="Пенальти ${smartTeamName(m.t2)}" class="bg-zinc-900 border border-zinc-800 text-white text-center p-2 rounded-xl text-xs w-28">
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
        
        // Пост-активация скрытия/отображения блоков для уже сохраненных в прошлом матчей
        if (isPast) {
            checkPlayoffPenaltyField(m.id);
            if (m.s1 >= 10 || m.s2 >= 10) document.getElementById(`extra-scores-${m.id}`).classList.remove('hidden');
            rebuildGoalsBlocks(m.id, m.t1, m.t2, true);
            document.getElementById(`goals-block-${m.id}`).classList.add('hidden'); // По умолчанию прячем блоки голов
        }
    });
}

function handleScoreSelectChange(matchId, t1, t2) {
    let s1 = document.getElementById(`score1-${matchId}`).value;
    let s2 = document.getElementById(`score2-${matchId}`).value;
    
    let extraBlock = document.getElementById(`extra-scores-${matchId}`);
    if (s1 === '10+' || s2 === '10+') { extraBlock.classList.remove('hidden'); } else { extraBlock.classList.add('hidden'); }

    checkPlayoffPenaltyField(matchId);

    if (s1 === '-' || s2 === '-') {
        document.getElementById(`goals-block-${matchId}`).classList.add('hidden');
        return;
    }
    
    document.getElementById(`goals-block-${matchId}`).classList.remove('hidden');
    rebuildGoalsBlocks(matchId, t1, t2, false);
}

function checkPlayoffPenaltyField(matchId) {
    let isPlayoffTab = (activeAdminTab === 'playoff');
    let pBlock = document.getElementById(`playoff-penalties-${matchId}`);
    if (!pBlock) return;

    let s1 = document.getElementById(`score1-${matchId}`).value;
    let s2 = document.getElementById(`score2-${matchId}`).value;
    
    if (s1 === '10+') s1 = parseInt(document.getElementById(`inp-score1-${matchId}`).value) || 0;
    if (s2 === '10+') s2 = parseInt(document.getElementById(`inp-score2-${matchId}`).value) || 0;

    if (isPlayoffTab && s1 !== '-' && s2 !== '-' && parseInt(s1) === parseInt(s2)) {
        pBlock.classList.remove('hidden');
    } else { pBlock.classList.add('hidden'); }
}

function rebuildGoalsBlocks(matchId, t1, t2, useSavedData) {
    let s1 = document.getElementById(`score1-${matchId}`).value;
    let s2 = document.getElementById(`score2-${matchId}`).value;
    
    if (s1 === '10+') s1 = parseInt(document.getElementById(`inp-score1-${matchId}`).value) || 0;
    if (s2 === '10+') s2 = parseInt(document.getElementById(`inp-score2-${matchId}`).value) || 0;
    
    let cnt1 = (s1 === '-') ? 0 : parseInt(s1);
    let cnt2 = (s2 === '-') ? 0 : parseInt(s2);

    let leftBox = document.getElementById(`goals-left-${matchId}`);
    let rightBox = document.getElementById(`goals-right-${matchId}`);
    leftBox.innerHTML = ''; rightBox.innerHTML = '';

    let savedEvents = db.goals2026.filter(e => e.match_id == matchId);

    // Строим блоки для Команды 1
    for (let i = 0; i < cnt1; i++) {
        let currentEvent = (useSavedData && savedEvents[i]) ? savedEvents[i] : null;
        leftBox.innerHTML += generateGoalRowHtml(matchId, t1, 't1', i, currentEvent);
    }
    // Строим блоки для Команды 2
    let t2Events = savedEvents.filter(e => e.team.toUpperCase() === t2.toUpperCase());
    for (let j = 0; j < cnt2; j++) {
        let currentEvent = (useSavedData && t2Events[j]) ? t2Events[j] : null;
        rightBox.innerHTML += generateGoalRowHtml(matchId, t2, 't2', j, currentEvent);
    }
}

function generateGoalRowHtml(matchId, teamName, side, idx, savedEvent) {
    const players = db.players2026.filter(p => p.team.toUpperCase() === teamName.toUpperCase());
    
    let pOptions = `<option value="Автогол" ${savedEvent && savedEvent.player === 'Автогол' ? 'selected' : ''}>⚽ АВТОГОЛ</option>`;
    pOptions += players.map(p => `<option value="${p.name}" ${savedEvent && savedEvent.player === p.name ? 'selected' : ''}>${p.name.toUpperCase()}</option>`).join('');

    let aOptions = `<option value="" ${!savedEvent || !savedEvent.assistant ? 'selected' : ''}>БЕЗ АССИСТА</option>`;
    aOptions += players.map(p => `<option value="${p.name}" ${savedEvent && savedEvent.assistant === p.name ? 'selected' : ''}>${p.name.toUpperCase()}</option>`).join('');

    let mOptions = '';
    for(let m = 1; m <= 20; m++) {
        mOptions += `<option value="${m}" ${savedEvent && savedEvent.minute === m ? 'selected' : (m === 10 && !savedEvent ? 'selected' : '')}>${m} МИН</option>`;
    }

    return `
        <div class="bg-black/20 border border-zinc-900 p-2 rounded-xl flex flex-col gap-1.5 text-left text-[10px]">
            <select id="goal-p-${side}-${matchId}-${idx}" class="bg-zinc-900 text-white rounded p-1 text-[10px] uppercase font-bold outline-none">${pOptions}</select>
            <select id="goal-a-${side}-${matchId}-${idx}" class="bg-zinc-900 text-zinc-400 rounded p-1 text-[10px] uppercase font-bold outline-none">${aOptions}</select>
            <select id="goal-m-${side}-${matchId}-${idx}" class="bg-zinc-900 text-neon rounded p-1 text-[10px] font-bold outline-none">${mOptions}</select>
        </div>`;
}

function checkAndRenderAdminLoats(anyGroupFuture) {
    const loatNotif = document.getElementById('admin-loat-notification');
    const loatList = document.getElementById('admin-loat-list');
    loatNotif.classList.add('hidden'); loatList.innerHTML = '';

    // Проверяем жребий для групп
    const groupMatches = db.matches2026.filter(m => m.group && m.group.toLowerCase().includes('группа'));
    const groups = [...new Set(groupMatches.map(m => m.group))].sort();

    groups.forEach(gName => {
        const mInGroup = groupMatches.filter(m => m.group === gName);
        const allGroupPlayed = mInGroup.every(m => m.status === 'past');
        if (allGroupPlayed) {
            let sorted = calculateGroupStats(mInGroup, ""); // базовый расчет без учета loats
            let hasEquals = false;
            for(let i=0; i<sorted.length-1; i++) {
                if (sorted[i].pts === sorted[i+1].pts && (sorted[i].gf - sorted[i].ga) === (sorted[i+1].gf - sorted[i+1].ga) && sorted[i].gf === sorted[i+1].gf) {
                    hasEquals = true; break;
                }
            }
            if (hasEquals) {
                loatNotif.classList.remove('hidden');
                renderLoatRowMarkup(loatList, gName, sorted.map(x => x.name));
            }
        }
    });

    // Проверяем жребий для общего зачета (когда весь групповой этап сыгран)
    if (!anyGroupFuture && groupMatches.length > 0) {
        let standings = getStandingsArray(); // Базовый без overall loats
        let hasOverallEquals = false;
        for (let i = 0; i < standings.length - 1; i++) {
            if (standings[i].pts === standings[i+1].pts && (standings[i].gf - standings[i].ga) === (standings[i+1].gf - standings[i+1].ga) && standings[i].gf === standings[i+1].gf) {
                hasOverallEquals = true; break;
            }
        }
        if (hasOverallEquals) {
            loatNotif.classList.remove('hidden');
            renderLoatRowMarkup(loatList, 'overall', standings.map(x => x.name));
        }
    }
}

function renderLoatRowMarkup(container, targetName, teamsArray) {
    let savedOrderText = (db.loats && db.loats[targetName]) ? db.loats[targetName].join(', ') : 'ЖРЕБИЙ НЕ ВЫБРАН';
    
    container.innerHTML += `
        <div class="bg-black/30 p-3 rounded-xl border border-zinc-800/80 text-[10px] font-bold">
            <div class="text-white uppercase mb-1.5">Цель: <span class="text-neon">${targetName}</span></div>
            <div class="text-zinc-500 uppercase mb-2 text-[9px]">Текущий выбор: <span class="text-yellow-500 font-black">${savedOrderText}</span></div>
            <div class="flex flex-col gap-2">
                <input type="text" id="loat-input-${targetName}" placeholder="Укажите через запятую: КОМАНДА1, КОМАНДА2" class="bg-zinc-900 border border-zinc-800 text-white p-2 rounded-xl text-xs uppercase">
                <button onclick="saveAdminLoat('${targetName}')" class="px-3 py-2 bg-yellow-500 text-black uppercase font-black text-[9px] rounded-lg tracking-wider self-end">Зафиксировать жребий</button>
            </div>
        </div>`;
}

async function saveAdminMatch(matchId, t1, t2) {
    let s1 = document.getElementById(`score1-${matchId}`).value;
    let s2 = document.getElementById(`score2-${matchId}`).value;
    
    if (s1 === '-' || s2 === '-') { alert("Выберите счет!"); return; }
    
    if (s1 === '10+') s1 = parseInt(document.getElementById(`inp-score1-${matchId}`).value) || 0;
    if (s2 === '10+') s2 = parseInt(document.getElementById(`inp-score2-${matchId}`).value) || 0;

    let pen1 = null, pen2 = null;
    let pBlock = document.getElementById(`playoff-penalties-${matchId}`);
    if (pBlock && !pBlock.classList.contains('hidden')) {
        let p1Val = document.getElementById(`pen1-${matchId}`).value;
        let p2Val = document.getElementById(`pen2-${matchId}`).value;
        if (p1Val === '' || p2Val === '') { alert("Введите результаты послематчевых пенальти!"); return; }
        pen1 = parseInt(p1Val); pen2 = parseInt(p2Val);
        if (pen1 === pen2) { alert("В серии пенальти должен быть победитель!"); return; }
    }

    let goals = [];
    // Собираем голы команды 1
    for (let i = 0; i < parseInt(s1); i++) {
        goals.push({
            team: t1,
            player: document.getElementById(`goal-p-t1-${matchId}-${i}`).value,
            assistant: document.getElementById(`goal-a-t1-${matchId}-${i}`).value,
            minute: parseInt(document.getElementById(`goal-m-t1-${matchId}-${i}`).value)
        });
    }
    // Собираем голы команды 2
    for (let j = 0; j < parseInt(s2); j++) {
        goals.push({
            team: t2,
            player: document.getElementById(`goal-p-t2-${matchId}-${j}`).value,
            assistant: document.getElementById(`goal-a-t2-${matchId}-${j}`).value,
            minute: parseInt(document.getElementById(`goal-m-t2-${matchId}-${j}`).value)
        });
    }

    let payload = { action: 'saveMatch', matchId: matchId, t1: t1, t2: t2, score1: s1, score2: s2, pen1: pen1, pen2: pen2, goals: goals, status: 'past' };
    
    document.getElementById(`send-btn-${matchId}`).innerText = "СИНХРОНИЗАЦИЯ...";
    
    try {
        let res = await fetch(APPS_SCRIPT_WEB_APP_URL, { method: 'POST', body: JSON.stringify(payload) }).then(r => r.json());
        if (res.status === 'success') {
            document.getElementById(`ok-badge-${matchId}`).classList.remove('hidden');
            document.getElementById(`send-btn-${matchId}`).innerText = "Редактировать";
            document.getElementById(`goals-block-${matchId}`).classList.add('hidden'); // прячем блоки после отправки
            
            // Локально обновляем оперативную память, чтобы не перезагружать всю страницу
            let matchIdx = db.matches2026.findIndex(m => m.id == matchId);
            if(matchIdx !== -1) {
                db.matches2026[matchIdx].s1 = parseInt(s1); db.matches2026[matchIdx].s2 = parseInt(s2);
                db.matches2026[matchIdx].p1 = pen1; db.matches2026[matchIdx].p2 = pen2; db.matches2026[matchIdx].status = 'past';
            }
            db.goals2026 = db.goals2026.filter(e => e.match_id != matchId).concat(goals.map(g => ({match_id: matchId, ...g})));
            checkAndRenderAdminLoats(db.matches2026.filter(m => m.group && m.group.toLowerCase().includes('группа')).some(m => m.status === 'future'));
        } else { alert("Ошибка сохранения базы"); }
    } catch(e) { alert("Ошибка сети"); }
}

async function saveAdminLoat(targetName) {
    let orderVal = document.getElementById(`loat-input-${targetName}`).value;
    if (!orderVal) { alert("Заполните порядок команд!"); return; }
    
    let payload = { action: 'saveLoat', target: targetName, resolvedOrder: orderVal };
    try {
        let res = await fetch(APPS_SCRIPT_WEB_APP_URL, { method: 'POST', body: JSON.stringify(payload) }).then(r => r.json());
        if (res.status === 'success') {
            alert("Жребий зафиксирован!");
            db.loats[targetName] = orderVal.split(',').map(x => normalizeTeamName(x).toUpperCase());
            renderAdminPanel();
        }
    } catch(e) { alert("Ошибка сети"); }
}

async function triggerBuildGrid() {
    if (!confirm("Вы уверены, что хотите рассчитать групповые итоги и автоматически построить сетку 1/16 плей-офф?")) return;
    
    let standings = getStandingsArray().map(x => x.name);
    // Сетка пар 1/16 по твоему алгоритму [1-32, 13-20, 5-28, 9-24, 3-30, 15-18, 7-26, 11-22, 2-31, 14-19, 6-27, 10-23, 4-29, 16-17, 8-25, 12-21]
    const pairs = [[1, 32], [13, 20], [5, 28], [9, 24], [3, 30], [15, 18], [7, 26], [11, 22], [2, 31], [14, 19], [6, 27], [10, 23], [4, 29], [16, 17], [8, 25], [12, 21]];
    
    let gridMatches = pairs.map((p, idx) => ({
        id: (101 + idx),
        t1: standings[p[0] - 1] || "---",
        t2: standings[p[1] - 1] || "---"
    }));

    try {
        let res = await fetch(APPS_SCRIPT_WEB_APP_URL, { method: 'POST', body: JSON.stringify({action: 'buildPlayoff', grid: gridMatches}) }).then(r => r.json());
        if (res.status === 'success') {
            alert("Сетка плей-офф успешно построена и выгружена на сайт!");
            location.reload();
        }
    } catch(e) { alert("Ошибка соединения."); }
}

async function triggerClearAllData() {
    if (!confirm("КРИТИЧЕСКОЕ ДЕЙСТВИЕ!\nВы уверены, что хотите полностью стереть все результаты матчей, очистить листы авторов голов и жребиев в Google Таблицах на этот сезон?")) return;
    try {
        let res = await fetch(APPS_SCRIPT_WEB_APP_URL, { method: 'POST', body: JSON.stringify({action: 'clearAll'}) }).then(r => r.json());
        if (res.status === 'success') { alert("База данных успешно сброшена!"); location.reload(); }
    } catch(e) { alert("Ошибка."); }
}


// Draggable Tabs Logic
const sliders = document.querySelectorAll('.draggable');
let isDown = false; let startX; let scrollLeft;
sliders.forEach(slider => {
    slider.addEventListener('mousedown', (e) => { isDown = true; slider.classList.add('drag-active'); startX = e.pageX - slider.offsetLeft; scrollLeft = slider.scrollLeft; });
    slider.addEventListener('mouseleave', () => { isDown = false; slider.classList.remove('drag-active'); });
    slider.addEventListener('mouseup', () => { isDown = false; slider.classList.remove('drag-active'); });
    slider.addEventListener('mousemove', (e) => { if (!isDown) return; e.preventDefault(); const x = e.pageX - slider.offsetLeft; const walk = (x - startX) * 2; slider.scrollLeft = scrollLeft - walk; });
});

init();
