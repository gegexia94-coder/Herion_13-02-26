import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardStats, getNotifications, markAllNotificationsRead, getReminders } from '@/services/api';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText, Plus, Clock, CheckCircle, Bell, ArrowRight, Sparkles, Shield, Zap,
  Calendar, ChevronLeft, ChevronRight, AlertTriangle, FileCheck, Megaphone, Globe,
  TrendingUp, Mail,
} from 'lucide-react';

const REMINDER_ICONS = { deadlines: Calendar, declarations: FileCheck, vat_reminders: AlertTriangle, document_preparation: FileText, country_notices: Globe, platform_updates: Megaphone };
const REMINDER_COLORS = {
  deadlines: { icon: 'text-[#FF6B6B]', bg: 'bg-[#FF6B6B]/10' },
  declarations: { icon: 'text-[#F59E0B]', bg: 'bg-[#F59E0B]/10' },
  vat_reminders: { icon: 'text-[#FF6B6B]', bg: 'bg-[#FF6B6B]/10' },
  document_preparation: { icon: 'text-[#3B82F6]', bg: 'bg-[#3B82F6]/10' },
  country_notices: { icon: 'text-[#8B5CF6]', bg: 'bg-[#8B5CF6]/10' },
  platform_updates: { icon: 'text-[#06B6D4]', bg: 'bg-[#06B6D4]/10' },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentReminder, setCurrentReminder] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (reminders.length > 1) {
      timerRef.current = setInterval(() => setCurrentReminder(c => (c + 1) % reminders.length), 6000);
      return () => clearInterval(timerRef.current);
    }
  }, [reminders.length]);

  const loadData = async () => {
    try {
      const [s, n, r] = await Promise.all([getDashboardStats(), getNotifications(), getReminders()]);
      setStats(s.data); setNotifications(n.data); setReminders(r.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleMarkAllRead = async () => {
    try { await markAllNotificationsRead(); setNotifications(notifications.map(n => ({ ...n, read: true }))); } catch {}
  };

  const prevReminder = () => { clearInterval(timerRef.current); setCurrentReminder(c => (c - 1 + reminders.length) % reminders.length); };
  const nextReminder = () => { clearInterval(timerRef.current); setCurrentReminder(c => (c + 1) % reminders.length); };

  const statusBadge = (status) => {
    const v = {
      'Bozza': 'bg-slate-50 text-slate-600 border-slate-200',
      'In Attesa': 'bg-[#F59E0B]/10 text-[#B45309] border-[#F59E0B]/20',
      'In Elaborazione': 'bg-[#3B82F6]/10 text-[#1D4ED8] border-[#3B82F6]/20',
      'In Attesa di Approvazione': 'bg-[#8B5CF6]/10 text-[#6D28D9] border-[#8B5CF6]/20',
      'Approvata': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'Inviata': 'bg-[#3B82F6]/10 text-[#1D4ED8] border-[#3B82F6]/20',
      'Completata': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'Bloccata': 'bg-[#FF6B6B]/10 text-[#DC2626] border-[#FF6B6B]/20',
      'Escalation': 'bg-[#FF6B6B]/10 text-[#DC2626] border-[#FF6B6B]/20',
      'Rifiutata': 'bg-[#FF6B6B]/10 text-[#DC2626] border-[#FF6B6B]/20',
    };
    return <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${v[status] || v['Bozza']}`}>{status}</span>;
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A192F]" />
    </div>
  );

  return (
    <div className="space-y-8" data-testid="dashboard-page">

      {/* ── HERO — Welcome + Brand Background ── */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0A192F] p-8 sm:p-10">
        {/* Monumental background typography */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden" aria-hidden="true">
          <span className="text-[18vw] sm:text-[14vw] lg:text-[10vw] font-black tracking-[-0.04em] text-white/[0.04] uppercase whitespace-nowrap leading-none">
            HERION
          </span>
        </div>
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='1'%3E%3Cpath d='M0 30h60M30 0v60'/%3E%3C/g%3E%3C/svg%3E")`}} />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-[#3B82F6] animate-pulse-soft"></div>
              <span className="text-[11px] font-semibold text-[#3B82F6] uppercase tracking-[0.15em]">Piattaforma Operativa</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2" data-testid="dashboard-welcome">
              {user?.first_name ? `Ciao, ${user.first_name}` : user?.name ? `Ciao, ${user.name.split(' ')[0]}` : 'Dashboard'}
            </h1>
            <p className="text-sm text-white/50 max-w-md">Panoramica della tua gestione fiscale. Controlla lo stato, gestisci le pratiche e monitora le comunicazioni.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.08] border border-white/10" data-testid="hero-email-status">
              <Mail className="w-3.5 h-3.5 text-[#3B82F6]" strokeWidth={1.5} />
              <span className="text-[11px] font-semibold text-white/60">Flusso Email Live</span>
            </div>
            <Link to="/practices/new">
              <Button className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-lg shadow-[0_0_20px_rgba(59,130,246,0.25)] text-sm px-5 font-semibold" data-testid="create-practice-btn">
                <Plus className="w-4 h-4 mr-1.5" />Nuova Pratica
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── KPI CARDS — Bento-style, hero + supporting ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="kpi-grid">
        {/* Hero KPI — Total Practices */}
        <div className="col-span-2 lg:col-span-1 bg-[#0A192F] rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#3B82F6]/10 rounded-full -translate-y-6 translate-x-6" />
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#3B82F6]">Totale Pratiche</span>
          <p className="text-5xl font-black text-white tracking-tighter mt-2" data-testid="stat-total">{stats?.total_practices || 0}</p>
          <p className="text-xs text-white/40 mt-1.5 font-medium">Tutte le pratiche registrate</p>
        </div>

        {/* Supporting KPIs */}
        {[
          { label: 'In Attesa', value: stats?.pending, icon: Clock, accent: '#F59E0B', testId: 'stat-pending' },
          { label: 'In Corso', value: stats?.processing, icon: TrendingUp, accent: '#3B82F6', testId: 'stat-processing' },
          { label: 'Completate', value: stats?.completed, icon: CheckCircle, accent: '#10B981', testId: 'stat-completed' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#E2E8F0] p-5 hover:shadow-md transition-shadow duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#475569]">{s.label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${s.accent}15` }}>
                <s.icon className="w-4 h-4" style={{ color: s.accent }} strokeWidth={1.5} />
              </div>
            </div>
            <p className="text-3xl font-black text-[#0A192F] tracking-tighter" data-testid={s.testId}>{s.value || 0}</p>
          </div>
        ))}
      </div>

      {/* ── SMART REMINDER BANNER ── */}
      {reminders.length > 0 && (
        <div className="relative bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden" data-testid="reminder-banner">
          <div className="flex items-center px-6 py-5">
            <button onClick={prevReminder} className="p-1.5 rounded-lg hover:bg-[#F1F3F5] transition-colors flex-shrink-0 mr-4" data-testid="reminder-prev">
              <ChevronLeft className="w-4 h-4 text-[#94A3B8]" />
            </button>
            <div className="flex-1 min-w-0">
              {reminders.map((r, i) => {
                const Icon = REMINDER_ICONS[r.category] || Megaphone;
                const colors = REMINDER_COLORS[r.category] || REMINDER_COLORS.platform_updates;
                return (
                  <div key={r.id} className={`flex items-center gap-4 transition-all duration-500 ${i === currentReminder ? 'opacity-100 max-h-20' : 'opacity-0 max-h-0 overflow-hidden absolute'}`}>
                    <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${colors.icon}`} strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#475569]">{r.category_label}</span>
                        {r.priority === 'urgent' && <span className="text-[8px] px-1.5 py-0.5 bg-[#FF6B6B]/10 text-[#DC2626] rounded-full font-bold">URGENTE</span>}
                        {r.priority === 'high' && <span className="text-[8px] px-1.5 py-0.5 bg-[#F59E0B]/10 text-[#B45309] rounded-full font-bold">IMPORTANTE</span>}
                      </div>
                      <p className="text-sm font-semibold text-[#0A192F] truncate">{r.title}</p>
                      <p className="text-xs text-[#475569] truncate">{r.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={nextReminder} className="p-1.5 rounded-lg hover:bg-[#F1F3F5] transition-colors flex-shrink-0 ml-4" data-testid="reminder-next">
              <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
            </button>
          </div>
          {reminders.length > 1 && (
            <div className="flex justify-center gap-1 pb-3">
              {reminders.map((_, i) => (
                <button key={i} onClick={() => { clearInterval(timerRef.current); setCurrentReminder(i); }}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentReminder ? 'bg-[#0A192F]' : 'bg-[#E2E8F0]'}`} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── OPERATIONAL STATUS — Quick System Health ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Zap, title: 'Risparmia tempo', desc: 'Gestisci pratiche e documenti in pochi clic, senza confusione.', accent: '#F59E0B' },
          { icon: Shield, title: 'Conformita garantita', desc: 'Guard e Rules verificano ogni pratica rispetto alle normative italiane.', accent: '#3B82F6' },
          { icon: Globe, title: 'Architettura europea', desc: 'Infrastruttura pronta per espansione multi-paese, oggi operativa in Italia.', accent: '#8B5CF6' },
        ].map((item) => (
          <div key={item.title} className="bg-white rounded-2xl border border-[#E2E8F0] p-6 hover:shadow-md transition-shadow duration-300 group">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${item.accent}12` }}>
              <item.icon className="w-5 h-5" style={{ color: item.accent }} strokeWidth={1.5} />
            </div>
            <h3 className="text-sm font-bold text-[#0A192F] mb-1">{item.title}</h3>
            <p className="text-xs text-[#475569] leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* ── MAIN CONTENT — Practices + Notifications ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Practices */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-[#0A192F] uppercase tracking-wide">Pratiche Recenti</h3>
            <Link to="/practices" className="text-xs text-[#3B82F6] hover:text-[#2563EB] font-semibold flex items-center gap-1 transition-colors">
              Vedi tutte <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {stats?.recent_practices?.length > 0 ? (
            <div className="space-y-2">
              {stats.recent_practices.map((p, i) => (
                <Link key={p.id} to={`/practices/${p.id}`}
                  className="flex items-center justify-between p-4 border border-[#E2E8F0] rounded-xl hover:bg-[#F8F9FA] hover:border-[#3B82F6]/20 transition-all group"
                  data-testid={`recent-practice-${i}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#0A192F]/5 flex items-center justify-center group-hover:bg-[#3B82F6]/10 transition-colors">
                      <FileText className="w-4 h-4 text-[#0A192F] group-hover:text-[#3B82F6] transition-colors" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="font-semibold text-[#0A192F] text-sm">{p.practice_type_label}</p>
                      <p className="text-xs text-[#475569]">{p.client_name}</p>
                    </div>
                  </div>
                  {statusBadge(p.status_label)}
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-10 h-10 text-[#CBD5E1] mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-sm text-[#475569] mb-3">Nessuna pratica presente</p>
              <Link to="/practices/new">
                <Button variant="outline" className="rounded-xl text-sm border-[#E2E8F0]" data-testid="empty-create-btn">
                  Crea la tua prima pratica
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#0A192F] uppercase tracking-wide">Notifiche</h3>
              {stats?.unread_notifications > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#3B82F6] text-white rounded-full min-w-[20px] text-center" data-testid="unread-badge">
                  {stats.unread_notifications}
                </span>
              )}
            </div>
            {notifications.some(n => !n.read) && (
              <button onClick={handleMarkAllRead} className="text-[10px] text-[#3B82F6] hover:text-[#2563EB] font-semibold transition-colors" data-testid="mark-all-read-btn">
                Segna lette
              </button>
            )}
          </div>
          <ScrollArea className="h-[300px]">
            {notifications.length > 0 ? (
              <div className="space-y-2">
                {notifications.slice(0, 8).map(n => (
                  <div key={n.id} className={`p-3 rounded-xl border transition-colors ${
                    n.read ? 'border-[#E2E8F0] bg-white' : 'border-[#3B82F6]/15 bg-[#3B82F6]/[0.03]'
                  }`} data-testid={`notification-${n.id}`}>
                    <p className="text-xs font-semibold text-[#0A192F] truncate">{n.title}</p>
                    <p className="text-[10px] text-[#475569] mt-0.5 line-clamp-2">{n.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Bell className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-xs text-[#475569]">Nessuna notifica</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* ── AI AGENTS BANNER ── */}
      <div className="bg-gradient-to-r from-[#0A192F] to-[#0B243B] rounded-2xl p-7 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Ccircle cx='20' cy='20' r='1'/%3E%3C/g%3E%3C/svg%3E")`}} />
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-[#3B82F6]/15 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-[#3B82F6]" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-sm text-white mb-0.5">Herion AI &mdash; 5 Agenti Specializzati</h3>
            <p className="text-xs text-white/45">Compass, Shield, Rules, Docs e Voice. Coordinati da Herion Admin per analisi trasparenti.</p>
          </div>
          <Link to="/agents">
            <Button className="bg-[#3B82F6]/15 hover:bg-[#3B82F6]/25 text-[#3B82F6] border-0 rounded-lg text-xs px-5 font-semibold transition-colors">
              Scopri <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
