import { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { LogOut, ChevronDown, UserCircle, Shield } from 'lucide-react';

const mainNav = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/practices', label: 'Pratiche' },
  { path: '/email-center', label: 'Comunicazione' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogout, setShowLogout] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-[#F8F9FA]" data-testid="app-layout">
      {/* ─── NAVBAR ─── */}
      <header className={`sticky top-0 z-50 transition-shadow duration-300 ${scrolled ? 'shadow-sm' : ''}`}>
        <nav className="bg-white border-b border-[#E2E8F0]/70" data-testid="main-navbar">
          <div className="max-w-[1280px] mx-auto px-5">
            <div className="flex items-center justify-between h-[52px]">

              {/* Logo */}
              <NavLink to="/dashboard" className="flex items-center gap-2.5 flex-shrink-0 group" data-testid="logo-link">
                <img src="/herion-mascot.png" alt="Herion" className="h-8 w-auto object-contain" />
                <span className="text-[15px] font-extrabold tracking-[-0.02em] text-[#0A192F] hidden sm:block">Herion</span>
              </NavLink>

              {/* Main nav — 3 items */}
              <div className="flex items-center gap-1 ml-8" data-testid="nav-main">
                {mainNav.map(item => (
                  <NavLink key={item.path} to={item.path}
                    className={({ isActive }) => `px-4 py-1.5 rounded-md text-[13px] font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-[#0A192F] text-white'
                        : 'text-[#475569] hover:text-[#0A192F] hover:bg-[#F1F3F5]'
                    }`}
                    data-testid={`nav-${item.path.slice(1)}`}>
                    {item.label}
                  </NavLink>
                ))}
              </div>

              {/* Right side */}
              <div className="flex items-center gap-2">
                {/* User menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-1.5 rounded-md hover:bg-[#F1F3F5] px-2 h-8" data-testid="user-menu-btn">
                      <div className="w-7 h-7 rounded-md bg-[#0A192F] flex items-center justify-center text-white text-[11px] font-bold">
                        {user?.first_name?.charAt(0)?.toUpperCase() || user?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <span className="text-[12px] font-semibold text-[#475569] hidden sm:block max-w-[100px] truncate">{user?.first_name || user?.name?.split(' ')[0]}</span>
                      <ChevronDown className="w-3 h-3 text-[#94A3B8]" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 rounded-xl border-[#E2E8F0] shadow-lg mt-1">
                    <div className="px-3 py-2 border-b border-[#E2E8F0]">
                      <p className="text-[12px] font-semibold text-[#0A192F] truncate">{user?.first_name || user?.name}</p>
                      <p className="text-[10px] text-[#94A3B8] truncate">{user?.email}</p>
                    </div>
                    <div className="p-1">
                      <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer rounded-lg text-[12px] gap-2" data-testid="profile-nav-btn">
                        <UserCircle className="w-3.5 h-3.5 text-[#94A3B8]" />Profilo
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
            </div>
          </div>
        </nav>
      </header>

      {/* ─── CONTENT ─── */}
      <main className="max-w-[1280px] mx-auto px-5 pt-6 pb-12">
        <Outlet />
      </main>

      {/* ─── LOGOUT DIALOG ─── */}
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
