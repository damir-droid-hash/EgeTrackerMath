/* Страницы приложения. */
window.EGE_pages = (() => {
  const S = () => window.EGE_store;
  const D = window.EGE_dates;
  const UI = () => window.EGE_ui;

  // Локальное состояние списков/проверки
  const view = { q: '', status: 'all', sort: 'num', check: null };

  function statusChips(current) {
    const items = [['all', 'Все'], ['green', '🟢 Умею'], ['yellow', '🟡 Повторить'], ['red', '🔴 Не умею'], ['fresh', '⚪ Новые']];
    return `<div class="chips">${items.map(([v, l]) =>
      `<button class="chip ${current === v ? 'on' : ''}" data-action="filter" data-v="${v}">${l}</button>`).join('')}</div>`;
  }

  /* ---------- ГЛАВНАЯ ---------- */
  function home() {
    const s = S(), ui = UI();
    const c = s.counts(), pct = s.progress();
    const b = s.buckets();
    const dueCount = b.overdue.length + b.today.length;
    const recent = s.recentActivity(5);
    const greenCount = c.green;
    return `<div class="page">
      <header class="page-head">
        <h1>Профильная математика</h1>
        <p>Твой прогресс подготовки к ЕГЭ</p>
      </header>
      ${c.green + c.yellow + c.red === 0 ? `<section class="card today-card">
        <div><h2>👋 Начни подготовку</h2><p class="muted">Открой список заданий и проверь первое — это займёт минуту.</p></div>
        <button class="btn btn-primary" data-action="go" data-to="#/tasks">К заданиям</button>
      </section>` : ''}
      <section class="card hero-card">
        ${ui.ring(pct)}
        <div class="hero-stats">
          <div class="hstat g"><b>${c.green}</b><span>🟢 Умею</span></div>
          <div class="hstat y"><b>${c.yellow}</b><span>🟡 Повторить</span></div>
          <div class="hstat r"><b>${c.red}</b><span>🔴 Не умею</span></div>
        </div>
      </section>
      <section class="card today-card">
        <div>
          <h2>К повторению</h2>
          <p class="big-n">${dueCount} ${plural(dueCount, 'задание', 'задания', 'заданий')}</p>
        </div>
        <button class="btn btn-primary" data-action="go" data-to="#/review">Начать повторение</button>
      </section>
      <section class="card link-card" data-action="go" data-to="#/mastered" role="link" tabindex="0">
        <div><h2>Ты уверенно умеешь решать</h2><p class="big-n accent">${greenCount} ${plural(greenCount, 'задание', 'задания', 'заданий')}</p></div>
        <span class="arrow">→</span>
      </section>
      <section>
        <h2 class="sec-title">Последние изменения</h2>
        ${recent.length ? `<div class="list">${recent.map(ev => {
          const def = s.taskDef(ev.id);
          const prev = ev.prev ? UI().stMeta(ev.prev).dot : '⚪';
          return `<div class="row-card" data-action="open-task" data-id="${ev.id}" role="link" tabindex="0">
            <div><b>№${def.num} — ${UI().esc(def.title)}</b>
            <span class="row-sub">${prev} → ${UI().stMeta(ev.r).dot} ${UI().stMeta(ev.r).label} · ${D.relDay(ev.d)}</span></div>
            <span class="arrow">→</span></div>`;
        }).join('')}</div>` : UI().empty('📝', 'Пока нет изменений', 'Проверь первое задание — история появится здесь.')}
      </section>
    </div>`;
  }

  function plural(n, a, b, c) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return a;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return b;
    return c;
  }

  /* ---------- ПОВТОРЕНИЕ ---------- */
  function section(title, ids, emptyTitle, emptyText) {
    const ui = UI();
    return `<h2 class="sec-title">${title} <span class="count">${ids.length}</span></h2>
      ${ids.length ? `<div class="grid">${ids.map(id => ui.taskCard(id)).join('')}</div>`
        : ui.empty('🎉', emptyTitle, emptyText)}`;
  }

  function review() {
    const b = S().buckets();
    // Без давления: всё, что ждёт повторения (включая пропущенное), — в одном спокойном списке
    const due = [...b.overdue, ...b.today];
    return `<div class="page">
      <header class="page-head"><h1>Повторение</h1><p>Занимайся в своём темпе</p></header>
      ${section('К повторению', due, 'Всё повторено 🎉', 'Здесь появятся задания, когда придёт их время.')}
      ${section('Запланировано', b.upcoming.slice(0, 8), 'Пока пусто', 'Проверь задания — появится расписание.')}
      ${b.fresh.length ? `<h2 class="sec-title">Новые задания <span class="count">${b.fresh.length}</span></h2>
        <div class="grid">${b.fresh.map(id => UI().taskCard(id)).join('')}</div>` : ''}
    </div>`;
  }

  /* ---------- ПРОВЕРКА (модалка) ---------- */
  function openCheck(id) {
    view.check = { id, step: 1, result: null };
    renderCheck();
  }

  function renderCheck() {
    const ui = UI(), s = S();
    const { id, step, result } = view.check;
    const def = s.taskDef(id);
    if (step === 1) {
      ui.openModal(`<h2 class="modal-title">Как прошло решение?</h2>
        <p class="modal-sub">№${def.num} — ${ui.esc(def.title)}</p>
        <div class="check-btns">
          <button class="check-btn g" data-action="check-pick" data-r="green"><span>🟢</span>Решил уверенно</button>
          <button class="check-btn y" data-action="check-pick" data-r="yellow"><span>🟡</span>Решил, но были ошибки</button>
          <button class="check-btn r" data-action="check-pick" data-r="red"><span>🔴</span>Не смог решить</button>
        </div>`, { title: 'Проверка' });
    } else {
      const crit = s.getCriteria(id);
      ui.openModal(`<h2 class="modal-title">Самопроверка</h2>
        <p class="modal-sub">${result === 'green' ? '🟢 Решил уверенно' : result === 'yellow' ? '🟡 Были ошибки' : '🔴 Не смог решить'} · №${def.num}</p>
        <p class="crit-note">Отметь, что действительно получилось. Это твои личные критерии — не официальные критерии ФИПИ.</p>
        <div class="crit-list">${crit.map((c, i) =>
          `<label class="crit"><input type="checkbox" data-crit="${i}" ${result === 'green' ? 'checked' : ''}><span class="box"></span>${ui.esc(c)}</label>`).join('')}
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" data-action="check-back">Назад</button>
          <button class="btn btn-primary" data-action="check-save">Сохранить результат</button>
        </div>`, { title: 'Самопроверка' });
    }
  }

  function saveCheck() {
    const s = S(), ui = UI();
    const { id, result } = view.check;
    const t = s.check(id, result);
    ui.closeModal();
    view.check = null;
    ui.toast(`Статус сохранён · следующее повторение: ${D.fmtLong(t.nextReview)}`);
    window.EGE_app.rerender();
  }

  /* ---------- ВСЕ ЗАДАНИЯ ---------- */
  function tasks() {
    const s = S(), ui = UI();
    let ids = window.EGE_DB.tasks.map(t => t.id);
    const q = view.q.trim().toLowerCase();
    if (q) ids = ids.filter(id => {
      const d = s.taskDef(id);
      return String(d.num).includes(q) || d.title.toLowerCase().includes(q);
    });
    if (view.status !== 'all') {
      ids = ids.filter(id => (s.getTask(id).status || 'fresh') === view.status);
    }
    const rank = { red: 0, yellow: 1, fresh: 2, green: 3 };
    if (view.sort === 'num') ids.sort((a, b) => s.taskDef(a).num - s.taskDef(b).num);
    else if (view.sort === 'next') ids.sort((a, b) => D.cmp(s.getTask(a).nextReview, s.getTask(b).nextReview));
    else if (view.sort === 'status') ids.sort((a, b) => rank[s.getTask(a).status || 'fresh'] - rank[s.getTask(b).status || 'fresh']);
    return `<div class="page">
      <header class="page-head"><h1>Все задания</h1><p>${window.EGE_DB.tasks.length} заданий · ${s.counts().green} освоено</p></header>
      <div class="search"><span>🔍</span><input id="search" type="search" placeholder="Поиск по номеру или названию…" value="${ui.esc(view.q)}"></div>
      <div class="sort-row"><label>Сортировка</label>
        <select id="sortsel">
          <option value="num" ${view.sort === 'num' ? 'selected' : ''}>По номеру</option>
          <option value="next" ${view.sort === 'next' ? 'selected' : ''}>По дате повторения</option>
          <option value="status" ${view.sort === 'status' ? 'selected' : ''}>По статусу</option>
        </select></div>
      <div id="tasks-zone">
      ${statusChips(view.status)}
      ${ids.length ? `<div class="grid">${ids.map(id => ui.taskCard(id)).join('')}</div>`
        : ui.empty('🔍', 'Ничего не найдено', 'Попробуй другой запрос или сбрось фильтры.')}
      </div>
    </div>`;
  }

  /* ---------- УМЕЮ ---------- */
  function mastered() {
    const s = S(), ui = UI();
    const ids = window.EGE_DB.tasks.map(t => t.id).filter(id => s.getTask(id).status === 'green');
    return `<div class="page">
      <header class="page-head"><h1>Умею</h1><p>Ты уверенно умеешь решать · ${ids.length}</p></header>
      <div class="card note-card">🟢 Задания остаются в расписании и продолжают повторяться — так навык не потеряется.</div>
      ${ids.length ? `<div class="grid">${ids.map(id => ui.taskCard(id)).join('')}</div>`
        : ui.empty('🌱', 'Пока нет заданий в разделе «Умею»', 'Отмечай уверенно решённые задания — они появятся здесь.')}
    </div>`;
  }

  /* ---------- СТРАНИЦА ЗАДАНИЯ ---------- */
  function taskDetail(id) {
    const s = S(), ui = UI(), def = s.taskDef(id);
    if (!def) return ui.empty('❓', 'Задание не найдено', '');
    const t = s.getTask(id);
    const crit = s.getCriteria(id);
    const isCustom = !!t.criteria;
    return `<div class="page">
      <button class="back" data-action="back">← Назад</button>
      <header class="page-head"><p class="over">Задание</p><h1>№${def.num}</h1><p>${ui.esc(def.title)}</p></header>
      <section class="card">
        <h2 class="sec-title sm">Статус</h2>
        <div class="seg">
          ${['green', 'yellow', 'red'].map(k => `<button class="seg-btn ${t.status === k ? 'on ' + k : ''}" data-action="set-status" data-id="${id}" data-v="${k}">${UI().stMeta(k).dot} ${UI().stMeta(k).label}</button>`).join('')}
        </div>
        <button class="btn btn-primary btn-block" data-action="open-check" data-id="${id}">Проверить решение</button>
      </section>
      <section class="card">
        <h2 class="sec-title sm">Мои заметки</h2>
        <textarea id="notes" rows="4" placeholder="Например: часто ошибаюсь при составлении уравнения…">${ui.esc(t.notes)}</textarea>
        <div class="save-hint" id="notes-hint">Сохранено автоматически</div>
      </section>
      <section class="card">
        <div class="rep-grid">
          <div><span>Последняя проверка</span><b>${t.lastCheck ? D.fmt(t.lastCheck) : '—'}</b></div>
          <div><span>Следующее повторение</span><b>${t.nextReview ? D.relDay(t.nextReview) + ' · ' + D.fmt(t.nextReview) : '—'}</b></div>
        </div>
      </section>
      <section class="card">
        <h2 class="sec-title sm">Критерии самопроверки ${isCustom ? '' : '<span class="tag">общие</span>'}</h2>
        <p class="crit-note">Личные критерии, не официальные критерии ФИПИ. Можно изменить под себя.</p>
        <div class="crit-static">${crit.map((c, i) => `<div class="crit-row"><span>${ui.esc(c)}</span><button class="icon-btn" data-action="del-crit" data-id="${id}" data-i="${i}" aria-label="Удалить">×</button></div>`).join('')}</div>
        <div class="crit-add"><input id="crit-input" placeholder="Новый критерий…"><button class="btn btn-ghost btn-sm" data-action="add-crit" data-id="${id}">Добавить</button></div>
        ${isCustom ? `<button class="link-btn" data-action="reset-crit" data-id="${id}">Вернуть общие критерии</button>` : ''}
      </section>
      <section class="card">
        <h2 class="sec-title sm">История</h2>
        ${t.history.length ? `<div class="hist">${[...t.history].reverse().map(h =>
          `<div class="hist-row"><span>${D.fmt(h.d)}</span><span>${UI().stMeta(h.r).dot} ${UI().stMeta(h.r).label}</span></div>`).join('')}</div>`
          : `<p class="muted">Проверок пока не было.</p>`}
      </section>
    </div>`;
  }

  /* ---------- СТАТИСТИКА ---------- */
  function stats() {
    const s = S(), ui = UI();
    const c = s.counts(), pct = s.progress();
    const total = window.EGE_DB.tasks.length || 1;
    const act = s.activity(30);
    const max = Math.max(1, ...act.map(a => a.n));
    const prob = s.problematic(5), stab = s.stable(5);
    const bar = (n, cls) => `<div class="bar-row"><div class="bar-track"><div class="bar-fill ${cls}" style="width:${Math.round((n / total) * 100)}%"></div></div><b>${n}</b></div>`;
    return `<div class="page">
      <header class="page-head"><h1>Статистика</h1><p>Как идёт подготовка</p></header>
      <section class="card center">${ui.ring(pct)}<p class="muted">Общий прогресс</p></section>
      <section class="card">
        <h2 class="sec-title sm">Прогресс по заданиям</h2>
        <div class="stat-line"><span>🟢 Умею</span>${bar(c.green, 'b-g')}</div>
        <div class="stat-line"><span>🟡 Повторить</span>${bar(c.yellow, 'b-y')}</div>
        <div class="stat-line"><span>🔴 Не умею</span>${bar(c.red, 'b-r')}</div>
      </section>
      <section class="card">
        <h2 class="sec-title sm">Активность за 30 дней</h2>
        <div class="chart">${act.map(a => `<div class="col" title="${D.fmt(a.d)} — ${a.n}"><div class="col-fill" style="height:${Math.round((a.n / max) * 100)}%"></div></div>`).join('')}</div>
        <p class="muted">Проверок за месяц: ${act.reduce((x, a) => x + a.n, 0)}</p>
      </section>
      <section class="card">
        <h2 class="sec-title sm">Самые проблемные</h2>
        ${prob.length ? prob.map(p => {
          const def = s.taskDef(p.id);
          return `<div class="row-card" data-action="open-task" data-id="${p.id}" role="link" tabindex="0">
            <div><b>№${def.num} — ${ui.esc(def.title)}</b><span class="row-sub">🔴 ${p.reds} ${plural(p.reds, 'провал', 'провала', 'провалов')} · последнее: ${UI().stMeta(p.last.r).label}</span></div><span class="arrow">→</span></div>`;
        }).join('') : '<p class="muted">Проблемных заданий нет 🎉</p>'}
      </section>
      <section class="card">
        <h2 class="sec-title sm">Самые стабильные</h2>
        ${stab.length ? stab.map(p => {
          const def = s.taskDef(p.id);
          return `<div class="row-card" data-action="open-task" data-id="${p.id}" role="link" tabindex="0">
            <div><b>№${def.num} — ${ui.esc(def.title)}</b><span class="row-sub">🟢 Серия: ${p.s} подряд</span></div><span class="arrow">→</span></div>`;
        }).join('') : '<p class="muted">Стабильных серий пока нет.</p>'}
      </section>
    </div>`;
  }

  /* ---------- НАСТРОЙКИ ---------- */
  function settings() {
    const s = S().state;
    return `<div class="page">
      <header class="page-head"><h1>Настройки</h1><p>Интервалы, данные, резервные копии</p></header>
      <section class="card">
        <h2 class="sec-title sm">Интервалы повторения</h2>
        ${[['green', '🟢 Умею'], ['yellow', '🟡 Повторить'], ['red', '🔴 Не умею']].map(([k, l]) =>
          `<label class="set-row"><span>${l}</span><span class="num-wrap"><input type="number" min="0" max="365" id="int-${k}" value="${s.intervals[k]}"> дн.</span></label>`).join('')}
        <button class="btn btn-primary btn-block" data-action="save-intervals">Сохранить интервалы</button>
      </section>
      <section class="card">
        <h2 class="sec-title sm">Резервная копия</h2>
        <div class="btn-col">
          <button class="btn btn-ghost btn-block" data-action="export">Скачать данные (JSON)</button>
          <label class="btn btn-ghost btn-block file-btn">Восстановить из файла<input type="file" id="import-file" accept="application/json" hidden></label>
        </div>
      </section>
      <section class="card danger">
        <h2 class="sec-title sm">Опасная зона</h2>
        <button class="btn btn-danger btn-block" data-action="reset-ask">Сбросить прогресс</button>
      </section>
      <p class="muted center">Сборка damir · данные хранятся на этом устройстве (localStorage).</p>
    </div>`;
  }

  return { home, review, tasks, mastered, taskDetail, stats, settings, openCheck, renderCheck, saveCheck, view };
})();
