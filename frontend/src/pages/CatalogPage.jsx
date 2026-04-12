import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getCatalog, getCatalogCategories } from '@/services/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Search, FileText, ExternalLink, Shield, CheckCircle, Clock,
  ChevronDown, ChevronUp, Key, Receipt, User, Briefcase, Users,
  ArrowRight, RefreshCw, Eye, Bot, UserCheck, Lock, Info, Globe,
  Building, CreditCard, Cog
} from 'lucide-react';
import { toast } from 'sonner';

const CATEGORY_ICONS = {
  fiscale: Receipt,
  previdenziale: Shield,
  societario: Building,
  documentale: FileText,
  informativo: Info,
};

const CATEGORY_COLORS = {
  fiscale: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', accent: 'bg-blue-500' },
  previdenziale: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', accent: 'bg-emerald-500' },
  societario: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', accent: 'bg-amber-500' },
  documentale: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', accent: 'bg-slate-400' },
  informativo: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', accent: 'bg-purple-400' },
};

const USER_TYPE_LABELS = { private: 'Privato', freelancer: 'Libero professionista', company: 'Azienda' };
const USER_TYPE_ICONS = { private: User, freelancer: Briefcase, company: Users };

export default function CatalogPage() {
  const [catalog, setCatalog] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all'); // all | official | internal
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const [catRes, catsRes] = await Promise.all([getCatalog(), getCatalogCategories()]);
        setCatalog(catRes.data);
        setCategories(catsRes.data);
      } catch (e) { console.warn('Catalog fetch failed:', e?.message); }
      finally { setLoading(false); }
    })();
  }, []);

  const filtered = useMemo(() => {
    let items = [...catalog];
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.official_action?.entity_name?.toLowerCase().includes(q) ||
        c.official_action?.label?.toLowerCase().includes(q)
      );
    }
    if (activeCategory !== 'all') items = items.filter(c => c.category === activeCategory);
    if (typeFilter === 'official') items = items.filter(c => c.procedure_type === 'official_procedure');
    if (typeFilter === 'internal') items = items.filter(c => c.procedure_type === 'internal_support');
    return items;
  }, [catalog, search, activeCategory, typeFilter]);

  // Group by category for display
  const grouped = useMemo(() => {
    if (activeCategory !== 'all') return [{ category: activeCategory, items: filtered }];
    const map = {};
    for (const item of filtered) {
      const cat = item.category || 'altro';
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    }
    const order = ['fiscale', 'previdenziale', 'societario', 'documentale', 'informativo'];
    return order.filter(c => map[c]).map(c => ({ category: c, items: map[c] }));
  }, [filtered, activeCategory]);

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="w-5 h-5 animate-spin text-[var(--text-muted)]" /></div>;

  return (
    <div className="space-y-5" data-testid="catalog-page">

      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">Catalogo Procedure</h1>
        <p className="text-[12px] text-[var(--text-secondary)]">Procedure fiscali, previdenziali e amministrative disponibili</p>
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2" data-testid="category-cards">
        {categories.map(cat => {
          const CatIcon = CATEGORY_ICONS[cat.id] || Info;
          const colors = CATEGORY_COLORS[cat.id] || CATEGORY_COLORS.informativo;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(isActive ? 'all' : cat.id)}
              className={`rounded-xl border p-3 text-left transition-all ${isActive ? `${colors.bg} ${colors.border} ring-2 ring-offset-1` : 'bg-white hover:bg-[var(--hover-soft)]'}`}
              style={isActive ? { ringColor: colors.accent } : { borderColor: 'var(--border-soft)' }}
              data-testid={`category-${cat.id}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <CatIcon className={`w-3.5 h-3.5 ${isActive ? colors.text : 'text-[var(--text-muted)]'}`} />
                <span className={`text-[11px] font-bold ${isActive ? colors.text : 'text-[var(--text-primary)]'}`}>{cat.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[18px] font-bold text-[var(--text-primary)]">{cat.procedure_count}</span>
                {cat.is_official && <span className="text-[8px] font-bold bg-emerald-50 text-emerald-600 px-1 py-0.5 rounded">Ufficiale</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Search + Type filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <Input
            placeholder="Cerca per nome, ente o azione..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl h-9 text-[11px]"
            style={{ borderColor: 'var(--border-soft)' }}
            data-testid="catalog-search"
          />
        </div>
        <div className="flex gap-1">
          {[
            { key: 'all', label: 'Tutte' },
            { key: 'official', label: 'Ufficiali' },
            { key: 'internal', label: 'Interne' },
          ].map(f => (
            <Button key={f.key} variant={typeFilter === f.key ? 'default' : 'outline'} size="sm"
              onClick={() => setTypeFilter(f.key)}
              className={`rounded-lg h-9 text-[10px] px-3 ${typeFilter === f.key ? 'bg-[var(--text-primary)] text-white' : ''}`}
              style={typeFilter !== f.key ? { borderColor: 'var(--border-soft)' } : {}}
              data-testid={`filter-${f.key}`}>
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border py-12 px-6 text-center" style={{ borderColor: 'var(--border-soft)' }}>
          <Search className="w-6 h-6 text-[var(--text-muted)] mx-auto mb-2 opacity-30" />
          <p className="text-[13px] font-semibold text-[var(--text-primary)]">Nessuna procedura trovata</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">Prova a cambiare i filtri o il termine di ricerca.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(group => {
            const colors = CATEGORY_COLORS[group.category] || CATEGORY_COLORS.informativo;
            const catData = categories.find(c => c.id === group.category);
            return (
              <div key={group.category} data-testid={`group-${group.category}`}>
                {/* Category header (only when showing all) */}
                {activeCategory === 'all' && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-1 h-5 rounded-full ${colors.accent}`} />
                    <p className={`text-[12px] font-bold ${colors.text}`}>{catData?.label || group.category}</p>
                    <span className="text-[9px] text-[var(--text-muted)]">{group.items.length} procedure</span>
                    {catData?.is_official && <span className="text-[8px] font-bold bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full">Procedure ufficiali</span>}
                  </div>
                )}

                <div className="space-y-2">
                  {group.items.map(entry => (
                    <ProcedureCard
                      key={entry.practice_id}
                      entry={entry}
                      isExpanded={!!expanded[entry.practice_id]}
                      onToggle={() => toggleExpand(entry.practice_id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


function ProcedureCard({ entry, isExpanded, onToggle }) {
  const isOfficial = entry.procedure_type === 'official_procedure';
  const oa = entry.official_action;
  const wa = entry.who_acts || {};
  const proof = entry.proof_expected;
  const duration = entry.estimated_duration;
  const docSpecs = entry.document_specs || [];
  const colors = CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.informativo;

  return (
    <div className="bg-white rounded-xl border overflow-hidden transition-shadow hover:shadow-sm" style={{ borderColor: 'var(--border-soft)' }} data-testid={`procedure-${entry.practice_id}`}>

      {/* Main row — always visible */}
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--hover-soft)] transition-colors">
        <div className={`w-2 h-8 rounded-full flex-shrink-0 ${colors.accent}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[12px] font-semibold text-[var(--text-primary)]">{entry.name}</p>
            {isOfficial ? (
              <span className="text-[8px] font-bold bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full">Ufficiale</span>
            ) : (
              <span className="text-[8px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">Interna</span>
            )}
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">{entry.user_explanation || entry.description}</p>
          {/* Key info pills */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {oa && (
              <span className="inline-flex items-center gap-1 text-[9px] text-[var(--text-secondary)] font-medium">
                <ExternalLink className="w-2.5 h-2.5" />{oa.entity_name}
              </span>
            )}
            {entry.auth_method && (
              <span className="inline-flex items-center gap-1 text-[9px] text-amber-600 font-medium">
                <Key className="w-2.5 h-2.5" />{entry.auth_method}
              </span>
            )}
            {duration && (
              <span className="inline-flex items-center gap-1 text-[9px] text-[var(--text-muted)]">
                <Clock className="w-2.5 h-2.5" />{duration.label}
              </span>
            )}
            {(entry.user_type || []).map(ut => {
              const UIcon = USER_TYPE_ICONS[ut] || User;
              return <span key={ut} className="inline-flex items-center gap-0.5 text-[8px] text-[var(--text-muted)]"><UIcon className="w-2.5 h-2.5" />{USER_TYPE_LABELS[ut]}</span>;
            })}
          </div>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />}
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="border-t px-4 py-4 space-y-4" style={{ borderColor: 'var(--border-soft)' }}>

          {/* Who acts — the most important info */}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Chi fa cosa</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {wa.herion_prepares && (
                <div className="flex items-center gap-2 p-2 bg-emerald-50/50 rounded-lg">
                  <Bot className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[10px] font-medium text-emerald-700">Herion prepara</span>
                </div>
              )}
              {wa.herion_submits && (
                <div className="flex items-center gap-2 p-2 bg-emerald-50/50 rounded-lg">
                  <Bot className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[10px] font-medium text-emerald-700">Herion invia</span>
                </div>
              )}
              {wa.user_submits && (
                <div className="flex items-center gap-2 p-2 bg-amber-50/50 rounded-lg">
                  <Eye className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-[10px] font-medium text-amber-700">Tu invii</span>
                </div>
              )}
              {wa.user_signs && (
                <div className="flex items-center gap-2 p-2 bg-amber-50/50 rounded-lg">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-[10px] font-medium text-amber-700">Tu firmi</span>
                </div>
              )}
              {wa.delegation_possible && (
                <div className="flex items-center gap-2 p-2 bg-blue-50/50 rounded-lg">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-[10px] font-medium text-blue-700">Delega possibile</span>
                </div>
              )}
              {wa.entity_response_expected && (
                <div className="flex items-center gap-2 p-2 bg-purple-50/50 rounded-lg">
                  <ExternalLink className="w-3.5 h-3.5 text-purple-600" />
                  <span className="text-[10px] font-medium text-purple-700">Risposta ente attesa</span>
                </div>
              )}
            </div>
          </div>

          {/* Official action */}
          {oa && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Azione ufficiale</p>
              <div className="p-3 bg-[var(--bg-soft)] rounded-lg">
                <p className="text-[11px] font-semibold text-[var(--text-primary)]">{oa.label}</p>
                <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{oa.description}</p>
                <div className="flex items-center gap-3 mt-1.5 text-[9px] text-[var(--text-muted)]">
                  <span>Ente: <strong className="text-[var(--text-primary)]">{oa.entity_name}</strong></span>
                  {oa.form_reference && <span>Modulo: <strong className="text-[var(--text-primary)]">{oa.form_reference}</strong></span>}
                </div>
              </div>
            </div>
          )}

          {/* Documents needed */}
          {docSpecs.length > 0 && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Documenti richiesti</p>
              <div className="space-y-1.5">
                {docSpecs.map((doc, i) => (
                  <div key={i} className="flex items-start gap-2.5 py-1.5 px-3 bg-[var(--bg-soft)] rounded-lg">
                    <FileText className="w-3 h-3 text-[var(--text-muted)] flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[10px] font-semibold text-[var(--text-primary)]">{doc.name}</p>
                        {doc.mandatory && <span className="text-[7px] font-bold bg-red-50 text-red-500 px-1 py-0.5 rounded">Obbligatorio</span>}
                      </div>
                      <p className="text-[9px] text-[var(--text-muted)] mt-0.5">{doc.why_needed}</p>
                      <p className="text-[8px] text-[var(--text-muted)]">Formato: {doc.format}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Auth + Proof + Timing row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {entry.auth_method && (
              <div className="p-2.5 bg-amber-50/50 rounded-lg">
                <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase">Autenticazione</p>
                <p className="text-[11px] font-semibold text-amber-700 mt-0.5 flex items-center gap-1">
                  <Key className="w-3 h-3" />{entry.auth_method}
                </p>
              </div>
            )}
            {proof && (
              <div className="p-2.5 bg-[var(--bg-soft)] rounded-lg">
                <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase">Ricevuta attesa</p>
                <p className="text-[10px] font-semibold text-[var(--text-primary)] mt-0.5">{proof.label}</p>
                <p className="text-[8px] text-[var(--text-muted)]">
                  {proof.timing === 'immediate' ? 'Immediata' : proof.timing === 'delayed' ? 'Differita' : proof.timing}
                  {proof.optional ? ' (opzionale)' : ' (obbligatoria)'}
                </p>
              </div>
            )}
            {duration && (
              <div className="p-2.5 bg-[var(--bg-soft)] rounded-lg">
                <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase">Tempistica</p>
                <p className="text-[10px] font-semibold text-[var(--text-primary)] mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" />{duration.label}
                </p>
              </div>
            )}
          </div>

          {/* Create practice CTA */}
          {isOfficial && (
            <Link to={`/practices/new?type=${entry.practice_id}`}>
              <Button className="bg-[#0ABFCF] hover:bg-[#09a8b6] text-white rounded-xl h-9 w-full text-[11px] font-semibold" data-testid={`create-from-${entry.practice_id}`}>
                <ArrowRight className="w-3.5 h-3.5 mr-1.5" />Avvia questa procedura
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
