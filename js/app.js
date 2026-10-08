/* Роутер, навигация и обработка действий. */
window.EGE_app = (() => {
  const S = () => window.EGE_store;
  const P = () => window.EGE_pages;
  const UI = () => window.EGE_ui;

  const app = () => document.getElementById('app');

  const ROUTES = [
    { re: /^\/?(#\/)?$/, name: 'home', render: () => P().home() },
    { re: /^#\/review$/, name: 'review', render: () => P().review() },
    { re: /^#\/tasks$/, name: 'tasks', render: () => P().tasks() },
    { re: /^#\/mastered$/, name: 'mastered', render: () => P().mastered() },
    { re: /^#\/task\/([\w-]+)$/, name: 'detail', render: m => P().taskDetail(m[0]) },
    { re: /^#\/stats$/, name: 'stats', render: () => P().stats() },
    { re: /^#\/settings$/, name: 'settings', render: () => P().settings() }
  ];

  function current() {
    const h = location.hash || '#/';
    for (const r of ROUTES) {
      const m = h.match(r.re);
      if (m) return { ...r, params: m.slice(1) };
    }
    return { ...ROUTES[0], params: [] };
  }

  function render() {
    const r = current();
    app().innerHTML = r.render(r.params);
    app().scrollTop = 0;
    window.scrollTo(0, 0);
    document.querySelectorAll('[data-nav]').forEach(a => {
      const on = a.getAttribute('href') === (location.hash || '#/');
      a.classList.toggle('active', on);
    });
    const first = app().querySelector('.page');
    if (first) { first.classList.add('enter'); }
  }

  function rerender() { render(); }

  function refreshTasksZone() {
    const zone = document.getElementById('tasks-zone');
    if (!zone) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = P().tasks();
    zone.innerHTML = tmp.querySelector('#tasks-zone').innerHTML;
  }

  let searchTimer = null, notesTimer = null;

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const a = el.dataset.action, id = el.dataset.id;
    const ui = UI(), s = S();

    switch (a) {
      case 'go': location.hash = el.dataset.to; break;
      case 'open-task': location.hash = '#/task/' + id; break;
      case 'back': history.length > 1 ? history.back() : (location.hash = '#/'); break;
      case 'open-check': e.stopPropagation(); P().openCheck(id); break;
      case 'check-pick': P().view.check.result = el.dataset.r; P().view.check.step = 2; P().renderCheck(); break;
      case 'check-back': P().view.check.step = 1; P().renderCheck(); break;
      case 'check-save': P().saveCheck(); break;
      case 'set-status':
        s.setStatus(id, el.dataset.v);
        ui.toast('Статус сохранён');
        rerender();
        break;
      case 'filter': P().view.status = el.dataset.v; refreshTasksZone(); break;
      case 'add-crit': {
        const inp = document.getElementById('crit-input');
        const v = (inp.value || '').trim();
        if (!v) { ui.toast('Введи текст критерия'); break; }
        const list = s.getCriteria(id).slice();
        list.push(v);
        s.setCriteria(id, list);
        ui.toast('Критерий добавлен');
        rerender();
        break;
      }
      case 'del-crit': {
        const list = s.getCriteria(id).slice();
        list.splice(Number(el.dataset.i), 1);
        s.setCriteria(id, list.length ? list : window.EGE_DB.defaultCriteria.slice());
        if (!list.length) s.getTask(id).criteria = null, s.save();
        ui.toast('Критерий удалён');
        rerender();
        break;
      }
      case 'reset-crit':
        s.getTask(id).criteria = null; s.save();
        ui.toast('Возвращены общие критерии');
        rerender();
        break;
      case 'save-intervals': {
        const g = Math.max(0, Number(document.getElementById('int-green').value) || 0);
        const y = Math.max(0, Number(document.getElementById('int-yellow').value) || 0);
        const r = Math.max(0, Number(document.getElementById('int-red').value) || 0);
        s.state.intervals = { green: g, yellow: y, red: r };
        s.save();
        ui.toast('Интервалы сохранены');
        break;
      }
      case 'export': {
        const blob = new Blob([s.exportJSON()], { type: 'application/json' });
        const aEl = document.createElement('a');
        aEl.href = URL.createObjectURL(blob);
        aEl.download = 'ege-progress.json';
        aEl.click();
        setTimeout(() => URL.revokeObjectURL(aEl.href), 2000);
        ui.toast('Файл сохранён');
        break;
      }
      case 'reset-ask':
        ui.openModal(`<h2 class="modal-title">Удалить весь прогресс?</h2>
          <p class="modal-sub">Ты действительно хочешь удалить весь прогресс? Это действие нельзя отменить.</p>
          <div class="modal-foot">
            <button class="btn btn-ghost" data-action="modal-close">Отмена</button>
            <button class="btn btn-danger" data-action="reset-go">Удалить</button>
          </div>`, { title: 'Подтверждение' });
        break;
      case 'reset-go':
        s.resetAll();
        ui.closeModal();
        ui.toast('Прогресс сброшен');
        location.hash = '#/';
        rerender();
        break;
      case 'modal-close': ui.closeModal(); break;
    }
  });

  // Enter/Space на карточках-ссылках
  document.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[role="link"]')) {
      e.preventDefault();
      e.target.click();
    }
  });

  document.addEventListener('input', e => {
    if (e.target.id === 'search') {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        P().view.q = e.target.value;
        const pos = e.target.selectionStart;
        refreshTasksZone();
        const n = document.getElementById('search');
        if (n) { n.focus(); n.setSelectionRange(pos, pos); }
      }, 220);
    }
    if (e.target.id === 'notes') {
      clearTimeout(notesTimer);
      const v = e.target.value, id = current().params[0];
      notesTimer = setTimeout(() => {
        S().setNotes(id, v);
        const h = document.getElementById('notes-hint');
        if (h) h.textContent = 'Сохранено ✓';
      }, 600);
    }
  });

  document.addEventListener('change', e => {
    if (e.target.id === 'sortsel') {
      P().view.sort = e.target.value;
      refreshTasksZone();
    }
    if (e.target.id === 'import-file' && e.target.files[0]) {
      const f = e.target.files[0];
      const rd = new FileReader();
      rd.onload = () => {
        try {
          S().importJSON(rd.result);
          UI().toast('Данные восстановлены');
          rerender();
        } catch (err) { UI().toast('Не получилось прочитать файл'); }
      };
      rd.readAsText(f);
      e.target.value = '';
    }
    if (e.target.id === 'crit-input') { /* Enter добавит */ }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.id === 'crit-input') {
      e.preventDefault();
      const btn = document.querySelector('[data-action="add-crit"]');
      if (btn) btn.click();
    }
  });

  window.addEventListener('hashchange', render);

  function init() {
    S().load();
    const dt = document.getElementById('tb-date');
    if (dt) dt.textContent = window.EGE_dates.fmt(window.EGE_dates.todayStr());
    if (!location.hash) location.hash = '#/';
    render();
  }

  return { init, rerender, current };
})();

document.addEventListener('DOMContentLoaded', () => window.EGE_app.init());
