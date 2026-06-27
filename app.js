// Основной скрипт сайта

const APPS_SCRIPT_WEB_APP_URL = "https://raw.githubusercontent.com/ilnursultan/olotau/main/data.json";
let db = { matches2026: [], goals2026: [], players2026: [], archive: [], geo: {}, bestPlayers: [], groups2026: [], loats: {} };
let currentGlobalMode = '2026'; let active2026Tab = 'tables'; let activeArchiveTab = 'groups';
let current2026Gender = 'men'; 
let archiveYear = ''; let archiveTournament = ''; let currentPlayoffStage2026 = '1/16'; let currentPlayoffStageArchive = '';
let animId = null; let adminSecretClicks = 0; let adminClicksTimeout = null;

function handleAdminSecretClick() {
    adminSecretClicks++; clearTimeout(adminClicksTimeout);
    adminClicksTimeout = setTimeout(() => { adminSecretClicks = 0; }, 2000);
    if (adminSecretClicks >= 5) { adminSecretClicks = 0; window.location.href = 'admin.html'; }
}

function getGitHubLogoUrl(teamName) {
    let clean = normalizeTeamName(teamName).trim();
    if (!clean || clean === '' || clean === '---' || 
        clean.toUpperCase() === 'КОМАНДА' || 
        clean.toUpperCase().includes('ПОБЕДИТЕЛЬ') || 
        clean.toUpperCase().includes('ФИНАЛИСТ') || 
        clean.toUpperCase().includes('ПРОИГРАВШ') ||
        clean.toUpperCase().includes('ПАРА') || 
        clean.toUpperCase().includes('ГРУПП') || 
        clean.toUpperCase().includes('МЕСТО') || 
        clean.toUpperCase().includes('КОМАНДА #') || 
        clean.toUpperCase().includes('КОМАНДА №')) {
        return "https://cdn.jsdelivr.net/gh/ilnursultan/team-logos@main/logos/logo1.png";
    }
    // Проксируем через jsDelivr CDN — он летает в России и не блокируется операторами
    return `https://cdn.jsdelivr.net/gh/ilnursultan/team-logos@main/logos/${clean}.png`;
}

function set2026Category(category) {
    current2026Gender = category;
    const overallTabBtn = document.getElementById('tab-btn-overall');
    
    if (category === 'women') {
        if(overallTabBtn) overallTabBtn.classList.add('hidden');
        if (active2026Tab === 'standings') active2026Tab = 'tables';
        currentPlayoffStage2026 = '1/4';
    } else if (category === 'supercup') {
        if(overallTabBtn) overallTabBtn.classList.add('hidden');
        active2026Tab = 'playoffs';
        currentPlayoffStage2026 = '1/2';
    } else {
        if(overallTabBtn) overallTabBtn.classList.remove('hidden');
        if (currentPlayoffStage2026 === '1/4' && active2026Tab === 'playoffs') currentPlayoffStage2026 = '1/16';
    }
    
    let activeBtn = document.querySelector(`#nav-2026-tabs button[onclick*="${active2026Tab}"]`);
    if (activeBtn) {
        document.querySelectorAll('#nav-2026-tabs .tab-btn-top').forEach(el => el.classList.remove('active'));
        activeBtn.classList.add('active');
    }

    setupFiltersAndSelectors();
    switch2026Tab(active2026Tab, activeBtn);
}

function set2026Gender(gender) { set2026Category(gender); }

function openPlayoffModal(matchId, t1Fallback, t2Fallback, stageLabel) {
    let m = db.matches2026.find(x => x.id === matchId);
    let t1Name = (m && m.t1 && m.t1 !== '---') ? m.t1 : t1Fallback;
    let t2Name = (m && m.t2 && m.t2 !== '---') ? m.t2 : t2Fallback;
    let isPast = m && m.status === 'past';

    let cleanStage = stageLabel ? stageLabel.replace('Женщины: ', '') : 'Плей-офф';
    document.getElementById('playoff-modal-title-node').innerText = `Детали матча: ${cleanStage.toUpperCase()}`;

    document.getElementById('playoff-modal-t1').innerText = smartTeamName(t1Name);
    document.getElementById('playoff-modal-t2').innerText = smartTeamName(t2Name);
    document.getElementById('playoff-modal-logo1').src = getGitHubLogoUrl(t1Name);
    document.getElementById('playoff-modal-logo2').src = getGitHubLogoUrl(t2Name);

    let s1Text = isPast ? m.s1 : '-';
    let s2Text = isPast ? m.s2 : '-';
    
    if (isPast && m.p1 !== null && m.p2 !== null) {
        document.getElementById('playoff-modal-score').innerHTML = `
            ${m.s1}<sup class="text-white font-normal text-sm ml-0.5">${m.p1}</sup> 
            : 
            ${m.s2}<sup class="text-white font-normal text-sm ml-0.5">${m.p2}</sup>
        `;
    } else {
        document.getElementById('playoff-modal-score').innerText = `${s1Text} : ${s2Text}`;
    }
    
    let penaltyNode = document.getElementById('playoff-modal-penalty');
    if (penaltyNode) {
        if (m && (m.date || m.time)) {
            penaltyNode.innerHTML = `${m.date || '---'} | ${m.time || '00:00'}`;
            penaltyNode.classList.remove('hidden');
            penaltyNode.className = "text-[9px] font-medium text-zinc-500 uppercase tracking-widest mt-1.5";
        } else {
            penaltyNode.classList.add('hidden');
        }
    }

    let eventsContainer = document.getElementById('playoff-modal-events');
    eventsContainer.innerHTML = '';

    if (m && isPast) {
        let mGoals = db.goals2026.filter(g => g.match_id === m.id);
        mGoals.sort((a, b) => parseInt(a.minute || 0) - parseInt(b.minute || 0));

        if (mGoals.length > 0) {
            let c1 = 0, c2 = 0;
            let html = '';

            mGoals.forEach(g => {
                let isT1 = normalizeTeamName(g.team) === normalizeTeamName(m.t1);
                if (isT1) c1++; else c2++;

                let pName = shortenPlayerName(g.player || '');
                let aStr = g.assistant ? `<span class="text-zinc-500 text-[9px] ml-1">(${shortenPlayerName(g.assistant)})</span>` : '';

                if (isT1) {
                    html += `
                    <div class="flex items-center py-1 border-b border-zinc-900/20 last:border-0 justify-start w-full">
                        <span class="text-zinc-500 font-black text-[10px] w-6 shrink-0 text-left">${g.minute}'</span>
                        <span class="text-neon font-black text-[10px] bg-zinc-900/80 px-1.5 rounded mr-2 shrink-0">${c1}:${c2}</span>
                        <span class="text-white font-bold text-[10px] truncate">${pName}</span>${aStr}
                    </div>`;
                } else {
                    html += `
                    <div class="flex items-center py-1 border-b border-zinc-900/20 last:border-0 justify-end w-full text-right">
                        <span class="text-white font-bold text-[10px] truncate mr-1">${pName}</span>${aStr}
                        <span class="text-neon font-black text-[10px] bg-zinc-900/80 px-1.5 rounded mx-2 shrink-0">${c1}:${c2}</span>
                        <span class="text-zinc-500 font-black text-[10px] w-6 shrink-0 text-right">${g.minute}'</span>
                    </div>`;
                }
            });
            eventsContainer.innerHTML = html;
        } else {
            eventsContainer.innerHTML = `<div class="text-center italic py-4 text-zinc-600 text-xs font-bold uppercase">Нет данных о забитых голах</div>`;
        }
    } else {
        eventsContainer.innerHTML = `<div class="text-center italic py-4 text-zinc-600 text-xs font-bold uppercase">Матч еще не сыгран</div>`;
    }

    document.getElementById('playoff-modal').classList.remove('hidden');
}

function closePlayoffModal() {
    document.getElementById('playoff-modal').classList.add('hidden');
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
        // Добавляем хитрый сброс кэша для GitHub файла
        let cacheBuster = "https://raw.githubusercontent.com/ilnursultan/olotau/main/data.json?_t=" + new Date().getTime();
        let res = await fetch(cacheBuster).then(r => r.json());
        mapServerData(res);

        try {
            let ghGroups = await fetch('https://raw.githubusercontent.com/ilnursultan/team-logos/main/groups.json').then(r => r.json());
            db.groups2026 = ghGroups;
        } catch(e) { console.log('GitHub fallback', e); }

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

    let isWomen = (current2026Gender === 'women');
    let filteredMatches = db.matches2026.filter(m => isWomen ? (parseInt(m.id) >= 1000) : (parseInt(m.id) < 1000));
    
    const teams = [...new Set(filteredMatches.flatMap(m => [m.t1, m.t2]))].filter(t => t && !t.includes('КОМАНДА') && !t.includes('ПОБЕДИТЕЛЬ') && !t.includes('ПАРА')).sort();
    document.getElementById('filter-teams').innerHTML = '<option value="all">Все команды</option>' + teams.map(t => `<option value="${t}">${t}</option>`).join('');
    document.getElementById('filter-stages').innerHTML = '<option value="all">Все стадии</option><option value="Групповой этап">Групповой этап</option><option value="Плей-офф">Плей-офф</option>';
    
    ['filter-teams', 'filter-stages', 'filter-status'].forEach(id => {
        let el = document.getElementById(id);
        if (el) {
            el.removeEventListener('change', render2026Schedule);
            el.addEventListener('change', render2026Schedule);
        }
    });
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

function switch2026Tab(tab, btn) {
    active2026Tab = tab;
    document.querySelectorAll('#nav-2026-tabs .tab-btn-top').forEach(el => el.classList.remove('active'));
    if (btn) btn.classList.add('active');
    
    const sections = ['tables', 'schedule', 'standings', 'playoffs', 'scorers', 'assistants'];
    sections.forEach(t => {
        const el = document.getElementById('sub-2026-' + t);
        if (el) el.classList.add('hidden');
    });
    
    const activeEl = document.getElementById('sub-2026-' + tab);
    if (activeEl) activeEl.classList.remove('hidden');
    
    render2026Core();
}

function switchArchiveTab(tab, btn) {
    activeArchiveTab = tab;
    document.querySelectorAll('#archive-tabs-nav .tab-btn-top').forEach(el => el.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderArchiveCore();
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
    if (gender === 'Мужчины' || gender === 'Женщины') {
        let isWomen = (gender === 'Женщины');
        db.matches2026.forEach(m => {
            let idInt = parseInt(m.id);
            // Женские матчи — строго от 1000 до 9999
            let matchIsWomen = (idInt >= 1000 && idInt < 10000);
            
            if (isWomen === matchIsWomen) {
                if(m.t1 && m.t1 !== '-' && m.t1 !== '' && !m.t1.includes('КОМАНДА') && !m.t1.includes('ПАРА')) allTeams.add(normalizeTeamName(m.t1));
                if(m.t2 && m.t2 !== '-' && m.t2 !== '' && !m.t2.includes('КОМАНДА') && !m.t2.includes('ПАРА')) allTeams.add(normalizeTeamName(m.t2));
            }
        });
    }
    const sortedTeams = [...allTeams].sort(); const teamSelect = document.getElementById('stats-team');
    if (sortedTeams.length > 0) {
        teamSelect.innerHTML = sortedTeams.map(t => {
            let isKutuevo = t.toUpperCase().trim() === 'КУТУЕВО';
            return `<option value="${t}" ${isKutuevo ? 'selected' : ''}>${t.toUpperCase()}</option>`;
        }).join('');
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
            listEl.innerHTML += `<div class="flex items-center gap-2 py-1.5 border-b border-zinc-800/50 last:border-0"><span class="text-neon font-black text-[10px] w-4 text-right">${idx+1}.</span><span class="text-zinc-200 font-bold uppercase tracking-wide text-[11px]">${p.name}</span></div>`;
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
        if (yearStr === '2026' && m.status !== 'past') return; 
        
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
        if (m.group && m.group.trim() !== '') currentStage = 'Групповой этап';
        
        let label = currentStage.toUpperCase().replace('ЖЕНЩИНЫ: ', '');
        if (currentStage.toLowerCase().includes('финал') && !currentStage.toLowerCase().includes('3-е')) { label = isWin ? 'ЧЕМПИОН 🏆' : '2 МЕСТО 🥈'; } 
        else if (currentStage.toLowerCase().includes('3-е место')) { label = isWin ? '3 МЕСТО 🥉' : '4 МЕСТО'; }
        
        if(!bestStagesMap[label]) bestStagesMap[label] = [];
        if(!bestStagesMap[label].includes(yearStr)) bestStagesMap[label].push(yearStr);
        historyMatches.push({ year: yearStr, stage: currentStage.replace('Женщины: ', ''), opponent: isT1 ? t2Norm : t1Norm, scoreText: (teamScore !== null ? `${teamScore}:${oppScore}` : '-:-') + (teamPen !== null ? ` (${teamPen}:${oppPen} пен)` : ''), isWin: isWin, isLoss: isLoss });
    }
    db.archive.forEach(m => { if (m.tournament.trim().toLowerCase() === gender.trim().toLowerCase()) processMatch(m, m.year); });
    if (gender === 'Мужчины' || gender === 'Женщины') { db.matches2026.forEach(m => { if (m.status === 'past') processMatch(m, '2026'); }); }
    const stageWeight = { 'ЧЕМПИОН 🏆': 10, '2 МЕСТО 🥈': 9, '3 МЕСТО 🥉': 8, '4 МЕСТО': 7, '1/2': 6, '1/4': 5, '1/8': 4, '1/16': 3, '1/32': 2, 'ГРУППОВОЙ ЭТАП': 1 };
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
    
    if (bestStagesMap['ЧЕМПИОН 🏆']) { badgesHtml += `<div class="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full text-amber-400 text-[10px] font-black">🥇 <span class="opacity-70 font-bold ml-0.5">x</span>${bestStagesMap['ЧЕМПИОН 🏆'].length}</div>`; }
    if (bestStagesMap['2 МЕСТО 🥈']) { badgesHtml += `<div class="flex items-center gap-1 bg-slate-400/10 border border-slate-400/30 px-2.5 py-1 rounded-full text-slate-300 text-[10px] font-black">🥈 <span class="opacity-70 font-bold ml-0.5">x</span>${bestStagesMap['2 МЕСТО 🥈'].length}</div>`; }
    if (bestStagesMap['3 МЕСТО 🥉']) { badgesHtml += `<div class="flex items-center gap-1 bg-amber-700/10 border border-amber-700/30 px-2.5 py-1 rounded-full text-amber-600 text-[10px] font-black">🥉 <span class="opacity-70 font-bold ml-0.5">x</span>${bestStagesMap['3 МЕСТО 🥉'].length}</div>`; }

    let isHost = team.trim().toUpperCase().includes('КУТУЕВО');
    let requiredYears = ['2019', '2020', '2021', '2022', '2023', '2024', '2025'];
    let isVeteran = requiredYears.every(y => activeArchiveYears.has(y));

    if (isVeteran) { badgesHtml += `<span class="px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide border border-neon/40 bg-neon/10 text-neon">💎 ВЕТЕРАН ТУРНИРА</span>`; }
    if (isHost) { badgesHtml += `<span class="px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide border border-white/20 bg-white/5 text-white">🏠 ХОЗЯЕВА ТУРНИРА</span>`; }
    badgesContainer.innerHTML = badgesHtml;

    let resultBox = document.getElementById('stat-box-result');
    resultBox.className = "text-[10px] font-black uppercase tracking-tight whitespace-nowrap " + (bestLabel === 'ЧЕМПИОН 🏆' ? 'text-[#FFD700]' : 'text-white');
    resultBox.innerHTML = bestLabel;

    mainCardEl.className = mainCardEl.className.replace(/\s(before:bg-[^\s]+|border-[^\s]+|shadow-[^\s]+)/g, '');
    if (bestStagesMap['ЧЕМПИОН 🏆']) { 
        mainCardEl.style.borderColor = 'rgba(255, 215, 0, 0.4)'; 
        mainCardEl.style.boxShadow = '0 30px 60px -15px rgba(255, 215, 0, 0.25)'; 
        mainCardEl.style.backgroundImage = 'radial-gradient(ellipse 70% 70% at 0% 0%, rgba(255, 215, 0, 0.2) 0%, rgba(0, 0, 0, 0) 100%)'; 
    } else if (isVeteran) {
        mainCardEl.style.borderColor = 'rgba(0, 230, 118, 0.4)'; 
        mainCardEl.style.boxShadow = '0 25px 50px -12px rgba(0, 230, 118, 0.2)'; 
        mainCardEl.style.backgroundImage = 'radial-gradient(ellipse 70% 70% at 0% 0%, rgba(0, 230, 118, 0.1) 0%, rgba(0, 0, 0, 0) 100%)'; 
    } else { 
        mainCardEl.style.borderColor = 'rgba(63, 63, 70, 0.4)'; 
        mainCardEl.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.5)'; 
        mainCardEl.style.backgroundImage = 'radial-gradient(ellipse 70% 70% at 0% 0%, rgba(255, 255, 255, 0.04) 0%, rgba(0, 0, 0, 0) 100%)'; 
    }

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
    
    let filteredMatches = db.matches2026.filter(m => {
        let idInt = parseInt(m.id);
        if (current2026Gender === 'women') return idInt >= 1000 && idInt < 10000;
        if (current2026Gender === 'supercup') return idInt >= 10000;
        return idInt < 1000;
    });

    const groupMatches = filteredMatches.filter(m => m.stage.includes('Групповой этап'));
    const groups = [...new Set(groupMatches.map(m => m.group))].filter(Boolean).sort();
    
    if(groups.length === 0) { 
        container.innerHTML = `<div class="text-zinc-600 text-xs text-center py-10 italic col-span-2">Матчи группового этапа не найдены.</div>`; 
        return; 
    }
    
    let overallStandings = getStandingsArray(); 
    let playoffTeams2026 = overallStandings.slice(0, 32).map(x => x.name.trim().toUpperCase());
    
    groups.forEach(gName => {
        const mInGroup = groupMatches.filter(m => m.group === gName); 
        const sortedTeams = calculateGroupStats(mInGroup, gName);
        
        let headerLabel = gName.toUpperCase().includes('ГРУППА') ? gName : `Группа ${gName}`;
        
        let html = `<div class="group-card"><table><thead><tr><th>${headerLabel}</th><th class="col-stat">В</th><th class="col-stat">Н</th><th class="col-stat">П</th><th class="col-score">М</th><th class="col-stat">О</th></tr></thead><tbody>`;
        sortedTeams.forEach((t, idx) => {
            let isWomen = (current2026Gender === 'women');
            let barColor = isWomen ? (idx < 2 ? 'green-bar' : 'red-bar') : (playoffTeams2026.includes(t.name.trim().toUpperCase()) ? 'green-bar' : 'red-bar');
            html += `<tr><td class="${barColor} max-w-[130px] truncate"><img src="${getGitHubLogoUrl(t.name)}" class="team-logo mr-1.5" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'">${smartTeamName(t.name)}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td><td>${t.gf}-${t.ga}</td><td class="text-neon font-black">${t.pts}</td></tr>`;
        });
        html += `</tbody></table><div class="mt-3 border-t border-zinc-800/60 pt-1.5 space-y-1.5">`;
        mInGroup.forEach(m => {
            const isPast = m.status === 'past'; let scores = getScoreDisplay(m);
            let scoreBadge = isPast ? `<div class="text-neon font-black text-[11px] bg-zinc-900/80 px-2 py-0.5 rounded flex items-center shrink-0 select-none">${scores.s1} : ${scores.s2}</div>` : `<div class="text-zinc-500 text-[11px] bg-zinc-900/30 px-2 py-0.5 rounded shrink-0 select-none">- : -</div>`;
            
            html += `<div class="match-row clickable-match" onclick="openPlayoffModal('${m.id}', '${m.t1.replace(/'/g, "\\'")}', '${m.t2.replace(/'/g, "\\'")}', 'Групповой этап')"><div class="flex justify-between items-center text-[10px] sm:text-[11px] font-bold uppercase gap-2 w-full"><div class="flex-1 min-w-0 truncate flex items-center pr-1"><img src="${getGitHubLogoUrl(m.t1)}" class="team-logo mr-1.5" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'"><span class="truncate">${smartTeamName(m.t1)}</span></div>${scoreBadge}<div class="flex-1 min-w-0 text-right truncate flex items-center justify-end pl-1"><span class="truncate">${smartTeamName(m.t2)}</span><img src="${getGitHubLogoUrl(m.t2)}" class="team-logo ml-1.5" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'"></div></div></div>`;
        });
        container.innerHTML += html + `</div></div>`;
    });
}

function render2026StatList(type) {
    const listContainer = document.getElementById(type === 'scorers' ? 'scorers-list' : 'assistants-list'); if(!listContainer) return; listContainer.innerHTML = '';
    let statsMap = {};
    let isWomen = (current2026Gender === 'women');

    db.goals2026.forEach(g => {
        let mRef = db.matches2026.find(x => x.id === g.match_id);
        if (!mRef) return;
        
        let idInt = parseInt(mRef.id);
        if (current2026Gender === 'women' && (idInt < 1000 || idInt >= 10000)) return;
        if (current2026Gender === 'supercup' && idInt < 10000) return;
        if (current2026Gender === 'men' && idInt >= 1000) return;
        let matchIsWomen = (parseInt(mRef.id) >= 1000);
        if (isWomen !== matchIsWomen) return;

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
    
    let isWomen = (current2026Gender === 'women');

    let filtered = db.matches2026.filter(m => {
        let idInt = parseInt(m.id);
        if (current2026Gender === 'women' && (idInt < 1000 || idInt >= 10000)) return false;
        if (current2026Gender === 'supercup' && idInt < 10000) return false;
        if (current2026Gender === 'men' && idInt >= 1000) return false;

        if(tFilter !== 'all' && m.t1 !== tFilter && m.t2 !== tFilter) return false;
        if(sFilter === 'Групповой этап' && !m.stage.includes('Групповой этап')) return false;
        if(sFilter === 'Плей-офф' && m.stage.includes('Групповой этап')) return false;
        if(statusFilter === 'future' && m.status !== 'future') return false;
        if(statusFilter === 'past' && m.status !== 'past') return false;
        return true;
    });
    if(filtered.length === 0) { container.innerHTML = `<div class="text-zinc-600 text-xs text-center py-10 italic">Матчи не найдены</div>`; return; }
    container.innerHTML = filtered.map((m) => {
        let stageLabel = m.stage.replace('Женщины: ', '');
        if (m.stage.includes('Групповой этап')) {
            stageLabel = m.group.toUpperCase().includes('ГРУППА') ? m.group : `Группа ${m.group}`;
        }
        let isPast = m.status === 'past';
        let t1Name = m.t1; let t2Name = m.t2;
        if (!m.stage.includes('Групповой этап') && (t1Name === 'КОМАНДА' || t1Name === '---' || !t1Name)) { t1Name = getPlayoffFallbackLabel(m.id, 't1'); t2Name = getPlayoffFallbackLabel(m.id, 't2'); }
        let isMock1 = t1Name.includes('КОМАНДА') || t1Name.includes('ПОБЕДИТЕЛЬ') || t1Name.includes('ФИНАЛИСТ') || t1Name.includes('ПРОИГРАВШИЙ');
        let isMock2 = t2Name.includes('КОМАНДА') || t2Name.includes('ПОБЕДИТЕЛЬ') || t2Name.includes('ФИНАЛИСТ') || t2Name.includes('ПРОИГРАВШИЙ');
        let rightSideContent = isPast ? `<div class="text-right shrink-0 select-none"><div class="text-[9px] font-bold tracking-widest text-zinc-500">СЫГРАН</div><div class="text-[9px] text-zinc-600 font-bold uppercase tracking-tight mt-0.5">${m.date || '---'}</div></div>` : `<div class="text-right shrink-0 select-none"><div class="text-sm font-black tracking-wide text-white">${m.time}</div><div class="text-[9px] text-zinc-500 font-bold uppercase tracking-tight mt-0.5">${m.date || '---'}</div></div>`;
        
        return `<div class="bg-zinc-card border border-zinc-900 rounded-2xl p-4 flex justify-between items-center gap-4 transition-all hover:border-zinc-800/80 cursor-pointer clickable-match ${isPast ? 'opacity-60' : ''}" onclick="openPlayoffModal('${m.id}', '${t1Name.replace(/'/g, "\\'")}', '${t2Name.replace(/'/g, "\\'")}', '${m.stage.replace(/'/g, "\\'")}')"><div class="w-24 shrink-0 border-r border-zinc-800/60 pr-2 text-left"><div class="text-[10px] font-black text-neon truncate uppercase tracking-wider">${stageLabel}</div><div class="text-[9px] text-zinc-500 font-bold uppercase mt-0.5">ПОЛЕ #${m.field || '1'}</div></div><div class="flex-grow flex flex-col gap-2.5 min-w-0"><div class="flex items-center text-[11px] sm:text-xs font-bold text-white uppercase truncate gap-2"><img src="${getGitHubLogoUrl(t1Name)}" class="w-4 h-4 object-contain shrink-0" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'"><span class="truncate ${isMock1 ? 'text-zinc-600 font-semibold' : ''}">${smartTeamName(t1Name)}</span></div><div class="flex items-center text-[11px] sm:text-xs font-bold text-white uppercase truncate gap-2"><img src="${getGitHubLogoUrl(t2Name)}" class="w-4 h-4 object-contain shrink-0" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'"><span class="truncate ${isMock2 ? 'text-zinc-600 font-semibold' : ''}">${smartTeamName(t2Name)}</span></div></div>${rightSideContent}</div>`;
    }).join('');
}

function getPlayoffFallbackLabel(matchId, side) {
    let id = parseInt(matchId);
    if (id >= 10000) {
        if (id === 10001 || id === 10002) return 'ПОЛУФИНАЛИСТ СУПЕРКУБКА';
        return 'ФИНАЛИСТ СУПЕРКУБКА';
    }
    if (id >= 1101 && id <= 1500) {
        if (id >= 1101 && id <= 1104) {
            let pairsInfo = { 
                1101: "1 МЕСТО ГРУППЫ А vs 2 МЕСТО ГРУППЫ Г", 
                1102: "1 МЕСТО ГРУППЫ Б vs 2 МЕСТО ГРУППЫ В", 
                1103: "1 МЕСТО ГРУППЫ В vs 2 МЕСТО ГРУППЫ Б", 
                1104: "1 МЕСТО ГРУППЫ Г vs 2 МЕСТО ГРУППЫ А" 
            };
            let p = pairsInfo[id].split(" vs ");
            return side === 't1' ? p[0] : p[1];
        }
        if (id === 1201 || id === 1202) return 'ПОБЕДИТЕЛЬ 1/4 ФИНАЛА';
        if (id === 1301) return 'ПРОИГРАВШАЯ 1/2 ФИНАЛА';
        if (id === 1401) return 'ФИНАЛИСТ';
    }
    if (id >= 101 && id <= 116) {
        const pairs = [[1, 32], [13, 20], [5, 28], [9, 24], [3, 30], [15, 18], [7, 26], [11, 22], [2, 31], [14, 19], [6, 27], [10, 23], [4, 29], [16, 17], [8, 25], [12, 21]];
        let p = pairs[id - 101]; return side === 't1' ? `КОМАНДА #${p[0]}` : `КОМАНДА #${p[1]}`;
    }
    if (id >= 201 && id <= 208) { let base = (id - 201) * 2; return side === 't1' ? `ПОБЕДИТЕЛЬ 1/16 #${base + 1}` : `ПОБЕДИТЕЛЬ 1/16 #${base + 2}`; }
    if (id >= 301 && id <= 304) { let base = (id - 301) * 2; return side === 't1' ? `ПОБЕДИТЕЛЬ 1/8 #${base + 1}` : `ПОБЕДИТЕЛЬ 1/8 #${base + 2}`; }
    if (id === 401 || id === 402) { let base = (id - 401) * 2; return side === 't1' ? `ПОБЕДИТЕЛЬ 1/4 #${base + 1}` : `ПОБЕДИТЕЛЬ 1/4 #${base + 2}`; }
    if (id === 501) return side === 't1' ? 'ПРОИГРАВШИЙ 1/2 #1' : 'ПРОИГРАВШИЙ 1/2 #2';
    if (id === 601) return side === 't1' ? 'ФИНАЛИСТ #1' : 'ФИНАЛИСТ #2';
    return 'КОМАНДА';
}

function getStandingsArray() {
    const filteredMatches = db.matches2026.filter(m => {
        let idInt = parseInt(m.id);
        if (current2026Gender === 'women') return idInt >= 1000 && idInt < 10000;
        if (current2026Gender === 'supercup') return idInt >= 10000;
        return idInt < 1000;
    });

    const groupMatches = filteredMatches.filter(m => m.stage.includes('Групповой этап'));
    const groups = [...new Set(groupMatches.map(m => m.group))].filter(Boolean).sort();
    let ranksMap = {};
    
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
        layer.sort((a, b) => {
            if (b.pts !== a.pts) return b.pts - a.pts;
            if ((b.gf - b.ga) !== (a.gf - a.ga)) return (b.gf - b.ga) - (a.gf - a.ga);
            if (b.gf !== a.gf) return b.gf - a.gf;
            if (db.loats && db.loats['overall']) {
                let order = db.loats['overall'].map(x => x.toUpperCase()); 
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
    tbody.innerHTML = sm.map((t, i) => `<tr class="hover:bg-zinc-900/30 transition-colors border-b border-zinc-900/20 last:border-none"><td class="text-left font-bold py-3 text-[10px] sm:text-xs max-w-[150px] truncate ${i < 32 ? 'green-bar' : 'red-bar'}"><span class="inline-block text-zinc-500 font-bold mr-1 w-4 shrink-0">${i+1}.</span><img src="${getGitHubLogoUrl(t.name)}" class="team-logo mr-1.5" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'"><span>${smartTeamName(t.name)}</span></td><td>${t.games}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td><td>${t.gf}-${t.ga}</td><td class="text-neon font-black">${t.pts}</td></tr>`).join('');
}

function setPlayoffStage2026(stage) { currentPlayoffStage2026 = stage; render2026Playoffs(); }

function render2026Playoffs() {
    const nav = document.getElementById('playoff-stages-nav-2026'); const container = document.getElementById('playoff-matches-2026');
    if(!container || !nav) return; container.innerHTML = '';
    
    let isWomen = (current2026Gender === 'women');
    let isSupercup = (current2026Gender === 'supercup');

    const pMatches = db.matches2026.filter(m => {
        let idInt = parseInt(m.id);
        if (isWomen) return idInt >= 1000 && idInt < 10000;
        if (isSupercup) return idInt >= 10000;
        return idInt < 1000 && !m.stage.includes('Групповой этап');
    });
    
    let stages = ['1/16', '1/8', '1/4', '1/2', 'Финал'];
    if (isWomen) stages = ['1/4', '1/2', 'Финал'];
    if (isSupercup) stages = ['1/2', 'Финал'];

    if(!stages.includes(currentPlayoffStage2026)) currentPlayoffStage2026 = stages[0];
    nav.innerHTML = stages.map(s => `<button class="playoff-stage-btn flex-1 ${currentPlayoffStage2026 === s ? 'active' : ''}" onclick="setPlayoffStage2026('${s}')">${s}</button>`).join('');

    let matchesHtml = ''; 

    if (isSupercup) {
        let stageMatches = pMatches.filter(m => m.stage.includes(currentPlayoffStage2026));
        if (currentPlayoffStage2026 === '1/2') {
            const m1 = stageMatches.find(m => m.id === '10001');
            const m2 = stageMatches.find(m => m.id === '10002');
            matchesHtml += renderPlayoffCardLive(m1, 'Полуфиналист 1', 'Полуфиналист 2', '-', '-', 'Суперкубок: 1/2');
            matchesHtml += renderPlayoffCardLive(m2, 'Полуфиналист 3', 'Полуфиналист 4', '-', '-', 'Суперкубок: 1/2');
        } else if (currentPlayoffStage2026 === 'Финал') {
            const mf = stageMatches.find(m => m.id === '100010');
            matchesHtml += renderPlayoffCardLive(mf, 'Финалист 1', 'Финалист 2', '-', '-', 'Суперкубок: Финал');
        }
    } else if (!isWomen && currentPlayoffStage2026 === '1/16') {
        let stageMatches = pMatches.filter(m => m.stage.includes(currentPlayoffStage2026));
        const pairs = [[1, 32], [13, 20], [5, 28], [9, 24], [3, 30], [15, 18], [7, 26], [11, 22], [2, 31], [14, 19], [6, 27], [10, 23], [4, 29], [16, 17], [8, 25], [12, 21]];
        pairs.forEach((p, idx) => {
            let currentId = (101 + idx).toString(); let realMatch = stageMatches.find(m => m.id === currentId);
            let t1 = (realMatch && realMatch.t1 && realMatch.t1 !== 'КОМАНДА' && realMatch.t1 !== '---') ? realMatch.t1 : `КОМАНДА #${p[0]}`;
            let t2 = (realMatch && realMatch.t2 && realMatch.t2 !== 'КОМАНДА' && realMatch.t2 !== '---') ? realMatch.t2 : `КОМАНДА #${p[1]}`;
            matchesHtml += renderPlayoffCardLive(realMatch, t1, t2, p[0], p[1], currentPlayoffStage2026);
        });
    } else if (currentPlayoffStage2026 === '1/4' && isWomen) {
        let stageMatches = pMatches.filter(m => m.stage.includes(currentPlayoffStage2026));
        let pairsConfigWomen = [
            { id: "1101", g1: "А", r1: 1, g2: "Г", r2: 2, label1: "1 МЕСТО ГРУППЫ А", label2: "2 МЕСТО ГРУППЫ Г", short1: "1А", short2: "2Г" },
            { id: "1102", g1: "Б", r1: 1, g2: "В", r2: 2, label1: "1 МЕСТО ГРУППЫ Б", label2: "2 МЕСТО ГРУППЫ В", short1: "1Б", short2: "2В" },
            { id: "1103", g1: "В", r1: 1, g2: "Б", r2: 2, label1: "1 МЕСТО ГРУППЫ В", label2: "2 МЕСТО ГРУППЫ Б", short1: "1В", short2: "2Б" },
            { id: "1104", g1: "Г", r1: 1, g2: "А", r2: 2, label1: "1 МЕСТО ГРУППЫ Г", label2: "2 МЕСТО ГРУППЫ А", short1: "1Г", short2: "2А" }
        ];

        let allWomenGroupMatches = db.matches2026.filter(m => {
            let idInt = parseInt(m.id);
            return idInt >= 1000 && idInt < 1100;
        });

        pairsConfigWomen.forEach(cfg => {
            let realMatch = stageMatches.find(m => m.id === cfg.id);
            
            let cleanGroupName = (gValue) => {
                if (!gValue) return '';
                return gValue.toString().toUpperCase().replace('ГРУППА', '').trim();
            };

            let matchesG1 = allWomenGroupMatches.filter(m => cleanGroupName(m.group) === cfg.g1.toUpperCase());
            let matchesG2 = allWomenGroupMatches.filter(m => cleanGroupName(m.group) === cfg.g2.toUpperCase());

            let gTop1 = calculateGroupStats(matchesG1, cfg.g1);
            let gTop2 = calculateGroupStats(matchesG2, cfg.g2);

            let isG1Finished = matchesG1.length > 0 && matchesG1.every(m => m.status === 'past');
            let isG2Finished = matchesG2.length > 0 && matchesG2.every(m => m.status === 'past');

            let isT1MockInDb = !realMatch || !realMatch.t1 || realMatch.t1 === '---' || realMatch.t1.includes('МЕСТО') || realMatch.t1.includes('КОМАНДА') || realMatch.t1.length <= 4;
            let isT2MockInDb = !realMatch || !realMatch.t2 || realMatch.t2 === '---' || realMatch.t2.includes('МЕСТО') || realMatch.t2.includes('КОМАНДА') || realMatch.t2.length <= 4;

            let t1 = (!isT1MockInDb) ? realMatch.t1 : ((isG1Finished && gTop1 && gTop1[cfg.r1 - 1]) ? gTop1[cfg.r1 - 1].name : cfg.label1);
            let t2 = (!isT2MockInDb) ? realMatch.t2 : ((isG2Finished && gTop2 && gTop2[cfg.r2 - 1]) ? gTop2[cfg.r2 - 1].name : cfg.label2);

            matchesHtml += renderPlayoffCardLive(realMatch, t1, t2, cfg.short1, cfg.short2, '1/4 финала');
        });
    } else if (currentPlayoffStage2026 === 'Финал') {
        let finalId = isWomen ? '1401' : '601'; 
        let thirdPlaceId = isWomen ? '1301' : '501'; 
        
        const realFinal = pMatches.find(m => m.id === finalId); 
        if (realFinal) {
            matchesHtml += renderPlayoffCardLive(realFinal, 'ФИНАЛИСТ #1', 'ФИНАЛИСТ #2', '-', '-', 'Финал');
        }
        
        const real3rd = pMatches.find(m => m.id === thirdPlaceId); 
        if (real3rd) {
            matchesHtml += renderPlayoffCardLive(real3rd, isWomen ? 'ПРОИГРАВШАЯ 1/2 #1' : 'ПРОИГРАВШИЙ 1/2 #1', isWomen ? 'ПРОИГРАВШАЯ 1/2 #2' : 'ПРОИГРАВШИЙ 1/2 #2', '-', '-', 'Матч за 3 место');
        }
    } else {
        let stageMatches = pMatches.filter(m => m.stage.includes(currentPlayoffStage2026));
        let slots = currentPlayoffStage2026 === '1/8' ? 8 : (currentPlayoffStage2026 === '1/4' ? 4 : 2);
        let startId = currentPlayoffStage2026 === '1/8' ? 201 : (currentPlayoffStage2026 === '1/4' ? 301 : 401);
        if (isWomen && currentPlayoffStage2026 === '1/2') { slots = 2; startId = 1201; }
        
        let prevLabel = currentPlayoffStage2026 === '1/8' ? '1/16' : (currentPlayoffStage2026 === '1/4' ? '1/8' : '1/4');
        for(let i = 0; i < slots; i++) {
            let currentId = (startId + i).toString(); let realMatch = stageMatches.find(m => m.id === currentId);
            let t1 = (realMatch && realMatch.t1 && realMatch.t1 !== '---') ? realMatch.t1 : `ПОБЕДИТЕЛЬ ${prevLabel} #${i * 2 + 1}`;
            let t2 = (realMatch && realMatch.t2 && realMatch.t2 !== '---') ? realMatch.t2 : `ПОБЕДИТЕЛЬ ${prevLabel} #${i * 2 + 2}`;
            matchesHtml += renderPlayoffCardLive(realMatch, t1, t2, '-', '-', currentPlayoffStage2026 + ' финала');
        }
    }
    // Убран max-w-sm, карточки теперь во всю ширину экрана!
    container.innerHTML = `<div class="flex flex-col gap-3 w-full">${matchesHtml}</div>`;
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
        const groupM = mArch.filter(m => m.stage === 'Групповой этап');
        const groups = [...new Set(groupM.map(m => m.group))].filter(Boolean).sort();
        if(groups.length === 0) { gContainer.innerHTML = `<div class="text-zinc-600 text-xs text-center py-10 italic">Групповой этап не найден.</div>`; return; }
        const playoffTeams = new Set(mArch.filter(m => m.stage !== 'Групповой этап').flatMap(m => [m.t1, m.t2]).filter(Boolean));
        groups.forEach(g => {
            const sorted = calculateGroupStats(groupM.filter(m => m.group === g), g);
            let html = `<div class="group-card"><table><thead><tr><th>${g}</th><th class="col-stat">В</th><th class="col-stat">Н</th><th class="col-stat">П</th><th class="col-score">М</th><th class="col-stat">О</th></tr></thead><tbody>`;
            sorted.forEach((t, idx) => {
                let bar = playoffTeams.has(t.name) ? 'green-bar' : 'red-bar'; if (archiveYear === '2023') bar = idx === 0 ? 'green-bar' : (idx === 1 || idx === 2 ? 'lime-bar' : 'red-bar');
                html += `<tr><td class="${bar} max-w-[140px] truncate"><img src="${getGitHubLogoUrl(t.name)}" class="team-logo mr-1.5" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'">${smartTeamName(t.name)}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td><td>${t.gf}-${t.ga}</td><td class="text-neon font-black">${t.pts}</td></tr>`;
            });
            gContainer.innerHTML += html + `</tbody></table></div>`;
        });
    }
    if(activeArchiveTab === 'playoffs') {
        pContainer.classList.remove('hidden'); const playM = mArch.filter(m => m.stage !== 'Групповой этап');
        let stages = [...new Set(playM.map(m => m.stage))].filter(s => s && !s.toLowerCase().includes('3-е место'));
        const order = ['1/32', '1/16', '1/8', '1/4', '1/2', 'Финал']; stages.sort((a, b) => order.findIndex(o => a.toLowerCase().includes(o.toLowerCase())) - order.findIndex(o => b.toLowerCase().includes(o.toLowerCase())));
        if(stages.length === 0) { document.getElementById('archive-playoff-matches').innerHTML = `<div class="text-zinc-600 text-xs text-center py-10 italic">Плей-офф отсутствует</div>`; return; }
        if(!currentPlayoffStageArchive || !stages.includes(currentPlayoffStageArchive)) currentPlayoffStageArchive = stages[0];
        document.getElementById('archive-playoff-nav').innerHTML = stages.map(s => `<button class="playoff-stage-btn flex-1 text-[10px] !py-2.5 ${currentPlayoffStageArchive === s ? 'active' : ''}" onclick="setPlayoffStageArchive('${s}')">${s}</button>`).join('');
        let matchesHtml = ''; let stageMatches = playM.filter(m => m.stage === currentPlayoffStageArchive);
        if(currentPlayoffStageArchive.toLowerCase().includes('финал')) { const tm = playM.find(m => m.stage.toLowerCase().includes('3-е место')); if(tm) stageMatches.push(tm); }
        stageMatches.forEach(m => { matchesHtml += renderPlayoffCard(m, m.t1, m.t2); });
        // Убран max-w-sm, карточки Архива теперь тоже во всю ширину экрана!
        document.getElementById('archive-playoff-matches').innerHTML = `<div class="flex flex-col gap-3 w-full">${matchesHtml}</div>`;
    }
    if(activeArchiveTab === 'results') {
        rContainer.classList.remove('hidden'); rContainer.innerHTML = ''; const stages = [...new Set(mArch.map(m => m.stage))];
        if(stages.length === 0) { rContainer.innerHTML = `<div class="text-zinc-600 text-xs text-center py-10 italic">Матчи отсутствуют</div>`; return; }
        rContainer.innerHTML = stages.map(stg => {
            let ml = mArch.filter(m => m.stage === stg).map(m => {
                let scores = getScoreDisplay(m);
                return `<div class="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-3 flex justify-between text-[10px] sm:text-[11px] font-bold uppercase items-center w-full"><div class="space-y-1 flex-1 min-w-0 pr-2"><div class="flex items-center truncate"><img src="${getGitHubLogoUrl(m.t1)}" class="team-logo mr-2" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'">${smartTeamName(m.t1)}</div><div class="flex items-center truncate"><img src="${getGitHubLogoUrl(m.t2)}" class="team-logo mr-2" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'">${smartTeamName(m.t2)}</div></div><div class="text-right text-neon font-black space-y-1 shrink-0"><div>${scores.s1}</div><div>${scores.s2}</div></div></div>`;
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
    const genSelector = document.getElementById('gender-category-selector');
    [view2026, viewArch, viewStats].forEach(v => { if (v) v.classList.add('hidden'); });
    ['mode-btn-2026', 'mode-btn-stats', 'mode-btn-archive'].forEach(id => { 
        let el = document.getElementById(id);
        if (el) el.className = "flex flex-col items-center justify-center w-1/3 py-2 text-gray-500 hover:text-white transition-colors outline-none cursor-pointer"; 
    });
    
    if(mode === '2026') {
        if (view2026) view2026.classList.remove('hidden'); 
        if (tabs2026) tabs2026.classList.remove('hidden'); 
        if (ctrlsArch) ctrlsArch.classList.add('hidden'); 
        if (genSelector) genSelector.classList.remove('hidden');
        document.getElementById('mode-btn-2026').className = "flex flex-col items-center justify-center w-1/3 py-2 text-neon transition-colors outline-none cursor-pointer";
        render2026Core();
    } else if (mode === 'archive') {
        if (viewArch) viewArch.classList.remove('hidden'); 
        if (tabs2026) tabs2026.classList.add('hidden'); 
        if (ctrlsArch) ctrlsArch.classList.remove('hidden'); 
        if (genSelector) genSelector.classList.add('hidden');
        document.getElementById('mode-btn-archive').className = "flex flex-col items-center justify-center w-1/3 py-2 text-neon transition-colors outline-none cursor-pointer";
        renderArchiveCore();
    } else if (mode === 'stats') {
        if (viewStats) viewStats.classList.remove('hidden'); 
        if (tabs2026) tabs2026.classList.add('hidden'); 
        if (ctrlsArch) ctrlsArch.classList.add('hidden'); 
        if (genSelector) genSelector.classList.add('hidden');
        document.getElementById('mode-btn-stats').className = "flex flex-col items-center justify-center w-1/3 py-2 text-neon transition-colors outline-none cursor-pointer";
        renderTeamStatistics();
    }

    // Твое главное исправление: Плашки «Листайте» теперь зафиксированы и видны всегда во всех табах!
    const scrollIndicator = document.getElementById('scroll-indicator-top');
    const archiveIndicator = document.getElementById('scroll-indicator-archive');
    
    if (mode === 'stats') {
        if (scrollIndicator) scrollIndicator.style.setProperty('display', 'none', 'important');
        if (archiveIndicator) archiveIndicator.style.setProperty('display', 'none', 'important');
    } else if (mode === 'archive') {
        if (scrollIndicator) scrollIndicator.style.setProperty('display', 'none', 'important');
        if (archiveIndicator) archiveIndicator.style.setProperty('display', 'flex', 'important');
    } else if (mode === '2026') {
        if (archiveIndicator) archiveIndicator.style.setProperty('display', 'none', 'important');
        if (scrollIndicator) scrollIndicator.style.setProperty('display', 'flex', 'important'); // Всегда видна в Сезоне 2026!
    }
}

function render2026Core() {
    if (active2026Tab === 'tables') render2026Tables();
    if (active2026Tab === 'schedule') render2026Schedule();
    if (active2026Tab === 'standings') render2026OverallStandings();
    if (active2026Tab === 'playoffs') render2026Playoffs();
    if (active2026Tab === 'scorers') render2026StatList('scorers');
    if (active2026Tab === 'assistants') render2026StatList('assistants');
}

function getScoreDisplay(m) {
    if (m.status !== 'past' || m.s1 === null || m.s2 === null) return { s1: '-', s2: '-' };
    let pen1Str = (m.p1 !== null) ? ` <span class="text-white text-[9px] font-normal ml-1">${m.p1}</span>` : '';
    let pen2Str = (m.p2 !== null) ? ` <span class="text-white text-[9px] font-normal ml-1">${m.p2}</span>` : '';
    return { s1: m.s1 + pen1Str, s2: m.s2 + pen2Str };
}

function renderEventsInline(m, isPast) {
    if (!isPast) return '<div class="text-center italic py-1 text-zinc-600">Матч еще не сыгран</div>';
    let events = db.goals2026.filter(g => g.match_id == m.id);
    if (events.length === 0) return '<div class="text-center italic py-1 text-zinc-600">Нет данных о голах</div>';
    
    events.sort((a, b) => a.minute - b.minute);
    
    let s1 = 0; let s2 = 0;
    return events.map(e => {
        if (e.team.toUpperCase() === m.t1.toUpperCase()) s1++;
        else if (e.team.toUpperCase() === m.t2.toUpperCase()) s2++;
        
        let pName = shortenPlayerName(e.player);
        let aStr = e.assistant ? `<span class="text-zinc-500 text-[9px] ml-1">(${shortenPlayerName(e.assistant)})</span>` : '';
        return `<div class="flex items-center py-0.5">
            <span class="text-zinc-500 font-black text-[10px] w-6 shrink-0 text-left">${e.minute}'</span>
            <span class="text-neon font-black text-[10px] bg-zinc-900/80 px-1.5 rounded mr-2 shrink-0">${s1}:${s2}</span>
            <span class="text-white font-bold text-[10px] truncate">${pName}</span>${aStr}
        </div>`;
    }).join('');
}

function toggleDetails(id, el) {
    const det = document.getElementById(id);
    if(det) det.classList.toggle('open');
    if(el) el.classList.toggle('open');
}

function renderPlayoffCardLive(m, t1Fallback, t2Fallback, gridPos1, gridPos2, stageLabel) {
    let t1Name = (m && m.t1 && m.t1 !== '---') ? m.t1 : t1Fallback;
    let t2Name = (m && m.t2 && m.t2 !== '---') ? m.t2 : t2Fallback;
    
    let isMock1 = t1Name.includes('КОМАНДА') || t1Name.includes('ПОБЕДИТЕЛЬ') || t1Name.includes('ФИНАЛИСТ') || t1Name.includes('ПРОИГРАВШ') || t1Name.includes('ПАРА') || t1Name.includes('ГРУПП') || t1Name.includes('МЕСТО') || t1Name.toUpperCase().includes('ПРОИГРАВШАЯ');
    let isMock2 = t2Name.includes('КОМАНДА') || t2Name.includes('ПОБЕДИТЕЛЬ') || t2Name.includes('ФИНАЛИСТ') || t2Name.includes('ПРОИГРАВШ') || t2Name.includes('ПАРА') || t2Name.includes('ГРУПП') || t2Name.includes('МЕСТО') || t2Name.toUpperCase().includes('ПРОИГРАВШАЯ');
    
    let isPast = m && m.status === 'past';
    let medal1 = ""; let medal2 = "";
    
    if (isPast && m && m.s1 !== null && m.s2 !== null) {
        if (m.id === '601' || m.id === '1008' || m.id === '1401') {
            if (m.s1 > m.s2 || (m.s1 === m.s2 && m.p1 > m.p2)) { medal1 = " 🥇"; medal2 = " 🥈"; }
            else { medal1 = " 🥈"; medal2 = " 🥇"; }
        } else if (m.id === '501' || m.id === '1007' || m.id === '1301') {
            if (m.s1 > m.s2 || (m.s1 === m.s2 && m.p1 > m.p2)) { medal1 = " 🥉"; }
            else { medal2 = " 🥉"; }
        }
    }
    
    let s1 = (isPast && m.s1 !== null) ? m.s1 : '-';
    let s2 = (isPast && m.s2 !== null) ? m.s2 : '-';
    let p1 = (isPast && m.p1 !== null) ? `<sup class="text-white text-[9px] font-normal ml-0.5">${m.p1}</sup>` : '';
    let p2 = (isPast && m.p2 !== null) ? `<sup class="text-white text-[9px] font-normal ml-0.5">${m.p2}</sup>` : '';

    let gridBadge1 = gridPos1 !== '-' ? `<span class="text-zinc-500 font-extrabold text-[10px] w-5 shrink-0 text-left mr-1">${gridPos1}</span>` : '';
    let gridBadge2 = gridPos2 !== '-' ? `<span class="text-zinc-500 font-extrabold text-[10px] w-5 shrink-0 text-left mr-1">${gridPos2}</span>` : '';

    let inlineStyle = "";
    if (stageLabel === 'Финал' || (m && (m.id === '601' || m.id === '1008' || m.id === '1401'))) {
        inlineStyle = `style="border-color: rgba(255, 215, 0, 0.4) !important; box-shadow: 0 0 20px rgba(255, 215, 0, 0.15) !important; background-image: radial-gradient(ellipse 50% 50% at 0% 0%, rgba(255, 215, 0, 0.08) 0%, rgba(0, 0, 0, 0) 100%) !important;"`;
    } else if (stageLabel === 'Матч за 3 место' || (m && (m.id === '501' || m.id === '1007' || m.id === '1301'))) {
        inlineStyle = `style="border-color: rgba(205, 127, 50, 0.4) !important; box-shadow: 0 0 15px rgba(205, 127, 50, 0.1) !important; background-image: radial-gradient(ellipse 50% 50% at 0% 0%, rgba(205, 127, 50, 0.05) 0%, rgba(0, 0, 0, 0) 100%) !important;"`;
    }

    let matchId = m ? m.id : `mock-playoff-${Math.random()}`;

    return `
    <div ${inlineStyle} class="match-row clickable-match bg-zinc-card border border-zinc-900 rounded-2xl p-3 flex justify-between items-center w-full relative overflow-hidden transition-all hover:border-zinc-800/80 cursor-pointer" onclick="openPlayoffModal('${matchId}', '${t1Fallback.replace(/'/g, "\\'")}', '${t2Fallback.replace(/'/g, "\\'")}', '${stageLabel}')">
        <div class="flex-1 space-y-2 min-w-0 pr-2 z-10">
            <div class="flex items-center truncate text-[11px] sm:text-xs font-bold text-white uppercase">
                ${gridBadge1}
                <img src="${getGitHubLogoUrl(t1Name)}" class="team-logo mr-2 w-4 h-4 object-contain" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'">
                <span class="truncate ${isMock1 ? 'text-zinc-500 font-bold' : ''}">${smartTeamName(t1Name)}${medal1}</span>
            </div>
            <div class="flex items-center truncate text-[11px] sm:text-xs font-bold text-white uppercase">
                ${gridBadge2}
                <img src="${getGitHubLogoUrl(t2Name)}" class="team-logo mr-2 w-4 h-4 object-contain" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'">
                <span class="truncate ${isMock2 ? 'text-zinc-500 font-bold' : ''}">${smartTeamName(t2Name)}${medal2}</span>
            </div>
        </div>
        <div class="flex flex-col gap-1.5 items-end justify-center shrink-0 z-10 font-black text-xs sm:text-sm text-neon pr-1">
            <div class="flex items-center justify-end">${s1}${p1}</div>
            <div class="flex items-center justify-end">${s2}${p2}</div>
        </div>
    </div>`;
}

function setPlayoffStageArchive(stage) {
    currentPlayoffStageArchive = stage;
    renderArchiveCore();
}

function renderPlayoffCard(m, t1, t2) {
    let s1 = m.s1 !== null ? m.s1 : '-';
    let s2 = m.s2 !== null ? m.s2 : '-';
    let p1 = m.p1 !== null ? `<span class="text-white text-[9px] ml-1.5">${m.p1}</span>` : '';
    let p2 = m.p2 !== null ? `<span class="text-white text-[9px] ml-1.5">${m.p2}</span>` : '';

    let isPast = m.status === 'past';
    let inlineStyle = "";
    let medal1 = "";
    let medal2 = "";
    
    let stageLower = (m.stage || "").toLowerCase();

    if (stageLower.includes('финал') && !stageLower.includes('3')) {
        inlineStyle = `style="border-color: rgba(255, 215, 0, 0.35); box-shadow: 0 0 20px rgba(255, 215, 0, 0.15); background-image: radial-gradient(ellipse 50% 50% at 0% 0%, rgba(255, 215, 0, 0.08) 0%, rgba(0, 0, 0, 0) 100%);"`;
        if (isPast) {
            if (m.s1 > m.s2 || (m.s1 === m.s2 && m.p1 > m.p2)) { medal1 = " 🥇"; medal2 = " 🥈"; }
            else { medal1 = " 🥈"; medal2 = " 🥇"; }
        }
    } else if (stageLower.includes('3-е место') || stageLower.includes('3 место')) {
        inlineStyle = `style="border-color: rgba(205, 127, 50, 0.35); box-shadow: 0 0 20px rgba(205, 127, 50, 0.15); background-image: radial-gradient(ellipse 50% 50% at 0% 0%, rgba(205, 127, 50, 0.08) 0%, rgba(0, 0, 0, 0) 100%);"`;
        if (isPast) {
            if (m.s1 > m.s2 || (m.s1 === m.s2 && m.p1 > m.p2)) { medal1 = " 🥉"; }
            else { medal2 = " 🥉"; }
        }
    }

    return `<div ${inlineStyle} class="bg-zinc-card border border-zinc-900 rounded-2xl p-3 flex justify-between items-center w-full relative overflow-hidden">
        <div class="flex-1 space-y-2 min-w-0 pr-2 z-10">
            <div class="flex items-center truncate text-[11px] sm:text-xs font-bold text-white uppercase"><img src="${getGitHubLogoUrl(t1)}" class="team-logo mr-2" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'"><span class="truncate">${smartTeamName(t1)}${medal1}</span></div>
            <div class="flex items-center truncate text-[11px] sm:text-xs font-bold text-white uppercase"><img src="${getGitHubLogoUrl(t2)}" class="team-logo mr-2" onerror="this.src='https://raw.githubusercontent.com/ilnursultan/team-logos/main/logos/standart.png'"><span class="truncate">${smartTeamName(t2)}${medal2}</span></div>
        </div>
        <div class="flex flex-col gap-1.5 items-end justify-center shrink-0 z-10 font-black text-[11px] sm:text-xs text-neon">
            <div class="flex items-center">${s1}${p1}</div>
            <div class="flex items-center">${s2}${p2}</div>
        </div>
    </div>`;
}

function loadFilteredBestPlayers() {
    const bContainer = document.getElementById('best-players-list');
    if(!bContainer) return;
    let best = db.bestPlayers.filter(b => b.year === archiveYear && b.sex.toLowerCase() === archiveTournament.toLowerCase());
    if(best.length === 0) { bContainer.innerHTML = `<div class="text-zinc-600 text-xs text-center py-4 italic">Нет данных о лучших игроках</div>`; return; }
    bContainer.innerHTML = best.map(b => `
        <div class="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-3 flex items-center justify-between mb-2 hover:bg-zinc-900/60 transition-colors">
            <div class="flex items-center gap-3">
                <img src="${getGitHubLogoUrl(b.team)}" class="w-10 h-10 object-contain drop-shadow-md">
                <div class="flex flex-col gap-0.5">
                    <span class="text-white font-bold text-xs uppercase">${b.name}</span>
                    <span class="text-zinc-500 text-[10px] font-medium uppercase">${b.team}</span>
                </div>
            </div>
            <div class="text-right">
                <span class="text-[9px] font-black uppercase text-neon tracking-wider bg-neon/10 px-2 py-1 rounded-lg border border-neon/20">${b.nomination}</span>
            </div>
        </div>
    `).join('');
}

window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const hash = window.location.hash;
        if (hash === '#stats') {
            if (typeof setGlobalMode === 'function') setGlobalMode('stats');
        } else if (hash === '#archive') {
            if (typeof setGlobalMode === 'function') setGlobalMode('archive');
        }
    }, 300);
});

const originalSetGlobalMode = setGlobalMode;
setGlobalMode = function(mode) {
    if (mode === 'stats') {
        window.location.hash = 'stats';
    } else if (mode === 'archive') {
        window.location.hash = 'archive';
    } else if (mode === '2026') {
        history.replaceState(null, null, ' ');
    }
    if (typeof originalSetGlobalMode === 'function') {
        originalSetGlobalMode(mode);
    }
};

init();
