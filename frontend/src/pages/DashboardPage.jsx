import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardStats, getNotifications, markAllNotificationsRead, getReminders } from '@/services/api';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Plus, Clock, CheckCircle, Bell, ArrowRight, TrendingUp, Sparkles, Globe, Shield, Zap, Calendar, ChevronLeft, ChevronRight, AlertTriangle, FileCheck, Megaphone } from 'lucide-react';

const REMINDER_ICONS = { deadlines: Calendar, declarations: FileCheck, vat_reminders: AlertTriangle, document_preparation: FileText, country_notices: Globe, platform_updates: Megaphone };
const REMINDER_COLORS = { deadlines: 'text-red-500 bg-red-50', declarations: 'text-amber-600 bg-amber-50', vat_reminders: 'text-orange-500 bg-orange-50', document_preparation: 'text-sky-600 bg-sky-50', country_notices: 'text-violet-600 bg-violet-50', platform_updates: 'text-[#0F4C5C] bg-[#0F4C5C]/5' };

export default function DashboardPage() {
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
    const v = { 'In Attesa': 'bg-amber-50 text-amber-700 border-amber-200', 'In Elaborazione': 'bg-sky-50 text-sky-700 border-sky-200', 'Completata': 'bg-emerald-50 text-emerald-700 border-emerald-200', 'Rifiutata': 'bg-red-50 text-red-700 border-red-200' };
    return <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${v[status] || v['In Attesa']}`}>{status}</span>;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F4C5C]" /></div>;

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight mb-1">Dashboard</h1>
          <p className="text-sm text-[#475569]">Panoramica della tua gestione fiscale</p>
        </div>
        <Link to="/practices/new">
          <Button className="bg-[#0F4C5C] hover:bg-[#0b3844] rounded-full shadow-sm text-sm px-5" data-testid="create-practice-btn">
            <Plus className="w-4 h-4 mr-1.5" />Nuova Pratica
          </Button>
        </Link>
      </div>

      {/* Smart Reminder Banner */}
      {reminders.length > 0 && (
        <div className="relative bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_4px_20px_rgba(15,23,42,0.04)] overflow-hidden" data-testid="reminder-banner">
          <div className="flex items-center px-5 py-4">
            <button onClick={prevReminder} className="p-1.5 rounded-lg hover:bg-[#F1F5F9] transition-colors flex-shrink-0 mr-3" data-testid="reminder-prev"><ChevronLeft className="w-4 h-4 text-[#94A3B8]" /></button>
            <div className="flex-1 min-w-0">
              {reminders.map((r, i) => {
                const Icon = REMINDER_ICONS[r.category] || Megaphone;
                const colors = REMINDER_COLORS[r.category] || REMINDER_COLORS.platform_updates;
                const [iconColor, iconBg] = colors.split(' ');
                return (
                  <div key={r.id} className={`flex items-center gap-3.5 transition-all duration-500 ${i === currentReminder ? 'opacity-100 max-h-20' : 'opacity-0 max-h-0 overflow-hidden absolute'}`}>
                    <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}><Icon className={`w-5 h-5 ${iconColor}`} strokeWidth={1.5} /></div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-[#475569]">{r.category_label}</span>
                        {r.priority === 'urgent' && <span className="text-[8px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded-full font-bold">URGENTE</span>}
                        {r.priority === 'high' && <span className="text-[8px] px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded-full font-bold">IMPORTANTE</span>}
                      </div>
                      <p className="text-sm font-semibold text-[#0F172A] truncate">{r.title}</p>
                      <p className="text-xs text-[#475569] truncate">{r.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={nextReminder} className="p-1.5 rounded-lg hover:bg-[#F1F5F9] transition-colors flex-shrink-0 ml-3" data-testid="reminder-next"><ChevronRight className="w-4 h-4 text-[#94A3B8]" /></button>
          </div>
          {reminders.length > 1 && (
            <div className="flex justify-center gap-1 pb-2.5">
              {reminders.map((_, i) => <button key={i} onClick={() => { clearInterval(timerRef.current); setCurrentReminder(i); }} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentReminder ? 'bg-[#0F4C5C]' : 'bg-[#E2E8F0]'}`} />)}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Totale', value: stats?.total_practices, icon: FileText, color: 'bg-[#0F4C5C]/5', iconColor: 'text-[#0F4C5C]', testId: 'stat-total' },
          { label: 'In Attesa', value: stats?.pending, icon: Clock, color: 'bg-amber-50', iconColor: 'text-amber-600', testId: 'stat-pending' },
          { label: 'In Corso', value: stats?.processing, icon: TrendingUp, color: 'bg-sky-50', iconColor: 'text-sky-600', testId: 'stat-processing' },
          { label: 'Completate', value: stats?.completed, icon: CheckCircle, color: 'bg-emerald-50', iconColor: 'text-emerald-600', testId: 'stat-completed' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.07)] transition-shadow duration-300">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider">{s.label}</span>
              <div className={`w-9 h-9 rounded-xl ${s.color} flex items-center justify-center`}><s.icon className={`w-4.5 h-4.5 ${s.iconColor}`} strokeWidth={1.5} /></div>
            </div>
            <p className="text-2xl font-bold text-[#0F172A]" data-testid={s.testId}>{s.value || 0}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions + Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Zap, title: 'Risparmia tempo', desc: 'Gestisci pratiche e documenti in pochi clic, senza confusione.', color: 'text-[#C6A96B]', bg: 'bg-[#C6A96B]/10' },
          { icon: Shield, title: 'Conformita garantita', desc: 'Herion Shield e Rules verificano ogni pratica rispetto alle normative europee.', color: 'text-[#0F4C5C]', bg: 'bg-[#0F4C5C]/5' },
          { icon: Globe, title: "Pronto per l'Europa", desc: 'Supporto fiscale multi-paese con logica adattabile per ogni nazione.', color: 'text-[#5DD9C1]', bg: 'bg-[#5DD9C1]/10' },
        ].map((item, i) => (
          <div key={i} className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
            <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center mb-3`}><item.icon className={`w-5 h-5 ${item.color}`} strokeWidth={1.5} /></div>
            <h3 className="text-sm font-semibold text-[#0F172A] mb-1">{item.title}</h3>
            <p className="text-xs text-[#475569] leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Practices */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-[#0F172A]">Pratiche Recenti</h3>
            <Link to="/practices" className="text-xs text-[#0F4C5C] hover:underline font-medium flex items-center gap-1">Vedi tutte <ArrowRight className="w-3 h-3" /></Link>
          </div>
          {stats?.recent_practices?.length > 0 ? (
            <div className="space-y-2">
              {stats.recent_practices.map((p, i) => (
                <Link key={p.id} to={`/practices/${p.id}`} className="flex items-center justify-between p-3.5 border border-[#E2E8F0] rounded-xl hover:bg-[#F7FAFC] hover:border-[#0F4C5C]/15 transition-all" data-testid={`recent-practice-${i}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#0F4C5C]/5 flex items-center justify-center"><FileText className="w-4 h-4 text-[#0F4C5C]" strokeWidth={1.5} /></div>
                    <div><p className="font-medium text-[#0F172A] text-sm">{p.practice_type_label}</p><p className="text-xs text-[#475569]">{p.client_name}</p></div>
                  </div>
                  {statusBadge(p.status_label)}
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <FileText className="w-10 h-10 text-[#CBD5E1] mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-sm text-[#475569] mb-3">Nessuna pratica presente</p>
              <Link to="/practices/new"><Button variant="outline" className="rounded-xl text-sm" data-testid="empty-create-btn">Crea la tua prima pratica</Button></Link>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#0F172A]">Notifiche</h3>
              {stats?.unread_notifications > 0 && <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#0F4C5C] text-white rounded-full" data-testid="unread-badge">{stats.unread_notifications}</span>}
            </div>
            {notifications.some(n => !n.read) && <button onClick={handleMarkAllRead} className="text-[10px] text-[#0F4C5C] hover:underline font-medium" data-testid="mark-all-read-btn">Segna lette</button>}
          </div>
          <ScrollArea className="h-[280px]">
            {notifications.length > 0 ? (
              <div className="space-y-2">
                {notifications.slice(0, 8).map(n => (
                  <div key={n.id} className={`p-3 rounded-xl border transition-colors ${n.read ? 'border-[#E2E8F0] bg-white' : 'border-[#0F4C5C]/15 bg-[#0F4C5C]/[0.02]'}`} data-testid={`notification-${n.id}`}>
                    <p className="text-xs font-medium text-[#0F172A] truncate">{n.title}</p>
                    <p className="text-[10px] text-[#475569] mt-0.5 line-clamp-2">{n.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10"><Bell className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2" strokeWidth={1.5} /><p className="text-xs text-[#475569]">Nessuna notifica</p></div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* AI Banner */}
      <div className="bg-[#0F4C5C] rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Ccircle cx='20' cy='20' r='1.5'/%3E%3C/g%3E%3C/svg%3E")`}} />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0"><Sparkles className="w-6 h-6 text-[#5DD9C1]" /></div>
          <div className="flex-1">
            <h3 className="font-bold text-sm mb-0.5">Herion AI &mdash; 5 Agenti Specializzati</h3>
            <p className="text-xs text-white/60">Herion Compass, Shield, Rules, Docs e Voice. Coordinati da Herion Admin per analisi trasparenti e tracciabili.</p>
          </div>
          <Link to="/agents"><Button className="bg-white/10 hover:bg-white/15 text-white border-0 rounded-full text-xs px-4">Scopri <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button></Link>
        </div>
      </div>
    </div>
  );
}
