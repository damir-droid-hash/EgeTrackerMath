/* Работа с датами. Всегда используется текущая дата устройства. */
window.EGE_dates = (() => {
  const pad = n => String(n).padStart(2, '0');

  // ISO-дата локального "сегодня": YYYY-MM-DD
  function todayStr(d = new Date()) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function parseISO(s) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function addDays(iso, n) {
    const d = parseISO(iso);
    d.setDate(d.getDate() + n);
    return todayStr(d);
  }

  // 08.10.2026
  function fmt(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
  }

  const MONTHS_GEN = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];

  // "11 октября"
  function fmtLong(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-').map(Number);
    return `${d} ${MONTHS_GEN[m - 1]}`;
  }

  // Относительная подпись: Сегодня / Вчера / 06.10.2026
  function relDay(iso, today = todayStr()) {
    if (!iso) return '—';
    if (iso === today) return 'Сегодня';
    if (iso === addDays(today, -1)) return 'Вчера';
    if (iso === addDays(today, 1)) return 'Завтра';
    return fmt(iso);
  }

  function cmp(a, b) {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    return a < b ? -1 : a > b ? 1 : 0;
  }

  return { todayStr, parseISO, addDays, fmt, fmtLong, relDay, cmp, MONTHS_GEN };
})();
