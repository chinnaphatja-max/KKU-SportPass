export function formatThaiDate(dateString, useLongMonth = false) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  
  return date.toLocaleDateString('th-TH', {
    day: '2-digit',
    month: useLongMonth ? 'long' : 'short',
    year: 'numeric'
  });
}
