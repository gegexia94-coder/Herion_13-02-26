import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, Activity, AlertTriangle, Clock, CheckCircle, XCircle, TrendingUp, Users, FileText, Eye, Bot, Sparkles, BarChart3, Lock } from 'lucide-react';
import api from '@/services/api';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function CreatorControlRoom() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.is_creator) { navigate('/dashboard'); return; }
    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    try {
      const [s] = await Promise.all([api.get('/dashboard/stats')]);
      setStats(s.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (!user?.is_creator) return null;
  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F4C5C]" /></div>;

  return (
    <div className="space-y-6" data-testid="creator-control-room">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-[#0F4C5C] flex items-center justify-center">
          <Shield className="w-5 h-5 text-[#5DD9C1]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Herion Creator Control Room</h1>
          <p className="text-xs text-[#475569]">Area riservata al fondatore. Visibilita completa su sistema, agenti e operazioni.</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[9px] px-2 py-0.5 bg-[#0F4C5C]/10 text-[#0F4C5C] rounded-full font-bold uppercase tracking-wider">Creator</span>
          <span className="text-[9px] px-2 py-0.5 bg-[#5DD9C1]/10 text-[#0F4C5C] rounded-full font-medium">{user?.creator_uuid}</span>
        </div>
      </div>

      {/* System Overview */}
      <div className="bg-[#0F4C5C] rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Ccircle cx='20' cy='20' r='1.5'/%3E%3C/g%3E%3C/svg%3E")`}} />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-4 h-4 text-[#5DD9C1]" />
            <h3 className="text-sm font-bold">Panoramica Sistema</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-white/5 rounded-xl">
              <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Pratiche Totali</p>
              <p className="text-2xl font-bold">{stats?.total_practices || 0}</p>
            </div>
            <div className="p-3 bg-white/5 rounded-xl">
              <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">In Attesa Approvazione</p>
              <p className="text-2xl font-bold text-amber-300">{stats?.waiting_approval || 0}</p>
            </div>
            <div className="p-3 bg-white/5 rounded-xl">
              <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Completate</p>
              <p className="text-2xl font-bold text-[#5DD9C1]">{stats?.completed || 0}</p>
            </div>
            <div className="p-3 bg-white/5 rounded-xl">
              <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Bloccate / Escalation</p>
              <p className="text-2xl font-bold text-red-300">{stats?.blocked || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Agent Architecture */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-4 h-4 text-[#0F4C5C]" />
            <h3 className="text-sm font-bold text-[#0F172A]">Architettura Agenti</h3>
          </div>
          <div className="space-y-2">
            {[
              { name: 'Father Agent', role: 'Supervisore supremo', color: 'bg-[#0F4C5C]' },
              { name: 'Herion Intake', role: 'Raccolta e classificazione', color: 'bg-sky-500' },
              { name: 'Herion Ledger', role: 'Contabilita e finanza', color: 'bg-indigo-500' },
              { name: 'Herion Compliance', role: 'Conformita normativa', color: 'bg-amber-500' },
              { name: 'Herion Documents', role: 'Documenti e verifica', color: 'bg-emerald-500' },
              { name: 'Herion Delegate', role: 'Delega e autorizzazioni', color: 'bg-violet-500' },
              { name: 'Herion Deadline', role: 'Scadenze e tempistiche', color: 'bg-rose-500' },
              { name: 'Herion Flow', role: 'Gestione flusso', color: 'bg-cyan-500' },
              { name: 'Herion Routing', role: 'Canale e destinazione', color: 'bg-teal-500' },
              { name: 'Herion Research', role: 'Ricerca fonti ufficiali', color: 'bg-blue-500' },
              { name: 'Herion Monitor', role: 'Monitoraggio operativo', color: 'bg-orange-500' },
              { name: 'Herion Advisor', role: 'Spiegazione finale', color: 'bg-purple-500' },
            ].map((a, i) => (
              <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-[#F7FAFC] transition-colors">
                <div className={`w-2 h-2 rounded-full ${a.color}`} />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-[#0F172A]">{a.name}</p>
                  <p className="text-[9px] text-[#475569]">{a.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Operational Status */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-[#0F4C5C]" />
            <h3 className="text-sm font-bold text-[#0F172A]">Stato Operativo</h3>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-[#F7FAFC] rounded-xl border border-[#E2E8F0]">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Sistema</p>
                <span className="text-[9px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-medium">Attivo</span>
              </div>
              <p className="text-xs text-[#0F172A]">Piattaforma di esecuzione controllata operativa</p>
            </div>
            <div className="p-3 bg-[#F7FAFC] rounded-xl border border-[#E2E8F0]">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Agenti</p>
                <span className="text-[9px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-medium">12 attivi</span>
              </div>
              <p className="text-xs text-[#0F172A]">Tutti gli agenti specializzati operativi</p>
            </div>
            <div className="p-3 bg-[#F7FAFC] rounded-xl border border-[#E2E8F0]">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Catalogo</p>
                <span className="text-[9px] px-1.5 py-0.5 bg-sky-50 text-sky-700 rounded-full font-medium">20 pratiche</span>
              </div>
              <p className="text-xs text-[#0F172A]">Catalogo servizi con registro enti</p>
            </div>
            <div className="p-3 bg-[#F7FAFC] rounded-xl border border-[#E2E8F0]">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Approvazione</p>
                <span className="text-[9px] px-1.5 py-0.5 bg-[#0F4C5C]/10 text-[#0F4C5C] rounded-full font-medium">Gate attivo</span>
              </div>
              <p className="text-xs text-[#0F172A]">Nessuna esecuzione senza approvazione esplicita</p>
            </div>
          </div>
        </div>

        {/* Creator Insights */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-[#0F4C5C]" />
            <h3 className="text-sm font-bold text-[#0F172A]">Insights Fondatore</h3>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100">
              <p className="text-[10px] font-semibold text-amber-700 mb-0.5">Prossimo passo strategico</p>
              <p className="text-xs text-[#475569]">Integrare un provider email reale per abilitare comunicazioni operative complete.</p>
            </div>
            <div className="p-3 bg-sky-50/50 rounded-xl border border-sky-100">
              <p className="text-[10px] font-semibold text-sky-700 mb-0.5">Opportunita</p>
              <p className="text-xs text-[#475569]">Il catalogo di 20 pratiche copre i casi piu comuni. Espandere a 120+ per massimizzare il valore.</p>
            </div>
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
              <p className="text-[10px] font-semibold text-emerald-700 mb-0.5">Stato piattaforma</p>
              <p className="text-xs text-[#475569]">Flusso controllato con approvazione esplicita. Registro enti e catalogo pratiche attivi.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Security */}
      <div className="p-4 bg-[#0F4C5C]/[0.03] border border-[#0F4C5C]/10 rounded-2xl flex items-start gap-3">
        <Lock className="w-4 h-4 text-[#0F4C5C] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-[#0F172A] mb-0.5">Area Riservata</p>
          <p className="text-[10px] text-[#475569]">Questa sezione e accessibile esclusivamente al Creator. Nessun admin o utente standard puo accedere a questa area. Tutte le azioni del Creator sono registrate.</p>
        </div>
      </div>
    </div>
  );
}
