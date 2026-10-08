/* Хранилище: состояние, localStorage, интервальные повторения. */
window.EGE_store = (() => {
  const KEY = 'ege_damir_tracker_v1';
  const D = window.EGE_dates;

  const DEFAULT_INTERVALS = { green: 7, yellow: 3, red: 1 };

  function blankTask() {
    return { status: null, notes: '', lastCheck: null, nextReview: null, history: [], criteria: null };
  }

  function freshState() {
    return { version: 1, seededAt: D.todayStr(), intervals: { ...DEFAULT_INTERVALS }, tasks: {} };
  }

  let state = null;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        state = JSON.parse(raw);
        if (!state.intervals) state.intervals = { ...DEFAULT_INTERVALS };
        if (!state.tasks) state.tasks = {};
        return state;
      }
    } catch (e) { /* повреждённые данные — начнём заново */ }
    // Чистый старт: 0%, все задания новые, никакого демо-прогресса
    state = freshState();
    save();
    return state;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  function getTask(id) {
    if (!state.tasks[id]) state.tasks[id] = blankTask();
    return state.tasks[id];
  }

  function taskDef(id) {
    return window.EGE_DB.tasks.find(t => t.id === id);
  }

  // Проверка задания: result in green|yellow|red
  function check(id, result) {
    const t = getTask(id);
    const today = D.todayStr();
    const days = Math.max(0, Number(state.intervals[result]) || 0);
    t.history.push({ d: today, r: result });
    t.status = result;
    t.lastCheck = today;
    t.nextReview = D.addDays(today, days);
    save();
    return t;
  }

  function setStatus(id, status) {
    const t = getTask(id);
    t.status = status;
    save();
  }

  function setNotes(id, notes) {
    getTask(id).notes = notes;
    save();
  }

  function getCriteria(id) {
    const t = getTask(id);
    return t.criteria || window.EGE_DB.defaultCriteria;
  }

  function setCriteria(id, list) {
    getTask(id).criteria = list;
    save();
  }

  function counts() {
    const c = { green: 0, yellow: 0, red: 0, fresh: 0 };
    for (const def of window.EGE_DB.tasks) {
      const s = (state.tasks[def.id] || {}).status;
      if (s === 'green') c.green++;
      else if (s === 'yellow') c.yellow++;
      else if (s === 'red') c.red++;
      else c.fresh++;
    }
    return c;
  }

  function progress() {
    const total = window.EGE_DB.tasks.length;
    const c = counts();
    return Math.round(((c.green + c.yellow * 0.5) / total) * 100);
  }

  // Корзины повторения
  function buckets() {
    const today = D.todayStr();
    const overdue = [], todayL = [], upcoming = [], fresh = [];
    for (const def of window.EGE_DB.tasks) {
      const t = state.tasks[def.id];
      if (!t || !t.nextReview) { fresh.push(def.id); continue; }
      if (t.nextReview < today) overdue.push(def.id);
      else if (t.nextReview === today) todayL.push(def.id);
      else upcoming.push(def.id);
    }
    const byDate = (a, b) => D.cmp(state.tasks[a].nextReview, state.tasks[b].nextReview);
    overdue.sort(byDate); todayL.sort(byDate); upcoming.sort(byDate);
    return { overdue, today: todayL, upcoming, fresh };
  }

  // Последние события для главной
  function recentActivity(limit = 5) {
    const ev = [];
    for (const def of window.EGE_DB.tasks) {
      const t = state.tasks[def.id];
      if (!t) continue;
      t.history.forEach((h, i) => ev.push({ id: def.id, ...h, prev: i > 0 ? t.history[i - 1].r : null }));
    }
    ev.sort((a, b) => (a.d < b.d ? 1 : -1));
    return ev.slice(0, limit);
  }

  // Активность за N дней: [{d, n}]
  function activity(days = 30) {
    const today = D.todayStr();
    const map = {};
    for (const def of window.EGE_DB.tasks) {
      const t = state.tasks[def.id];
      if (!t) continue;
      for (const h of t.history) map[h.d] = (map[h.d] || 0) + 1;
    }
    const out = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = D.addDays(today, -i);
      out.push({ d, n: map[d] || 0 });
    }
    return out;
  }

  function streakGreen(id) {
    const h = (state.tasks[id] || { history: [] }).history;
    let s = 0;
    for (let i = h.length - 1; i >= 0; i--) {
      if (h[i].r === 'green') s++;
      else break;
    }
    return s;
  }

  function problematic(limit = 5) {
    const rows = window.EGE_DB.tasks
      .map(def => ({ id: def.id, t: state.tasks[def.id] }))
      .filter(r => r.t && r.t.history.length && r.t.history[r.t.history.length - 1].r !== 'green')
      .map(r => {
        const reds = r.t.history.filter(h => h.r === 'red').length;
        return { id: r.id, reds, last: r.t.history[r.t.history.length - 1] };
      })
      .sort((a, b) => b.reds - a.reds);
    return rows.slice(0, limit);
  }

  function stable(limit = 5) {
    return window.EGE_DB.tasks
      .map(def => ({ id: def.id, s: streakGreen(def.id) }))
      .filter(r => r.s >= 2)
      .sort((a, b) => b.s - a.s)
      .slice(0, limit);
  }

  function exportJSON() {
    return JSON.stringify({ exportedAt: new Date().toISOString(), app: 'ege-tracker', ...state }, null, 2);
  }

  function importJSON(text) {
    const obj = JSON.parse(text);
    if (!obj || typeof obj !== 'object' || !obj.tasks || !obj.intervals) throw new Error('bad file');
    state = {
      version: 1,
      seededAt: obj.seededAt || D.todayStr(),
      intervals: {
        green: Number(obj.intervals.green) || DEFAULT_INTERVALS.green,
        yellow: Number(obj.intervals.yellow) || DEFAULT_INTERVALS.yellow,
        red: Number(obj.intervals.red) || DEFAULT_INTERVALS.red
      },
      tasks: obj.tasks
    };
    save();
  }

  function resetAll() {
    state = freshState();
    save();
  }

  return {
    load, save, getTask, taskDef, check, setStatus, setNotes,
    getCriteria, setCriteria, counts, progress, buckets,
    recentActivity, activity, problematic, stable, streakGreen,
    exportJSON, importJSON, resetAll, DEFAULT_INTERVALS,
    get state() { return state; }
  };
})();
