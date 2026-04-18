import { useLanguage } from '@/contexts/LanguageContext';

export default function LanguageSwitcher({ className = '' }) {
  const { lang, switchLang } = useLanguage();

  return (
    <div className={`inline-flex items-center rounded-full border bg-white/80 backdrop-blur-sm p-0.5 ${className}`}
      style={{ borderColor: 'var(--border-soft)' }}
      data-testid="language-switcher"
    >
      <button
        onClick={() => switchLang('it')}
        className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide transition-all duration-150 ${
          lang === 'it'
            ? 'bg-[var(--text-primary)] text-white shadow-sm'
            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
        }`}
        data-testid="lang-switch-it"
      >
        IT
      </button>
      <button
        onClick={() => switchLang('en')}
        className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide transition-all duration-150 ${
          lang === 'en'
            ? 'bg-[var(--text-primary)] text-white shadow-sm'
            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
        }`}
        data-testid="lang-switch-en"
      >
        EN
      </button>
    </div>
  );
}
