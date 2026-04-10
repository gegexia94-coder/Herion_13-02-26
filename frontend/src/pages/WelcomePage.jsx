import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardList, FileCheck, Clock, ShieldCheck, Users, Building2, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-[#FAFCFD]" data-testid="welcome-page">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-[#E2E8F0]/60">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#0A192F] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 4V20" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round"/><path d="M18 4V20" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round"/><path d="M6 12H18" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round"/></svg>
            </div>
            <span className="text-lg font-bold text-[#0F172A] tracking-tight">Herion</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login"><Button variant="ghost" className="text-sm text-[#475569] hover:text-[#0F172A] rounded-xl h-9 px-4" data-testid="nav-login-btn">Accedi</Button></Link>
            <Link to="/register"><Button className="bg-[#0A192F] hover:bg-[#0B243B] text-white rounded-xl h-9 px-5 text-sm font-semibold" data-testid="nav-register-btn">Inizia ora</Button></Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6" data-testid="hero-section">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#0A192F]/[0.04] border border-[#0A192F]/10 rounded-full mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
            <span className="text-[11px] font-medium text-[#0A192F] tracking-wide">Assistente operativo fiscale</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-[#0F172A] leading-[1.2] tracking-tight mb-6">
            Herion ti aiuta a gestire pratiche fiscali, documenti e passaggi operativi in modo chiaro, ordinato e guidato.
          </h1>
          <p className="text-base sm:text-lg text-[#475569] leading-relaxed max-w-2xl mx-auto mb-4">
            Dalla raccolta dei dati alla verifica dei documenti, fino ai passaggi che possono essere preparati o inviati, Herion ti accompagna passo dopo passo, riducendo confusione, errori e perdite di tempo.
          </p>
          <p className="text-sm text-[#64748B] max-w-xl mx-auto mb-4">
            Pensato per privati, freelance e aziende in Italia. Herion unisce organizzazione, controllo e supporto operativo in un unico spazio.
          </p>
          <p className="text-[11px] text-[#94A3B8] max-w-md mx-auto mb-10">
            Attualmente operativo per il contesto fiscale italiano. Architettura predisposta per l'espansione europea.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/register"><Button className="bg-[#0A192F] hover:bg-[#0B243B] text-white rounded-xl h-12 px-8 text-sm font-semibold shadow-lg shadow-[#0A192F]/10" data-testid="hero-cta-btn">Inizia ora <ArrowRight className="w-4 h-4 ml-2" /></Button></Link>
            <Link to="/login"><Button variant="outline" className="border-[#0A192F]/20 text-[#0A192F] hover:bg-[#0A192F]/[0.03] rounded-xl h-12 px-8 text-sm font-semibold" data-testid="hero-login-btn">Accedi</Button></Link>
          </div>
        </div>
      </section>

      {/* Cosa fa Herion */}
      <section className="py-20 px-6 bg-white" data-testid="features-section">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <h2 className="text-lg sm:text-xl font-bold text-[#0F172A] mb-4">Cosa fa Herion</h2>
            <p className="text-sm text-[#475569] leading-relaxed">
              Herion nasce per rendere piu semplice tutto cio che di solito richiede attenzione, documenti, controlli e tempo.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: ClipboardList, title: 'Raccolta e organizzazione', desc: 'Raccogliere e organizzare dati e documenti in modo strutturato, senza perdere nulla.' },
              { icon: FileCheck, title: 'Pratiche guidate', desc: 'Seguire pratiche fiscali e amministrative con passaggi chiari e controllati.' },
              { icon: ShieldCheck, title: 'Verifiche e controlli', desc: 'Controllare cosa manca prima del passaggio successivo, evitando sorprese.' },
              { icon: ArrowRight, title: 'Prossimi passi chiari', desc: 'Spiegare in modo semplice cosa fare, senza linguaggio difficile o confuso.' },
              { icon: Clock, title: 'Scadenze e promemoria', desc: 'Ricordarti scadenze, approvazioni e azioni importanti al momento giusto.' },
              { icon: Building2, title: 'Casi semplici e complessi', desc: 'Distinguere i casi semplici da quelli che richiedono una verifica professionale.' },
            ].map((item, i) => (
              <div key={i} className="p-5 bg-[#FAFCFD] rounded-2xl border border-[#E2E8F0]/80 hover:border-[#0A192F]/15 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-[#0A192F]/[0.06] flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-[#0A192F]" strokeWidth={1.5} />
                </div>
                <h3 className="text-sm font-semibold text-[#0F172A] mb-1.5">{item.title}</h3>
                <p className="text-xs text-[#475569] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Perche e utile */}
      <section className="py-20 px-6" data-testid="benefits-section">
        <div className="max-w-4xl mx-auto">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <h2 className="text-lg sm:text-xl font-bold text-[#0F172A] mb-4">Perche e utile</h2>
            <p className="text-sm text-[#475569] leading-relaxed">
              Meno burocrazia da inseguire, piu chiarezza nelle cose da fare.
            </p>
          </div>
          <div className="space-y-3">
            {[
              'Evitare passaggi saltati o documenti mancanti',
              'Ridurre errori che possono rallentare una pratica',
              'Seguire lo stato di ogni richiesta in modo visibile',
              'Avere un riepilogo chiaro prima di ogni passaggio importante',
              'Sapere quando una pratica puo andare avanti e quando invece va fermata e verificata meglio',
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-3.5 p-4 bg-white rounded-xl border border-[#E2E8F0]/80">
                <div className="w-6 h-6 rounded-full bg-[#3B82F6]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-[#0A192F]" />
                </div>
                <p className="text-sm text-[#0F172A] leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Come funziona */}
      <section className="py-20 px-6 bg-white" data-testid="how-it-works-section">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-lg sm:text-xl font-bold text-[#0F172A] text-center mb-14">Come funziona</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Inserisci i dati e i documenti', desc: 'Herion raccoglie solo cio che serve davvero per capire la pratica.' },
              { step: '2', title: 'Controlla e organizza il flusso', desc: 'Gli agenti verificano documenti, passaggi, canali e scadenze, cosi ogni pratica segue un percorso ordinato.' },
              { step: '3', title: 'Ti guida fino al prossimo passo', desc: 'Prima di ogni azione importante, Herion ti mostra cosa sta succedendo, cosa manca e cosa puoi fare dopo.' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#0A192F] text-white flex items-center justify-center mx-auto mb-5 text-lg font-bold">{item.step}</div>
                <h3 className="text-sm font-semibold text-[#0F172A] mb-2">{item.title}</h3>
                <p className="text-xs text-[#475569] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Per chi e */}
      <section className="py-20 px-6" data-testid="audience-section">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-lg sm:text-xl font-bold text-[#0F172A] text-center mb-12">Per chi e Herion</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: Users, title: 'Privati', desc: 'Che hanno bisogno di ordine, spiegazioni chiare e supporto pratico per le proprie pratiche.' },
              { icon: Briefcase, title: 'Freelance e professionisti', desc: 'Che vogliono gestire meglio documenti, scadenze e passaggi fiscali senza perdersi tra le procedure.' },
              { icon: Building2, title: 'Aziende', desc: 'Che hanno bisogno di controllo, visibilita e flussi piu ordinati nella gestione amministrativa.' },
            ].map((item, i) => (
              <div key={i} className="p-6 bg-white rounded-2xl border border-[#E2E8F0]/80 text-center hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-[#0A192F]/[0.06] flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-5 h-5 text-[#0A192F]" strokeWidth={1.5} />
                </div>
                <h3 className="text-sm font-semibold text-[#0F172A] mb-2">{item.title}</h3>
                <p className="text-xs text-[#475569] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Valore */}
      <section className="py-20 px-6 bg-white" data-testid="value-section">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-sm text-[#0F172A] leading-relaxed mb-4">
            Herion non sostituisce in modo cieco il lavoro professionale.
            Ti aiuta a gestire meglio tutto cio che puo essere organizzato, controllato e preparato con regole chiare.
          </p>
          <p className="text-sm text-[#475569] leading-relaxed">
            Quando un caso e semplice o medio, Herion puo accompagnarti passo dopo passo.
            Quando il caso diventa delicato, ambiguo o rischioso, il sistema lo segnala chiaramente e prepara tutto in modo ordinato per una verifica piu attenta.
          </p>
        </div>
      </section>

      {/* Chi Siamo */}
      <section className="py-20 px-6" data-testid="about-section">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-lg sm:text-xl font-bold text-[#0F172A] text-center mb-8">Chi siamo</h2>
          <div className="space-y-4 text-sm text-[#475569] leading-relaxed">
            <p>Herion nasce dall'idea di rendere piu accessibili, ordinati e comprensibili i passaggi fiscali e amministrativi che spesso fanno perdere tempo, energie e serenita.</p>
            <p>Molte pratiche non sono difficili solo perche complesse: spesso diventano pesanti perche sono frammentate, poco chiare e piene di piccoli passaggi che si accumulano.</p>
            <p>Per questo Herion e stato pensato come uno spazio operativo dove dati, documenti, verifiche, approvazioni e scadenze possono convivere in modo piu leggibile e guidato.</p>
            <p>Il nostro obiettivo e aiutare privati, freelance e aziende a muoversi con piu ordine, piu controllo e meno fatica, senza lasciare tutto nel caos o nell'incertezza.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-[#0A192F]" data-testid="cta-section">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">Pronto a iniziare?</h2>
          <p className="text-sm text-white/60 mb-8">Siamo nati per trasformare burocrazia, pratiche e passaggi fiscali in percorsi piu semplici da capire e piu facili da seguire.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/register"><Button className="bg-[#3B82F6] hover:bg-[#4BC7AF] text-[#0A192F] rounded-xl h-12 px-8 text-sm font-bold">Inizia ora <ArrowRight className="w-4 h-4 ml-2" /></Button></Link>
            <Link to="/login"><Button variant="outline" className="border-white/20 text-white hover:bg-white/5 rounded-xl h-12 px-8 text-sm font-semibold">Accedi</Button></Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 bg-[#0A3440] text-white/40" data-testid="footer">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#3B82F6]/15 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 4V20" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round"/><path d="M18 4V20" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round"/><path d="M6 12H18" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round"/></svg>
            </div>
            <span className="text-sm font-semibold text-white/60">Herion</span>
          </div>
          <p className="text-xs text-white/30 text-center">Assistente operativo fiscale. Piu chiarezza nei passaggi. Piu ordine nelle pratiche. Piu controllo su cio che conta.</p>
          <div className="flex items-center gap-4 text-xs">
            <Link to="/login" className="text-white/40 hover:text-white/60 transition-colors">Accedi</Link>
            <Link to="/register" className="text-white/40 hover:text-white/60 transition-colors">Registrati</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
