import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPractices, deletePractice } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  FileText, 
  Plus, 
  Search,
  Trash2,
  Eye,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';

export default function PracticesListPage() {
  const [practices, setPractices] = useState([]);
  const [filteredPractices, setFilteredPractices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, practice: null });

  useEffect(() => {
    loadPractices();
  }, []);

  useEffect(() => {
    filterPractices();
  }, [practices, searchTerm, statusFilter, typeFilter]);

  const loadPractices = async () => {
    try {
      const response = await getPractices();
      setPractices(response.data);
    } catch (error) {
      console.error('Error loading practices:', error);
      toast.error('Errore nel caricamento delle pratiche');
    } finally {
      setLoading(false);
    }
  };

  const filterPractices = () => {
    let filtered = [...practices];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.client_name.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        p.practice_type_label.toLowerCase().includes(term)
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter(p => p.practice_type === typeFilter);
    }
    
    setFilteredPractices(filtered);
  };

  const handleDelete = async () => {
    if (!deleteDialog.practice) return;
    
    try {
      await deletePractice(deleteDialog.practice.id);
      setPractices(practices.filter(p => p.id !== deleteDialog.practice.id));
      setDeleteDialog({ open: false, practice: null });
      toast.success('Pratica eliminata', {
        description: 'La pratica è stata eliminata con successo'
      });
    } catch (error) {
      console.error('Error deleting practice:', error);
      toast.error('Errore nell\'eliminazione della pratica');
    }
  };

  const getStatusBadge = (status, label) => {
    const variants = {
      'draft': 'bg-slate-50 text-slate-700 border-slate-200',
      'pending': 'bg-amber-50 text-amber-700 border-amber-200',
      'in_progress': 'bg-sky-50 text-sky-700 border-sky-200',
      'processing': 'bg-sky-50 text-sky-700 border-sky-200',
      'waiting_approval': 'bg-[#0A192F]/5 text-[#0A192F] border-[#0A192F]/20',
      'approved': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'submitted': 'bg-blue-50 text-blue-700 border-blue-200',
      'completed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'blocked': 'bg-red-50 text-red-700 border-red-200',
      'escalated': 'bg-red-50 text-red-700 border-red-200',
      'rejected': 'bg-red-50 text-red-700 border-red-200'
    };
    return <span className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${variants[status] || variants.draft}`}>{label}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A192F]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="practices-list-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight mb-1">Pratiche</h1>
          <p className="text-sm text-[#475569]">Gestisci tutte le tue pratiche fiscali</p>
        </div>
        <Link to="/practices/new">
          <Button className="bg-[#0A192F] hover:bg-[#0A192F]/90 rounded-xl shadow-lg shadow-[#0A192F]/20" data-testid="create-practice-btn">
            <Plus className="w-4 h-4 mr-2" />
            Nuova Pratica
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A19E]" />
            <Input
              placeholder="Cerca per cliente o descrizione..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-xl border-[#E5E5E3] h-11"
              data-testid="search-input"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-44 rounded-xl border-[#E5E5E3] h-11" data-testid="status-filter">
              <SelectValue placeholder="Stato" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Tutti gli stati</SelectItem>
              <SelectItem value="pending">In Attesa</SelectItem>
              <SelectItem value="processing">In Elaborazione</SelectItem>
              <SelectItem value="completed">Completata</SelectItem>
              <SelectItem value="rejected">Rifiutata</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-44 rounded-xl border-[#E5E5E3] h-11" data-testid="type-filter">
              <SelectValue placeholder="Tipo pratica" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Tutti i tipi</SelectItem>
              <SelectItem value="vat_registration">Apertura P.IVA</SelectItem>
              <SelectItem value="vat_closure">Chiusura P.IVA</SelectItem>
              <SelectItem value="tax_declaration">Dichiarazione Redditi</SelectItem>
              <SelectItem value="f24_payment">Versamento F24</SelectItem>
              <SelectItem value="inps_registration">Iscrizione INPS</SelectItem>
              <SelectItem value="other">Altra Pratica</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Practices List */}
      {filteredPractices.length > 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5E5E3]/60 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-[#FAFAFA] border-b border-[#E5E5E3]/60">
                <th className="text-left text-xs uppercase tracking-wider font-medium text-[#5C5C59] px-6 py-4">Tipo Pratica</th>
                <th className="text-left text-xs uppercase tracking-wider font-medium text-[#5C5C59] px-6 py-4">Cliente</th>
                <th className="text-left text-xs uppercase tracking-wider font-medium text-[#5C5C59] px-6 py-4 hidden md:table-cell">Data</th>
                <th className="text-left text-xs uppercase tracking-wider font-medium text-[#5C5C59] px-6 py-4">Stato</th>
                <th className="text-right text-xs uppercase tracking-wider font-medium text-[#5C5C59] px-6 py-4">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E3]/60">
              {filteredPractices.map((practice, index) => (
                <tr key={practice.id} className="hover:bg-[#FAFAFA] transition-colors" data-testid={`practice-row-${index}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#0A192F]/5 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-[#0A192F]" />
                      </div>
                      <div>
                        <p className="font-medium text-[#111110] text-sm">{practice.practice_type_label}</p>
                        <p className="text-xs text-[#5C5C59] truncate max-w-[180px]">{practice.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-[#111110]">{practice.client_name}</p>
                    {practice.fiscal_code && (
                      <p className="text-xs text-[#5C5C59] font-mono">{practice.fiscal_code}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <div className="flex items-center gap-2 text-sm text-[#5C5C59]">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(practice.created_at), 'dd MMM yyyy', { locale: it })}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(practice.status, practice.status_label)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link to={`/practices/${practice.id}`}>
                        <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl hover:bg-[#0A192F]/5" data-testid={`view-practice-${index}`}>
                          <Eye className="w-4 h-4 text-[#0A192F]" />
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-9 w-9 p-0 rounded-xl hover:bg-red-50"
                        onClick={() => setDeleteDialog({ open: true, practice })}
                        data-testid={`delete-practice-${index}`}
                      >
                        <Trash2 className="w-4 h-4 text-[#E63946]" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E5E3]/60 text-center py-16 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-[#F5F5F4] flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-[#A1A19E]" />
          </div>
          <h3 className="text-lg font-medium text-[#111110] mb-2">Nessuna pratica trovata</h3>
          <p className="text-sm text-[#5C5C59] mb-6 max-w-sm mx-auto">
            {practices.length === 0 
              ? 'Inizia creando la tua prima pratica fiscale.'
              : 'Nessuna pratica corrisponde ai filtri selezionati.'
            }
          </p>
          {practices.length === 0 && (
            <Link to="/practices/new">
              <Button className="bg-[#0A192F] hover:bg-[#0A192F]/90 rounded-xl" data-testid="empty-create-btn">
                <Plus className="w-4 h-4 mr-2" />
                Crea Prima Pratica
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, practice: deleteDialog.practice })}>
        <AlertDialogContent className="rounded-2xl border-[#E5E5E3]/60 shadow-2xl max-w-md">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-[#E63946]" />
            </div>
            <AlertDialogTitle className="text-xl font-semibold text-center">Elimina pratica</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[#5C5C59]">
              Sei sicuro di voler eliminare la pratica <span className="font-medium text-[#111110]">"{deleteDialog.practice?.practice_type_label}"</span> per <span className="font-medium text-[#111110]">{deleteDialog.practice?.client_name}</span>? 
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 sm:gap-3">
            <AlertDialogCancel className="rounded-xl border-[#E5E5E3] hover:bg-[#F5F5F4] flex-1">
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-[#E63946] hover:bg-[#E63946]/90 rounded-xl flex-1"
              data-testid="confirm-delete-btn"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
