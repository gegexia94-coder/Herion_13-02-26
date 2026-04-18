import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/i18n/translations';
import { getPractices, deletePractice } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { FileText, Plus, Search, Trash2, Eye, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_CFG = {
  draft: { label: 'Non iniziata', color: '#5B6475' },
  waiting_user_documents: { label: 'Attesa documenti', color: '#F59E0B' },
  documents_received: { label: 'Documenti ricevuti', color: '#3B82F6' },
  internal_processing: { label: 'In revisione', color: '#3B82F6' },
  internal_validation_passed: { label: 'Revisione OK', color: '#10B981' },
  internal_validation_failed: { label: 'Problemi', color: '#EF4444' },
  waiting_user_review: { label: 'Verifica richiesta', color: '#F59E0B' },
  waiting_signature: { label: 'Attesa firma', color: '#F59E0B' },
  ready_for_submission: { label: 'Pronta invio', color: '#06B6D4' },
  submitted_manually: { label: 'Inviata', color: '#06B6D4' },
  submitted_via_channel: { label: 'Inviata', color: '#06B6D4' },
  waiting_external_response: { label: 'Attesa ente', color: '#8B5CF6' },
  accepted_by_entity: { label: 'Accettata', color: '#10B981' },
  rejected_by_entity: { label: 'Rifiutata', color: '#EF4444' },
  completed: { label: 'Completata', color: '#10B981' },
  blocked: { label: 'Bloccata', color: '#EF4444' },
  // Legacy
  pending: { label: 'In Attesa', color: '#F59E0B' },
  in_progress: { label: 'Elaborazione', color: '#3B82F6' },
  processing: { label: 'Elaborazione', color: '#3B82F6' },
  waiting_approval: { label: 'Verifica richiesta', color: '#F59E0B' },
  approved: { label: 'Approvata', color: '#10B981' },
  submitted: { label: 'Inviata', color: '#06B6D4' },
  escalated: { label: 'Escalation', color: '#EF4444' },
  rejected: { label: 'Rifiutata', color: '#EF4444' },
};

const PRIORITY_CFG = {
  urgent: { label: 'Urgente', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  high: { label: 'Alta', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  normal: { label: 'Normale', bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-400' },
  low: { label: 'Bassa', bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-300' },
};

export default function PracticesListPage() {
  const { lang } = useLanguage();
  const [practices, setPractices] = useState([]);
  const [filteredPractices, setFilteredPractices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, practice: null });

  useEffect(() => { loadPractices(); }, []);
  useEffect(() => { filterPractices(); }, [practices, searchTerm, statusFilter, typeFilter]);

  const loadPractices = async () => {
    try { const r = await getPractices(); setPractices(r.data); }
    catch (e) { console.warn('Practices fetch failed:', e?.message); }
    finally { setLoading(false); }
  };

  const filterPractices = () => {
    let filtered = [...practices];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => p.client_name.toLowerCase().includes(term) || p.description.toLowerCase().includes(term) || p.practice_type_label.toLowerCase().includes(term));
    }
    if (statusFilter !== 'all') filtered = filtered.filter(p => p.status === statusFilter);
    if (typeFilter !== 'all') filtered = filtered.filter(p => p.practice_type === typeFilter);
    setFilteredPractices(filtered);
  };

  const handleDelete = async () => {
    if (!deleteDialog.practice) return;
    try {
      await deletePractice(deleteDialog.practice.id);
      setPractices(practices.filter(p => p.id !== deleteDialog.practice.id));
      setDeleteDialog({ open: false, practice: null });
      toast.success('Pratica eliminata');
    } catch { toast.error("Errore nell'eliminazione"); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="w-5 h-5 animate-spin text-[var(--text-muted)]" /></div>;

  return (
    <div className="space-y-5" data-testid="practices-list-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">Pratiche</h1>
          <p className="text-[12px] text-[var(--text-secondary)]">{practices.length} pratiche totali</p>
        </div>
        <Link to="/practices/new">
          <Button className="bg-[var(--text-primary)] hover:bg-[#2a3040] rounded-lg text-[12px] font-semibold gap-2 h-9 px-5 w-full sm:w-auto" data-testid="create-practice-btn">
            <Plus className="w-3.5 h-3.5" /> Nuova Pratica
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <Input placeholder="Cerca cliente o descrizione..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 rounded-lg h-9 text-[12px]" style={{ borderColor: 'var(--border-soft)' }} data-testid="search-input" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36 rounded-lg h-9 text-[12px]" style={{ borderColor: 'var(--border-soft)' }} data-testid="status-filter"><SelectValue placeholder="Stato" /></SelectTrigger>
          <SelectContent className="rounded-lg">
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="draft">Non iniziata</SelectItem>
            <SelectItem value="waiting_user_documents">Attesa documenti</SelectItem>
            <SelectItem value="waiting_user_review">Verifica richiesta</SelectItem>
            <SelectItem value="ready_for_submission">Pronta invio</SelectItem>
            <SelectItem value="completed">Completata</SelectItem>
            <SelectItem value="blocked">Bloccata</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-36 rounded-lg h-9 text-[12px]" style={{ borderColor: 'var(--border-soft)' }} data-testid="type-filter"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent className="rounded-lg">
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="vat_registration">Apertura P.IVA</SelectItem>
            <SelectItem value="vat_closure">Chiusura P.IVA</SelectItem>
            <SelectItem value="tax_declaration">Dichiarazione</SelectItem>
            <SelectItem value="f24_payment">Versamento F24</SelectItem>
            <SelectItem value="other">Altra</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filteredPractices.length > 0 ? (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }}>
          {/* Table header — hidden on mobile */}
          <div className="hidden sm:grid grid-cols-[1fr_70px_100px_70px_80px] px-5 py-2.5 border-b text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]" style={{ borderColor: 'var(--border-soft)' }}>
            <span>Nome</span>
            <span>Priorita</span>
            <span>Stato</span>
            <span>Progresso</span>
            <span className="text-right">Azioni</span>
          </div>

          <div className="divide-y" style={{ borderColor: 'var(--border-soft)' }}>
            {filteredPractices.map((p, idx) => {
              const cfg = STATUS_CFG[p.status] || STATUS_CFG.draft;
              const pcfg = PRIORITY_CFG[p.priority] || PRIORITY_CFG.normal;
              const stepIdx = p.step_index ?? 0;
              const isBlocked = stepIdx === -1;
              return (
                <div key={p.id} data-testid={`practice-row-${idx}`}>
                  {/* Desktop row */}
                  <div className="hidden sm:grid grid-cols-[1fr_70px_100px_70px_80px] items-center px-5 py-3 hover:bg-[var(--hover-soft)] transition-colors">
                    <Link to={`/practices/${p.id}`} className="min-w-0">
                      <p className="text-[12px] font-semibold text-[var(--text-primary)] truncate">{p.client_name}</p>
                      <p className="text-[10px] text-[var(--text-muted)] truncate">{p.practice_type_label}</p>
                    </Link>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold ${pcfg.bg} ${pcfg.text}`} data-testid={`priority-${idx}`}>
                      <span className={`w-1 h-1 rounded-full ${pcfg.dot}`} />
                      {pcfg.label}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color: cfg.color }}>
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                      {cfg.label}
                    </span>
                    <div className="flex items-center gap-0.5" data-testid={`progress-${idx}`}>
                      {isBlocked ? (
                        <span className="text-[9px] font-bold text-red-500">!</span>
                      ) : (
                        [0,1,2,3,4,5].map(s => (
                          <div key={s} className={`h-1.5 flex-1 rounded-full max-w-[8px] ${
                            s < stepIdx ? 'bg-emerald-400' : s === stepIdx ? 'bg-[#0ABFCF]' : 'bg-[var(--border-soft)]'
                          }`} />
                        ))
                      )}
                    </div>
                    <div className="flex justify-end gap-0.5">
                      <Link to={`/practices/${p.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded" data-testid={`view-practice-${idx}`}><Eye className="w-3.5 h-3.5 text-[var(--text-secondary)]" /></Button>
                      </Link>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded hover:bg-red-50" onClick={() => setDeleteDialog({ open: true, practice: p })} data-testid={`delete-practice-${idx}`}>
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </Button>
                    </div>
                  </div>
                  {/* Mobile card */}
                  <Link to={`/practices/${p.id}`} className="sm:hidden flex items-center gap-3 px-4 py-3 hover:bg-[var(--hover-soft)] transition-colors">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-[var(--text-primary)] truncate">{p.client_name}</p>
                      <p className="text-[10px] text-[var(--text-muted)] truncate">{p.practice_type_label}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-bold ${pcfg.bg} ${pcfg.text}`}>{pcfg.label}</span>
                      <span className="text-[9px] font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border py-14 px-6 text-center" style={{ borderColor: 'var(--border-soft)' }}>
          <FileText className="w-7 h-7 text-[var(--text-muted)] mx-auto mb-2.5 opacity-30" strokeWidth={1.5} />
          {practices.length === 0 ? (
            <>
              <p className="text-[13px] font-semibold text-[var(--text-primary)]">{t('empty_practices_title', lang)}</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1 max-w-sm mx-auto">{t('empty_practices_desc', lang)}</p>
              <Link to="/practices/new"><Button className="mt-4 bg-[#0ABFCF] hover:bg-[#09a8b6] text-white rounded-xl text-[11px] font-semibold h-9 px-5" data-testid="empty-create-btn"><Plus className="w-3.5 h-3.5 mr-1.5" />{t('empty_practices_cta', lang)}</Button></Link>
            </>
          ) : (
            <>
              <p className="text-[13px] font-semibold text-[var(--text-primary)]">{t('empty_filter_title', lang)}</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">{t('empty_filter_desc', lang)}</p>
            </>
          )}
        </div>
      )}

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, practice: deleteDialog.practice })}>
        <AlertDialogContent className="rounded-xl shadow-xl max-w-sm" style={{ borderColor: 'var(--border-soft)' }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-center">Elimina pratica</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[var(--text-secondary)] text-[12px]">
              Eliminare <span className="font-semibold text-[var(--text-primary)]">"{deleteDialog.practice?.practice_type_label}"</span> per {deleteDialog.practice?.client_name}? Azione non reversibile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-lg flex-1 text-[12px]">Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 rounded-lg flex-1 text-[12px]" data-testid="confirm-delete-btn">Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
