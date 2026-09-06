import { Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function LanguageToggle({ className = '', variant = 'light' }) {
  const { language, setLanguage } = useLanguage();

  const isDark = variant === 'dark';

  return (
    <div 
      className={`inline-flex items-center gap-1.5 p-1 rounded-full text-xs font-semibold select-none transition ${
        isDark 
          ? 'bg-white/10 text-white/80 border border-white/10' 
          : 'bg-gray-100/90 text-gray-600 border border-gray-200/80 shadow-inner'
      } ${className}`}
      role="group"
      aria-label="Language selector"
    >
      <Globe size={13} className={`ml-1 ${isDark ? 'text-white/60' : 'text-gray-400'}`} />
      
      <button
        type="button"
        onClick={() => setLanguage('th')}
        className={`px-2 py-0.5 rounded-full transition-all text-[11px] font-bold ${
          language === 'th'
            ? isDark
              ? 'bg-[#fe6e00] text-white shadow-sm'
              : 'bg-white text-brand-600 shadow-sm'
            : isDark
              ? 'text-white/60 hover:text-white'
              : 'text-gray-500 hover:text-gray-900'
        }`}
        aria-pressed={language === 'th'}
      >
        TH
      </button>

      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-2 py-0.5 rounded-full transition-all text-[11px] font-bold ${
          language === 'en'
            ? isDark
              ? 'bg-[#fe6e00] text-white shadow-sm'
              : 'bg-white text-brand-600 shadow-sm'
            : isDark
              ? 'text-white/60 hover:text-white'
              : 'text-gray-500 hover:text-gray-900'
        }`}
        aria-pressed={language === 'en'}
      >
        EN
      </button>
    </div>
  );
}
