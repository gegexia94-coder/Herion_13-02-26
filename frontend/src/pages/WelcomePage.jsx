import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/i18n/translations';
import { ArrowRight, FileCheck, MapPin, Shield, Compass, BookOpen, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HerionBrand, HerionMarkLight, HerionIcon } from '@/components/HerionLogo';
import LanguageSwitcher from '@/components/LanguageSwitcher';

// ─── FLOW STEPS (visual composition) ───
const FLOW_STEPS = {
  it: [
    { num: '01', label: 'Capisci', desc: 'Herion ti spiega cosa serve e cosa succede' },
    { num: '02', label: 'Prepara', desc: 'Raccoglie e verifica i tuoi documenti' },
    { num: '03', label: 'Guida', desc: 'Ti accompagna verso il portale ufficiale' },
    { num: '04', label: 'Segue', desc: 'Monitora lo stato e ti tiene informato' },
  ],
  en: [
    { num: '01', label: 'Understand', desc: 'Herion explains what you need and what happens' },
    { num: '02', label: 'Prepare', desc: 'Collects and verifies your documents' },
    { num: '03', label: 'Guide', desc: 'Walks you through the official portal' },
    { num: '04', label: 'Follow', desc: 'Monitors status and keeps you informed' },
  ],
};

export default function WelcomePage() {
  const { lang } = useLanguage();

  return (
    <div className="min-h-screen bg-[var(--bg-app)]" data-testid="welcome-page">

      {/* ─── NAV ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b" style={{ borderColor: 'var(--border-soft)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
            <HerionBrand size={34} showText />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <Link to="/login"><Button variant="ghost" className="text-[12px] sm:text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl h-8 sm:h-9 px-2 sm:px-4" data-testid="nav-login-btn">{t('welcome_nav_login', lang)}</Button></Link>
            <Link to="/register"><Button className="bg-[var(--text-primary)] hover:bg-[#2a3040] text-white rounded-xl h-8 sm:h-9 px-3 sm:px-5 text-[12px] sm:text-[13px] font-semibold" data-testid="nav-register-btn">{t('welcome_nav_register', lang)}</Button></Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="pt-24 sm:pt-32 pb-14 sm:pb-20 px-4 sm:px-6 relative overflow-hidden" data-testid="hero-section">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none" aria-hidden="true">
          <HerionIcon size={320} color="rgba(10,191,207,0.03)" />
        </div>

        <div className="max-w-3xl mx-auto relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0ABFCF]/8 border border-[#0ABFCF]/15 rounded-full mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-[#0ABFCF] animate-pulse" />
            <span className="text-[11px] font-semibold text-[#0ABFCF]">{t('welcome_badge', lang)}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-[2.85rem] font-extrabold text-[var(--text-primary)] leading-[1.12] tracking-tight mb-5">
            {t('welcome_hero_title_1', lang)}<br />
            {t('welcome_hero_title_2', lang)}
          </h1>

          <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed max-w-xl mb-10">
            {t('welcome_hero_desc', lang)}
          </p>

          <Link to="/register">
            <Button className="bg-[var(--text-primary)] hover:bg-[#2a3040] text-white rounded-xl h-12 px-8 text-[14px] font-semibold shadow-lg shadow-black/5" data-testid="hero-cta-btn">
              {t('welcome_cta_start', lang)} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ═══ GUIDED FLOW COMPOSITION ═══ */}
      <section className="pb-20 px-6" data-testid="flow-section">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(FLOW_STEPS[lang] || FLOW_STEPS.it).map((step, i) => (
              <div key={i} className="relative group">
                <div className="bg-white rounded-xl border p-5 h-full transition-all duration-200 hover:shadow-md" style={{ borderColor: 'var(--border-soft)' }}>
                  <span className="text-[28px] font-black text-[#0ABFCF]/15 block mb-2 leading-none">{step.num}</span>
                  <p className="text-[13px] font-bold text-[var(--text-primary)] mb-1">{step.label}</p>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{step.desc}</p>
                </div>
                {i < 3 && (
                  <div className="hidden md:block absolute top-1/2 -right-2 w-4 h-px bg-[var(--border-soft)]" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ WHY HERION HELPS ═══ */}
      <section className="py-20 px-6 bg-white" data-testid="why-section">
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#0ABFCF] mb-3">Perche Herion</p>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] leading-tight mb-4">
            Meno confusione tra portali, enti e documenti.
          </h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-10 max-w-xl">
            Ogni anno, migliaia di persone e aziende perdono tempo cercando di capire cosa fare, dove andare e quali documenti servono. Herion mette ordine in tutto questo.
          </p>

          <div className="space-y-4">
            {[
              { icon: FileCheck, title: 'Preparazione completa', desc: 'Herion raccoglie i documenti, verifica che siano corretti e prepara tutto per l\'invio. Tu controlli e approvi prima di procedere.' },
              { icon: Compass, title: 'Guida verso l\'ente giusto', desc: 'Per ogni pratica, Herion ti indica l\'ente di destinazione, il portale esatto, le credenziali necessarie e il canale ufficiale. Non devi cercare nulla.' },
              { icon: MapPin, title: 'Monitoraggio dopo l\'invio', desc: 'Dopo l\'invio, Herion acquisisce il riferimento ufficiale (protocollo, DOMUS, ricevuta) e monitora lo stato della pratica. Ti avvisa quando ci sono novita.' },
              { icon: Shield, title: 'Continuita fino alla conclusione', desc: 'Herion non ti abbandona dopo il primo passaggio. Resta presente fino alla conferma ufficiale dell\'ente, spiegando cosa succede ad ogni fase.' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-xl hover:bg-[var(--bg-app)] transition-colors" data-testid={`why-item-${i}`}>
                <div className="w-10 h-10 rounded-xl bg-[#0ABFCF]/8 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <item.icon className="w-[18px] h-[18px] text-[#0ABFCF]" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-[var(--text-primary)] mb-1">{item.title}</p>
                  <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CHI SIAMO ═══ */}
      <section className="py-20 px-6 bg-[var(--bg-app)]" data-testid="about-section">
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-3">Chi siamo</p>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] leading-tight mb-6">
            Un commercialista digitale<br />che lavora con te.
          </h2>

          <div className="space-y-4 mb-8">
            <p className="text-[14px] text-[var(--text-secondary)] leading-[1.75]">
              Herion nasce da un'idea semplice: le pratiche fiscali e amministrative non dovrebbero essere un labirinto. Troppe persone si perdono tra portali, scadenze, documenti e passaggi ufficiali senza sapere a che punto sono.
            </p>
            <p className="text-[14px] text-[var(--text-secondary)] leading-[1.75]">
              Herion e un assistente operativo che ti accompagna dall'inizio alla fine. Prepara i documenti, verifica la completezza, ti guida verso l'ente giusto e segue lo stato della pratica fino alla conferma ufficiale. Non firma al posto tuo e non invia nulla senza la tua approvazione.
            </p>
            <p className="text-[14px] text-[var(--text-secondary)] leading-[1.75]">
              Il nostro obiettivo non e solo gestire le tue pratiche. E aiutarti a capire cosa sta succedendo, a sentirti meno in difficolta e a diventare piu autonomo nel tempo. Ogni pratica completata con Herion e anche un'occasione per capire meglio come funzionano le cose.
            </p>
          </div>

          <div className="p-5 bg-white rounded-xl border" style={{ borderColor: 'var(--border-soft)' }}>
            <p className="text-[12px] text-[var(--text-primary)] font-semibold mb-1">Il principio di Herion</p>
            <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed italic">
              "Ti guidiamo senza sostituirci a te. Ti semplifichiamo le cose senza nasconderle. Ti accompagniamo finche la pratica non e davvero conclusa."
            </p>
          </div>
        </div>
      </section>

      {/* ═══ CONSULTATION / GUIDANCE ═══ */}
      <section className="py-20 px-6 bg-white" data-testid="consultation-section">
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#0ABFCF] mb-3">Orientamento</p>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] leading-tight mb-4">
            Non sai da dove partire?<br />Herion ti aiuta a orientarti.
          </h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-8 max-w-xl">
            Prima ancora di aprire una pratica, Herion puo aiutarti a capire cosa ti serve in base alla tua situazione. Che tu sia un libero professionista, un'azienda o un privato.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: Users, label: 'Libero professionista', desc: 'P.IVA, regime forfettario, contributi INPS, fatturazione, F24 e scadenze. Herion ti mostra il percorso adatto a te.' },
              { icon: BookOpen, label: 'Azienda', desc: 'Adempimenti societari, Camera di Commercio, CU, bilanci, LIPE. Herion organizza e segue tutto il necessario.' },
              { icon: Compass, label: 'Privato', desc: 'Dichiarazione 730, cassetto fiscale, documenti personali. Herion ti guida anche nelle pratiche piu semplici.' },
            ].map((card, i) => (
              <div key={i} className="p-5 rounded-xl border bg-[var(--bg-app)]" style={{ borderColor: 'var(--border-soft)' }} data-testid={`consultation-card-${i}`}>
                <card.icon className="w-5 h-5 text-[#0ABFCF] mb-3" strokeWidth={1.5} />
                <p className="text-[13px] font-bold text-[var(--text-primary)] mb-1.5">{card.label}</p>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW HERION STAYS WITH YOU ═══ */}
      <section className="py-20 px-6 bg-[var(--bg-app)]" data-testid="continuity-section">
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-3">Continuita</p>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] leading-tight mb-4">
            Herion resta con te fino alla fine.
          </h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-8 max-w-xl">
            Molti strumenti ti aiutano a preparare una pratica. Pochi ti seguono anche dopo l'invio. Herion e diverso.
          </p>

          <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-soft)' }}>
            {[
              { phase: 'Prima', desc: 'Herion ti dice cosa serve, raccoglie i documenti e verifica che tutto sia in ordine.', color: 'bg-blue-500' },
              { phase: 'Durante', desc: 'Ti guida verso il portale giusto, ti spiega cosa fare e ti accompagna nell\'invio.', color: 'bg-[#0ABFCF]' },
              { phase: 'Dopo', desc: 'Acquisisce il protocollo, monitora lo stato e ti spiega cosa succede. Fino alla conferma.', color: 'bg-emerald-500' },
            ].map((item, i) => (
              <div key={i} className={`flex items-start gap-4 px-6 py-5 ${i < 2 ? 'border-b' : ''}`} style={i < 2 ? { borderColor: 'var(--border-soft)' } : {}} data-testid={`continuity-phase-${i}`}>
                <div className="flex flex-col items-center pt-1">
                  <div className={`w-2.5 h-2.5 rounded-full ${item.color} flex-shrink-0`} />
                  {i < 2 && <div className="w-px flex-1 bg-[var(--border-soft)] mt-1" />}
                </div>
                <div>
                  <p className="text-[12px] font-bold text-[var(--text-primary)] mb-0.5">{item.phase}</p>
                  <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-[var(--text-muted)] mt-4 text-center">
            Ogni pratica e un percorso. Herion lo segue con te dall'inizio alla fine.
          </p>
        </div>
      </section>

      {/* ═══ LEARN / AUTONOMY ═══ */}
      <section className="py-16 px-6 bg-white" data-testid="learn-section">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-3">Cresci con Herion</p>
          <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] leading-tight mb-3 max-w-lg mx-auto">
            Ogni pratica completata e un passo verso piu autonomia.
          </h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-md mx-auto">
            Herion non ti nasconde la complessita. Te la spiega. Con il tempo, capisci meglio come funzionano le cose e gestisci con piu sicurezza le tue pratiche fiscali e amministrative.
          </p>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="py-20 px-6 bg-[var(--text-primary)]" data-testid="cta-section">
        <div className="max-w-2xl mx-auto text-center">
          <HerionMarkLight size={36} className="mx-auto mb-5" />
          <h2 className="text-xl font-bold text-white mb-3">Meno confusione. Piu controllo.</h2>
          <p className="text-[13px] text-white/45 mb-8 max-w-md mx-auto leading-relaxed">
            Inizia a gestire le tue pratiche con un commercialista digitale che ti accompagna davvero. Dall'inizio alla fine.
          </p>
          <Link to="/register">
            <Button className="bg-[#0ABFCF] hover:bg-[#09a8b6] text-white rounded-xl h-12 px-8 text-[14px] font-semibold" data-testid="cta-register-btn">
              Inizia il tuo percorso <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-8 px-6 bg-[#161b26] text-white/40" data-testid="footer">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <HerionMarkLight size={24} />
            <span className="text-[11px] text-white/30 font-medium">Herion</span>
          </div>
          <p className="text-[10px] text-white/25 text-center">Commercialista digitale. Chiarezza, guida e continuita.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <Link to="/login" className="text-white/40 hover:text-white/60 transition-colors">Accedi</Link>
            <Link to="/register" className="text-white/40 hover:text-white/60 transition-colors">Registrati</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
