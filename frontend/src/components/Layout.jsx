import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { LogOut, ChevronDown, UserCircle, Shield, LayoutDashboard, FileText, Mail, PanelLeftClose, PanelLeft } from 'lucide-react';
import { HerionMark } from '@/components/HerionLogo';

const sideNav = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/practices', label: 'Pratiche', icon: FileText },
  { path: '/email-center', label: 'Comunicazione', icon: Mail },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogout, setShowLogout] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  useEffect(() => {
    const onResize = () => { if (window.innerWidth < 768) setMobileOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex" data-testid="app-layout">

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* ─── LEFT SIDEBAR ─── */}
      <aside
        className={`fixed top-0 left-0 h-full z-50 bg-white border-r transition-all duration-200 ease-out flex flex-col
          ${collapsed ? 'w-16' : 'w-[220px]'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        `}
        style={{ borderColor: 'var(--border-soft)' }}
        data-testid="sidebar"
      >
        {/* Logo area */}
        <div className={`flex items-center h-14 border-b px-3 flex-shrink-0 ${collapsed ? 'justify-center' : 'gap-3'}`} style={{ borderColor: 'var(--border-soft)' }}>
          <NavLink to="/dashboard" className="flex-shrink-0" data-testid="logo-link">
            <HerionMark size={collapsed ? 28 : 32} />
          </NavLink>
          {!collapsed && (
            <span className="text-[15px] font-extrabold tracking-tight text-[var(--text-primary)] truncate">
              Herion
            </span>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 px-2 space-y-0.5" data-testid="nav-main">
          {sideNav.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 rounded-lg transition-all duration-150 group
                ${collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'}
                ${isActive
                  ? 'bg-[var(--surface-accent-1)]/30 text-[var(--text-primary)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--hover-soft)] hover:text-[var(--text-primary)]'
                }`
              }
              data-testid={`nav-${item.path.slice(1)}`}
            >
              {({ isActive }) => (
                <>
                  {isActive && <div className="absolute left-0 w-[3px] h-5 rounded-r-full bg-[var(--surface-accent-1)]" />}
                  <item.icon className={`w-[18px] h-[18px] flex-shrink-0 transition-transform group-hover:translate-x-[1px] ${isActive ? 'text-[var(--text-primary)]' : ''}`} strokeWidth={1.8} />
                  {!collapsed && <span className="text-[13px] truncate">{item.label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className="hidden md:flex px-2 pb-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[var(--text-muted)] hover:bg-[var(--hover-soft)] hover:text-[var(--text-secondary)] transition-colors w-full ${collapsed ? 'justify-center' : ''}`}
            data-testid="sidebar-toggle"
          >
            {collapsed ? <PanelLeft className="w-4 h-4" strokeWidth={1.8} /> : <PanelLeftClose className="w-4 h-4" strokeWidth={1.8} />}
            {!collapsed && <span className="text-[11px] font-medium">Comprimi</span>}
          </button>
        </div>

        {/* User area */}
        <div className={`border-t px-2 py-2.5 flex-shrink-0 ${collapsed ? 'flex justify-center' : ''}`} style={{ borderColor: 'var(--border-soft)' }}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`flex items-center gap-2.5 rounded-lg hover:bg-[var(--hover-soft)] transition-colors w-full ${collapsed ? 'justify-center p-2' : 'px-3 py-2'}`} data-testid="user-menu-btn">
                <div className="w-7 h-7 rounded-lg bg-[var(--text-primary)] flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                  {user?.first_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                {!collapsed && (
                  <>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-[12px] font-semibold text-[var(--text-primary)] truncate">{user?.first_name || user?.name?.split(' ')[0]}</p>
                      <p className="text-[10px] text-[var(--text-muted)] truncate">{user?.email}</p>
                    </div>
                    <ChevronDown className="w-3 h-3 text-[var(--text-muted)] flex-shrink-0" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-48 rounded-xl shadow-lg mb-1" style={{ borderColor: 'var(--border-soft)' }}>
              <div className="p-1">
                <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer rounded-lg text-[12px] gap-2" data-testid="profile-nav-btn">
                  <UserCircle className="w-3.5 h-3.5 text-[var(--text-muted)]" />Profilo
                </DropdownMenuItem>
                {user?.is_creator && (
                  <DropdownMenuItem onClick={() => navigate('/creator')} className="cursor-pointer rounded-lg text-[12px] gap-2 text-[#8B5CF6]" data-testid="nav-creator">
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
      <div className={`flex-1 transition-all duration-200 ${collapsed ? 'md:ml-16' : 'md:ml-[220px]'}`}>
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b h-12 flex items-center px-4 gap-3" style={{ borderColor: 'var(--border-soft)' }}>
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg hover:bg-[var(--hover-soft)]" data-testid="mobile-menu-btn">
            <PanelLeft className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
          <HerionMark size={24} />
        </header>

        <main className="max-w-[1120px] mx-auto px-5 md:px-8 pt-6 pb-12">
          <Outlet />
        </main>
      </div>

      {/* ─── LOGOUT DIALOG ─── */}
      <AlertDialog open={showLogout} onOpenChange={setShowLogout}>
        <AlertDialogContent className="rounded-2xl shadow-2xl max-w-sm" style={{ borderColor: 'var(--border-soft)' }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-center">Conferma uscita</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[var(--text-secondary)] text-sm">
              Vuoi uscire dal tuo account Herion?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="rounded-xl flex-1 text-sm" style={{ borderColor: 'var(--border-soft)' }}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-red-600 hover:bg-red-700 rounded-xl flex-1 text-sm" data-testid="confirm-logout-btn">Esci</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
