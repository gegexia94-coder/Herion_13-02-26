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
  TrendingUp
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
      'In Attesa': 'status-pending',
      'In Elaborazione': 'status-processing',
      'Completata': 'status-completed',
      'Rifiutata': 'status-rejected'
    };
    return <span className={`status-tag ${variants[status] || 'status-pending'}`}>{status}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F4C5C]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="heading-2 mb-1">Dashboard</h1>
          <p className="body-text">Panoramica delle tue pratiche fiscali</p>
        </div>
        <Link to="/practices/new">
          <Button className="bg-[#0F4C5C] hover:bg-[#0F4C5C]/90 rounded-sm" data-testid="create-practice-btn">
            <Plus className="w-4 h-4 mr-2" />
            Nuova Pratica
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="aic-card animate-fade-in stagger-1">
          <div className="flex items-center justify-between mb-4">
            <span className="label-text">Totale Pratiche</span>
            <FileText className="w-5 h-5 text-[#0F4C5C]" />
          </div>
          <p className="text-3xl font-bold text-[#111110]" data-testid="stat-total">{stats?.total_practices || 0}</p>
        </div>

        <div className="aic-card animate-fade-in stagger-2">
          <div className="flex items-center justify-between mb-4">
            <span className="label-text">In Attesa</span>
            <Clock className="w-5 h-5 text-[#D4A373]" />
          </div>
          <p className="text-3xl font-bold text-[#D4A373]" data-testid="stat-pending">{stats?.pending || 0}</p>
        </div>

        <div className="aic-card animate-fade-in stagger-3">
          <div className="flex items-center justify-between mb-4">
            <span className="label-text">In Elaborazione</span>
            <TrendingUp className="w-5 h-5 text-[#5DD9C1]" />
          </div>
          <p className="text-3xl font-bold text-[#5DD9C1]" data-testid="stat-processing">{stats?.processing || 0}</p>
        </div>

        <div className="aic-card animate-fade-in stagger-4">
          <div className="flex items-center justify-between mb-4">
            <span className="label-text">Completate</span>
            <CheckCircle className="w-5 h-5 text-[#1A4331]" />
          </div>
          <p className="text-3xl font-bold text-[#1A4331]" data-testid="stat-completed">{stats?.completed || 0}</p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Practices */}
        <div className="lg:col-span-2 aic-card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="heading-4">Pratiche Recenti</h3>
            <Link to="/practices" className="text-sm text-[#001F54] hover:underline flex items-center gap-1">
              Vedi tutte <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          {stats?.recent_practices?.length > 0 ? (
            <div className="space-y-4">
              {stats.recent_practices.map((practice, index) => (
                <Link
                  key={practice.id}
                  to={`/practices/${practice.id}`}
                  className="flex items-center justify-between p-4 border border-[#E5E5E3] rounded-sm hover:bg-[#F9F9F8] transition-colors"
                  data-testid={`recent-practice-${index}`}
                >
                  <div className="flex items-center gap-4">
                    <FileText className="w-5 h-5 text-[#5C5C59]" />
                    <div>
                      <p className="font-medium text-[#111110]">{practice.practice_type_label}</p>
                      <p className="text-sm text-[#5C5C59]">{practice.client_name}</p>
                    </div>
                  </div>
                  {getStatusBadge(practice.status_label)}
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-[#A1A19E] mx-auto mb-4" />
              <p className="body-text">Nessuna pratica presente</p>
              <Link to="/practices/new">
                <Button variant="outline" className="mt-4 rounded-sm" data-testid="empty-create-btn">
                  Crea la tua prima pratica
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="aic-card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <h3 className="heading-4">Notifiche</h3>
              {stats?.unread_notifications > 0 && (
                <Badge variant="destructive" className="rounded-full" data-testid="unread-badge">
                  {stats.unread_notifications}
                </Badge>
              )}
            </div>
            {notifications.some(n => !n.read) && (
              <button 
                onClick={handleMarkAllRead}
                className="text-sm text-[#001F54] hover:underline"
                data-testid="mark-all-read-btn"
              >
                Segna tutte come lette
              </button>
            )}
          </div>

          <ScrollArea className="h-[300px]">
            {notifications.length > 0 ? (
              <div className="space-y-3">
                {notifications.slice(0, 10).map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-sm border ${notification.read ? 'border-[#E5E5E3] bg-white' : 'border-[#001F54]/20 bg-[#001F54]/5'}`}
                    data-testid={`notification-${notification.id}`}
                  >
                    <div className="flex items-start gap-3">
                      {notification.type === 'success' && <CheckCircle className="w-4 h-4 text-[#1A4331] mt-0.5" />}
                      {notification.type === 'warning' && <AlertCircle className="w-4 h-4 text-[#D4A373] mt-0.5" />}
                      {notification.type === 'error' && <AlertCircle className="w-4 h-4 text-[#E63946] mt-0.5" />}
                      {notification.type === 'info' && <Bell className="w-4 h-4 text-[#002FA7] mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#111110] truncate">{notification.title}</p>
                        <p className="text-xs text-[#5C5C59] mt-1 line-clamp-2">{notification.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Bell className="w-10 h-10 text-[#A1A19E] mx-auto mb-3" />
                <p className="text-sm text-[#5C5C59]">Nessuna notifica</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
