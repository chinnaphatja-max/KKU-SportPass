// Bangkok Timezone (UTC+7) Date Utilities

export function getBangkokDate(offsetDays = 0) {
  const now = new Date();
  const bangkokTime = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000 + (offsetDays * 86400000));
  return bangkokTime;
}

export function getBangkokDateStr(offsetDays = 0) {
  const b = getBangkokDate(offsetDays);
  return b.toISOString().split('T')[0];
}

export function parseDateSafe(dateString) {
  if (!dateString) return new Date();
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d);
  }
  return new Date(dateString);
}

export function formatThaiDate(dateString, useLongMonth = false, lang = 'th') {
  if (!dateString) return '';
  const date = parseDateSafe(dateString);
  if (isNaN(date.getTime())) return dateString;
  
  const locale = lang === 'en' ? 'en-US' : 'th-TH';
  return date.toLocaleDateString(locale, {
    day: 'numeric',
    month: useLongMonth ? 'long' : 'short',
    year: 'numeric'
  });
}

export function formatFullThaiDate(dateString, lang = 'th') {
  if (!dateString) return '';
  const date = parseDateSafe(dateString);
  if (isNaN(date.getTime())) return dateString;

  const locale = lang === 'en' ? 'en-US' : 'th-TH';
  return date.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export function addDays(dateString, days) {
  const d = parseDateSafe(dateString);
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getQuickDateList(numDays = 7, lang = 'th') {
  const list = [];
  const todayStr = getBangkokDateStr(0);
  const tomorrowStr = getBangkokDateStr(1);

  for (let i = 0; i < numDays; i++) {
    const dStr = getBangkokDateStr(i);
    const dObj = parseDateSafe(dStr);
    const isToday = (dStr === todayStr);
    const isTomorrow = (dStr === tomorrowStr);
    
    let mainLabel = '';
    if (isToday) {
      mainLabel = lang === 'en' ? 'Today' : 'วันนี้';
    } else if (isTomorrow) {
      mainLabel = lang === 'en' ? 'Tomorrow' : 'พรุ่งนี้';
    } else {
      mainLabel = dObj.toLocaleDateString(lang === 'en' ? 'en-US' : 'th-TH', { weekday: 'short' });
    }

    const subLabel = dObj.toLocaleDateString(lang === 'en' ? 'en-US' : 'th-TH', {
      day: 'numeric',
      month: 'short'
    });

    list.push({
      dateStr: dStr,
      isToday,
      isTomorrow,
      mainLabel,
      subLabel
    });
  }

  return list;
}


