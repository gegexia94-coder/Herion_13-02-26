import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/i18n/translations';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { LogOut, ChevronDown, UserCircle, Shield, LayoutDashboard, FileText, Mail, Search, HelpCircle, Menu, X, Bot, FolderOpen, BookOpen, Compass, BarChart3, MessageCircle, Globe } from 'lucide-react';
import { HerionBrand } from '@/components/HerionLogo';
import { NotificationBell, NotificationPanel } from '@/components/NotificationPanel';
import { getDashboardStats } from '@/services/api';

const sideNavKeys = [
  { path: '/dashboard', labelKey: 'nav_dashboard', hintKey: 'nav_dashboard_hint', icon: LayoutDashboard },
  { path: '/practices', labelKey: 'nav_practices', hintKey: 'nav_practices_hint', icon: FileText },
  { path: '/consulenza', labelKey: 'nav_consulenza', hintKey: 'nav_consulenza_hint', icon: MessageCircle },
  { path: '/services', labelKey: 'nav_services', hintKey: 'nav_services_hint', icon: Compass },
  { path: '/catalog', labelKey: 'nav_catalog', hintKey: 'nav_catalog_hint', icon: BookOpen },
  { path: '/vault', labelKey: 'nav_vault', hintKey: 'nav_vault_hint', icon: FolderOpen },
  { path: '/agents', labelKey: 'nav_agents', hintKey: 'nav_agents_hint', icon: Bot },
  { path: '/email-center', labelKey: 'nav_email', hintKey: 'nav_email_hint', icon: Mail },
  { path: '/search', labelKey: 'nav_search', hintKey: 'nav_search_hint', icon: Search },
  { path: '/support', labelKey: 'nav_support', hintKey: 'nav_support_hint', icon: HelpCircle },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { lang, toggle } = useLanguage();
  const navigate = useNavigate();
  const [showLogout, setShowLogout] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const isCreator = user?.is_creator || user?.role === 'creator';

  const handleLogout = async () => { await logout(); navigate('/login'); };

  useEffect(() => {
    const fetchUnread = async () => {
      try { const res = await getDashboardStats(); setUnreadCount(res.data?.unread_notifications || 0); } catch { /* silent */ }
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

        {/* Nav items */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto" data-testid="nav-main">
          {sideNavKeys.map(item => (
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
                    <span className="text-[13px] truncate">{t(item.labelKey, lang)}</span>
                    {!isActive && <span className="text-[9px] text-[var(--text-muted)] truncate">{t(item.hintKey, lang)}</span>}
                  </div>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Creator-only: Statistics */}
        {isCreator && (
          <nav className="px-3 pb-2 space-y-1 border-t pt-2" style={{ borderColor: 'var(--border-soft)' }} data-testid="nav-creator-stats">
            <NavLink
              to="/admin/stats"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150 group
                ${isActive
                  ? 'bg-amber-50 text-amber-800 font-semibold shadow-sm'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--hover-soft)] hover:text-[var(--text-primary)]'
                }`
              }
              data-testid="nav-admin-stats"
            >
              {({ isActive }) => (
                <>
                  {isActive && <div className="absolute left-0 w-[3px] h-6 rounded-r-full bg-amber-500" />}
                  <BarChart3 className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-amber-500' : ''}`} strokeWidth={1.8} />
                  <span className="text-[13px] truncate">{t('nav_stats', lang)}</span>
                </>
              )}
            </NavLink>
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
            <DropdownMenuContent align="end" side="top" className="w-52 rounded-xl shadow-lg mb-1" style={{ borderColor: 'var(--border-soft)' }}>
              <div className="p-1">
                <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer rounded-lg text-[12px] gap-2" data-testid="profile-nav-btn">
                  <UserCircle className="w-3.5 h-3.5 text-[var(--text-muted)]" />{t('user_profile', lang)}
                </DropdownMenuItem>
                {isCreator && (
                  <DropdownMenuItem onClick={() => navigate('/creator')} className="cursor-pointer rounded-lg text-[12px] gap-2 text-[#0ABFCF]" data-testid="nav-creator">
                    <Shield className="w-3.5 h-3.5" />{t('user_control_room', lang)}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {/* Language toggle */}
                <DropdownMenuItem onClick={toggle} className="cursor-pointer rounded-lg text-[12px] gap-2" data-testid="lang-toggle-menu">
                  <Globe className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span className="flex-1">{t('user_language', lang)}</span>
                  <span className="text-[10px] font-bold text-[#0ABFCF] bg-[#0ABFCF]/10 px-1.5 py-0.5 rounded" data-testid="lang-indicator">{lang.toUpperCase()}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowLogout(true)} className="text-red-600 cursor-pointer rounded-lg focus:bg-red-50 focus:text-red-600 text-[12px] gap-2" data-testid="logout-btn">
                  <LogOut className="w-3.5 h-3.5" />{t('user_logout', lang)}
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─── */}
      <div className="flex-1 md:ml-[220px] overflow-x-hidden">
        <header className="md:hidden sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b h-14 flex items-center px-4 gap-3" style={{ borderColor: 'var(--border-soft)' }}>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1.5 rounded-lg hover:bg-[var(--hover-soft)]" data-testid="mobile-menu-btn">
            {mobileOpen ? <X className="w-5 h-5 text-[var(--text-secondary)]" /> : <Menu className="w-5 h-5 text-[var(--text-secondary)]" />}
          </button>
          <HerionBrand size={28} showText />
        </header>

        <main className="max-w-[1080px] mx-auto px-4 sm:px-5 md:px-8 pt-6 sm:pt-8 pb-16">
          <Outlet />
        </main>
      </div>

      {/* Notifications */}
      <NotificationPanel open={notifOpen} onClose={() => { setNotifOpen(false); getDashboardStats().then(r => setUnreadCount(r.data?.unread_notifications || 0)).catch(() => {}); }} />

      {/* Logout dialog */}
      <AlertDialog open={showLogout} onOpenChange={setShowLogout}>
        <AlertDialogContent className="rounded-2xl shadow-2xl max-w-sm" style={{ borderColor: 'var(--border-soft)' }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-center">{t('user_logout_confirm_title', lang)}</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[var(--text-secondary)] text-sm">
              {t('user_logout_confirm_desc', lang)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="rounded-xl flex-1 text-sm">{t('user_logout_cancel', lang)}</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-red-600 hover:bg-red-700 rounded-xl flex-1 text-sm" data-testid="confirm-logout-btn">{t('user_logout_action', lang)}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
