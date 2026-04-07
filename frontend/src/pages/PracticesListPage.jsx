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
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

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
    } catch (error) {
      console.error('Error deleting practice:', error);
    }
  };

  const getStatusBadge = (status, label) => {
    const variants = {
      'pending': 'status-pending',
      'processing': 'status-processing',
      'completed': 'status-completed',
      'rejected': 'status-rejected'
    };
    return <span className={`status-tag ${variants[status] || 'status-pending'}`}>{label}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F4C5C]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="practices-list-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="heading-2 mb-1">Pratiche</h1>
          <p className="body-text">Gestisci tutte le tue pratiche fiscali</p>
        </div>
        <Link to="/practices/new">
          <Button className="bg-[#0F4C5C] hover:bg-[#0F4C5C]/90 rounded-sm" data-testid="create-practice-btn">
            <Plus className="w-4 h-4 mr-2" />
            Nuova Pratica
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="aic-card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A19E]" />
            <Input
              placeholder="Cerca per cliente o descrizione..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-[#E5E5E3] rounded-sm"
              data-testid="search-input"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48 border-[#E5E5E3] rounded-sm" data-testid="status-filter">
              <SelectValue placeholder="Stato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli stati</SelectItem>
              <SelectItem value="pending">In Attesa</SelectItem>
              <SelectItem value="processing">In Elaborazione</SelectItem>
              <SelectItem value="completed">Completata</SelectItem>
              <SelectItem value="rejected">Rifiutata</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-48 border-[#E5E5E3] rounded-sm" data-testid="type-filter">
              <SelectValue placeholder="Tipo pratica" />
            </SelectTrigger>
            <SelectContent>
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
        <div className="aic-card overflow-hidden p-0">
          <table className="aic-table">
            <thead>
              <tr className="bg-[#F9F9F8]">
                <th className="px-6 pt-4">Tipo Pratica</th>
                <th className="px-6 pt-4">Cliente</th>
                <th className="px-6 pt-4 hidden md:table-cell">Data Creazione</th>
                <th className="px-6 pt-4">Stato</th>
                <th className="px-6 pt-4 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredPractices.map((practice, index) => (
                <tr key={practice.id} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }} data-testid={`practice-row-${index}`}>
                  <td className="px-6">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-[#5C5C59]" />
                      <div>
                        <p className="font-medium text-[#111110]">{practice.practice_type_label}</p>
                        <p className="text-xs text-[#5C5C59] truncate max-w-[200px]">{practice.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6">
                    <p className="text-[#111110]">{practice.client_name}</p>
                    {practice.fiscal_code && (
                      <p className="text-xs text-[#5C5C59] font-mono">{practice.fiscal_code}</p>
                    )}
                  </td>
                  <td className="px-6 hidden md:table-cell">
                    <div className="flex items-center gap-2 text-sm text-[#5C5C59]">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(practice.created_at), 'dd MMM yyyy', { locale: it })}
                    </div>
                  </td>
                  <td className="px-6">
                    {getStatusBadge(practice.status, practice.status_label)}
                  </td>
                  <td className="px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/practices/${practice.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid={`view-practice-${index}`}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-[#E63946] hover:text-[#E63946] hover:bg-[#E63946]/10"
                        onClick={() => setDeleteDialog({ open: true, practice })}
                        data-testid={`delete-practice-${index}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="aic-card text-center py-12">
          <FileText className="w-16 h-16 text-[#A1A19E] mx-auto mb-4" />
          <h3 className="heading-4 mb-2">Nessuna pratica trovata</h3>
          <p className="body-text mb-6">
            {practices.length === 0 
              ? 'Inizia creando la tua prima pratica fiscale.'
              : 'Nessuna pratica corrisponde ai filtri selezionati.'
            }
          </p>
          {practices.length === 0 && (
            <Link to="/practices/new">
              <Button className="bg-[#0F4C5C] hover:bg-[#0F4C5C]/90 rounded-sm" data-testid="empty-create-btn">
                <Plus className="w-4 h-4 mr-2" />
                Crea Prima Pratica
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, practice: deleteDialog.practice })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare la pratica "{deleteDialog.practice?.practice_type_label}" per {deleteDialog.practice?.client_name}? 
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-[#E63946] hover:bg-[#E63946]/90"
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
