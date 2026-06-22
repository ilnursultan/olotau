// Конфигурация, Рендеринг интерфейса и Управление Глобальным Состоянием приложений

const URLS_2026 = {
    archive: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRm1C8ix_HjpSlkuU3D9GdOaZy2hs8CeKdQM11SAlwseAn9X6o9Q7vw-KlOJIjTjcn_bmFidY6gQBqB/pub?gid=0&single=true&output=csv',
    matches: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRm1C8ix_HjpSlkuU3D9GdOaZy2hs8CeKdQM11SAlwseAn9X6o9Q7vw-KlOJIjTjcn_bmFidY6gQBqB/pub?gid=1442464542&single=true&output=csv',
    goals: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRm1C8ix_HjpSlkuU3D9GdOaZy2hs8CeKdQM11SAlwseAn9X6o9Q7vw-KlOJIjTjcn_bmFidY6gQBqB/pub?gid=1335071059&single=true&output=csv',
    players: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRm1C8ix_HjpSlkuU3D9GdOaZy2hs8CeKdQM11SAlwseAn9X6o9Q7vw-KlOJIjTjcn_bmFidY6gQBqB/pub?gid=559105845&single=true&output=csv',
    geo: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRm1C8ix_HjpSlkuU3D9GdOaZy2hs8CeKdQM11SAlwseAn9X6o9Q7vw-KlOJIjTjcn_bmFidY6gQBqB/pub?gid=603732331&single=true&output=csv',
    best: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRm1C8ix_HjpSlkuU3D9GdOaZy2hs8CeKdQM11SAlwseAn9X6o9Q7vw-KlOJIjTjcn_bmFidY6gQBqB/pub?gid=1220926923&single=true&output=csv'
};

let db = { matches2026: [], goals2026: [], players2026: [], archive: [], geo: {}, bestPlayers: [] };
let currentGlobalMode = '2026'; let active2026Tab = 'tables'; let activeArchiveTab = 'groups';
let archiveYear = ''; let archiveTournament = ''; let currentPlayoffStage2026 = '1/16'; let currentPlayoffStageArchive = '';
let animId = null;

function getGitHubLogoUrl(teamName) {
    let clean = normalizeTeamName(teamName).trim();
    if (!clean || clean === '' || clean === '---' || clean.toUpperCase() === 'КОМАНДА' || clean.toUpperCase().includes('ПОБЕДИТЕЛЬ') || clean.toUpperCase().includes('ПРОИГРАВШИЙ')) {
        return 'https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png';
    }
    return `https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/${clean}.png`;
}

function updateLiveDateStrings() {
    let playedMatches = db.matches2026.filter(m => m.status && m.status.toLowerCase().trim() === 'past');
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
        const [rM, rG, rP, rA, rGeo, rB] = await Promise.all([
            fetch(URLS_2026.matches + '&cb=' + Date.now()).then(r => r.text()),
            fetch(URLS_2026.goals + '&cb=' + Date.now()).then(r => r.text()),
            fetch(URLS_2026.players + '&cb=' + Date.now()).then(r => r.text()),
            fetch(URLS_2026.archive + '&cb=' + Date.now()).then(r => r.text()),
            fetch(URLS_2026.geo + '&cb=' + Date.now()).then(r => r.text()),
            fetch(URLS_2026.best + '&cb=' + Date.now()).then(r => r.text())
        ]);
        db.matches2026 = parseCoreCSV(rM, 'm'); db.goals2026 = parseCoreCSV(rG, 'g'); db.players2026 = parseCoreCSV(rP, 'p'); db.archive = parseArchiveCSV(rA);
        parseGeoCSV(rGeo); parseBestPlayersCSV(rB);
        
        if (animId) clearInterval(animId); 
        document.getElementById('loader').style.display = 'none'; document.getElementById('mode-container').classList.remove('hidden');
        setupFiltersAndSelectors(); setupStatsSelectors(); setGlobalMode('2026');
    } catch (err) {
        if (animId) clearInterval(animId); 
        document.getElementById('loader').innerHTML = `<div class="text-red-500 font-bold text-sm">Ошибка синхронизации данных.</div>`;
    }
}

function getTeamGeoHtml(teamName, isMen = true) {
    const key = normalizeTeamName(teamName).toUpperCase();
    if (db.geo[key]) {
        const item = db.geo[key]; let dist = item.district;
        if (isMen && dist && !dist.toLowerCase().includes('район') && !dist.toLowerCase().includes('р-н')) { dist += ' район'; }
        let baseGeo = `<span class="font-extrabold text-white">${dist}${dist && item.subject ? ', ' : ''}${item.subject}</span>`.toUpperCase();
        let distanceHtml = '';
        if (item.distance && parseInt(item.distance) > 0 && !key.includes('КУТУЕВО')) {
            distanceHtml = `<div class="text-zinc-500 font-light text-[10px] tracking-wider mt-0.5">ДО КУТУЕВО ${item.distance} КМ</div>`;
        }
        return `<span>${baseGeo}</span>${distanceHtml}`;
    }
    return '';
}

function setupFiltersAndSelectors() {
    const tArch = [...new Set(db.archive.map(m => m.tournament))].filter(Boolean);
    document.getElementById('archive-tournament').innerHTML = tArch.map(t => `<option value="${t}">${t}</option>`).join('');
    if(tArch.length > 0) archiveTournament = tArch[0];

    document.getElementById('archive-tournament').addEventListener('change', (e) => { archiveTournament = e.target.value; toggleSupercupBanner(archiveTournament); currentPlayoffStageArchive = ''; updateArchiveYears(); });
    document.getElementById('archive-year').addEventListener('change', (e) => { archiveYear = e.target.value; currentPlayoffStageArchive = ''; renderArchiveCore(); });

    const teams = [...new Set(db.matches2026.flatMap(m => [m.t1, m.t2]))].filter(Boolean).sort();
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
            if(m.t1 && m.t1 !== '-' && m.t1 !== '') allTeams.add(normalizeTeamName(m.t1));
            if(m.t2 && m.t2 !== '-' && m.t2 !== '') allTeams.add(normalizeTeamName(m.t2));
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

function renderTeamStatistics() {
    const team = document.getElementById('stats-team').value; const gender = document.getElementById('stats-gender').value;
    if (!team) return;

    let isMen = (gender === 'Мужчины'); document.getElementById('stats-team-title').innerText = team;
    const logoUrl = getGitHubLogoUrl(team); const logoEl = document.getElementById('stats-team-logo');
    logoEl.src = logoUrl; logoEl.onerror = function() { this.src = 'https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'; };
    document.getElementById('stats-team-geo').innerHTML = getTeamGeoHtml(team, isMen);

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
        gf += teamScore; ga += oppScore;

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
            scoreText: `${teamScore}:${oppScore}` + (teamPen !== null ? ` ${teamPen}:${oppPen} пен` : ''), isWin: isWin, isLoss: isLoss
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

    if (isChampion) {
        mainCardEl.style.borderColor = 'rgba(234, 179, 8, 0.25)'; mainCardEl.style.boxShadow = '0 30px 60px -15px rgba(234, 179, 8, 0.12)';
        mainCardEl.style.backgroundImage = 'radial-gradient(ellipse 70% 70% at 0% 0%, rgba(234, 179, 8, 0.12) 0%, rgba(0, 0, 0, 0) 100%)';
    } else if (isVeteran || isHost) {
        mainCardEl.style.borderColor = 'rgba(0, 230, 118, 0.25)'; mainCardEl.style.boxShadow = '0 30px 60px -15px rgba(0, 230, 118, 0.1)';
        mainCardEl.style.backgroundImage = 'radial-gradient(ellipse 70% 70% at 0% 0%, rgba(0, 230, 118, 0.12) 0%, rgba(0, 0, 0, 0) 100%)';
    } else {
        mainCardEl.style.borderColor = 'rgba(63, 63, 70, 0.4)'; mainCardEl.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.5)';
        mainCardEl.style.backgroundImage = 'radial-gradient(ellipse 70% 70% at 0% 0%, rgba(255, 255, 255, 0.04) 0%, rgba(0, 0, 0, 0) 100%)';
    }

    historyMatches.sort((a, b) => b.year - a.year); let matchesByYear = {};
    historyMatches.forEach(m => { if (!matchesByYear[m.year]) matchesByYear[m.year] = []; matchesByYear[m.year].push(m); });

    const yearsContainer = document.getElementById('stats-years-container');
    if (historyMatches.length === 0) {
        yearsContainer.innerHTML = `<div class="text-zinc-600 text-xs text-center py-6 italic">Матчи не найдены</div>`;
    } else {
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

            return `
                <div class="bg-zinc-card/60 border border-zinc-800/80 rounded-[24px] p-3 flex flex-col gap-2">
                    <div class="text-neon font-black text-xs sm:text-sm tracking-wider px-1 py-0.5 border-b border-zinc-800/50 pb-1.5 flex items-center justify-between">
                        <span>${year} ГОД</span>
                        <span class="text-[9px] text-zinc-500 font-bold">${matchesByYear[year].length} МАТЧ(ЕЙ)</span>
                    </div>
                    <div class="flex flex-col gap-1.5">${matchesHtml}</div>
                </div>`;
        }).join('');
    }
}

function render2026Core() {
    const tabs = ['tables', 'schedule', 'standings', 'playoffs', 'scorers', 'assistants'];
    tabs.forEach(t => { const el = document.getElementById(`sub-2026-${t}`); if(el) el.classList.add('hidden'); });

    const currentContainer = document.getElementById(`sub-2026-${active2026Tab}`);
    if (currentContainer) currentContainer.classList.remove('hidden');

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
    const gContainer = document.getElementById('archive-groups'); const pContainer = document.getElementById('archive-playoffs'); const rContainer = document.getElementById('archive-results'); const bContainer = document.getElementById('archive-best');
    [gContainer, pContainer, rContainer, bContainer, document.getElementById('regulations-info-archive')].forEach(c => c?.classList.add('hidden'));
    const isSupercup = archiveTournament.toUpperCase().includes('СУПЕРКУБОК');

    if(activeArchiveTab === 'groups') {
        gContainer.classList.remove('hidden'); gContainer.innerHTML = '';
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
    let score1 = m ? `${s1Val}` : '-'; let score2 = m ? `${s2Val}` : '-';
    
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
    let score1 = `${m.s1}`; let score2 = `${m.s2}`;
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
        const mInGroup = groupMatches.filter(m => m.group === gName); const sortedTeams = calculateGroupStats(mInGroup);
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
    if(sorted.length === 0) { listContainer.innerHTML = `<div class="text-zinc-600 text-xs text-center py-4 italic">Нет зарегистрированных данных</div>`; return; }
    listContainer.innerHTML = sorted.map((p, idx) => `
        <div class="grid grid-cols-12 text-[10px] sm:text-xs font-bold items-center p-3 text-center uppercase hover:bg-zinc-900/10 transition-colors">
            <div class="col-span-1 text-center text-zinc-500">${idx+1}</div>
            <div class="col-span-5 text-left text-white truncate flex items-center gap-2 pl-1">
                <img src="${getGitHubLogoUrl(p.team)}" class="team-logo" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'">
                <span class="truncate">${p.name}</span>
            </div>
            <div class="col-span-4 text-zinc-400 text-[9px] sm:text-[11px] truncate text-center">${smartTeamName(p.team)}</div>
            <div class="col-span-2 text-center text-neon font-black">${p.count}</div>
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
                        <span class="truncate">${smartTeamName(m.t1)}</span>
                    </div>
                    <div class="flex items-center text-[11px] sm:text-xs font-bold text-white uppercase truncate gap-2">
                        <img src="${getGitHubLogoUrl(m.t2)}" class="w-4 h-4 object-contain shrink-0" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'">
                        <span class="truncate">${smartTeamName(m.t2)}</span>
                    </div>
                </div>
                ${rightSideContent}
            </div>`;
    }).join('');
}

function getStandingsArray() {
    const groupMatches = db.matches2026.filter(m => m.group && m.group.toLowerCase().includes('группа'));
    const groups = [...new Set(groupMatches.map(m => m.group))].sort(); let sm = [];
    groups.forEach(g => { calculateGroupStats(groupMatches.filter(m => m.group === g)).forEach((tStats, rank) => { sm.push({ ...tStats, groupRank: rank + 1 }); }); });
    sm.sort((a,b) => a.groupRank !== b.groupRank ? a.groupRank - b.groupRank : b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));
    return sm;
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
        pairs.forEach((p) => {
            let defaultT1 = standings[p[0] - 1] || `КОМАНДА #${p[0]}`; let defaultT2 = standings[p[1] - 1] || `КОМАНДА #${p[1]}`;
            let realMatch = stageMatches.find(m => m.t1.toUpperCase() === defaultT1.toUpperCase() || m.t2.toUpperCase() === defaultT1.toUpperCase());
            matchesHtml += renderPlayoffCardLive(realMatch, defaultT1, defaultT2, p[0], p[1]);
        });
    } else if (currentPlayoffStage2026 === 'Финал') {
        const realFinal = stageMatches.find(m => m.stage.toLowerCase() === 'финал');
        matchesHtml += renderPlayoffCardLive(realFinal, 'ПОБЕДИТЕЛЬ 1/2 #1', 'ПОБЕДИТЕЛЬ 1/2 #2', '-', '-');
        const real3rd = pMatches.find(m => m.stage.toLowerCase().includes('3-е место'));
        matchesHtml += `<div class="mt-1.5 pt-2"><div class="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1 pl-1">Матч за 3-е место</div></div>` + renderPlayoffCardLive(real3rd, 'ПРОИГРАВШИЙ 1/2 #1', 'ПРОИГРАВШИЙ 1/2 #2', '-', '-');
    } else {
        if (stageMatches.length === 0) {
            let slots = currentPlayoffStage2026 === '1/8' ? 8 : (currentPlayoffStage2026 === '1/4' ? 4 : 2);
            let prev = currentPlayoffStage2026 === '1/8' ? '1/16' : (currentPlayoffStage2026 === '1/4' ? '1/8' : '1/4');
            for(let i = 1; i <= slots; i++) { matchesHtml += renderPlayoffCardLive(null, `ПОБЕДИТЕЛЬ ${prev} #${i * 2 - 1}`, `ПОБЕДИТЕЛЬ ${prev} #${i * 2}`, '-', '-'); }
        } else { stageMatches.forEach(m => { matchesHtml += renderPlayoffCardLive(m, m.t1, m.t2, '-', '-'); }); }
    }
    container.innerHTML = matchesHtml;
}

function setPlayoffStage2026(stage) { currentPlayoffStage2026 = stage; render2026Playoffs(); }

function renderPlayoffCardLive(m, defaultT1, defaultT2, rank1, rank2) {
    let s1Val = m ? m.s1 : 0; let s2Val = m ? m.s2 : 0; let p1Val = (m && m.p1 !== null) ? m.p1 : null; let p2Val = (m && m.p2 !== null) ? m.p2 : null;
    let score1 = m ? `${s1Val}` : '-'; let score2 = m ? `${s2Val}` : '-';
    if (p1Val !== null && p2Val !== null) { 
        score1 += ` <span class="text-[9px] text-neon font-bold ml-1">(${p1Val})</span>`;
        score2 += ` <span class="text-[9px] text-neon font-bold ml-1">(${p2Val})</span>`;
    }
    let t1Name = m ? m.t1 : defaultT1; let t2Name = m ? m.t2 : defaultT2;
    let isMock1 = t1Name.includes('КОМАНДА') || t1Name.includes('ПОБЕДИТЕЛЬ') || t1Name.includes('ПРОИГРАВШИЙ');
    let isMock2 = t2Name.includes('КОМАНДА') || t2Name.includes('ПОБЕДИТЕЛЬ') || t2Name.includes('ПРОИГРАВШИЙ');
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
        return `
        <div class="flex items-center gap-2 text-[11px] w-full text-left py-0.5">
            <span class="text-zinc-500 font-bold shrink-0">${e.minute}'</span>
            <span class="bg-zinc-800/60 px-1.5 py-0.5 rounded text-neon font-black text-[10px] tracking-tighter border border-zinc-700/30 shrink-0">${s1}-${s2}</span>
            <span class="font-medium text-zinc-300 truncate">${shortenPlayerName(e.player)}${e.assistant ? ` (${shortenPlayerName(e.assistant)})` : ''}</span>
        </div>`;
    }).join('');
}

function toggleDetails(containerId, matchRowElement) {
    const el = document.getElementById(containerId); if (!el) return;
    if (el.classList.contains('open')) { 
        el.classList.remove('open'); matchRowElement.classList.remove('open');
    } else { 
        document.querySelectorAll('.details-container.open').forEach(o => o.classList.remove('open')); 
        document.querySelectorAll('.match-row.open').forEach(r => r.classList.remove('open')); 
        el.classList.add('open'); matchRowElement.classList.add('open');
    }
}

// Draggable Tabs Logic
const sliders = document.querySelectorAll('.draggable');
let isDown = false; let startX; let scrollLeft;
sliders.forEach(slider => {
    slider.addEventListener('mousedown', (e) => {
        isDown = true; slider.classList.add('drag-active'); startX = e.pageX - slider.offsetLeft; scrollLeft = slider.scrollLeft;
    });
    slider.addEventListener('mouseleave', () => { isDown = false; slider.classList.remove('drag-active'); });
    slider.addEventListener('mouseup', () => { isDown = false; slider.classList.remove('drag-active'); });
    slider.addEventListener('mousemove', (e) => {
        if (!isDown) return; e.preventDefault(); const x = e.pageX - slider.offsetLeft; const walk = (x - startX) * 2; slider.scrollLeft = scrollLeft - walk;
    });
});

// Запуск приложения
init();