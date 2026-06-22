// Чистые функции для обработки строк и вычисления статистики спортивных результатов

function normalizeTeamName(name) {
    if (!name) return '';
    let s = name.trim();
    let upper = s.toUpperCase();
    if (upper.endsWith("-1") || upper.endsWith(" 1")) {
        s = s.substring(0, s.length - 2).trim();
    }
    return s;
}

function smartTeamName(name) {
    let s = normalizeTeamName(name);
    if (!s) return '';
    let upper = s.toUpperCase();
    if (upper.startsWith("НОВО")) { s = "Н-" + s.substring(4); }
    else if (upper.startsWith("БОЛЬШИЕ") || upper.startsWith("БОЛЬШАЯ") || upper.startsWith("БОЛЬШОЕ")) { 
        let parts = s.split(/\s+/); 
        s = "Б. " + parts.slice(1).join(" "); 
    }
    else if (upper.startsWith("СТАРО")) { s = "С-" + s.substring(5); }
    else if (upper.startsWith("КРАСНАЯ")) { 
        let parts = s.split(/\s+/); 
        s = "КР. " + parts.slice(1).join(" "); 
    }
    return s;
}

function parseGeoCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
    for(let i = 1; i < lines.length; i++) {
        const sep = lines[i].includes(';') ? ';' : ','; 
        const p = lines[i].split(sep).map(x => x.trim());
        if (p[0]) {
            let normKey = normalizeTeamName(p[0]).toUpperCase();
            db.geo[normKey] = { district: p[1] || '', subject: p[2] || '', distance: p[3] || '' };
        }
    }
}

function parseBestPlayersCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== ''); 
    db.bestPlayers = [];
    for(let i = 1; i < lines.length; i++) {
        const sep = lines[i].includes(';') ? ';' : ','; 
        const p = lines[i].split(sep).map(x => x.replace(/^"|"$/g, '').trim());
        if (p.length < 5 || !p[0]) continue;
        db.bestPlayers.push({ year: p[0].trim(), sex: p[1].trim().toLowerCase(), nomination: p[2], name: p[3], team: p[4] });
    }
}

function parseCoreCSV(text, mode) {
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== ''); 
    const res = [];
    for(let i = 1; i < lines.length; i++) {
        const sep = lines[i].includes(';') ? ';' : ','; 
        const p = lines[i].split(sep).map(x => x.trim());
        
        // Защита от пустых или сломанных строк в таблицах
        if (!p || p.length === 0 || p[0] === "") continue;

        if (mode === 'p') { 
            if (p[0] && p[1] && p[0].toLowerCase() !== "team") { 
                res.push({ team: normalizeTeamName(p[0]), name: p[1] }); 
            } 
            continue; 
        }
        if(mode === 'm') {
            if (!p[3] || !p[4] || p[3] === "" || p[4] === "") continue;
            res.push({ 
                id: p[0] || i.toString(), 
                stage: p[1] || '', 
                group: p[2] || '', 
                t1: normalizeTeamName(p[3]), 
                t2: normalizeTeamName(p[4]), 
                s1: p[5] !== "" ? parseInt(p[5]) : 0, 
                s2: p[6] !== "" ? parseInt(p[6]) : 0, 
                p1: p[7] ? parseInt(p[7]) : null, 
                p2: p[8] ? parseInt(p[8]) : null, 
                time: p[9] || '00:00', 
                date: p[10] || '', 
                field: p[11] || '1', 
                status: p[12] ? p[12].toLowerCase() : 'future' 
            });
        } else if(mode === 'g' && p.length >= 5) {
            res.push({ match_id: p[0].toString(), team: normalizeTeamName(p[1]), player: p[2], assistant: p[3], minute: parseInt(p[4]||1) });
        }
    }
    return res;
}

function parseArchiveCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== ''); 
    const result = [];
    for(let i = 1; i < lines.length; i++) {
        const sep = lines[i].includes(';') ? ';' : ','; 
        const p = lines[i].split(sep).map(x => x.trim());
        if (!p || p.length < 5 || !p[3] || !p[4]) continue;
        result.push({ year: p[0] || '2025', tournament: p[1] || 'Мужчины', stage: p[2] || '', t1: normalizeTeamName(p[3]), t2: normalizeTeamName(p[4]), s1: p[5] !== "" ? parseInt(p[5]) : 0, s2: p[6] !== "" ? parseInt(p[6]) : 0, p1: p[7] ? parseInt(p[7]) : null, p2: p[8] ? parseInt(p[8]) : null, status: 'past' });
    }
    return result;
}

function calculateGroupStats(matches) {
    let stats = {};
    matches.forEach(m => {
        let t1Norm = normalizeTeamName(m.t1); 
        let t2Norm = normalizeTeamName(m.t2);
        if (!stats[t1Norm]) stats[t1Norm] = { name: t1Norm, games: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
        if (!stats[t2Norm]) stats[t2Norm] = { name: t2Norm, games: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
        
        if (m.status === 'past' || (m.s1 !== null && m.s2 !== null && (m.s1 !== 0 || m.s2 !== 0))) {
            stats[t1Norm].games++; 
            stats[t2Norm].games++; 
            stats[t1Norm].gf += m.s1; 
            stats[t1Norm].ga += m.s2; 
            stats[t2Norm].gf += m.s2; 
            stats[t2Norm].ga += m.s1;
            
            if (m.s1 > m.s2) { stats[t1Norm].w++; stats[t1Norm].pts += 3; stats[t2Norm].l++; }
            else if (m.s1 < m.s2) { stats[t2Norm].w++; stats[t2Norm].pts += 3; stats[t2Norm].l++; }
            else { stats[t1Norm].d++; stats[t1Norm].pts += 1; stats[t2Norm].d++; stats[t2Norm].pts += 1; }
        }
    });
    return Object.values(stats).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
}