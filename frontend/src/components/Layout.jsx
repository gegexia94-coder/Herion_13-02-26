import { useState } from 'react';
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
  FileText,
  LayoutDashboard,
  FolderOpen,
  Bot,
  History,
  LogOut,
  User,
  Menu,
  X,
  ChevronDown
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/practices', label: 'Pratiche', icon: FolderOpen },
  { path: '/agents', label: 'Agenti AI', icon: Bot },
  { path: '/activity-log', label: 'Log Attività', icon: History },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F9F9F8]" data-testid="app-layout">
      {/* Top Navigation */}
      <header className="bg-white border-b border-[#E5E5E3] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <NavLink to="/dashboard" className="flex items-center gap-3" data-testid="logo-link">
              <FileText className="w-8 h-8 text-[#001F54]" />
              <span className="text-xl font-bold text-[#001F54] hidden sm:inline">AIC</span>
            </NavLink>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-[#001F54] text-white' 
                        : 'text-[#5C5C59] hover:bg-[#F0F0EE] hover:text-[#111110]'
                    }`
                  }
                  data-testid={`nav-${item.path.slice(1)}`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2" data-testid="user-menu-btn">
                    <div className="w-8 h-8 rounded-full bg-[#001F54] flex items-center justify-center text-white text-sm font-medium">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <span className="hidden sm:inline text-sm font-medium text-[#111110]">
                      {user?.name}
                    </span>
                    <ChevronDown className="w-4 h-4 text-[#5C5C59]" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium text-[#111110]">{user?.name}</p>
                    <p className="text-xs text-[#5C5C59]">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-[#E63946] cursor-pointer" data-testid="logout-btn">
                    <LogOut className="w-4 h-4 mr-2" />
                    Esci
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Menu Button */}
              <button
                className="md:hidden p-2 rounded-sm hover:bg-[#F0F0EE]"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                data-testid="mobile-menu-btn"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-[#E5E5E3] py-2 px-4 animate-fade-in">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-sm text-sm font-medium ${
                    isActive 
                      ? 'bg-[#001F54] text-white' 
                      : 'text-[#5C5C59] hover:bg-[#F0F0EE]'
                  }`
                }
                data-testid={`mobile-nav-${item.path.slice(1)}`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E5E3] bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-[#5C5C59]">
              <FileText className="w-4 h-4" />
              <span>AIC - Artificial Commercialista</span>
            </div>
            <p className="text-xs text-[#A1A19E]">
              Trasparenza totale • Nessuna logica nascosta • Ogni azione registrata
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
