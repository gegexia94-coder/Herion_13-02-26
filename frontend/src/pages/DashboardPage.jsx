import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardStats, getNotifications, markAllNotificationsRead } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Bell,
  ArrowRight,
  TrendingUp,
  Sparkles
} from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, notifRes] = await Promise.all([
        getDashboardStats(),
        getNotifications()
      ]);
      setStats(statsRes.data);
      setNotifications(notifRes.data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      'In Attesa': 'bg-amber-50 text-amber-700 border-amber-200',
      'In Elaborazione': 'bg-sky-50 text-sky-700 border-sky-200',
      'Completata': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'Rifiutata': 'bg-red-50 text-red-700 border-red-200'
    };
    return <span className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${variants[status] || variants['In Attesa']}`}>{status}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F4C5C]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#111110] mb-1">Dashboard</h1>
          <p className="text-sm text-[#5C5C59]">Panoramica delle tue pratiche fiscali</p>
        </div>
        <Link to="/practices/new">
          <Button className="bg-[#0F4C5C] hover:bg-[#0F4C5C]/90 rounded-xl shadow-lg shadow-[#0F4C5C]/20" data-testid="create-practice-btn">
            <Plus className="w-4 h-4 mr-2" />
            Nuova Pratica
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl border border-[#E5E5E3]/60 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-[#5C5C59] uppercase tracking-wider">Totale</span>
            <div className="w-10 h-10 rounded-xl bg-[#0F4C5C]/5 flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#0F4C5C]" />
            </div>
          </div>
          <p className="text-3xl font-semibold text-[#111110]" data-testid="stat-total">{stats?.total_practices || 0}</p>
          <p className="text-xs text-[#5C5C59] mt-1">Pratiche totali</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E5E3]/60 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-[#5C5C59] uppercase tracking-wider">In Attesa</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-3xl font-semibold text-amber-600" data-testid="stat-pending">{stats?.pending || 0}</p>
          <p className="text-xs text-[#5C5C59] mt-1">Da processare</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E5E3]/60 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-[#5C5C59] uppercase tracking-wider">In Corso</span>
            <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-sky-600" />
            </div>
          </div>
          <p className="text-3xl font-semibold text-sky-600" data-testid="stat-processing">{stats?.processing || 0}</p>
          <p className="text-xs text-[#5C5C59] mt-1">In elaborazione</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E5E3]/60 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-[#5C5C59] uppercase tracking-wider">Completate</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-3xl font-semibold text-emerald-600" data-testid="stat-completed">{stats?.completed || 0}</p>
          <p className="text-xs text-[#5C5C59] mt-1">Finalizzate</p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Practices */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E5E5E3]/60 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[#111110]">Pratiche Recenti</h3>
            <Link to="/practices" className="text-sm text-[#0F4C5C] hover:underline flex items-center gap-1 font-medium">
              Vedi tutte <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          {stats?.recent_practices?.length > 0 ? (
            <div className="space-y-3">
              {stats.recent_practices.map((practice, index) => (
                <Link
                  key={practice.id}
                  to={`/practices/${practice.id}`}
                  className="flex items-center justify-between p-4 border border-[#E5E5E3]/60 rounded-xl hover:bg-[#FAFAFA] hover:border-[#0F4C5C]/20 transition-all"
                  data-testid={`recent-practice-${index}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#0F4C5C]/5 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-[#0F4C5C]" />
                    </div>
                    <div>
                      <p className="font-medium text-[#111110] text-sm">{practice.practice_type_label}</p>
                      <p className="text-xs text-[#5C5C59]">{practice.client_name}</p>
                    </div>
                  </div>
                  {getStatusBadge(practice.status_label)}
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-[#F5F5F4] flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7 text-[#A1A19E]" />
              </div>
              <p className="text-sm text-[#5C5C59] mb-4">Nessuna pratica presente</p>
              <Link to="/practices/new">
                <Button variant="outline" className="rounded-xl" data-testid="empty-create-btn">
                  Crea la tua prima pratica
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl border border-[#E5E5E3]/60 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-[#111110]">Notifiche</h3>
              {stats?.unread_notifications > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-[#0F4C5C] text-white rounded-full" data-testid="unread-badge">
                  {stats.unread_notifications}
                </span>
              )}
            </div>
            {notifications.some(n => !n.read) && (
              <button 
                onClick={handleMarkAllRead}
                className="text-xs text-[#0F4C5C] hover:underline font-medium"
                data-testid="mark-all-read-btn"
              >
                Segna tutte lette
              </button>
            )}
          </div>

          <ScrollArea className="h-[320px]">
            {notifications.length > 0 ? (
              <div className="space-y-3">
                {notifications.slice(0, 10).map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-xl border transition-colors ${notification.read ? 'border-[#E5E5E3]/60 bg-white' : 'border-[#0F4C5C]/20 bg-[#0F4C5C]/5'}`}
                    data-testid={`notification-${notification.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        notification.type === 'success' ? 'bg-emerald-50' :
                        notification.type === 'warning' ? 'bg-amber-50' :
                        notification.type === 'error' ? 'bg-red-50' : 'bg-sky-50'
                      }`}>
                        {notification.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                        {notification.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-600" />}
                        {notification.type === 'error' && <AlertCircle className="w-4 h-4 text-red-600" />}
                        {notification.type === 'info' && <Bell className="w-4 h-4 text-sky-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#111110] truncate">{notification.title}</p>
                        <p className="text-xs text-[#5C5C59] mt-1 line-clamp-2">{notification.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-xl bg-[#F5F5F4] flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-6 h-6 text-[#A1A19E]" />
                </div>
                <p className="text-sm text-[#5C5C59]">Nessuna notifica</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Herion AI Banner */}
      <div className="bg-gradient-to-r from-[#0F4C5C] to-[#1A6B7C] rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-[#5DD9C1]" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Herion AI</h3>
            <p className="text-sm text-white/70">4 agenti intelligenti pronti ad assisterti nelle tue pratiche fiscali.</p>
          </div>
          <Link to="/agents">
            <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-0 rounded-xl">
              Scopri <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
