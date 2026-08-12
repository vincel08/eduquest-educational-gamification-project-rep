import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(isToday);
dayjs.extend(isYesterday);
dayjs.extend(customParseFormat);

export function getTimestampValue(item, field = 'created') {
  if (!item) return null;
  if (field === 'updated') {
    return item.updated_at || item.updatedAt || null;
  }
  return item.created_at || item.createdAt || null;
}

/** Teacher/admin style: July 30, 2026 • 9:35 AM (with Today/Yesterday) */
export function formatContentDateTime(value, { relativeDay = true } = {}) {
  if (!value) return '—';
  const date = dayjs(value);
  if (!date.isValid()) return '—';

  const time = date.format('h:mm A');
  if (relativeDay && date.isToday()) return `Today • ${time}`;
  if (relativeDay && date.isYesterday()) return `Yesterday • ${time}`;
  return `${date.format('MMMM D, YYYY')} • ${time}`;
}

/** Student style: July 30, 2026 (date only, with Today/Yesterday) */
export function formatContentDate(value, { relativeDay = true } = {}) {
  if (!value) return '—';
  const date = dayjs(value);
  if (!date.isValid()) return '—';

  if (relativeDay && date.isToday()) return 'Today';
  if (relativeDay && date.isYesterday()) return 'Yesterday';
  return date.format('MMMM D, YYYY');
}

export function formatCreatedLabel(value, { includeTime = true } = {}) {
  if (!value) return 'Created —';
  const date = dayjs(value);
  if (!date.isValid()) return 'Created —';

  if (includeTime) {
    const time = date.format('h:mm A');
    if (date.isToday()) return `Created Today • ${time}`;
    if (date.isYesterday()) return `Created Yesterday • ${time}`;
    return `Created ${date.format('MMMM D, YYYY')} • ${time}`;
  }

  if (date.isToday()) return 'Created Today';
  if (date.isYesterday()) return 'Created Yesterday';
  return `Created ${date.format('MMMM D, YYYY')}`;
}

export function sortByTimestamp(items, sortKey = 'newest') {
  const list = [...(items || [])];
  list.sort((a, b) => {
    if (sortKey === 'oldest') {
      return dayjs(getTimestampValue(a, 'created')).valueOf()
        - dayjs(getTimestampValue(b, 'created')).valueOf();
    }
    if (sortKey === 'updated') {
      return dayjs(getTimestampValue(b, 'updated') || getTimestampValue(b, 'created')).valueOf()
        - dayjs(getTimestampValue(a, 'updated') || getTimestampValue(a, 'created')).valueOf();
    }
    // newest first
    return dayjs(getTimestampValue(b, 'created')).valueOf()
      - dayjs(getTimestampValue(a, 'created')).valueOf();
  });
  return list;
}

export function filterByTimestamp(items, filters = {}) {
  const {
    createdFrom = '',
    createdTo = '',
    updatedFrom = '',
    updatedTo = '',
    month = '',
    year = '',
  } = filters;

  return (items || []).filter((item) => {
    const created = dayjs(getTimestampValue(item, 'created'));
    const updated = dayjs(getTimestampValue(item, 'updated') || getTimestampValue(item, 'created'));

    if (createdFrom && (!created.isValid() || created.isBefore(dayjs(createdFrom), 'day'))) return false;
    if (createdTo && (!created.isValid() || created.isAfter(dayjs(createdTo), 'day'))) return false;
    if (updatedFrom && (!updated.isValid() || updated.isBefore(dayjs(updatedFrom), 'day'))) return false;
    if (updatedTo && (!updated.isValid() || updated.isAfter(dayjs(updatedTo), 'day'))) return false;

    if (year) {
      const y = Number(year);
      if (!created.isValid() || created.year() !== y) return false;
    }
    if (month !== '' && month !== null && month !== undefined) {
      const m = Number(month);
      if (!created.isValid() || created.month() !== m) return false;
    }

    return true;
  });
}

export function applyTimestampControls(items, { sort = 'newest', filters = {} } = {}) {
  return sortByTimestamp(filterByTimestamp(items, filters), sort);
}
