import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { LogOut, ChevronDown, UserCircle, Shield, LayoutDashboard, FileText, Mail, Search, HelpCircle, Menu, X, Bot, FolderOpen, BookOpen, Compass, BarChart3 } from 'lucide-react';
import { HerionBrand } from '@/components/HerionLogo';
import { NotificationBell, NotificationPanel } from '@/components/NotificationPanel';
import { getDashboardStats } from '@/services/api';

const sideNav = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, hint: 'Panoramica e azioni rapide' },
  { path: '/practices', label: 'Pratiche', icon: FileText, hint: 'Gestisci le tue pratiche' },
  { path: '/services', label: 'Aree operative', icon: Compass, hint: 'I sei pilastri del commercialista digitale' },
  { path: '/catalog', label: 'Catalogo', icon: BookOpen, hint: 'Procedure disponibili' },
  { path: '/vault', label: 'Documenti', icon: FolderOpen, hint: 'Tutti i tuoi documenti' },
  { path: '/agents', label: 'Agenti', icon: Bot, hint: 'Attivita degli agenti' },
  { path: '/email-center', label: 'Comunicazione', icon: Mail, hint: 'Email e messaggi' },
  { path: '/search', label: 'Ricerca', icon: Search, hint: 'Cerca pratiche e documenti' },
  { path: '/support', label: 'Supporto', icon: HelpCircle, hint: 'Aiuto e contatti' },
];

const adminNav = [
  { path: '/admin/stats', label: 'Statistiche', icon: BarChart3, hint: 'Statistiche prodotto e utenti' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogout, setShowLogout] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  // Fetch unread count
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await getDashboardStats();
        setUnreadCount(res.data?.unread_notifications || 0);
      } catch { /* silent */ }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth < 768) setMobileOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex" data-testid="app-layout">

      {/* Mobile overlay */}
      {mobileOpen && <div className="fixed inset-0 bg-black/20 z-40 md:hidden" onClick={() => setMobileOpen(false)} />}

      {/* ─── LEFT SIDEBAR ─── */}
      <aside
        className={`fixed top-0 left-0 h-full z-50 bg-white border-r w-[220px] flex flex-col transition-transform duration-200
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
        style={{ borderColor: 'var(--border-soft)' }}
        data-testid="sidebar"
      >
        {/* Logo area */}
        <div className="flex items-center justify-between h-16 border-b px-4 flex-shrink-0" style={{ borderColor: 'var(--border-soft)' }}>
          <NavLink to="/dashboard" className="flex-shrink-0" data-testid="logo-link">
            <HerionBrand size={36} showText />
          </NavLink>
          <NotificationBell unreadCount={unreadCount} onClick={() => setNotifOpen(!notifOpen)} />
        </div>

        {/* Nav items — always show labels */}
        <nav className="flex-1 py-4 px-3 space-y-1" data-testid="nav-main">
          {sideNav.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150 group
                ${isActive
                  ? 'bg-[var(--bg-soft)] text-[var(--text-primary)] font-semibold shadow-sm'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--hover-soft)] hover:text-[var(--text-primary)]'
                }`
              }
              data-testid={`nav-${item.path.slice(1)}`}
            >
              {({ isActive }) => (
                <>
                  {isActive && <div className="absolute left-0 w-[3px] h-6 rounded-r-full bg-[#0ABFCF]" />}
                  <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-[#0ABFCF]' : ''}`} strokeWidth={1.8} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] truncate">{item.label}</span>
                    {!isActive && <span className="text-[9px] text-[var(--text-muted)] truncate">{item.hint}</span>}
                  </div>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Admin nav */}
        {user?.role === 'admin' && (
          <nav className="px-3 pb-2 space-y-1 border-t pt-2" style={{ borderColor: 'var(--border-soft)' }} data-testid="nav-admin">
            {adminNav.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => `relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150 group
                  ${isActive
                    ? 'bg-amber-50 text-amber-800 font-semibold shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--hover-soft)] hover:text-[var(--text-primary)]'
                  }`
                }
                data-testid={`nav-${item.path.replace(/\//g, '-').slice(1)}`}
              >
                {({ isActive }) => (
                  <>
                    {isActive && <div className="absolute left-0 w-[3px] h-6 rounded-r-full bg-amber-500" />}
                    <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-amber-500' : ''}`} strokeWidth={1.8} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[13px] truncate">{item.label}</span>
                    </div>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        )}

        {/* User area */}
        <div className="border-t px-3 py-3 flex-shrink-0" style={{ borderColor: 'var(--border-soft)' }}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 rounded-xl hover:bg-[var(--hover-soft)] transition-colors w-full px-3 py-2.5" data-testid="user-menu-btn">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0ABFCF] to-[#0087D0] flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0">
                  {user?.first_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-[12px] font-semibold text-[var(--text-primary)] truncate">{user?.first_name || user?.name?.split(' ')[0]}</p>
                  <p className="text-[10px] text-[var(--text-muted)] truncate">{user?.email}</p>
                </div>
                <ChevronDown className="w-3 h-3 text-[var(--text-muted)] flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-48 rounded-xl shadow-lg mb-1" style={{ borderColor: 'var(--border-soft)' }}>
              <div className="p-1">
                <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer rounded-lg text-[12px] gap-2" data-testid="profile-nav-btn">
                  <UserCircle className="w-3.5 h-3.5 text-[var(--text-muted)]" />Profilo
                </DropdownMenuItem>
                {user?.is_creator && (
                  <DropdownMenuItem onClick={() => navigate('/creator')} className="cursor-pointer rounded-lg text-[12px] gap-2 text-[#0ABFCF]" data-testid="nav-creator">
                    <Shield className="w-3.5 h-3.5" />Control Room
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowLogout(true)} className="text-red-600 cursor-pointer rounded-lg focus:bg-red-50 focus:text-red-600 text-[12px] gap-2" data-testid="logout-btn">
                  <LogOut className="w-3.5 h-3.5" />Esci
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─── */}
      <div className="flex-1 md:ml-[220px]">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b h-14 flex items-center px-4 gap-3" style={{ borderColor: 'var(--border-soft)' }}>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1.5 rounded-lg hover:bg-[var(--hover-soft)]" data-testid="mobile-menu-btn">
            {mobileOpen ? <X className="w-5 h-5 text-[var(--text-secondary)]" /> : <Menu className="w-5 h-5 text-[var(--text-secondary)]" />}
          </button>
          <HerionBrand size={28} showText />
        </header>

        <main className="max-w-[1080px] mx-auto px-5 md:px-8 pt-8 pb-16">
          <Outlet />
        </main>
      </div>

      {/* ─── NOTIFICATION PANEL ─── */}
      <NotificationPanel open={notifOpen} onClose={() => { setNotifOpen(false); /* refresh count */ getDashboardStats().then(r => setUnreadCount(r.data?.unread_notifications || 0)).catch(() => {}); }} />

      {/* ─── LOGOUT DIALOG ─── */}
      <AlertDialog open={showLogout} onOpenChange={setShowLogout}>
        <AlertDialogContent className="rounded-2xl shadow-2xl max-w-sm" style={{ borderColor: 'var(--border-soft)' }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-center">Conferma uscita</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[var(--text-secondary)] text-sm">
              Vuoi uscire dal tuo account Herion?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="rounded-xl flex-1 text-sm">Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-red-600 hover:bg-red-700 rounded-xl flex-1 text-sm" data-testid="confirm-logout-btn">Esci</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
