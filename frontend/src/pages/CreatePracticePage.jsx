import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPractice, getCatalog, getPreStartIntelligence } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft, ArrowRight, User, Briefcase, Building2, UserCircle,
  CheckCircle, FileText, Search, ExternalLink, Shield, Key, Clock,
  MapPin, AlertTriangle, Info, Compass, ChevronRight, Loader2,
  BookOpen, Lock, CircleDot, Check, X, Link2, ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';

const CLIENT_TYPES = [
  { value: 'private', label: 'Privato', desc: 'Persona fisica', icon: UserCircle },
  { value: 'freelancer', label: 'Professionista', desc: 'Con Partita IVA', icon: User },
  { value: 'company', label: 'Azienda', desc: 'Societa o impresa', icon: Building2 },
];

const PHASE_LABELS = [
  { key: 'select', label: 'Scegli' },
  { key: 'prepare', label: 'Preparati' },
  { key: 'confirm', label: 'Conferma' },
];

export default function CreatePracticePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [phase, setPhase] = useState('select'); // select | prepare | confirm
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState(searchParams.get('type') || '');
  const [clientType, setClientType] = useState('');
  const [preStart, setPreStart] = useState(null);
  const [preStartLoading, setPreStartLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [creating, setCreating] = useState(false);

  const [formData, setFormData] = useState({
    client_name: '', fiscal_code: '', vat_number: '', description: '',
  });

  // Load catalog
  useEffect(() => {
    (async () => {
      try {
        const res = await getCatalog();
        setCatalog(res.data || []);
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, []);

  // Auto-advance if type pre-selected from URL
  useEffect(() => {
    if (selectedType && catalog.length > 0 && !clientType) {
      const entry = catalog.find(c => c.practice_id === selectedType);
      if (entry) {
        // Pre-select a sensible client type
        const types = entry.user_type || [];
        if (types.includes('freelancer')) setClientType('freelancer');
        else if (types.includes('company')) setClientType('company');
        else setClientType('private');
      }
    }
  }, [selectedType, catalog, clientType]);

  // Load pre-start intelligence when type + clientType selected
  useEffect(() => {
    if (!selectedType || !clientType) { setPreStart(null); return; }
    (async () => {
      setPreStartLoading(true);
      try {
        const res = await getPreStartIntelligence(selectedType, clientType);
        setPreStart(res.data);
      } catch { setPreStart(null); }
      finally { setPreStartLoading(false); }
    })();
  }, [selectedType, clientType]);

  const filtered = useMemo(() => {
    if (!search) return catalog;
    const q = search.toLowerCase();
    return catalog.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.category?.toLowerCase().includes(q) ||
      c.official_action?.entity_name?.toLowerCase().includes(q)
    );
  }, [catalog, search]);

  const selectedEntry = catalog.find(c => c.practice_id === selectedType);
  const showVat = clientType === 'freelancer' || clientType === 'company';
  const phaseIndex = phase === 'select' ? 0 : phase === 'prepare' ? 1 : 2;

  const handleCreate = async () => {
    setShowConfirm(false);
    setCreating(true);
    try {
      const res = await createPractice({
        practice_type: selectedType,
        client_type: clientType,
        client_name: formData.client_name,
        fiscal_code: formData.fiscal_code,
        vat_number: formData.vat_number,
        description: formData.description || selectedEntry?.description || '',
        additional_data: {},
      });
      toast.success('Pratica creata');
      navigate(`/practices/${res.data.id}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Errore nella creazione');
    } finally { setCreating(false); }
  };

  const canProceedToConfirm = preStart?.readiness?.can_start && formData.client_name && clientType;

  return (
    <div className="max-w-3xl mx-auto" data-testid="create-practice-page">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => phase === 'select' ? navigate('/practices') : setPhase(phase === 'confirm' ? 'prepare' : 'select')}
          className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-3 transition-colors" data-testid="back-btn">
          <ArrowLeft className="w-3.5 h-3.5" />{phase === 'select' ? 'Torna alle pratiche' : 'Indietro'}
        </button>
        <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Nuova pratica</h1>
        <p className="text-[12px] text-[var(--text-secondary)] mt-1">Herion ti prepara prima di iniziare.</p>
      </div>

      {/* Phase indicator */}
      <div className="flex items-center gap-2 mb-6" data-testid="phase-indicator">
        {PHASE_LABELS.map((p, i) => (
          <div key={p.key} className="flex items-center">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              i === phaseIndex ? 'bg-[var(--text-primary)] text-white' :
              i < phaseIndex ? 'bg-emerald-50 text-emerald-600' : 'bg-[var(--bg-soft)] text-[var(--text-muted)]'
            }`}>
              {i < phaseIndex ? <Check className="w-3 h-3" /> : <span className="text-[10px]">{i + 1}</span>}
              {p.label}
            </div>
            {i < 2 && <ChevronRight className="w-3 h-3 text-[var(--text-muted)] mx-1" />}
          </div>
        ))}
      </div>

      {/* ═══ PHASE 1: SELECT ═══ */}
      {phase === 'select' && (
        <div className="space-y-4" data-testid="phase-select">
          {/* Client type */}
          <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-3">Chi sei</p>
            <div className="grid grid-cols-3 gap-2">
              {CLIENT_TYPES.map(ct => (
                <button key={ct.value} onClick={() => { setClientType(ct.value); setSelectedType(''); setPreStart(null); }}
                  className={`p-3 rounded-lg border text-center transition-all ${clientType === ct.value ? 'border-[#0ABFCF] bg-[#0ABFCF]/5 ring-1 ring-[#0ABFCF]/30' : 'border-[var(--border-soft)] hover:bg-[var(--bg-app)]'}`}
                  data-testid={`client-type-${ct.value}`}>
                  <ct.icon className={`w-5 h-5 mx-auto mb-1 ${clientType === ct.value ? 'text-[#0ABFCF]' : 'text-[var(--text-muted)]'}`} strokeWidth={1.5} />
                  <p className="text-[11px] font-semibold text-[var(--text-primary)]">{ct.label}</p>
                  <p className="text-[9px] text-[var(--text-muted)]">{ct.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Search + catalog */}
          {clientType && (
            <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="procedure-selector">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-3">Cosa devi fare</p>
              <div className="relative mb-3">
                <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <Input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Cerca procedura..." className="pl-9 rounded-lg h-9 text-[12px]" style={{ borderColor: 'var(--border-soft)' }}
                  data-testid="procedure-search" />
              </div>
              <ScrollArea className="h-[280px]">
                <div className="space-y-1 pr-2">
                  {loading ? <div className="flex justify-center py-8"><Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)]" /></div> :
                    filtered.filter(c => c.user_type?.includes(clientType)).length === 0 ?
                      <p className="text-center text-[12px] text-[var(--text-muted)] py-8">Nessuna procedura trovata</p> :
                    filtered.filter(c => c.user_type?.includes(clientType)).map(entry => {
                      const isOff = entry.procedure_type === 'official_procedure';
                      const isSelected = selectedType === entry.practice_id;
                      return (
                        <button key={entry.practice_id} onClick={() => setSelectedType(entry.practice_id)}
                          className={`w-full text-left p-3 rounded-lg transition-all ${isSelected ? 'bg-[#0ABFCF]/8 border border-[#0ABFCF]/30' : 'hover:bg-[var(--bg-app)] border border-transparent'}`}
                          data-testid={`procedure-option-${entry.practice_id}`}>
                          <div className="flex items-start gap-2.5">
                            <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${isOff ? 'bg-blue-50' : 'bg-slate-50'}`}>
                              {isOff ? <ExternalLink className="w-3 h-3 text-blue-500" /> : <FileText className="w-3 h-3 text-slate-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-[11px] font-semibold leading-tight ${isSelected ? 'text-[#0ABFCF]' : 'text-[var(--text-primary)]'}`}>{entry.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[9px] text-[var(--text-muted)]">{entry.category_label}</span>
                                {entry.official_action?.entity_name && <span className="text-[9px] text-[var(--text-muted)]">{entry.official_action.entity_name}</span>}
                              </div>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#0ABFCF] flex-shrink-0 mt-1" />}
                          </div>
                        </button>
                      );
                    })
                  }
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Next */}
          {selectedType && clientType && (
            <div className="flex justify-end">
              <Button onClick={() => setPhase('prepare')} className="bg-[var(--text-primary)] hover:bg-[#2a3040] text-white rounded-xl h-10 px-6 text-[12px] font-semibold" data-testid="go-to-prepare">
                Vai alla preparazione <ArrowRight className="w-3.5 h-3.5 ml-2" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ═══ PHASE 2: PREPARE (Pre-Practice Intelligence) ═══ */}
      {phase === 'prepare' && (
        <div className="space-y-4" data-testid="phase-prepare">
          {preStartLoading ? (
            <div className="flex items-center justify-center h-40"><Loader2 className="w-5 h-5 animate-spin text-[var(--text-muted)]" /></div>
          ) : preStart ? (
            <>
              {/* Orientation block */}
              <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="orientation-block">
                <div className="flex items-center gap-2 mb-3">
                  <Compass className="w-4 h-4 text-[#0ABFCF]" strokeWidth={1.5} />
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Orientamento pratica</p>
                </div>
                <h2 className="text-[15px] font-bold text-[var(--text-primary)] mb-1">{preStart.orientation.practice_name}</h2>
                <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed mb-3">{preStart.orientation.practice_description}</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${preStart.orientation.is_official ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-500'}`}>
                    {preStart.orientation.is_official ? 'Procedura ufficiale' : 'Servizio interno'}
                  </span>
                  <span className="text-[9px] text-[var(--text-muted)]">{preStart.orientation.category_label}</span>
                  {preStart.timing?.label && (
                    <span className="text-[9px] text-[var(--text-muted)] flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{preStart.timing.label}</span>
                  )}
                </div>
              </div>

              {/* Entity direction block */}
              {preStart.entity_direction && (
                <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="entity-block">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-[var(--text-muted)]" strokeWidth={1.5} />
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Ente e direzione</p>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-purple-50/30 rounded-lg">
                    <Building2 className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                    <div className="flex-1">
                      <p className="text-[13px] font-bold text-[var(--text-primary)]">{preStart.entity_direction.entity_name}</p>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{preStart.entity_direction.action_label}</p>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="text-[9px] text-[var(--text-muted)]">{preStart.entity_direction.submission_channel}</span>
                        {preStart.entity_direction.form_reference && (
                          <span className="text-[9px] text-[var(--text-muted)]">Modulo: {preStart.entity_direction.form_reference}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Checklist block */}
              {preStart.checklist?.length > 0 && (
                <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="checklist-block">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[var(--text-muted)]" strokeWidth={1.5} />
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Cosa ti serve</p>
                    </div>
                    <span className="text-[9px] text-[var(--text-muted)]">{preStart.readiness.mandatory_count} obbligatori</span>
                  </div>
                  <div className="space-y-2">
                    {preStart.checklist.map((item, i) => (
                      <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${item.mandatory ? 'bg-[var(--bg-app)]' : 'bg-transparent'}`} data-testid={`checklist-item-${i}`}>
                        <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          item.type === 'identification' ? 'bg-purple-50' : item.type === 'precondition' ? 'bg-amber-50' : 'bg-blue-50'
                        }`}>
                          {item.type === 'identification' ? <Key className="w-3 h-3 text-purple-500" /> :
                           item.type === 'precondition' ? <Shield className="w-3 h-3 text-amber-500" /> :
                           <FileText className="w-3 h-3 text-blue-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-[var(--text-primary)]">{item.label}</p>
                          <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{item.why_needed}</p>
                          {item.format && <p className="text-[9px] text-[var(--text-muted)] mt-0.5">Formato: {item.format}</p>}
                        </div>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${item.mandatory ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
                          {item.mandatory ? 'Obbligatorio' : 'Facoltativo'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Auth block */}
              {preStart.auth?.auth_required && (
                <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="auth-block">
                  <div className="flex items-center gap-2 mb-3">
                    <Lock className="w-4 h-4 text-purple-500" strokeWidth={1.5} />
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Autenticazione richiesta</p>
                  </div>
                  <div className="p-3 bg-purple-50/30 rounded-lg">
                    <p className="text-[12px] font-semibold text-purple-700 mb-1">{preStart.auth.auth_label || preStart.auth.auth_method}</p>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{preStart.auth.auth_description}</p>
                    <p className="text-[9px] text-[var(--text-muted)] mt-2 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />{preStart.auth.when_needed}
                    </p>
                  </div>
                </div>
              )}

              {/* ATECO block */}
              {preStart.ateco?.relevant && (
                <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="ateco-block">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4 text-[#0ABFCF]" strokeWidth={1.5} />
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Codice ATECO</p>
                  </div>
                  <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed mb-1">{preStart.ateco.reason}</p>
                  <p className="text-[11px] text-[#0ABFCF] font-medium">{preStart.ateco.guidance}</p>
                </div>
              )}

              {/* Who acts + proof summary */}
              <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="who-acts-block">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-3">Come funziona</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Herion prepara', active: preStart.who_acts_summary.herion_prepares, color: 'emerald' },
                    { label: 'Tu invii', active: preStart.who_acts_summary.user_submits, color: 'amber' },
                    { label: 'Firma richiesta', active: preStart.who_acts_summary.user_signs, color: 'amber' },
                    { label: 'Delega possibile', active: preStart.who_acts_summary.delegation_possible, color: 'blue' },
                  ].map((item, i) => (
                    <div key={i} className={`flex items-center gap-2 p-2 rounded-lg ${item.active ? `bg-${item.color}-50` : 'bg-[var(--bg-app)]'}`}>
                      {item.active ? <Check className={`w-3 h-3 text-${item.color}-500`} /> : <X className="w-3 h-3 text-[var(--text-muted)]" />}
                      <span className={`text-[10px] font-medium ${item.active ? `text-${item.color}-700` : 'text-[var(--text-muted)]'}`}>{item.label}</span>
                    </div>
                  ))}
                </div>
                {preStart.proof_expected && (
                  <div className="mt-3 p-2 bg-[var(--bg-app)] rounded-lg flex items-center gap-2">
                    <CircleDot className="w-3 h-3 text-[var(--text-muted)]" />
                    <span className="text-[10px] text-[var(--text-secondary)]">Ricevuta attesa: {preStart.proof_expected.label}</span>
                  </div>
                )}
              </div>

              {/* Readiness result */}
              <div className={`rounded-xl border-2 p-5 ${
                preStart.readiness.state === 'ready_to_start' ? 'bg-emerald-50/40 border-emerald-200' :
                preStart.readiness.state === 'ready_with_warnings' ? 'bg-amber-50/40 border-amber-200' :
                preStart.readiness.state === 'likely_wrong_practice' ? 'bg-amber-50/40 border-amber-300' :
                'bg-red-50/40 border-red-200'
              }`} data-testid="readiness-block">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: preStart.readiness.color }} />
                  <p className="text-[13px] font-bold" style={{ color: preStart.readiness.color }} data-testid="readiness-label">{preStart.readiness.label}</p>
                </div>
                <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed mb-3">{preStart.readiness.message}</p>
                {preStart.readiness.issues?.length > 0 && (
                  <div className="space-y-1.5">
                    {preStart.readiness.issues.map((issue, i) => (
                      <div key={i} className="flex items-start gap-2">
                        {issue.severity === 'warning' ? <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" /> :
                         <Info className="w-3 h-3 text-blue-400 flex-shrink-0 mt-0.5" />}
                        <p className={`text-[10px] ${issue.severity === 'warning' ? 'text-amber-700' : 'text-[var(--text-secondary)]'}`}>{issue.label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── DEPENDENCY & RISK BLOCK ── */}
              {preStart.dependencies?.has_dependencies && (
                <DependencyCard deps={preStart.dependencies} />
              )}

              {/* Actions */}
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => setPhase('select')} className="rounded-xl h-9 text-[11px] px-4" data-testid="back-to-select">
                  <ArrowLeft className="w-3 h-3 mr-1.5" />Cambia procedura
                </Button>
                {preStart.readiness.can_start && (
                  <Button onClick={() => setPhase('confirm')} className="bg-[var(--text-primary)] hover:bg-[#2a3040] text-white rounded-xl h-10 px-6 text-[12px] font-semibold" data-testid="go-to-confirm">
                    Continua <ArrowRight className="w-3.5 h-3.5 ml-2" />
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-[var(--text-muted)] text-[12px]">Seleziona una procedura per vedere la preparazione.</div>
          )}
        </div>
      )}

      {/* ═══ PHASE 3: CONFIRM ═══ */}
      {phase === 'confirm' && preStart && (
        <div className="space-y-4" data-testid="phase-confirm">
          <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-4">Dati della pratica</p>
            <div className="space-y-4">
              <div>
                <Label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Nome / Ragione sociale *</Label>
                <Input value={formData.client_name} onChange={e => setFormData({...formData, client_name: e.target.value})}
                  placeholder="Es: Mario Rossi / Rossi S.r.l." className="rounded-lg h-9 text-[12px] mt-1.5" style={{ borderColor: 'var(--border-soft)' }}
                  data-testid="client-name-input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Codice fiscale</Label>
                  <Input value={formData.fiscal_code} onChange={e => setFormData({...formData, fiscal_code: e.target.value.toUpperCase()})}
                    placeholder="RSSMRA85M01H501Z" className="rounded-lg h-9 text-[12px] mt-1.5 font-mono" style={{ borderColor: 'var(--border-soft)' }} maxLength={16}
                    data-testid="fiscal-code-input" />
                </div>
                {showVat && (
                  <div>
                    <Label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Partita IVA *</Label>
                    <Input value={formData.vat_number} onChange={e => setFormData({...formData, vat_number: e.target.value})}
                      placeholder="12345678901" className="rounded-lg h-9 text-[12px] mt-1.5 font-mono" style={{ borderColor: 'var(--border-soft)' }} maxLength={11}
                      data-testid="vat-number-input" />
                  </div>
                )}
              </div>
              <div>
                <Label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Note aggiuntive</Label>
                <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Dettagli o note sulla pratica..." className="rounded-lg text-[12px] mt-1.5 min-h-[80px] resize-none" style={{ borderColor: 'var(--border-soft)' }}
                  data-testid="description-input" />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-[var(--bg-app)] rounded-xl border p-4" style={{ borderColor: 'var(--border-soft)' }} data-testid="confirm-summary">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-2">Riepilogo</p>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between"><span className="text-[var(--text-muted)]">Procedura</span><span className="font-semibold text-[var(--text-primary)]">{preStart.orientation.practice_name}</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-muted)]">Tipo cliente</span><span className="font-semibold text-[var(--text-primary)]">{CLIENT_TYPES.find(c=>c.value===clientType)?.label}</span></div>
              {preStart.entity_direction && <div className="flex justify-between"><span className="text-[var(--text-muted)]">Ente</span><span className="font-semibold text-[var(--text-primary)]">{preStart.entity_direction.entity_name}</span></div>}
              {preStart.auth?.auth_method && <div className="flex justify-between"><span className="text-[var(--text-muted)]">Autenticazione</span><span className="font-semibold text-purple-600">{preStart.auth.auth_method}</span></div>}
              <div className="flex justify-between"><span className="text-[var(--text-muted)]">Documenti richiesti</span><span className="font-semibold text-[var(--text-primary)]">{preStart.readiness.mandatory_count}</span></div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setPhase('prepare')} className="rounded-xl h-9 text-[11px] px-4" data-testid="back-to-prepare">
              <ArrowLeft className="w-3 h-3 mr-1.5" />Preparazione
            </Button>
            <Button onClick={() => { if (!formData.client_name) { toast.error('Inserisci il nome del cliente'); return; } if (showVat && !formData.vat_number) { toast.error('Inserisci la Partita IVA'); return; } setShowConfirm(true); }}
              disabled={creating || !formData.client_name} className="bg-[#0ABFCF] hover:bg-[#09a8b6] text-white rounded-xl h-10 px-6 text-[12px] font-semibold" data-testid="submit-practice">
              {creating ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Creazione...</> : <>Crea pratica</>}
            </Button>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="rounded-xl shadow-xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-center">Conferma creazione</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[12px]">
              Stai per creare la pratica <span className="font-semibold text-[var(--text-primary)]">{preStart?.orientation?.practice_name}</span> per <span className="font-semibold text-[var(--text-primary)]">{formData.client_name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-lg flex-1 text-[12px]">Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreate} className="bg-[#0ABFCF] hover:bg-[#09a8b6] text-white rounded-lg flex-1 text-[12px]" data-testid="confirm-create-btn">Conferma</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


// ─── DEPENDENCY & RISK CARD ───

const OBLIGATION_STYLES = {
  mandatory: { bg: 'bg-red-50', text: 'text-red-700', label: 'Obbligatorio', dot: 'bg-red-400' },
  recommended: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Consigliato', dot: 'bg-blue-400' },
  conditional: { bg: 'bg-amber-50', text: 'text-amber-600', label: 'Condizionale', dot: 'bg-amber-400' },
};

const TIMING_LABELS = { before: 'Prima', during: 'Contestuale', after: 'Dopo' };

const RISK_STYLES = {
  high: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
  low: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100' },
};

function DependencyCard({ deps }) {
  if (!deps?.has_dependencies) return null;

  const { linked_obligations, risk_if_omitted, completion_integrity, mandatory_links, high_risks } = deps;

  return (
    <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="dependency-card">

      {/* Header */}
      <div className="px-5 py-3.5 bg-orange-50/40 border-b border-orange-100">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-orange-500" strokeWidth={1.5} />
          <p className="text-[11px] font-bold text-orange-800">Passaggi collegati e rischi</p>
          <div className="ml-auto flex items-center gap-2">
            {mandatory_links > 0 && <span className="text-[8px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{mandatory_links} obbligatori</span>}
            {high_risks > 0 && <span className="text-[8px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{high_risks} rischi alti</span>}
          </div>
        </div>
        <p className="text-[10px] text-orange-600/70 mt-1">Herion ti segnala i passaggi collegati per evitare omissioni.</p>
      </div>

      <div className="px-5 py-4 space-y-4">

        {/* Linked obligations */}
        {linked_obligations.length > 0 && (
          <div data-testid="linked-obligations-block">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] mb-2">Cosa non dimenticare</p>
            <div className="space-y-1.5">
              {linked_obligations.map((ob, i) => {
                const style = OBLIGATION_STYLES[ob.type] || OBLIGATION_STYLES.recommended;
                return (
                  <div key={i} className={`flex items-start gap-3 p-2.5 rounded-lg ${style.bg}`} data-testid={`obligation-${i}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${style.dot} flex-shrink-0 mt-1.5`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-[11px] font-semibold ${style.text}`}>{ob.label}</p>
                        <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded-full bg-white/60 ${style.text}`}>{style.label}</span>
                        <span className="text-[7px] text-[var(--text-muted)] ml-auto">{TIMING_LABELS[ob.when_needed] || ob.when_needed}</span>
                      </div>
                      <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">{ob.why_linked}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Risk block */}
        {risk_if_omitted.length > 0 && (
          <div data-testid="risk-block">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] mb-2">Rischi da evitare</p>
            <div className="space-y-1.5">
              {risk_if_omitted.map((risk, i) => {
                const style = RISK_STYLES[risk.severity] || RISK_STYLES.medium;
                return (
                  <div key={i} className={`p-2.5 rounded-lg border ${style.bg} ${style.border}`} data-testid={`risk-${i}`}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <ShieldAlert className={`w-3 h-3 ${style.text} flex-shrink-0`} />
                      <p className={`text-[10px] font-bold ${style.text}`}>{risk.label}</p>
                      <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded-full ${style.bg} ${style.text} border ${style.border} ml-auto`}>{risk.severity === 'high' ? 'Alto' : risk.severity === 'medium' ? 'Medio' : 'Basso'}</span>
                    </div>
                    <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">{risk.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Completion integrity */}
        {completion_integrity && (
          <div data-testid="completion-integrity-block">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] mb-2">Per completare davvero questa pratica</p>
            <div className="p-3 bg-[var(--bg-app)] rounded-lg">
              <div className="space-y-1">
                {completion_integrity.is_complete_only_if?.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CircleDot className="w-2.5 h-2.5 text-[var(--text-muted)] flex-shrink-0" />
                    <p className="text-[10px] text-[var(--text-primary)]">{item}</p>
                  </div>
                ))}
              </div>
              {completion_integrity.common_missing_steps?.length > 0 && (
                <div className="mt-2.5 pt-2.5 border-t" style={{ borderColor: 'var(--border-soft)' }}>
                  <p className="text-[9px] font-bold text-amber-600 mb-1">Passaggi spesso dimenticati:</p>
                  {completion_integrity.common_missing_steps.map((step, i) => (
                    <p key={i} className="text-[9px] text-amber-600/80 ml-3">• {step}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
