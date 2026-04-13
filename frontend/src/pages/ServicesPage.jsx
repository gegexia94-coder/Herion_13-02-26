import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCatalog, getPractices, getDeadlines } from '@/services/api';
import { Button } from '@/components/ui/button';
import {
  Receipt, Shield, Building, Compass, Calendar, BookOpen,
  ArrowRight, ExternalLink, FileText, MapPin, Clock, Users,
  Briefcase, TrendingUp, AlertTriangle, CheckCircle, ChevronRight,
  RefreshCw, Lightbulb, HelpCircle
} from 'lucide-react';

// ─── 6 OPERATIONAL AREAS DEFINITION ───
const AREAS = [
  {
    id: 'fiscal',
    title: 'Gestione fiscale e contabile',
    subtitle: 'IVA, F24, dichiarazioni, contabilita, bilanci',
    description: 'Herion ti aiuta a preparare e organizzare le tue pratiche fiscali e contabili. Dalla compilazione dell\'F24 alla dichiarazione IVA, ogni passaggio e guidato e verificato.',
    what_herion_does: 'Prepara i modelli, verifica i dati, ti accompagna verso l\'invio ufficiale. Tu controlli e approvi.',
    icon: Receipt,
    color: '#3B82F6',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-700',
    catalogCategories: ['fiscale'],
    keywords: ['IVA', 'F24', 'Redditi', '730', 'LIPE', 'CU', 'fattura', 'cassetto'],
  },
  {
    id: 'planning',
    title: 'Scadenze e pianificazione fiscale',
    subtitle: 'Scadenze, deduzioni, vantaggi, preparazione anticipata',
    description: 'Herion ti aiuta a non perdere scadenze e a capire in anticipo cosa preparare. Ti segnala possibili vantaggi fiscali e ti guida nella pianificazione.',
    what_herion_does: 'Monitora le scadenze, ti avvisa in anticipo, suggerisce cosa preparare prima che diventi urgente.',
    icon: Calendar,
    color: '#F59E0B',
    bgLight: 'bg-amber-50',
    textColor: 'text-amber-700',
    catalogCategories: ['fiscale', 'informativo', 'lavoro'],
    keywords: ['scadenza', 'F24', 'LIPE', 'dichiarazione', 'regime', 'UniEmens', 'autoliquidazione', 'conguaglio'],
  },
  {
    id: 'company',
    title: 'Societa e struttura aziendale',
    subtitle: 'Aperture, variazioni, chiusure, Camera di Commercio',
    description: 'Herion ti accompagna nelle pratiche societarie: dalla costituzione alla variazione, dalla SCIA alla cancellazione. Ogni procedura ha il suo percorso guidato.',
    what_herion_does: 'Raccoglie i documenti, verifica i requisiti, ti indirizza verso l\'ente giusto con le istruzioni corrette.',
    icon: Building,
    color: '#8B5CF6',
    bgLight: 'bg-purple-50',
    textColor: 'text-purple-700',
    catalogCategories: ['societario'],
    keywords: ['SRL', 'SCIA', 'ATECO', 'Camera', 'Commercio', 'chiusura', 'costituzione'],
  },
  {
    id: 'strategic',
    title: 'Supporto strategico e orientamento',
    subtitle: 'Situazione fiscale, decisioni, chiarezza operativa',
    description: 'Herion ti aiuta a capire meglio la tua situazione fiscale e amministrativa. Non solo numeri, ma indicazioni pratiche su cosa fare e come muoverti.',
    what_herion_does: 'Analizza la tua situazione, ti spiega cosa conta, ti aiuta a prendere decisioni piu informate.',
    icon: Lightbulb,
    color: '#06B6D4',
    bgLight: 'bg-cyan-50',
    textColor: 'text-cyan-700',
    catalogCategories: ['informativo', 'documentale'],
    keywords: ['informazioni', 'regime', 'forfettario', 'consulenza', 'report'],
  },
  {
    id: 'entities',
    title: 'Procedure con enti ufficiali',
    subtitle: 'Agenzia delle Entrate, INPS, Camera di Commercio, SUAP',
    description: 'Ogni procedura ufficiale ha un ente di destinazione, un portale, un canale e un riferimento atteso. Herion ti guida verso l\'ente giusto e segue la pratica fino alla conferma.',
    what_herion_does: 'Ti indica il portale esatto, le credenziali necessarie, il canale ufficiale. Dopo l\'invio, acquisisce il protocollo e monitora lo stato.',
    icon: ExternalLink,
    color: '#10B981',
    bgLight: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    catalogCategories: ['fiscale', 'previdenziale', 'societario', 'lavoro'],
    keywords: ['INPS', 'Agenzia', 'Entrate', 'Camera', 'SUAP', 'portale', 'SPID', 'INAIL', 'Centro', 'Impiego'],
  },
  {
    id: 'guidance',
    title: 'Guida continua e chiarezza',
    subtitle: 'Spiegazioni, prossimi passi, supporto anti-confusione',
    description: 'Herion non ti lascia mai senza indicazioni. In ogni momento sai dove sei, cosa manca, cosa devi fare e cosa viene dopo. Questo e il cuore dell\'esperienza.',
    what_herion_does: 'Ti spiega ogni passaggio, ti dice chi agisce, cosa aspettarti e quando intervenire. Resta presente fino alla conclusione.',
    icon: Compass,
    color: '#0ABFCF',
    bgLight: 'bg-[#0ABFCF]/5',
    textColor: 'text-[#0ABFCF]',
    catalogCategories: ['documentale', 'informativo'],
    keywords: ['follow-up', 'aggiornamento', 'stato', 'completezza', 'approvazione'],
  },
];

export default function ServicesPage() {
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState([]);
  const [practices, setPractices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedArea, setExpandedArea] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [catRes, pracRes] = await Promise.all([
          getCatalog(),
          getPractices(),
        ]);
        setCatalog(catRes.data || []);
        setPractices(pracRes.data || []);
      } catch (e) { console.warn('Load failed:', e?.message); }
      finally { setLoading(false); }
    })();
  }, []);

  const getAreaProcedures = (area) => {
    return catalog.filter(c => {
      if (area.catalogCategories.includes(c.category)) return true;
      const name = (c.name || '').toLowerCase();
      const desc = (c.description || '').toLowerCase();
      return area.keywords.some(k => name.includes(k.toLowerCase()) || desc.includes(k.toLowerCase()));
    }).slice(0, 8);
  };

  const getAreaStats = (area) => {
    const procs = getAreaProcedures(area);
    const officialCount = procs.filter(p => p.procedure_type === 'official_procedure').length;
    const activePractices = practices.filter(p => {
      const matchesCat = area.catalogCategories.some(cat => {
        const catalogEntry = catalog.find(c => c.practice_id === p.practice_type);
        return catalogEntry?.category === cat;
      });
      return matchesCat && !['completed', 'accepted_by_entity'].includes(p.status);
    }).length;
    return { procedures: procs.length, official: officialCount, active: activePractices };
  };

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="w-5 h-5 animate-spin text-[var(--text-muted)]" /></div>;

  return (
    <div className="space-y-6" data-testid="services-page">
      {/* ── HEADER ── */}
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight" data-testid="services-title">Aree operative</h1>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1 max-w-lg">
          Herion ti supporta come un commercialista digitale in sei aree principali. Ogni area copre un insieme di pratiche, servizi e procedure reali.
        </p>
      </div>

      {/* ── AREA CARDS ── */}
      <div className="space-y-3">
        {AREAS.map((area) => {
          const isExpanded = expandedArea === area.id;
          const stats = getAreaStats(area);
          const procedures = isExpanded ? getAreaProcedures(area) : [];
          const Icon = area.icon;

          return (
            <div key={area.id} className="bg-white rounded-xl border overflow-hidden transition-shadow hover:shadow-md" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid={`area-card-${area.id}`}>
              {/* Main card */}
              <button
                onClick={() => setExpandedArea(isExpanded ? null : area.id)}
                className="w-full text-left px-5 py-5 flex items-start gap-4 hover:bg-[var(--bg-app)]/50 transition-colors"
                data-testid={`area-toggle-${area.id}`}
              >
                <div className={`w-11 h-11 rounded-xl ${area.bgLight} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <Icon className="w-5 h-5" style={{ color: area.color }} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h2 className="text-[14px] font-bold text-[var(--text-primary)]">{area.title}</h2>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mb-2">{area.subtitle}</p>
                  <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">{area.description}</p>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 mt-3">
                    {stats.procedures > 0 && (
                      <span className="text-[10px] text-[var(--text-muted)]">
                        <span className="font-bold text-[var(--text-primary)]">{stats.procedures}</span> procedure
                      </span>
                    )}
                    {stats.official > 0 && (
                      <span className="text-[10px] text-[var(--text-muted)]">
                        <span className="font-bold" style={{ color: area.color }}>{stats.official}</span> ufficiali
                      </span>
                    )}
                    {stats.active > 0 && (
                      <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        {stats.active} attive
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 text-[var(--text-muted)] flex-shrink-0 mt-2 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t px-5 py-4 space-y-4" style={{ borderColor: 'var(--border-soft)' }}>
                  {/* What Herion does */}
                  <div className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: `${area.color}08` }}>
                    <HelpCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: area.color }} strokeWidth={1.5} />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] mb-0.5">Cosa fa Herion qui</p>
                      <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">{area.what_herion_does}</p>
                    </div>
                  </div>

                  {/* Procedures list */}
                  {procedures.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] mb-2">Procedure correlate</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {procedures.map((proc, i) => (
                          <ProcedureCard key={proc.practice_id || i} proc={proc} areaColor={area.color} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <Link to={`/catalog?category=${area.catalogCategories[0]}`}>
                      <Button variant="outline" className="rounded-lg h-8 text-[11px] px-4" style={{ borderColor: 'var(--border-soft)' }} data-testid={`area-catalog-link-${area.id}`}>
                        <BookOpen className="w-3 h-3 mr-1.5" />Vedi catalogo
                      </Button>
                    </Link>
                    <Link to="/practices/new">
                      <Button className="rounded-lg h-8 text-[11px] px-4 text-white" style={{ backgroundColor: area.color }} data-testid={`area-new-practice-${area.id}`}>
                        Nuova pratica <ArrowRight className="w-3 h-3 ml-1.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── BOTTOM GUIDANCE ── */}
      <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="services-guidance">
        <div className="flex items-start gap-3">
          <Compass className="w-5 h-5 text-[#0ABFCF] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <div>
            <p className="text-[13px] font-bold text-[var(--text-primary)] mb-1">Non sai da dove partire?</p>
            <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed mb-3">
              Ogni area copre un aspetto della tua vita fiscale e amministrativa. Puoi esplorare le procedure disponibili, aprire una nuova pratica o chiedere a Herion di orientarti.
            </p>
            <div className="flex items-center gap-2">
              <Link to="/catalog">
                <Button variant="outline" className="rounded-lg h-8 text-[11px] px-4" style={{ borderColor: 'var(--border-soft)' }} data-testid="services-explore-catalog">
                  <BookOpen className="w-3 h-3 mr-1.5" />Esplora il catalogo completo
                </Button>
              </Link>
              <Link to="/support">
                <Button variant="ghost" className="rounded-lg h-8 text-[11px] px-4 text-[var(--text-secondary)]" data-testid="services-support-link">
                  <HelpCircle className="w-3 h-3 mr-1.5" />Chiedi supporto
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── SUB-COMPONENT: Procedure Card ───

function ProcedureCard({ proc, areaColor }) {
  const isOfficial = proc.procedure_type === 'official_procedure';
  const entity = proc.official_action?.entity_name;
  const authMethod = proc.auth_method;
  const duration = proc.estimated_duration;

  return (
    <Link
      to={`/practices/new?type=${proc.practice_id}`}
      className="flex items-start gap-3 p-3 rounded-lg border hover:bg-[var(--bg-app)]/50 hover:shadow-sm transition-all group"
      style={{ borderColor: 'var(--border-soft)' }}
      data-testid={`procedure-${proc.practice_id}`}
    >
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: `${areaColor}10` }}>
        {isOfficial ? <ExternalLink className="w-3.5 h-3.5" style={{ color: areaColor }} strokeWidth={1.5} /> : <FileText className="w-3.5 h-3.5 text-[var(--text-muted)]" strokeWidth={1.5} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-[var(--text-primary)] group-hover:text-[#0ABFCF] transition-colors leading-tight">{proc.name}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {entity && (
            <span className="text-[9px] text-[var(--text-muted)] flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5" />{entity}
            </span>
          )}
          {authMethod && (
            <span className="text-[9px] text-purple-500 font-medium">{authMethod}</span>
          )}
          {duration?.label && (
            <span className="text-[9px] text-[var(--text-muted)] flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />{duration.label}
            </span>
          )}
        </div>
      </div>
      <ArrowRight className="w-3 h-3 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1.5" />
    </Link>
  );
}
