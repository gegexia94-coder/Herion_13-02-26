import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/i18n/translations';
import { ArrowRight, ChevronLeft, ChevronRight, Eye, FileCheck, Compass, Shield, Heart, CheckCircle, Users, BookOpen, Send, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { HerionBrand, HerionMarkLight } from '@/components/HerionLogo';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { toast } from 'sonner';

const CAROUSEL_SLIDES = [
  { src: '/carousel-1.svg', alt: 'Autonomia fiscale' },
  { src: '/carousel-2.svg', alt: 'Il metodo Herion' },
  { src: '/carousel-3.svg', alt: 'Gli agenti Herion' },
  { src: '/carousel-4.svg', alt: 'La tua crescita fiscale' },
];

function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setCurrent(c => (c + 1) % CAROUSEL_SLIDES.length), []);
  const prev = useCallback(() => setCurrent(c => (c - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length), []);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [paused, next]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl bg-[#F8F9FC]"
      style={{ paddingBottom: '56.25%' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      data-testid="hero-carousel"
    >
      {CAROUSEL_SLIDES.map((slide, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-700 ease-in-out flex items-center justify-center"
          style={{ opacity: i === current ? 1 : 0 }}
        >
          <img
            src={slide.src}
            alt={slide.alt}
            className="w-full h-full object-contain"
            loading={i === 0 ? 'eager' : 'lazy'}
          />
        </div>
      ))}

      {/* Nav arrows */}
      <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/60 backdrop-blur-sm text-[#0A192F] flex items-center justify-center hover:bg-white/90 transition-colors z-10 shadow-sm" aria-label="Previous" data-testid="carousel-prev">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/60 backdrop-blur-sm text-[#0A192F] flex items-center justify-center hover:bg-white/90 transition-colors z-10 shadow-sm" aria-label="Next" data-testid="carousel-next">
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {CAROUSEL_SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? 'w-6 bg-[#0A192F]' : 'w-1.5 bg-[#0A192F]/25'}`}
            data-testid={`carousel-dot-${i}`}
          />
        ))}
      </div>
    </div>
  );
}

const VALUE_BLOCKS = {
  it: [
    { icon: Eye, title: 'Comprensione', desc: 'Ogni passaggio viene spiegato nel suo contesto, cosi capisci il perche di cio che stai facendo.' },
    { icon: Compass, title: 'Guida operativa', desc: 'Indicazioni chiare e progressive ti accompagnano in ogni fase, senza lasciarti nel dubbio.' },
    { icon: FileCheck, title: 'Preparazione sicura', desc: 'Documenti verificati, dati controllati, firma pronta. Tutto e organizzato prima del contatto con l\'ente.' },
    { icon: Shield, title: 'Autonomia crescente', desc: 'Piu utilizzi Herion, piu sviluppi sicurezza e indipendenza nelle tue procedure.' },
  ],
  en: [
    { icon: Eye, title: 'Understanding', desc: 'Each step is explained in context, so you understand the why behind what you\'re doing.' },
    { icon: Compass, title: 'Operational guidance', desc: 'Clear and progressive directions guide you through every phase, never leaving you in doubt.' },
    { icon: FileCheck, title: 'Secure preparation', desc: 'Documents verified, data checked, signature ready. Everything is organized before contacting the authority.' },
    { icon: Shield, title: 'Growing autonomy', desc: 'The more you use Herion, the more confidence and independence you develop in your procedures.' },
  ],
};

export default function WelcomePage() {
  const { lang } = useLanguage();
  const isIT = lang === 'it';
  const [collab, setCollab] = useState({ name: '', email: '', message: '' });
  const [sending, setSending] = useState(false);

  const handleCollab = (e) => {
    e.preventDefault();
    if (!collab.email.trim()) return;
    setSending(true);
    setTimeout(() => {
      toast.success(isIT ? 'Grazie! Ti contatteremo presto.' : 'Thanks! We\'ll contact you soon.');
      setCollab({ name: '', email: '', message: '' });
      setSending(false);
    }, 800);
  };

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

      {/* ═══ HERO CAROUSEL ═══ */}
      <section className="pt-20 sm:pt-24 px-4 sm:px-6" data-testid="hero-section">
        <div className="max-w-5xl mx-auto">
          <HeroCarousel />
        </div>
      </section>

      {/* ═══ HEADLINE + CTA ═══ */}
      <section className="py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-[24px] sm:text-[32px] lg:text-[38px] font-extrabold text-[#0A192F] leading-[1.15] tracking-tight mb-4">
            {isIT
              ? <>La burocrazia fiscale non dovrebbe<br className="hidden sm:block" /> essere un labirinto incomprensibile.</>
              : <>Tax bureaucracy shouldn't be<br className="hidden sm:block" /> an incomprehensible maze.</>
            }
          </h1>
          <p className="text-[14px] sm:text-[15px] text-[var(--text-secondary)] leading-[1.7] max-w-xl mx-auto mb-8">
            {isIT
              ? 'Herion ti accompagna passo dopo passo in ogni procedura, trasformando la complessita in un percorso piu chiaro, consapevole e gestibile.'
              : 'Herion walks with you step by step through every procedure, turning complexity into a clearer, more conscious, and manageable path.'
            }
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/register">
              <Button className="bg-[#0A192F] hover:bg-[#162033] text-white rounded-xl h-11 px-7 text-[13px] font-semibold shadow-lg shadow-black/8" data-testid="hero-cta-btn">
                {t('welcome_cta_start', lang)} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <a href="#metodo">
              <Button variant="outline" className="rounded-xl h-11 px-6 text-[13px] border-[var(--border-soft)] text-[var(--text-secondary)]" data-testid="hero-how-btn">
                {t('welcome_cta_how', lang)}
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* ═══ VALUE BLOCKS — Il metodo Herion ═══ */}
      <section className="py-14 sm:py-18 px-4 sm:px-6 bg-white" id="metodo" data-testid="value-section">
        <div className="max-w-4xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#0ABFCF] mb-2 text-center">
            {isIT ? 'Il metodo Herion' : 'The Herion method'}
          </p>
          <h2 className="text-lg sm:text-xl font-bold text-[#0A192F] text-center mb-8">
            {isIT ? 'Comprendere, agire, diventare autonomi.' : 'Understand, act, become autonomous.'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(VALUE_BLOCKS[lang] || VALUE_BLOCKS.it).map((block, i) => (
              <div key={i} className="flex items-start gap-3.5 p-4 rounded-xl border bg-[var(--bg-app)] card-hover" style={{ borderColor: 'var(--border-soft)' }} data-testid={`value-block-${i}`}>
                <div className="w-9 h-9 rounded-lg bg-[#0ABFCF]/8 flex items-center justify-center flex-shrink-0">
                  <block.icon className="w-4 h-4 text-[#0ABFCF]" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-[#0A192F] mb-0.5">{block.title}</p>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{block.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ BEFORE / AFTER ═══ */}
      <section className="py-14 sm:py-18 px-4 sm:px-6" data-testid="before-after-section">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl bg-red-50/60 border border-red-100/80">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-red-400 mb-3">
              {isIT ? 'Prima di Herion' : 'Before Herion'}
            </p>
            <div className="space-y-2">
              {(isIT
                ? ['Compilavi moduli senza comprenderli davvero', 'Firmavi con incertezza', 'Ogni scadenza sembrava una fonte di ansia', 'La burocrazia appariva come un percorso confuso']
                : ['You filled forms without truly understanding them', 'You signed with uncertainty', 'Every deadline felt like anxiety', 'Bureaucracy was a confusing path']
              ).map((line, i) => (
                <p key={i} className="text-[11px] text-red-700/60 leading-relaxed">{line}.</p>
              ))}
            </div>
          </div>
          <div className="p-5 rounded-xl bg-emerald-50/60 border border-emerald-100/80">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-500 mb-3">
              {isIT ? 'Dopo Herion' : 'After Herion'}
            </p>
            <div className="space-y-2">
              {(isIT
                ? ['Ogni campo ha un significato chiaro', 'Ogni firma diventa una scelta consapevole', 'Le scadenze diventano passaggi da gestire con metodo', 'Con Herion capisci cosa fai e lo fai con sicurezza']
                : ['Every field has clear meaning', 'Every signature becomes a conscious choice', 'Deadlines become steps managed with method', 'With Herion you understand and act with confidence']
              ).map((line, i) => (
                <p key={i} className="text-[11px] text-emerald-700/60 leading-relaxed flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />{line}.
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CHI SIAMO ═══ */}
      <section className="py-14 sm:py-18 px-4 sm:px-6 bg-white" data-testid="about-section">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-2">Chi siamo</p>
          <h2 className="text-lg sm:text-xl font-bold text-[#0A192F] mb-5">
            {isIT ? 'Autonomia fiscale e liberta personale.' : 'Fiscal autonomy is personal freedom.'}
          </h2>
          <p className="text-[13px] text-[var(--text-secondary)] leading-[1.75] max-w-lg mx-auto mb-6">
            {isIT
              ? 'Oggi molte procedure sembrano difficili soprattutto perche nessuno le spiega con chiarezza, se non a costo di rivolgersi ogni volta a uno specialista. Ma questo richiede tempo, energie e spese che non tutti possono sostenere.'
              : 'Today many procedures seem difficult mainly because nobody explains them clearly, unless you pay a specialist every time. But this requires time, energy, and costs that not everyone can sustain.'
            }
          </p>
          <div className="p-4 bg-[var(--bg-app)] rounded-xl border inline-block text-left max-w-md" style={{ borderColor: 'var(--border-soft)' }}>
            <div className="flex items-start gap-2.5">
              <Heart className="w-3.5 h-3.5 text-[#0ABFCF] flex-shrink-0 mt-1" />
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed italic">
                {isIT
                  ? '"Impara a essere contabile di te stesso. Herion e il partner che ti insegna mentre ti aiuta."'
                  : '"Learn to be your own accountant. Herion is the partner that teaches while it helps."'
                }
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOR WHO ═══ */}
      <section className="py-14 sm:py-18 px-4 sm:px-6" data-testid="audience-section">
        <div className="max-w-4xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#0ABFCF] mb-2 text-center">
            {isIT ? 'Per chi e Herion' : 'Who is Herion for'}
          </p>
          <h2 className="text-lg sm:text-xl font-bold text-[#0A192F] text-center mb-8">
            {isIT ? 'Per chi vuole procedere con piu chiarezza.' : 'For anyone who wants to proceed with more clarity.'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: Users, label: isIT ? 'Professionisti' : 'Professionals', desc: isIT ? 'P.IVA, regime forfettario, contributi, F24 e scadenze.' : 'VAT, flat-rate regime, contributions, tax payments.' },
              { icon: BookOpen, label: isIT ? 'Aziende' : 'Companies', desc: isIT ? 'Adempimenti societari, Camera di Commercio, bilanci.' : 'Corporate filings, chamber of commerce, statements.' },
              { icon: Compass, label: isIT ? 'Privati' : 'Individuals', desc: isIT ? 'Dichiarazioni, cassetto fiscale, documenti personali.' : 'Tax returns, fiscal records, personal documents.' },
            ].map((card, i) => (
              <div key={i} className="p-4 rounded-xl border bg-white card-hover" style={{ borderColor: 'var(--border-soft)' }}>
                <card.icon className="w-5 h-5 text-[#0ABFCF] mb-2.5" strokeWidth={1.5} />
                <p className="text-[12px] font-bold text-[#0A192F] mb-1">{card.label}</p>
                <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ COLLABORATION FORM ═══ */}
      <section className="py-14 sm:py-18 px-4 sm:px-6 bg-white" data-testid="collab-section">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#0ABFCF] mb-2">
            {isIT ? 'Collabora con noi' : 'Join us'}
          </p>
          <h2 className="text-lg font-bold text-[#0A192F] mb-2">
            {isIT ? 'Vuoi aiutarci a crescere?' : 'Want to help us grow?'}
          </h2>
          <p className="text-[12px] text-[var(--text-secondary)] mb-6 max-w-sm mx-auto leading-relaxed">
            {isIT
              ? 'Cerchiamo collaboratori, commercialisti, sviluppatori e professionisti che vogliono rendere la burocrazia piu umana.'
              : 'We\'re looking for collaborators, accountants, developers, and professionals who want to make bureaucracy more human.'
            }
          </p>
          <form onSubmit={handleCollab} className="space-y-3 text-left">
            <div className="grid grid-cols-2 gap-3">
              <Input value={collab.name} onChange={e => setCollab({...collab, name: e.target.value})} placeholder={isIT ? 'Nome' : 'Name'} className="rounded-xl h-10 text-[12px] border-[var(--border-soft)]" data-testid="collab-name" />
              <Input type="email" value={collab.email} onChange={e => setCollab({...collab, email: e.target.value})} placeholder="Email" required className="rounded-xl h-10 text-[12px] border-[var(--border-soft)]" data-testid="collab-email" />
            </div>
            <Textarea value={collab.message} onChange={e => setCollab({...collab, message: e.target.value})} placeholder={isIT ? 'Come vorresti contribuire?' : 'How would you like to contribute?'} className="rounded-xl text-[12px] border-[var(--border-soft)] min-h-[80px] resize-none" data-testid="collab-message" />
            <Button type="submit" disabled={sending} className="w-full bg-[#0A192F] hover:bg-[#162033] text-white rounded-xl h-10 text-[12px] font-semibold gap-2" data-testid="collab-submit">
              <Mail className="w-3.5 h-3.5" />
              {sending ? (isIT ? 'Invio...' : 'Sending...') : (isIT ? 'Invia' : 'Send')}
            </Button>
          </form>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="py-16 px-4 sm:px-6" style={{ background: 'linear-gradient(180deg, rgba(10,25,47,0.04) 0%, rgba(10,191,207,0.06) 100%)' }} data-testid="cta-section">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-lg font-bold text-[#0A192F] mb-2">
            {isIT ? 'Meno confusione. Piu controllo.' : 'Less confusion. More control.'}
          </h2>
          <p className="text-[12px] text-[var(--text-secondary)] mb-6 max-w-md mx-auto leading-relaxed">
            {isIT
              ? 'Inizia a gestire le tue pratiche con un commercialista digitale che ti accompagna. Dall\'inizio alla fine.'
              : 'Start managing your procedures with a digital accountant that walks with you. From start to finish.'
            }
          </p>
          <Link to="/register">
            <Button className="bg-[#0A192F] hover:bg-[#162033] text-white rounded-xl h-11 px-7 text-[13px] font-semibold shadow-sm" data-testid="cta-register-btn">
              {t('welcome_cta_start', lang)} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-6 px-4 sm:px-6 bg-[var(--bg-app)] border-t" style={{ borderColor: 'var(--border-soft)' }} data-testid="footer">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <HerionMarkLight size={20} />
            <span className="text-[10px] text-[var(--text-muted)] font-medium">Herion</span>
            <span className="text-[9px] text-[var(--text-muted)]">&middot; {isIT ? 'Commercialista digitale' : 'Digital accountant'}</span>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-[var(--text-muted)]">
            <Link to="/login" className="hover:text-[var(--text-primary)] transition-colors">{t('welcome_nav_login', lang)}</Link>
            <Link to="/register" className="hover:text-[var(--text-primary)] transition-colors">{t('welcome_nav_register', lang)}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
