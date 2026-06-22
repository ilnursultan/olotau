// Логика телефонной админки с единой точкой входа данных пакета

const APPS_SCRIPT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbw3ZFpu3v52mQswK2Ztg_MWk2mP6lsDLElZ8ZmHDzugUNdJlosgdBVvO8YVP5k2j6H8/exec";

let db = { matches2026: [], goals2026: [], players2026: [], loats: {} };
let activeAdminTab = 'group';

async function initAdmin() {
    try {
        // Качаем чистый структурированный JSON пакет со всеми листами за раз
        let res = await fetch(APPS_SCRIPT_WEB_APP_URL).then(r => r.json());
        mapServerData(res);
        
        document.getElementById('admin-loader').style.display = 'none';
        document.getElementById('admin-content').classList.remove('hidden');
        renderAdminPanel();
    } catch(e) {
        document.getElementById('admin-loader').innerText = "Ошибка соединения с Google Sheets API";
    }
}

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

// (Все функции сохранения saveAdminMatch, triggerBuildGrid остаются без изменений)
initAdmin();
