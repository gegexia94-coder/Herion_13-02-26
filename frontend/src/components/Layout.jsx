import { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { LayoutDashboard, FolderOpen, Bot, History, LogOut, Menu, X, ChevronDown, UserCircle, Shield, User, Settings, BookOpen, Clock, Send, ShieldCheck, Bell, Lock, Eye, Mail } from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
  { path: '/practices', label: 'Pratiche', icon: FolderOpen, adminOnly: false },
  { path: '/catalog', label: 'Catalogo', icon: BookOpen, adminOnly: false },
  { path: '/submissions', label: 'Centro Invii', icon: Send, adminOnly: false },
  { path: '/deadlines', label: 'Scadenze', icon: Clock, adminOnly: false },
  { path: '/vault', label: 'Archivio', icon: Lock, adminOnly: false },
  { path: '/follow-ups', label: 'Follow-Up', icon: Eye, adminOnly: false },
  { path: '/email-center', label: 'Email', icon: Mail, adminOnly: false },
  { path: '/alerts', label: 'Allerte', icon: Bell, adminOnly: false },
  { path: '/governance', label: 'Governance', icon: ShieldCheck, adminOnly: true },
  { path: '/agents', label: 'Herion AI', icon: Bot, adminOnly: false },
  { path: '/activity-log', label: 'Attivita', icon: History, adminOnly: false },
  { path: '/creator', label: 'Control Room', icon: Shield, creatorOnly: true },
  { path: '/profile', label: 'Profilo', icon: User, adminOnly: false },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const [lastY, setLastY] = useState(0);

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

  return (
    <div className="min-h-screen bg-[#F7FAFC]" data-testid="app-layout">
      <header className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-6xl transition-all duration-500 ease-out ${navVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}`}>
        <nav className="bg-white/90 backdrop-blur-xl border border-[#E2E8F0]/60 rounded-full shadow-[0_4px_20px_rgba(15,23,42,0.06)] px-3 lg:px-5">
          <div className="flex items-center justify-between h-14">
            <NavLink to="/dashboard" className="flex items-center gap-2 pl-2" data-testid="logo-link">
              <div className="w-8 h-8 rounded-lg bg-[#0F4C5C] flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 4V20" stroke="#5DD9C1" strokeWidth="2.5" strokeLinecap="round"/><path d="M18 4V20" stroke="#5DD9C1" strokeWidth="2.5" strokeLinecap="round"/><path d="M6 12H18" stroke="#5DD9C1" strokeWidth="2.5" strokeLinecap="round"/></svg>
              </div>
              <span className="text-sm font-bold text-[#0F172A] hidden sm:inline tracking-tight">Herion</span>
            </NavLink>

            <div className="hidden md:flex items-center gap-0.5 bg-[#F1F5F9] rounded-full p-1">
              {navItems.filter(item => {
                if (item.creatorOnly && !user?.is_creator) return false;
                if (item.adminOnly && !['admin', 'creator'].includes(user?.role)) return false;
                return true;
              }).map(item => (
                <NavLink key={item.path} to={item.path}
                  className={({ isActive }) => `flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${isActive ? 'bg-[#0F4C5C] text-white shadow-sm' : 'text-[#475569] hover:text-[#0F172A] hover:bg-white'}`}
                  data-testid={`nav-${item.path.slice(1)}`}>
                  <item.icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span className="hidden lg:inline">{item.label}</span>
                </NavLink>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 rounded-full hover:bg-[#F1F5F9] px-2 h-9" data-testid="user-menu-btn">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0F4C5C] to-[#1A6B7C] flex items-center justify-center text-white text-xs font-bold">
                      {user?.first_name?.charAt(0)?.toUpperCase() || user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-xl border-[#E2E8F0] shadow-lg mt-1">
                  <div className="px-3 py-2.5 border-b border-[#E2E8F0]">
                    <p className="text-sm font-semibold text-[#0F172A]">{user?.first_name || user?.name}</p>
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
              <button className="md:hidden p-2 rounded-full hover:bg-[#F1F5F9]" onClick={() => setMobileOpen(!mobileOpen)} data-testid="mobile-menu-btn">
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {mobileOpen && (
            <div className="md:hidden border-t border-[#E2E8F0]/60 py-2 px-2 animate-fade-in">
              {navItems.filter(item => {
                if (item.creatorOnly && !user?.is_creator) return false;
                if (item.adminOnly && !['admin', 'creator'].includes(user?.role)) return false;
                return true;
              }).map(item => (
                <NavLink key={item.path} to={item.path} onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => `flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-[#0F4C5C] text-white' : 'text-[#475569] hover:bg-[#F1F5F9]'}`}
                  data-testid={`mobile-nav-${item.path.slice(1)}`}>
                  <item.icon className="w-4.5 h-4.5" strokeWidth={1.5} />{item.label}
                </NavLink>
              ))}
            </div>
          )}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12">
        <Outlet />
      </main>

      <footer className="border-t border-[#E2E8F0] bg-white/60 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-[#0F4C5C] flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M6 4V20" stroke="#5DD9C1" strokeWidth="3" strokeLinecap="round"/><path d="M18 4V20" stroke="#5DD9C1" strokeWidth="3" strokeLinecap="round"/><path d="M6 12H18" stroke="#5DD9C1" strokeWidth="3" strokeLinecap="round"/></svg>
              </div>
              <span className="text-xs font-medium text-[#475569]">Herion</span>
              <span className="text-xs text-[#94A3B8]">Precision. Control. Confidence.</span>
            </div>
            <p className="text-xs text-[#94A3B8]">Assistente fiscale europeo con AI trasparente</p>
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
