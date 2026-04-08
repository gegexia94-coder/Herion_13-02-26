import { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { HerionLogoCompact } from '@/components/HerionLogo';
import { 
  LayoutDashboard,
  FolderOpen,
  Bot,
  History,
  LogOut,
  Menu,
  X,
  ChevronDown
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/practices', label: 'Pratiche', icon: FolderOpen },
  { path: '/agents', label: 'Herion AI', icon: Bot },
  { path: '/activity-log', label: 'Attività', icon: History },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Floating navbar scroll behavior
  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    
    if (currentScrollY < 50) {
      setNavVisible(true);
    } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
      setNavVisible(false);
    } else if (currentScrollY < lastScrollY) {
      setNavVisible(true);
    }
    
    setLastScrollY(currentScrollY);
  }, [lastScrollY]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]" data-testid="app-layout">
      {/* Floating Navbar */}
      <header 
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-6xl transition-all duration-500 ease-out ${
          navVisible 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 -translate-y-full pointer-events-none'
        }`}
      >
        <nav className="bg-white/95 backdrop-blur-md border border-[#E5E5E3]/60 rounded-2xl shadow-lg shadow-black/5 px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <NavLink to="/dashboard" className="flex items-center" data-testid="logo-link">
              <HerionLogoCompact />
            </NavLink>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1 bg-[#F5F5F4] rounded-xl p-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive 
                        ? 'bg-[#0F4C5C] text-white shadow-md' 
                        : 'text-[#5C5C59] hover:text-[#111110] hover:bg-white'
                    }`
                  }
                  data-testid={`nav-${item.path.slice(1)}`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden lg:inline">{item.label}</span>
                </NavLink>
              ))}
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 rounded-xl hover:bg-[#F5F5F4] px-3" data-testid="user-menu-btn">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0F4C5C] to-[#1A6B7C] flex items-center justify-center text-white text-sm font-semibold shadow-sm">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="hidden sm:flex flex-col items-start">
                      <span className="text-sm font-medium text-[#111110]">
                        {user?.name?.split(' ')[0]}
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-[#A1A19E]" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl border-[#E5E5E3]/60 shadow-xl">
                  <div className="px-3 py-3 border-b border-[#E5E5E3]/60">
                    <p className="text-sm font-semibold text-[#111110]">{user?.name}</p>
                    <p className="text-xs text-[#5C5C59] mt-0.5">{user?.email}</p>
                  </div>
                  <div className="p-1.5">
                    <DropdownMenuItem 
                      onClick={() => setShowLogoutDialog(true)} 
                      className="text-[#E63946] cursor-pointer rounded-lg focus:bg-[#E63946]/10 focus:text-[#E63946]" 
                      data-testid="logout-btn"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Esci dall'account
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Menu Button */}
              <button
                className="md:hidden p-2.5 rounded-xl hover:bg-[#F5F5F4] transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                data-testid="mobile-menu-btn"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-[#E5E5E3]/60 py-3 animate-in slide-in-from-top-2 duration-200">
              <div className="space-y-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        isActive 
                          ? 'bg-[#0F4C5C] text-white' 
                          : 'text-[#5C5C59] hover:bg-[#F5F5F4]'
                      }`
                    }
                    data-testid={`mobile-nav-${item.path.slice(1)}`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* Main Content - with top padding for floating nav */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E5E3]/60 bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="44" height="44" rx="12" fill="#0F4C5C" />
                <path d="M14 12V36" stroke="#5DD9C1" strokeWidth="4" strokeLinecap="round"/>
                <path d="M34 12V36" stroke="#5DD9C1" strokeWidth="4" strokeLinecap="round"/>
                <path d="M14 24H34" stroke="#5DD9C1" strokeWidth="4" strokeLinecap="round"/>
              </svg>
              <span className="text-sm font-medium text-[#5C5C59]">Herion</span>
              <span className="text-xs text-[#A1A19E]">• Precision. Control. Confidence.</span>
            </div>
            <p className="text-xs text-[#A1A19E]">
              Trasparenza totale • Ogni azione registrata
            </p>
          </div>
        </div>
      </footer>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="rounded-2xl border-[#E5E5E3]/60 shadow-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold">Conferma uscita</AlertDialogTitle>
            <AlertDialogDescription className="text-[#5C5C59]">
              Sei sicuro di voler uscire dal tuo account Herion? Dovrai effettuare nuovamente l'accesso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 sm:gap-3">
            <AlertDialogCancel className="rounded-xl border-[#E5E5E3] hover:bg-[#F5F5F4]">
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleLogout}
              className="bg-[#E63946] hover:bg-[#E63946]/90 rounded-xl"
              data-testid="confirm-logout-btn"
            >
              Esci
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
