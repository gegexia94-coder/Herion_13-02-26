import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getPractices } from '@/services/api';
import { Input } from '@/components/ui/input';
import { Search, FileText, ArrowRight, RefreshCw } from 'lucide-react';

const PRIORITY_CFG = {
  urgent: { label: 'Urgente', bg: 'bg-red-50', text: 'text-red-700' },
  high: { label: 'Alta', bg: 'bg-amber-50', text: 'text-amber-700' },
  normal: { label: 'Normale', bg: 'bg-sky-50', text: 'text-sky-700' },
  low: { label: 'Bassa', bg: 'bg-gray-50', text: 'text-gray-500' },
};

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [practices, setPractices] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPractices().then(r => { setPractices(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const search = useCallback((q) => {
    if (!q.trim()) { setResults([]); return; }
    const term = q.toLowerCase();
    setResults(practices.filter(p =>
      p.client_name?.toLowerCase().includes(term) ||
      p.practice_type_label?.toLowerCase().includes(term) ||
      p.description?.toLowerCase().includes(term) ||
      p.fiscal_code?.toLowerCase().includes(term) ||
      p.vat_number?.toLowerCase().includes(term)
    ));
  }, [practices]);

  useEffect(() => { search(query); }, [query, search]);

  return (
    <div className="space-y-6" data-testid="search-page">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Ricerca</h1>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1">Cerca tra pratiche, clienti e documenti</p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Cerca per nome cliente, tipo pratica, codice fiscale..."
          className="pl-12 h-12 rounded-xl text-[14px] bg-white shadow-sm"
          style={{ borderColor: 'var(--border-soft)' }}
          autoFocus
          data-testid="search-input"
        />
      </div>

      {loading && <div className="flex justify-center py-12"><RefreshCw className="w-5 h-5 animate-spin text-[var(--text-muted)]" /></div>}

      {!loading && query && results.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3 opacity-40" strokeWidth={1.5} />
          <p className="text-[14px] text-[var(--text-secondary)]">Nessun risultato per "{query}"</p>
          <p className="text-[12px] text-[var(--text-muted)] mt-1">Prova con un termine diverso</p>
        </div>
      )}

      {!loading && !query && (
        <div className="text-center py-12">
          <Search className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3 opacity-40" strokeWidth={1.5} />
          <p className="text-[14px] text-[var(--text-secondary)]">Inizia a scrivere per cercare</p>
          <p className="text-[12px] text-[var(--text-muted)] mt-1">Puoi cercare per nome cliente, tipo pratica, codice fiscale o partita IVA</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }}>
          <p className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] border-b" style={{ borderColor: 'var(--border-soft)' }}>
            {results.length} risultat{results.length === 1 ? 'o' : 'i'}
          </p>
          <div className="divide-y" style={{ borderColor: 'var(--border-soft)' }}>
            {results.map(p => {
              const pcfg = PRIORITY_CFG[p.priority] || PRIORITY_CFG.normal;
              return (
                <Link key={p.id} to={`/practices/${p.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-[var(--hover-soft)] transition-colors" data-testid={`search-result-${p.id}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" strokeWidth={1.5} />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{p.client_name}</p>
                      <p className="text-[11px] text-[var(--text-muted)] truncate">{p.practice_type_label} &middot; {p.country}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${pcfg.bg} ${pcfg.text}`}>{pcfg.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
