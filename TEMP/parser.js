// Вычислительный слой обработки данных

function normalizeTeamName(name) {
    if (!name) return '';
    let s = name.toString().trim();
    let upper = s.toUpperCase();
    if (upper.endsWith("-1") || upper.endsWith(" 1")) { s = s.substring(0, s.length - 2).trim(); }
    return s;
}

function smartTeamName(name) {
    let s = normalizeTeamName(name); if (!s) return '';
    let upper = s.toUpperCase();
    if (upper.startsWith("НОВО")) { s = "Н-" + s.substring(4); }
    else if (upper.startsWith("БОЛЬШИЕ") || upper.startsWith("БОЛЬШАЯ") || upper.startsWith("БОЛЬШОЕ")) { 
        let parts = s.split(/\s+/); s = "Б. " + parts.slice(1).join(" "); 
    }
    else if (upper.startsWith("СТАРО")) { s = "С-" + s.substring(5); }
    else if (upper.startsWith("КРАСНАЯ")) { let parts = s.split(/\s+/); s = "КР. " + parts.slice(1).join(" "); }
    return s;
}

function parseGeoCSV(text) {
    // В новой JSON версии этот метод вызывается внутри mapServerData
}

function getTeamGeoHtml(teamName, isMen = true) {
    const key = normalizeTeamName(teamName).toUpperCase();
    if (db.geo && db.geo[key]) {
        const item = db.geo[key]; let dist = item.distance;
        let dText = item.district || '';
        if (isMen && dText && !dText.toLowerCase().includes('район') && !dText.toLowerCase().includes('р-н')) { dText += ' район'; }
        let baseGeo = `<span class="font-extrabold text-white">${dText}${dText && item.subject ? ', ' : ''}${item.subject}</span>`.toUpperCase();
        let distanceHtml = '';
        if (dist && parseInt(dist) > 0 && !key.includes('КУТУЕВО')) {
            distanceHtml = `<div class="text-zinc-500 font-light text-[10px] tracking-wider mt-0.5">ДО КУТУЕВО ${dist} КМ</div>`;
        }
        return `<span>${baseGeo}</span>${distanceHtml}`;
    }
    return '';
}

function parseBestPlayersCSV(text) {}
function parseLoatsCSV(text) {}

function mapServerData(data) {
    db.matches2026 = (data.matches2026 || []).map(m => ({
        id: m.id ? m.id.toString() : "", 
        stage: m.stage ? m.stage.toString().trim() : "", 
        group: m.group ? m.group.toString().trim() : "", 
        t1: normalizeTeamName(m.team1), 
        t2: normalizeTeamName(m.team2),
        s1: m.score1 !== "" && m.score1 !== "-" && m.score1 !== undefined ? parseInt(m.score1) : null,
        s2: m.score2 !== "" && m.score2 !== "-" && m.score2 !== undefined ? parseInt(m.score2) : null,
        p1: m.pen1 !== "" && m.pen1 !== undefined ? parseInt(m.pen1) : null, 
        p2: m.pen2 !== "" && m.pen2 !== undefined ? parseInt(m.pen2) : null,
        time: m.time || "00:00", date: m.date || "", field: m.field || "1", 
        status: m.status ? m.status.toLowerCase().trim() : 'future'
    }));

    db.goals2026 = (data.goals2026 || []).map(g => ({
        match_id: g.match_id ? g.match_id.toString() : "", 
        team: normalizeTeamName(g.team), 
        player: g.player || "", 
        assistant: g.assistant || "", 
        minute: parseInt(g.minute || 1)
    }));

    db.players2026 = (data.players2026 || []).map(p => ({ team: normalizeTeamName(p.team), name: p.player_name || "" }));
    db.groups2026 = (data.groups2026 || []).map(g => ({ group: g.group || "", team: normalizeTeamName(g.team) }));
    db.loats = data.loats || {};
    
    db.geo = {};
    (data.teams || []).forEach(t => {
        if(t.name) {
            db.geo[normalizeTeamName(t.name).toUpperCase()] = { district: t.district || "", subject: t.subject || "", distance: t.distance || "" };
        }
    });

db.archive = (data.archive || []).map(m => ({
        year: m.year ? m.year.toString() : "2025", 
        tournament: m.tournament || "Мужчины", 
        stage: m.stage ? m.stage.toString().trim() : "", 
        group: m.group ? m.group.toString().trim() : "", // Добавили чтение группы
        t1: normalizeTeamName(m.team1), 
        t2: normalizeTeamName(m.team2),
        s1: m.score1 !== "" && m.score1 !== undefined ? parseInt(m.score1) : 0, 
        s2: m.score2 !== "" && m.score2 !== undefined ? parseInt(m.score2) : 0,
        p1: m.pen1 !== "" && m.pen1 !== undefined ? parseInt(m.pen1) : null, 
        p2: m.pen2 !== "" && m.pen2 !== undefined ? parseInt(m.pen2) : null, 
        status: 'past'
    }));

    db.bestPlayers = (data.bestPlayers || []).map(b => ({
        year: b.year ? b.year.toString() : "", 
        sex: b.sex ? b.sex.toLowerCase().trim() : '', 
        nomination: b.nomination || "", 
        name: b.name || "", 
        team: normalizeTeamName(b.team)
    }));
}

function calculateGroupStats(matches, groupName = "") {
    let stats = {};
    matches.forEach(m => {
        let t1Norm = normalizeTeamName(m.t1); let t2Norm = normalizeTeamName(m.t2);
        if (!stats[t1Norm]) stats[t1Norm] = { name: t1Norm, games: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
        if (!stats[t2Norm]) stats[t2Norm] = { name: t2Norm, games: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
        
        if (m.status === 'past' && m.s1 !== null && m.s2 !== null) {
            stats[t1Norm].games++; stats[t2Norm].games++;
            stats[t1Norm].gf += m.s1; stats[t1Norm].ga += m.s2;
            stats[t2Norm].gf += m.s2; stats[t2Norm].ga += m.s1;
            if (m.s1 > m.s2) { stats[t1Norm].w++; stats[t1Norm].pts += 3; stats[t2Norm].l++; }
            else if (m.s1 < m.s2) { stats[t2Norm].w++; stats[t2Norm].pts += 3; stats[t1Norm].l++; }
            else { stats[t1Norm].d++; stats[t1Norm].pts += 1; stats[t2Norm].d++; stats[t2Norm].pts += 1; }
        }
    });

    let teamList = Object.values(stats);
    teamList.sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        let dm = matches.filter(m => m.status === 'past' && m.s1 !== null && m.s2 !== null &&
            ((normalizeTeamName(m.t1) === a.name && normalizeTeamName(m.t2) === b.name) || (normalizeTeamName(m.t1) === b.name && normalizeTeamName(m.t2) === a.name)));
        
        if (dm.length > 0) {
            let aP = 0, bP = 0;
            dm.forEach(m => {
                let isA = normalizeTeamName(m.t1) === a.name;
                if (m.s1 > m.s2) { if (isA) aP += 3; else bP += 3; } 
                else if (m.s1 < m.s2) { if (isA) bP += 3; else aP += 3; } 
                else { aP++; bP++; }
            });
            if (bP !== aP) return bP - aP;
        }

        if ((b.gf - b.ga) !== (a.gf - a.ga)) return (b.gf - b.ga) - (a.gf - a.ga);
        if (b.gf !== a.gf) return b.gf - a.gf;

        if (groupName && db.loats && db.loats[groupName]) {
            let o = db.loats[groupName]; let iA = o.indexOf(a.name.toUpperCase()); let iB = o.indexOf(b.name.toUpperCase());
            if (iA !== -1 && iB !== -1) return iA - iB;
        }
        return 0;
    });
    return teamList;
}