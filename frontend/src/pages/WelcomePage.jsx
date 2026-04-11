import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HerionMark, HerionMarkLight } from '@/components/HerionLogo';

const HERO_SLIDES = [
  { heading: 'Chiarezza in ogni operazione', body: 'Ogni pratica ha un percorso visibile, ogni passaggio ha una spiegazione. Niente piu confusione.' },
  { heading: 'Autonomia con supporto continuo', body: 'Herion ti guida senza sostituirti. Decidi tu, ma con tutte le informazioni necessarie davanti.' },
  { heading: 'Suggerimenti economici aggiornati', body: 'Scadenze, adempimenti e opportunita fiscali sempre sotto controllo, senza doverli cercare.' },
  { heading: 'Comunicazione organizzata', body: 'Email, documenti e notifiche in un unico flusso. Meno caos, piu risposte puntuali.' },
  { heading: 'Una direzione piu chiara', body: 'Ogni giorno sai dove sei, cosa manca e qual e il prossimo passo. Herion tiene tutto in ordine per te.' },
];

function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setCurrent(c => (c + 1) % HERO_SLIDES.length), []);
  const prev = () => setCurrent(c => (c - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [paused, next]);

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      data-testid="hero-carousel"
    >
      <div className="overflow-hidden">
        <div className="transition-transform duration-500 ease-out flex" style={{ transform: `translateX(-${current * 100}%)` }}>
          {HERO_SLIDES.map((slide, i) => (
            <div key={i} className="w-full flex-shrink-0 px-4">
              <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] mb-2">{slide.heading}</h2>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-md">{slide.body}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 mt-5 px-4">
        <button onClick={prev} className="w-7 h-7 rounded-full bg-white/80 border border-[var(--border-soft)] flex items-center justify-center hover:bg-white transition-colors" data-testid="carousel-prev">
          <ChevronLeft className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
        </button>
        <div className="flex gap-1.5">
          {HERO_SLIDES.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)} className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? 'w-5 bg-[var(--surface-accent-1)]' : 'w-1.5 bg-[var(--text-muted)]/30'}`} />
          ))}
        </div>
        <button onClick={next} className="w-7 h-7 rounded-full bg-white/80 border border-[var(--border-soft)] flex items-center justify-center hover:bg-white transition-colors" data-testid="carousel-next">
          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
        </button>
      </div>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-[var(--bg-app)]" data-testid="welcome-page">

      {/* ─── NAV ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-b" style={{ borderColor: 'var(--border-soft)' }}>
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <HerionMark size={30} />
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/login"><Button variant="ghost" className="text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg h-9 px-4" data-testid="nav-login-btn">Accedi</Button></Link>
            <Link to="/register"><Button className="bg-[var(--text-primary)] hover:bg-[#2a3040] text-white rounded-lg h-9 px-5 text-[13px] font-semibold" data-testid="nav-register-btn">Inizia ora</Button></Link>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="pt-28 pb-16 px-6 relative overflow-hidden" data-testid="hero-section">
        {/* Large background H watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" aria-hidden="true">
          <span className="text-[min(40vw,320px)] font-black text-[var(--text-primary)] opacity-[0.025] leading-none tracking-tighter">
            HERION
          </span>
        </div>

        <div className="max-w-3xl mx-auto relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--bg-soft)] border border-[var(--surface-accent-1)]/30 rounded-full mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--surface-accent-1)]" />
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">Assistente operativo fiscale</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-[var(--text-primary)] leading-[1.15] tracking-tight mb-5">
            Meno confusione.<br />
            Piu controllo sulle tue pratiche.
          </h1>

          <p className="text-base text-[var(--text-secondary)] leading-relaxed max-w-xl mb-10">
            Herion e nato per rendere la vita piu semplice. Ti accompagna nella gestione fiscale e amministrativa con chiarezza, autonomia e supporto costante.
          </p>

          <Link to="/register">
            <Button className="bg-[var(--text-primary)] hover:bg-[#2a3040] text-white rounded-lg h-12 px-8 text-sm font-semibold shadow-lg shadow-black/5" data-testid="hero-cta-btn">
              Inizia ora <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ─── CAROUSEL SECTION ─── */}
      <section className="pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl border p-6 sm:p-8" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-soft)' }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-4">Cosa cambia con Herion</p>
            <HeroCarousel />
          </div>
        </div>
      </section>

      {/* ─── CHI SIAMO ─── */}
      <section className="py-16 px-6 bg-[var(--bg-soft)]" data-testid="about-section">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Chi siamo</h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
            Herion nasce dall'idea che gestire pratiche fiscali e amministrative non debba essere un'esperienza frustrante. Troppo spesso i passaggi si accumulano, i documenti si perdono e la chiarezza viene meno.
          </p>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Per questo abbiamo creato uno spazio operativo dove ogni fase e visibile, ogni azione e guidata e il supporto non si ferma mai. Non un servizio che ti sostituisce, ma un compagno che ti aiuta a muoverti con piu ordine e meno fatica, giorno dopo giorno.
          </p>
        </div>
      </section>

      {/* ─── VALUE PROPOSITION ─── */}
      <section className="py-16 px-6" data-testid="value-section">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: 'Organizzazione', body: 'Dati, documenti e scadenze in un unico flusso. Niente piu fogli sparsi o email dimenticate.' },
              { title: 'Controllo', body: 'Sai sempre dove sei, cosa manca e cosa serve. Ogni pratica ha un percorso chiaro e trasparente.' },
              { title: 'Supporto', body: 'Herion ti accompagna nel tempo. Non e una consulenza isolata, ma un alleato continuo.' },
            ].map((card, i) => (
              <div key={i} className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }}>
                <div className={`w-8 h-8 rounded-lg mb-3 flex items-center justify-center ${i === 0 ? 'bg-[var(--surface-accent-1)]/30' : i === 1 ? 'bg-[var(--surface-accent-2)]/30' : 'bg-[var(--bg-soft)]'}`}>
                  <span className="text-[13px] font-bold text-[var(--text-primary)]">{i + 1}</span>
                </div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1.5">{card.title}</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRODUCT PREVIEW ─── */}
      <section className="py-16 px-6 bg-white" data-testid="preview-section">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3">Costruito per la chiarezza</h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-lg mx-auto mb-8">
            Una piattaforma dove pratiche, agenti intelligenti, documenti e comunicazioni si integrano in un unico flusso operativo. Tutto visibile, tutto sotto controllo.
          </p>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { num: '12', label: 'Agenti specializzati' },
              { num: '34', label: 'Template email' },
              { num: '100%', label: 'Controllo operativo' },
            ].map((stat, i) => (
              <div key={i} className="py-4 px-3 rounded-xl bg-[var(--bg-app)] border" style={{ borderColor: 'var(--border-soft)' }}>
                <p className="text-2xl font-black text-[var(--text-primary)]">{stat.num}</p>
                <p className="text-[10px] text-[var(--text-muted)] font-medium mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-16 px-6 bg-[var(--text-primary)]" data-testid="cta-section">
        <div className="max-w-2xl mx-auto text-center">
          <HerionMarkLight size={40} className="mx-auto mb-5" />
          <h2 className="text-xl font-bold text-white mb-3">Pronto a semplificare?</h2>
          <p className="text-sm text-white/50 mb-8 max-w-md mx-auto">
            Inizia a gestire le tue pratiche con piu ordine, piu chiarezza e meno stress. Herion e qui per accompagnarti.
          </p>
          <Link to="/register">
            <Button className="bg-[var(--surface-accent-1)] hover:bg-[#b3ccf7] text-[var(--text-primary)] rounded-lg h-12 px-8 text-sm font-bold" data-testid="cta-register-btn">
              Inizia ora <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-8 px-6 bg-[#161b26] text-white/40" data-testid="footer">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <HerionMarkLight size={24} />
          </div>
          <p className="text-[11px] text-white/30 text-center">Assistente operativo fiscale. Chiarezza, ordine e controllo.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <Link to="/login" className="text-white/40 hover:text-white/60 transition-colors">Accedi</Link>
            <Link to="/register" className="text-white/40 hover:text-white/60 transition-colors">Registrati</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
