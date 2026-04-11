import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPractices, deletePractice } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { FileText, Plus, Search, Trash2, Eye, AlertTriangle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';

const STATUS_CFG = {
  draft: { label: 'Bozza', color: '#5B6475' },
  pending: { label: 'In Attesa', color: '#F59E0B' },
  in_progress: { label: 'Elaborazione', color: '#3B82F6' },
  processing: { label: 'Elaborazione', color: '#3B82F6' },
  waiting_approval: { label: 'Approvazione', color: '#F59E0B' },
  approved: { label: 'Approvata', color: '#10B981' },
  submitted: { label: 'Inviata', color: '#06B6D4' },
  completed: { label: 'Completata', color: '#10B981' },
  blocked: { label: 'Bloccata', color: '#EF4444' },
  escalated: { label: 'Escalation', color: '#EF4444' },
  rejected: { label: 'Rifiutata', color: '#EF4444' },
};

export default function PracticesListPage() {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">Pratiche</h1>
          <p className="text-[12px] text-[var(--text-secondary)]">{practices.length} pratiche totali</p>
        </div>
        <Link to="/practices/new">
          <Button className="bg-[var(--text-primary)] hover:bg-[#2a3040] rounded-lg text-[12px] font-semibold gap-2 h-9 px-5" data-testid="create-practice-btn">
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
            <SelectItem value="draft">Bozza</SelectItem>
            <SelectItem value="in_progress">Elaborazione</SelectItem>
            <SelectItem value="waiting_approval">Approvazione</SelectItem>
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
          {/* Table header */}
          <div className="grid grid-cols-[1fr_120px_80px] sm:grid-cols-[1fr_120px_100px_80px] px-5 py-2.5 border-b text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]" style={{ borderColor: 'var(--border-soft)' }}>
            <span>Nome</span>
            <span>Stato</span>
            <span className="hidden sm:block">Data</span>
            <span className="text-right">Azioni</span>
          </div>

          <div className="divide-y" style={{ borderColor: 'var(--border-soft)' }}>
            {filteredPractices.map((p, idx) => {
              const cfg = STATUS_CFG[p.status] || STATUS_CFG.draft;
              return (
                <div key={p.id} className="grid grid-cols-[1fr_120px_80px] sm:grid-cols-[1fr_120px_100px_80px] items-center px-5 py-3 hover:bg-[var(--hover-soft)] transition-colors" data-testid={`practice-row-${idx}`}>
                  <Link to={`/practices/${p.id}`} className="min-w-0">
                    <p className="text-[12px] font-semibold text-[var(--text-primary)] truncate">{p.client_name}</p>
                    <p className="text-[10px] text-[var(--text-muted)] truncate">{p.practice_type_label}</p>
                  </Link>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color: cfg.color }}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                    {cfg.label}
                  </span>
                  <span className="hidden sm:block text-[10px] text-[var(--text-muted)]">{format(new Date(p.created_at), 'dd MMM yy', { locale: it })}</span>
                  <div className="flex justify-end gap-0.5">
                    <Link to={`/practices/${p.id}`}>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded" data-testid={`view-practice-${idx}`}><Eye className="w-3.5 h-3.5 text-[var(--text-secondary)]" /></Button>
                    </Link>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded hover:bg-red-50" onClick={() => setDeleteDialog({ open: true, practice: p })} data-testid={`delete-practice-${idx}`}>
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border text-center py-14" style={{ borderColor: 'var(--border-soft)' }}>
          <FileText className="w-7 h-7 text-[var(--text-muted)] mx-auto mb-2 opacity-40" strokeWidth={1.5} />
          <p className="text-[13px] font-medium text-[var(--text-primary)]">Nessuna pratica trovata</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">{practices.length === 0 ? 'Inizia creando la tua prima pratica.' : 'Nessun risultato per i filtri selezionati.'}</p>
          {practices.length === 0 && (
            <Link to="/practices/new"><Button className="mt-4 bg-[var(--text-primary)] hover:bg-[#2a3040] rounded-lg text-[12px]" data-testid="empty-create-btn"><Plus className="w-3.5 h-3.5 mr-1.5" />Crea Prima Pratica</Button></Link>
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
