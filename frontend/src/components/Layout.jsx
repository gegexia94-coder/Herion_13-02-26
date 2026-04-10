import { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  LayoutDashboard, FolderOpen, History, LogOut, Menu, X, ChevronDown,
  UserCircle, Shield, User, BookOpen, Clock, Send, ShieldCheck, Bell, Lock, Eye, Mail, Bot, MoreHorizontal,
} from 'lucide-react';

const primaryNav = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/practices', label: 'Pratiche', icon: FolderOpen },
  { path: '/email-center', label: 'Email', icon: Mail },
  { path: '/deadlines', label: 'Scadenze', icon: Clock },
  { path: '/governance', label: 'Governance', icon: ShieldCheck, adminOnly: true },
];

const secondaryNav = [
  { path: '/catalog', label: 'Catalogo', icon: BookOpen },
  { path: '/vault', label: 'Archivio', icon: Lock },
  { path: '/follow-ups', label: 'Follow-Up', icon: Eye },
  { path: '/alerts', label: 'Allerte', icon: Bell },
  { path: '/activity-log', label: 'Attivita', icon: History },
  { path: '/agents', label: 'Herion AI', icon: Bot },
  { path: '/submissions', label: 'Centro Invii', icon: Send },
];

const specialNav = [
  { path: '/creator', label: 'Control Room', icon: Shield, creatorOnly: true },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const [lastY, setLastY] = useState(0);

  const isAdmin = user?.role === 'admin' || user?.role === 'creator';

  const handleScroll = useCallback(() => {
    const y = window.scrollY;
    if (y < 50) setNavVisible(true);
    else if (y > lastY && y > 100) setNavVisible(false);
    else if (y < lastY) setNavVisible(true);
    setLastY(y);
  }, [lastY]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const filteredPrimary = primaryNav.filter(item => {
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  const allMobileItems = [
    ...filteredPrimary,
    ...secondaryNav,
    ...specialNav.filter(item => item.creatorOnly ? user?.is_creator : true),
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA]" data-testid="app-layout">
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-400 ease-out ${navVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}`}>
        <nav className="bg-white/80 backdrop-blur-2xl border-b border-[#E2E8F0]/60" data-testid="main-navbar">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              {/* Logo — icon only */}
              <NavLink to="/dashboard" className="flex items-center flex-shrink-0" data-testid="logo-link">
                <div className="w-8 h-8 rounded-lg bg-[#0A192F] flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M6 4V20" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round"/>
                    <path d="M18 4V20" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round"/>
                    <path d="M6 12H18" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                </div>
              </NavLink>

              {/* Primary nav items */}
              <div className="hidden md:flex items-center gap-1 ml-8">
                {filteredPrimary.map(item => (
                  <NavLink key={item.path} to={item.path}
                    className={({ isActive }) => `flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[13px] font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-[#0A192F] text-white shadow-sm'
                        : 'text-[#475569] hover:text-[#0A192F] hover:bg-[#F1F3F5]'
                    }`}
                    data-testid={`nav-${item.path.slice(1)}`}>
                    <item.icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                    {item.label}
                  </NavLink>
                ))}

                {/* "Altro" dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[13px] font-semibold text-[#475569] hover:text-[#0A192F] hover:bg-[#F1F3F5] transition-all duration-200" data-testid="nav-altro-trigger">
                      <MoreHorizontal className="w-3.5 h-3.5" strokeWidth={1.5} />
                      Altro
                      <ChevronDown className="w-3 h-3 ml-0.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48 rounded-xl border-[#E2E8F0] shadow-lg mt-1 p-1">
                    {secondaryNav.map(item => (
                      <DropdownMenuItem key={item.path} onClick={() => navigate(item.path)}
                        className="cursor-pointer rounded-lg text-[13px] font-medium gap-2 py-2" data-testid={`nav-${item.path.slice(1)}`}>
                        <item.icon className="w-4 h-4 text-[#94A3B8]" strokeWidth={1.5} />{item.label}
                      </DropdownMenuItem>
                    ))}
                    {user?.is_creator && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate('/creator')}
                          className="cursor-pointer rounded-lg text-[13px] font-medium gap-2 py-2 text-[#8B5CF6]" data-testid="nav-creator">
                          <Shield className="w-4 h-4" strokeWidth={1.5} />Control Room
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Right side: email status + user menu */}
              <div className="flex items-center gap-3">
                {/* Email live indicator */}
                <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F1F3F5] border border-[#E2E8F0]/60" data-testid="email-live-indicator">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3B82F6] opacity-50"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3B82F6]"></span>
                  </span>
                  <span className="text-[10px] font-semibold text-[#475569] tracking-wide">Comunicazioni Attive</span>
                </div>

                {/* User menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 rounded-lg hover:bg-[#F1F3F5] px-2 h-9" data-testid="user-menu-btn">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0A192F] to-[#112240] flex items-center justify-center text-white text-xs font-bold">
                        {user?.first_name?.charAt(0)?.toUpperCase() || user?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 rounded-xl border-[#E2E8F0] shadow-lg mt-1">
                    <div className="px-3 py-2.5 border-b border-[#E2E8F0]">
                      <p className="text-sm font-semibold text-[#0A192F]">{user?.first_name || user?.name}</p>
                      <p className="text-xs text-[#475569] mt-0.5">{user?.email}</p>
                    </div>
                    <div className="p-1">
                      <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer rounded-lg text-sm" data-testid="profile-nav-btn">
                        <UserCircle className="w-4 h-4 mr-2" />Profilo
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setShowLogout(true)} className="text-red-600 cursor-pointer rounded-lg focus:bg-red-50 focus:text-red-600 text-sm" data-testid="logout-btn">
                        <LogOut className="w-4 h-4 mr-2" />Esci
                      </DropdownMenuItem>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Mobile hamburger */}
                <button className="md:hidden p-2 rounded-lg hover:bg-[#F1F3F5]" onClick={() => setMobileOpen(!mobileOpen)} data-testid="mobile-menu-btn">
                  {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Mobile menu */}
            {mobileOpen && (
              <div className="md:hidden border-t border-[#E2E8F0]/60 py-2 animate-fade-in">
                {allMobileItems.map(item => (
                  <NavLink key={item.path} to={item.path} onClick={() => setMobileOpen(false)}
                    className={({ isActive }) => `flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive ? 'bg-[#0A192F] text-white' : 'text-[#475569] hover:bg-[#F1F3F5]'
                    }`}
                    data-testid={`mobile-nav-${item.path.slice(1)}`}>
                    <item.icon className="w-4 h-4" strokeWidth={1.5} />{item.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
        <Outlet />
      </main>

      <footer className="border-t border-[#E2E8F0] bg-white/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-[#0A192F] flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                  <path d="M6 4V20" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round"/>
                  <path d="M18 4V20" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round"/>
                  <path d="M6 12H18" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="text-xs font-semibold text-[#0A192F]">Herion</span>
              <span className="text-xs text-[#94A3B8]">Precision. Control. Confidence.</span>
            </div>
            <p className="text-xs text-[#94A3B8]">Gestione fiscale operativa per l'Italia</p>
          </div>
        </div>
      </footer>

      <AlertDialog open={showLogout} onOpenChange={setShowLogout}>
        <AlertDialogContent className="rounded-2xl border-[#E2E8F0] shadow-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-center">Conferma uscita</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[#475569] text-sm">
              Vuoi uscire dal tuo account Herion?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="rounded-xl border-[#E2E8F0] flex-1 text-sm">Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-red-600 hover:bg-red-700 rounded-xl flex-1 text-sm" data-testid="confirm-logout-btn">Esci</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
