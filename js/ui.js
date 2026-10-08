/* Переиспользуемые компоненты интерфейса. */
window.EGE_ui = (() => {
  const D = window.EGE_dates;

  const STATUS = {
    green:  { dot: '🟢', label: 'Умею',      cls: 'st-green' },
    yellow: { dot: '🟡', label: 'Повторить', cls: 'st-yellow' },
    red:    { dot: '🔴', label: 'Не умею',   cls: 'st-red' },
    fresh:  { dot: '⚪', label: 'Новое',      cls: 'st-fresh' }
  };

  function stKey(s) { return s || 'fresh'; }
  function stMeta(s) { return STATUS[stKey(s)]; }

  function badge(status) {
    const m = stMeta(status);
    return `<span class="badge ${m.cls}"><span class="badge-dot"></span>${m.label}</span>`;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Карточка задания для списков
  function taskCard(id, opts = {}) {
    const S = window.EGE_store;
    const def = S.taskDef(id);
    const t = S.getTask(id);
    const m = stMeta(t.status);
    const last = t.lastCheck ? D.relDay(t.lastCheck) : '—';
    let next, nextCls = '';
    if (!t.nextReview) { next = 'Ещё не проверено'; }
    else if (t.nextReview <= D.todayStr()) { next = 'Сейчас'; nextCls = 'due'; }
    else { next = D.fmt(t.nextReview); }
    return `<article class="card task-card" data-action="open-task" data-id="${id}" role="link" tabindex="0">
      <div class="task-top">
        <span class="task-num">№${def.num}</span>
        ${badge(t.status)}
      </div>
      <h3 class="task-title">${esc(def.title)}</h3>
      <div class="task-meta">
        <div><span>Последняя проверка</span><b>${last}</b></div>
        <div><span>Следующее повторение</span><b class="${nextCls}">${next}</b></div>
      </div>
      ${opts.actions === false ? '' : `<div class="task-actions">
        <button class="btn btn-primary btn-sm" data-action="open-check" data-id="${id}">Проверить</button>
        <button class="btn btn-ghost btn-sm" data-action="open-task" data-id="${id}">Открыть</button>
      </div>`}
    </article>`;
  }

  function empty(icon, title, text) {
    return `<div class="empty">
      <div class="empty-icon">${icon}</div>
      <div class="empty-title">${title}</div>
      ${text ? `<div class="empty-text">${text}</div>` : ''}
    </div>`;
  }

  // Кольцевой прогресс
  function ring(pct) {
    const r = 52, c = 2 * Math.PI * r;
    const off = c - (pct / 100) * c;
    return `<div class="ring-wrap">
      <svg class="ring" viewBox="0 0 130 130" width="130" height="130">
        <circle cx="65" cy="65" r="${r}" class="ring-bg"/>
        <circle cx="65" cy="65" r="${r}" class="ring-fg" style="stroke-dasharray:${c.toFixed(1)};stroke-dashoffset:${off.toFixed(1)}"/>
      </svg>
      <div class="ring-num"><b>${pct}%</b><span>прогресс</span></div>
    </div>`;
  }

  // Toast
  let toastTimer = null;
  function toast(msg) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  // Модальное окно в стиле macOS: шапка с тремя кружочками слева сверху.
  // Красный кружок закрывает окно. Заголовок передаётся через opts.title.
  function openModal(html, opts = {}) {
    closeModal();
    const bar = opts.title
      ? `<div class="mac-bar"><span class="mac-dots"><i class="md r" data-action="modal-close" role="button" aria-label="Закрыть"></i><i class="md y"></i><i class="md g"></i></span><span class="mac-title">${esc(opts.title)}</span></div>`
      : '';
    const ov = document.createElement('div');
    ov.className = 'modal-ov' + (opts.cls ? ' ' + opts.cls : '');
    ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${bar}${html}</div>`;
    ov.addEventListener('mousedown', e => { if (e.target === ov) closeModal(); });
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));
    document.body.classList.add('no-scroll');
  }

  function closeModal() {
    const ov = document.querySelector('.modal-ov');
    if (ov) ov.remove();
    document.body.classList.remove('no-scroll');
  }

  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  return { STATUS, stMeta, stKey, badge, esc, taskCard, empty, ring, toast, openModal, closeModal };
})();
