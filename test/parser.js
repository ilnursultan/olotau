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
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
    db.geo = {};
    for(let i = 1; i < lines.length; i++) {
        const sep = lines[i].includes(';') ? ';' : ','; const p = lines[i].split(sep).map(x => x.trim());
        if (p[0]) {
            let normKey = normalizeTeamName(p[0]).toUpperCase();
            db.geo[normKey] = { district: p[1] || '', subject: p[2] || '', distance: p[3] || '' };
        }
    }
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

function parseBestPlayersCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== ''); db.bestPlayers = [];
    for(let i = 1; i < lines.length; i++) {
        const sep = lines[i].includes(';') ? ';' : ','; const p = lines[i].split(sep).map(x => x.replace(/^"|"$/g, '').trim());
        if (p.length < 5 || !p[0]) continue;
        db.bestPlayers.push({ year: p[0].trim(), sex: p[1].trim().toLowerCase(), nomination: p[2], name: p[3], team: p[4] });
    }
}

function parseLoatsCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== ''); db.loats = {};
    for (let i = 1; i < lines.length; i++) {
        const sep = lines[i].includes(';') ? ';' : ','; const p = lines[i].split(sep).map(x => x.replace(/^"|"$/g, '').trim());
        if (!p[0]) continue;
        db.loats[p[0].trim()] = p[1] ? p[1].split(',').map(x => normalizeTeamName(x).toUpperCase()) : [];
    }
}

function parseCoreCSV(text, mode) {
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== ''); const res = [];
    for(let i = 1; i < lines.length; i++) {
        const sep = lines[i].includes(';') ? ';' : ','; const p = lines[i].split(sep).map(x => x.trim());
        if (!p || p.length === 0 || p[0] === "") continue;
        if (mode === 'p') { if (p[0] && p[1] && p[0].toLowerCase() !== "team") { res.push({ team: normalizeTeamName(p[0]), name: p[1] }); } continue; }
        if(mode === 'm') {
            if (!p[3] || !p[4] || p[3] === "" || p[4] === "") continue;
            res.push({ id: p[0], stage: p[1] || '', group: p[2] || '', t1: normalizeTeamName(p[3]), t2: normalizeTeamName(p[4]), s1: p[5] !== "" && p[5] !== "-" ? parseInt(p[5]) : null, s2: p[6] !== "" && p[6] !== "-" ? parseInt(p[6]) : null, p1: p[7] && p[7] !== "" ? parseInt(p[7]) : null, p2: p[8] && p[8] !== "" ? parseInt(p[8]) : null, time: p[9] || '00:00', date: p[10] || '', field: p[11] || '1', status: p[12] ? p[12].toLowerCase() : 'future' });
        } else if(mode === 'g' && p.length >= 5) {
            res.push({ match_id: p[0].toString(), team: normalizeTeamName(p[1]), player: p[2], assistant: p[3], minute: parseInt(p[4]||1) });
        }
    }
    return res;
}

function parseArchiveCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== ''); const result = [];
    for(let i = 1; i < lines.length; i++) {
        const sep = lines[i].includes(';') ? ';' : ','; const p = lines[i].split(sep).map(x => x.trim());
        if (!p || p.length < 5 || !p[3] || !p[4]) continue;
        result.push({ year: p[0] || '2025', tournament: p[1] || 'Мужчины', stage: p[2] || '', t1: normalizeTeamName(p[3]), t2: normalizeTeamName(p[4]), s1: p[5] !== "" && p[5] !== "-" ? parseInt(p[5]) : 0, s2: p[6] !== "" && p[6] !== "-" ? parseInt(p[6]) : 0, p1: p[7] && p[7] !== "" ? parseInt(p[7]) : null, p2: p[8] && p[8] !== "" ? parseInt(p[8]) : null, status: 'past' });
    }
    return result;
}

function parseGroups2026CSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== ''); db.groups2026 = [];
    for (let i = 1; i < lines.length; i++) {
        const sep = lines[i].includes(';') ? ';' : ','; const p = lines[i].split(sep).map(x => x.trim());
        if (p[0] && p[1]) { db.groups2026.push({ group: p[0], team: normalizeTeamName(p[1]) }); }
    }
}

function mapServerData(data) {
    db.matches2026 = (data.matches2026 || []).map(m => ({
        id: m.id, stage: m.stage, group: m.group, t1: normalizeTeamName(m.team1), t2: normalizeTeamName(m.team2),
        s1: m.score1 !== "" && m.score1 !== "-" ? parseInt(m.score1) : null,
        s2: m.score2 !== "" && m.score2 !== "-" ? parseInt(m.score2) : null,
        p1: m.pen1 !== "" ? parseInt(m.pen1) : null, p2: m.pen2 !== "" ? parseInt(m.pen2) : null,
        time: m.time, date: m.date, field: m.field, status: m.status ? m.status.toLowerCase() : 'future'
    }));
    db.goals2026 = (data.goals2026 || []).map(g => ({
        match_id: g.match_id, team: normalizeTeamName(g.team), player: g.player, assistant: g.assistant, minute: parseInt(g.minute || 1)
    }));
    db.players2026 = (data.players2026 || []).map(p => ({ team: normalizeTeamName(p.team), name: p.player_name }));
    db.groups2026 = (data.groups2026 || []).map(g => ({ group: g.group, team: normalizeTeamName(g.team) }));
    db.loats = data.loats || {};
    db.geo = {};
    (data.teams || []).forEach(t => {
        db.geo[normalizeTeamName(t.name).toUpperCase()] = { district: t.district, subject: t.subject, distance: t.distance };
    });
    db.archive = (data.archive || []).map(m => ({
        year: m.year, tournament: m.tournament, stage: m.stage, t1: normalizeTeamName(m.team1), t2: normalizeTeamName(m.team2),
        s1: m.score1 !== "" ? parseInt(m.score1) : 0, s2: m.score2 !== "" ? parseInt(m.score2) : 0,
        p1: m.pen1 !== "" ? parseInt(m.pen1) : null, p2: m.pen2 !== "" ? parseInt(m.pen2) : null, status: 'past'
    }));
    db.bestPlayers = (data.bestPlayers || []).map(b => ({
        year: b.year, sex: b.sex ? b.sex.toLowerCase() : '', nomination: b.nomination, name: b.name, team: normalizeTeamName(b.team)
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
                if (m.s1 > m.s2) { if (isA) aP += 3; else bP += 3; } else if (m.s1 < m.s2) { if (isA) bP += 3; else aP += 3; } else { aP++; bP++; }
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
