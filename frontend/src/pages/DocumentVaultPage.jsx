import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVault, getVaultSummary, patchVaultDocument } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  Lock, FileText, Shield, CheckCircle, XCircle, Clock, AlertTriangle,
  Search, ChevronRight, Eye, Archive, ShieldCheck, Download, Loader2, Filter
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';

const CATEGORY_CONFIG = {
  identity: { label: 'Identita', icon: Shield, color: 'text-blue-600', bg: 'bg-blue-50' },
  tax: { label: 'Fiscale', icon: FileText, color: 'text-red-600', bg: 'bg-red-50' },
  company: { label: 'Aziendale', icon: Archive, color: 'text-violet-600', bg: 'bg-violet-50' },
  accounting: { label: 'Contabilita', icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  payment: { label: 'Pagamento', icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  delegation: { label: 'Delega', icon: Lock, color: 'text-amber-600', bg: 'bg-amber-50' },
  compliance: { label: 'Conformita', icon: ShieldCheck, color: 'text-teal-600', bg: 'bg-teal-50' },
  support_docs: { label: 'Supporto', icon: FileText, color: 'text-[#475569]', bg: 'bg-[#F1F5F9]' },
  generated_pdf: { label: 'PDF Generato', icon: Download, color: 'text-[#0A192F]', bg: 'bg-[#F0FAF8]' },
  receipt_protocol: { label: 'Ricevuta', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  final_dossier: { label: 'Dossier Finale', icon: Archive, color: 'text-[#0A192F]', bg: 'bg-[#F0FAF8]' },
  other: { label: 'Altro', icon: FileText, color: 'text-[#94A3B8]', bg: 'bg-[#F8F9FA]' },
};

const STATUS_CONFIG = {
  stored: { label: 'Archiviato', color: 'text-[#475569]', bg: 'bg-[#F1F5F9]' },
  linked: { label: 'Collegato', color: 'text-sky-600', bg: 'bg-sky-50' },
  under_review: { label: 'In revisione', color: 'text-amber-600', bg: 'bg-amber-50' },
  verified: { label: 'Verificato', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  rejected: { label: 'Rifiutato', color: 'text-red-600', bg: 'bg-red-50' },
  archived: { label: 'Archiviato', color: 'text-[#94A3B8]', bg: 'bg-[#F1F5F9]' },
  locked: { label: 'Bloccato', color: 'text-red-700', bg: 'bg-red-50' },
  ready_for_send: { label: 'Pronto invio', color: 'text-[#0A192F]', bg: 'bg-[#F0FAF8]' },
  sent: { label: 'Inviato', color: 'text-[#3B82F6]', bg: 'bg-[#F0FAF8]' },
  protected_output: { label: 'Output protetto', color: 'text-violet-600', bg: 'bg-violet-50' },
};

const SENSITIVITY_CONFIG = {
  low: { label: 'Basso', color: 'text-[#94A3B8]' },
  medium: { label: 'Medio', color: 'text-amber-600' },
  high: { label: 'Alto', color: 'text-orange-600' },
  critical: { label: 'Critico', color: 'text-red-600' },
};

const VERIFICATION_CONFIG = {
  pending: { label: 'In attesa', color: 'text-amber-600', bg: 'bg-amber-50' },
  verified: { label: 'Verificato', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  rejected: { label: 'Rifiutato', color: 'text-red-600', bg: 'bg-red-50' },
};

export default function DocumentVaultPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updating, setUpdating] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [vRes, sRes] = await Promise.all([getVault(), getVaultSummary()]);
      setDocs(vRes.data.documents || []);
      setSummary(sRes.data);
    } catch (e) { console.warn('Vault fetch failed:', e?.message); }
    finally { setLoading(false); }
  };

  const handleStatusUpdate = async (docId, newStatus) => {
    setUpdating(docId);
    try {
      await patchVaultDocument(docId, { vault_status: newStatus });
      toast.success('Stato documento aggiornato');
      loadData();
    } catch { toast.error('Errore nell\'aggiornamento'); }
    finally { setUpdating(null); }
  };

  const filtered = docs.filter(d => {
    if (search) {
      const q = search.toLowerCase();
      if (!d.original_filename?.toLowerCase().includes(q) && !d.practice_id?.toLowerCase().includes(q)) return false;
    }
    if (catFilter !== 'all' && d.category !== catFilter) return false;
    if (statusFilter !== 'all' && d.vault_status !== statusFilter) return false;
    return true;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A192F]" /></div>;

  const isAdmin = ['admin', 'creator'].includes(user?.role);

  return (
    <div className="space-y-6" data-testid="document-vault">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight mb-1">Archivio Documenti</h1>
        <p className="text-sm text-[#475569]">Custodia, verifica e protezione dei documenti</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            { label: 'Totali', value: summary.total, Icon: FileText, color: 'text-[#0A192F]' },
            { label: 'Verificati', value: summary.verified, Icon: CheckCircle, color: 'text-emerald-600' },
            { label: 'Da verificare', value: summary.pending_review, Icon: Clock, color: 'text-amber-600' },
            { label: 'Rifiutati', value: summary.rejected, Icon: XCircle, color: 'text-red-600' },
            { label: 'Alta sensibilita', value: summary.high_sensitivity, Icon: Shield, color: 'text-orange-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-[#E2E8F0] p-3 flex items-center gap-2.5">
              <s.Icon className={`w-4 h-4 ${s.color}`} strokeWidth={1.5} />
              <div>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[9px] text-[#94A3B8] font-medium">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search + Filters */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <Input placeholder="Cerca documento..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl border-[#E2E8F0] h-10 text-sm" data-testid="vault-search" />
          </div>
          <div className="flex gap-1 flex-wrap">
            {[{ key: 'all', label: 'Tutte' }, ...Object.entries(CATEGORY_CONFIG).slice(0, 6).map(([k, v]) => ({ key: k, label: v.label }))].map(tab => (
              <button key={tab.key} onClick={() => setCatFilter(tab.key)}
                className={`px-2.5 py-1.5 rounded-full text-[10px] font-medium transition-all ${catFilter === tab.key ? 'bg-[#0A192F] text-white' : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'}`}
                data-testid={`cat-${tab.key}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <p className="text-xs text-[#94A3B8]">{filtered.length} documenti trovati</p>

      {/* Document List */}
      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map(doc => {
            const cat = CATEGORY_CONFIG[doc.category] || CATEGORY_CONFIG.other;
            const vs = STATUS_CONFIG[doc.vault_status] || STATUS_CONFIG.stored;
            const sens = SENSITIVITY_CONFIG[doc.sensitivity_level] || SENSITIVITY_CONFIG.medium;
            const ver = VERIFICATION_CONFIG[doc.verification_status] || VERIFICATION_CONFIG.pending;
            const CatIcon = cat.icon;

            return (
              <div key={doc.id} className="bg-white rounded-xl border border-[#E2E8F0] p-3.5 hover:shadow-md hover:border-[#CBD5E1] transition-all group" data-testid={`vault-doc-${doc.id}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl ${cat.bg} flex items-center justify-center flex-shrink-0`}>
                    <CatIcon className={`w-4 h-4 ${cat.color}`} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#0F172A] truncate">{doc.original_filename}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${cat.bg} ${cat.color}`}>{cat.label}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${vs.bg} ${vs.color}`}>{vs.label}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${ver.bg} ${ver.color}`}>{ver.label}</span>
                      <span className={`text-[9px] ${sens.color}`}>Sensibilita: {sens.label}</span>
                      {doc.practice_id && <span className="text-[9px] text-[#94A3B8]">Pratica: {doc.practice_id.slice(0, 8)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {doc.created_at && <span className="text-[9px] text-[#94A3B8] hidden md:block">{format(new Date(doc.created_at), 'dd/MM/yy', { locale: it })}</span>}
                    {isAdmin && doc.vault_status === 'stored' && (
                      <button onClick={() => handleStatusUpdate(doc.id, 'verified')} disabled={updating === doc.id}
                        className="text-[9px] px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-medium hover:bg-emerald-100 transition-colors disabled:opacity-50 flex items-center gap-0.5"
                        data-testid={`verify-${doc.id}`}>
                        {updating === doc.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <CheckCircle className="w-2.5 h-2.5" />}Verifica
                      </button>
                    )}
                    {doc.practice_id && (
                      <button onClick={() => navigate(`/practices/${doc.practice_id}`)}
                        className="p-1.5 rounded-lg hover:bg-[#F1F5F9] transition-colors">
                        <ChevronRight className="w-3.5 h-3.5 text-[#CBD5E1] group-hover:text-[#0A192F]" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] text-center py-16">
          <Lock className="w-10 h-10 text-[#CBD5E1] mx-auto mb-3" strokeWidth={1.5} />
          <h3 className="text-base font-semibold text-[#0F172A] mb-1">Nessun documento</h3>
          <p className="text-sm text-[#475569]">L'archivio e vuoto o i filtri non restituiscono risultati</p>
        </div>
      )}
    </div>
  );
}
