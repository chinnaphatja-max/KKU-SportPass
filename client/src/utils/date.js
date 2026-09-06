export function formatThaiDate(dateString, useLongMonth = false, lang = 'th') {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  
  const locale = lang === 'en' ? 'en-US' : 'th-TH';
  return date.toLocaleDateString(locale, {
    day: '2-digit',
    month: useLongMonth ? 'long' : 'short',
    year: 'numeric'
  });
}

