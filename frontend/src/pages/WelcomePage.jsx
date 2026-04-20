import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/i18n/translations';
import { ArrowRight, FileCheck, Compass, Shield, Eye, BookOpen, Users, Heart, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HerionBrand, HerionHeroLogo, HerionMarkLight } from '@/components/HerionLogo';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const VALUE_BLOCKS = {
  it: [
    { icon: Eye, title: 'Comprendi il contesto', desc: 'Ogni passaggio viene spiegato con chiarezza. Capisci cosa stai facendo e perche, senza dover ogni volta rivolgerti a uno specialista.' },
    { icon: FileCheck, title: 'Prepara con sicurezza', desc: 'Herion raccoglie i documenti, verifica che siano completi e corretti, e ti prepara tutto prima del contatto con l\'ente. Niente sorprese.' },
    { icon: Compass, title: 'Segui una guida chiara', desc: 'Per ogni procedura sai esattamente dove andare, cosa portare e cosa aspettarti. Herion ti accompagna verso il portale giusto al momento giusto.' },
    { icon: Shield, title: 'Continuita fino alla fine', desc: 'Dopo l\'invio, Herion monitora lo stato della pratica e ti tiene informato. Non ti abbandona dopo il primo passaggio.' },
  ],
  en: [
    { icon: Eye, title: 'Understand the context', desc: 'Each step is explained clearly. You understand what you\'re doing and why, without needing a specialist every time.' },
    { icon: FileCheck, title: 'Prepare with confidence', desc: 'Herion collects documents, verifies completeness, and prepares everything before you contact the authority. No surprises.' },
    { icon: Compass, title: 'Follow a clear guide', desc: 'For each procedure you know exactly where to go, what to bring, and what to expect. Herion walks you through the right portal at the right time.' },
    { icon: Shield, title: 'Continuity to the end', desc: 'After submission, Herion monitors the practice status and keeps you informed. It doesn\'t leave after the first step.' },
  ],
};

const FLOW_STEPS = {
  it: [
    { num: '01', label: 'Capisci', desc: 'Cosa serve e cosa succede' },
    { num: '02', label: 'Prepara', desc: 'Documenti verificati e pronti' },
    { num: '03', label: 'Agisci', desc: 'Guida verso il portale ufficiale' },
    { num: '04', label: 'Segui', desc: 'Monitoraggio fino alla conferma' },
  ],
  en: [
    { num: '01', label: 'Understand', desc: 'What\'s needed and what happens' },
    { num: '02', label: 'Prepare', desc: 'Documents verified and ready' },
    { num: '03', label: 'Act', desc: 'Guided to the official portal' },
    { num: '04', label: 'Follow', desc: 'Monitored until confirmation' },
  ],
};

export default function WelcomePage() {
  const { lang } = useLanguage();
  const isIT = lang === 'it';

  return (
    <div className="min-h-screen bg-[var(--bg-app)]" data-testid="welcome-page">

      {/* ─── NAV ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b" style={{ borderColor: 'var(--border-soft)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex-shrink-0"><HerionBrand size={36} showText /></Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <Link to="/login"><Button variant="ghost" className="text-[12px] sm:text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl h-8 sm:h-9 px-2 sm:px-4" data-testid="nav-login-btn">{t('welcome_nav_login', lang)}</Button></Link>
            <Link to="/register"><Button className="bg-[#0A192F] hover:bg-[#162033] text-white rounded-xl h-8 sm:h-9 px-3 sm:px-5 text-[12px] sm:text-[13px] font-semibold" data-testid="nav-register-btn">{t('welcome_nav_register', lang)}</Button></Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="pt-28 sm:pt-36 pb-16 sm:pb-24 px-4 sm:px-6 relative overflow-hidden" data-testid="hero-section">
        <div className="max-w-3xl mx-auto relative">
          <div className="mb-8">
            <HerionHeroLogo className="mb-6" />
          </div>

          <h1 className="text-[26px] sm:text-[34px] lg:text-[40px] font-extrabold text-[#0A192F] leading-[1.15] tracking-tight mb-5">
            {isIT
              ? <>Le procedure fiscali<br />non dovrebbero essere un labirinto.</>
              : <>Tax procedures<br />shouldn't be a maze.</>
            }
          </h1>

          <p className="text-[15px] sm:text-[16px] text-[var(--text-secondary)] leading-[1.7] max-w-xl mb-4">
            {isIT
              ? 'Troppo spesso nessuno spiega con chiarezza cosa fare, a meno di rivolgersi ogni volta a uno specialista. Ma questo costa tempo, energia e denaro che non tutti possono permettersi per ogni pratica personale.'
              : 'Too often, nobody explains clearly what to do unless you go to a specialist every single time. But this takes time, energy, and money that not everyone can afford for each personal procedure.'
            }
          </p>

          <p className="text-[15px] sm:text-[16px] text-[#0A192F] leading-[1.7] max-w-xl mb-10 font-medium">
            {isIT
              ? 'Herion nasce per rendere questi passaggi piu chiari, piu accessibili e meno pesanti da affrontare.'
              : 'Herion exists to make these steps clearer, more accessible, and less heavy to face.'
            }
          </p>

          <div className="flex flex-wrap gap-3">
            <Link to="/register">
              <Button className="bg-[#0A192F] hover:bg-[#162033] text-white rounded-xl h-12 px-8 text-[14px] font-semibold shadow-lg shadow-black/8" data-testid="hero-cta-btn">
                {t('welcome_cta_start', lang)} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <a href="#come-funziona">
              <Button variant="outline" className="rounded-xl h-12 px-6 text-[14px] border-[var(--border-soft)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]" data-testid="hero-how-btn">
                {t('welcome_cta_how', lang)}
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* ═══ VALUE BLOCKS — Core reasons Herion matters ═══ */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-white" id="come-funziona" data-testid="value-section">
        <div className="max-w-4xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#0ABFCF] mb-3">
            {isIT ? 'Il metodo Herion' : 'The Herion method'}
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0A192F] leading-tight mb-3">
            {isIT
              ? 'Comprendere, agire, diventare autonomi.'
              : 'Understand, act, become autonomous.'
            }
          </h2>
          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-10 max-w-xl">
            {isIT
              ? 'Herion ti accompagna passo dopo passo in ogni procedura, trasformando la complessita in un percorso chiaro, consapevole e gestibile.'
              : 'Herion walks with you step by step through every procedure, turning complexity into a clear, conscious, and manageable path.'
            }
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(VALUE_BLOCKS[lang] || VALUE_BLOCKS.it).map((block, i) => (
              <div key={i} className="flex items-start gap-4 p-5 rounded-xl border bg-[var(--bg-app)] transition-all hover:shadow-sm" style={{ borderColor: 'var(--border-soft)' }} data-testid={`value-block-${i}`}>
                <div className="w-10 h-10 rounded-xl bg-[#0ABFCF]/8 flex items-center justify-center flex-shrink-0">
                  <block.icon className="w-[18px] h-[18px] text-[#0ABFCF]" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-[#0A192F] mb-1">{block.title}</p>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{block.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FLOW STEPS — Quick visual ═══ */}
      <section className="py-14 px-4 sm:px-6" data-testid="flow-section">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(FLOW_STEPS[lang] || FLOW_STEPS.it).map((step, i) => (
              <div key={i} className="relative group">
                <div className="bg-white rounded-xl border p-4 sm:p-5 h-full" style={{ borderColor: 'var(--border-soft)' }}>
                  <span className="text-[24px] font-black text-[#0ABFCF]/12 block mb-1.5 leading-none">{step.num}</span>
                  <p className="text-[12px] font-bold text-[#0A192F] mb-0.5">{step.label}</p>
                  <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">{step.desc}</p>
                </div>
                {i < 3 && <div className="hidden md:block absolute top-1/2 -right-2 w-4 h-px bg-[var(--border-soft)]" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ BEFORE / AFTER — Emotional impact ═══ */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-white" data-testid="before-after-section">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Before */}
            <div className="p-6 rounded-xl bg-[#FEF2F2] border border-red-100">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-red-400 mb-3">
                {isIT ? 'Prima di Herion' : 'Before Herion'}
              </p>
              <div className="space-y-2.5">
                {(isIT
                  ? ['Compilavi moduli senza comprenderli davvero', 'Firmavi con incertezza', 'Ogni scadenza sembrava una fonte di ansia', 'La burocrazia appariva come un percorso confuso, da affrontare per tentativi']
                  : ['You filled out forms without truly understanding them', 'You signed with uncertainty', 'Every deadline felt like a source of anxiety', 'Bureaucracy appeared as a confusing path, faced by trial and error']
                ).map((line, i) => (
                  <p key={i} className="text-[12px] text-red-800/70 leading-relaxed">{line}.</p>
                ))}
              </div>
            </div>
            {/* After */}
            <div className="p-6 rounded-xl bg-[#F0FDF4] border border-emerald-100">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-500 mb-3">
                {isIT ? 'Dopo Herion' : 'After Herion'}
              </p>
              <div className="space-y-2.5">
                {(isIT
                  ? ['Ogni campo ha un significato chiaro', 'Ogni firma diventa una scelta consapevole', 'Le scadenze non sono piu un peso, ma passaggi da gestire con metodo', 'Con Herion capisci cosa stai facendo e lo fai con piu sicurezza']
                  : ['Every field has a clear meaning', 'Every signature becomes a conscious choice', 'Deadlines are no longer a burden, but steps to manage with method', 'With Herion you understand what you\'re doing and do it with more confidence']
                ).map((line, i) => (
                  <p key={i} className="text-[12px] text-emerald-800/70 leading-relaxed flex items-start gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />{line}.
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CHI SIAMO — Why Herion exists ═══ */}
      <section className="py-16 sm:py-20 px-4 sm:px-6" data-testid="about-section">
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-3">Chi siamo</p>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0A192F] leading-tight mb-6">
            {isIT
              ? <>Autonomia fiscale<br />e liberta personale.</>
              : <>Fiscal autonomy<br />is personal freedom.</>
            }
          </h2>

          <div className="space-y-4 mb-8">
            <p className="text-[14px] text-[var(--text-secondary)] leading-[1.75]">
              {isIT
                ? 'La chiarezza non e un lusso, ma una condizione per agire bene. Herion rende le procedure piu comprensibili, piu guidate e meno pesanti da affrontare.'
                : 'Clarity is not a luxury, but a condition for acting well. Herion makes procedures more understandable, more guided, and less heavy to face.'
              }
            </p>
            <p className="text-[14px] text-[var(--text-secondary)] leading-[1.75]">
              {isIT
                ? 'Oggi molte procedure sembrano difficili soprattutto perche nessuno le spiega con chiarezza, se non a costo di rivolgersi ogni volta a uno specialista. Ma questo richiede tempo, energie e spese che non tutti possono sostenere per ogni pratica personale presso gli enti competenti.'
                : 'Today many procedures seem difficult mainly because nobody explains them clearly, unless you pay a specialist every single time. But this requires time, energy, and costs that not everyone can sustain for each personal procedure at the relevant authorities.'
              }
            </p>
            <p className="text-[14px] text-[#0A192F] leading-[1.75] font-medium">
              {isIT
                ? 'Herion nasce per rendere questi passaggi piu chiari, piu accessibili e meno pesanti, aiutandoti a comprendere, preparare e procedere con maggiore sicurezza.'
                : 'Herion exists to make these steps clearer, more accessible, and less heavy, helping you understand, prepare, and proceed with greater confidence.'
              }
            </p>
          </div>

          <div className="p-5 bg-white rounded-xl border" style={{ borderColor: 'var(--border-soft)' }}>
            <div className="flex items-start gap-3">
              <Heart className="w-4 h-4 text-[#0ABFCF] flex-shrink-0 mt-1" />
              <div>
                <p className="text-[12px] text-[#0A192F] font-semibold mb-1">
                  {isIT ? 'Il principio di Herion' : 'The Herion principle'}
                </p>
                <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed italic">
                  {isIT
                    ? '"Impara a essere contabile di te stesso. Herion e il partner che ti insegna mentre ti aiuta, trasformando ogni procedura fiscale in un\'opportunita di crescita personale e professionale."'
                    : '"Learn to be your own accountant. Herion is the partner that teaches while it helps, turning every fiscal procedure into an opportunity for personal and professional growth."'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CONSULTATION / GUIDANCE ═══ */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-white" data-testid="consultation-section">
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#0ABFCF] mb-3">
            {isIT ? 'Per chi e Herion' : 'Who is Herion for'}
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0A192F] leading-tight mb-8">
            {isIT
              ? <>Non sai da dove partire?<br />Herion ti aiuta a orientarti.</>
              : <>Not sure where to start?<br />Herion helps you find the way.</>
            }
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: Users, label: isIT ? 'Libero professionista' : 'Freelancer', desc: isIT ? 'P.IVA, regime forfettario, contributi, F24 e scadenze. Herion ti mostra il percorso adatto a te.' : 'VAT, flat-rate regime, contributions, tax payments. Herion shows you the right path.' },
              { icon: BookOpen, label: isIT ? 'Azienda' : 'Company', desc: isIT ? 'Adempimenti societari, Camera di Commercio, bilanci. Herion organizza e segue tutto il necessario.' : 'Corporate filings, chamber of commerce, financial statements. Herion organizes everything.' },
              { icon: Compass, label: isIT ? 'Privato' : 'Individual', desc: isIT ? 'Dichiarazioni, cassetto fiscale, documenti personali. Herion ti guida anche nelle pratiche piu semplici.' : 'Tax returns, fiscal records, personal documents. Herion guides you through even the simplest procedures.' },
            ].map((card, i) => (
              <div key={i} className="p-5 rounded-xl border bg-[var(--bg-app)]" style={{ borderColor: 'var(--border-soft)' }} data-testid={`consultation-card-${i}`}>
                <card.icon className="w-5 h-5 text-[#0ABFCF] mb-3" strokeWidth={1.5} />
                <p className="text-[13px] font-bold text-[#0A192F] mb-1.5">{card.label}</p>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="py-20 px-4 sm:px-6 bg-[#0A192F]" data-testid="cta-section">
        <div className="max-w-2xl mx-auto text-center">
          <HerionMarkLight size={40} className="mx-auto mb-5" />
          <h2 className="text-xl font-bold text-white mb-3">
            {isIT ? 'Meno confusione. Piu controllo.' : 'Less confusion. More control.'}
          </h2>
          <p className="text-[13px] text-white/40 mb-8 max-w-md mx-auto leading-relaxed">
            {isIT
              ? 'Inizia a gestire le tue pratiche con un commercialista digitale che ti accompagna davvero. Dall\'inizio alla fine.'
              : 'Start managing your procedures with a digital accountant that truly walks with you. From start to finish.'
            }
          </p>
          <Link to="/register">
            <Button className="bg-[#0ABFCF] hover:bg-[#09a8b6] text-white rounded-xl h-12 px-8 text-[14px] font-semibold" data-testid="cta-register-btn">
              {t('welcome_cta_start', lang)} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-8 px-4 sm:px-6 bg-[#0f1420] text-white/40" data-testid="footer">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <HerionMarkLight size={24} />
            <span className="text-[11px] text-white/30 font-medium">Herion</span>
          </div>
          <p className="text-[10px] text-white/20 text-center">
            {isIT ? 'Commercialista digitale. Chiarezza, guida e continuita.' : 'Digital accountant. Clarity, guidance, and continuity.'}
          </p>
          <div className="flex items-center gap-4 text-[11px]">
            <Link to="/login" className="text-white/30 hover:text-white/50 transition-colors">{t('welcome_nav_login', lang)}</Link>
            <Link to="/register" className="text-white/30 hover:text-white/50 transition-colors">{t('welcome_nav_register', lang)}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
