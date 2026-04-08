import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HerionLogo } from '@/components/HerionLogo';
import { ArrowRight, Eye, EyeOff, Shield, Sparkles, BarChart3 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex" data-testid="login-page">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0F4C5C] via-[#0F4C5C] to-[#0A3640] text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <svg width="52" height="52" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="44" height="44" rx="12" fill="rgba(93, 217, 193, 0.15)" />
              <path d="M14 12V36" stroke="#5DD9C1" strokeWidth="4" strokeLinecap="round"/>
              <path d="M34 12V36" stroke="#5DD9C1" strokeWidth="4" strokeLinecap="round"/>
              <path d="M14 24H34" stroke="#5DD9C1" strokeWidth="4" strokeLinecap="round"/>
              <path d="M24 18L27 21L24 24L21 21L24 18Z" fill="#5DD9C1" opacity="0.6"/>
            </svg>
            <span className="text-2xl font-semibold tracking-tight">Herion</span>
          </div>
          
          <h1 className="text-4xl font-semibold leading-tight mb-4">
            Precision.<br />Control.<br />Confidence.
          </h1>
          <p className="text-lg text-white/70 leading-relaxed max-w-md">
            Gestisci le tue pratiche fiscali con intelligenza artificiale trasparente e affidabile.
          </p>
        </div>
        
        <div className="relative z-10 space-y-5">
          <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10">
            <div className="w-10 h-10 rounded-lg bg-[#5DD9C1]/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#5DD9C1]" />
            </div>
            <div>
              <p className="text-sm font-medium">Trasparenza totale</p>
              <p className="text-xs text-white/60">Ogni azione AI è registrata</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10">
            <div className="w-10 h-10 rounded-lg bg-[#5DD9C1]/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#5DD9C1]" />
            </div>
            <div>
              <p className="text-sm font-medium">Assistenza intelligente</p>
              <p className="text-xs text-white/60">4 agenti AI specializzati</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10">
            <div className="w-10 h-10 rounded-lg bg-[#5DD9C1]/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-[#5DD9C1]" />
            </div>
            <div>
              <p className="text-sm font-medium">Controllo completo</p>
              <p className="text-xs text-white/60">Dashboard intuitiva</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-10">
            <HerionLogo size="lg" />
          </div>
          
          <h2 className="text-2xl font-semibold text-[#111110] mb-2">Bentornato</h2>
          <p className="text-[#5C5C59] mb-8">
            Accedi al tuo account Herion
          </p>

          {error && (
            <div className="bg-[#E63946]/10 border border-[#E63946]/20 text-[#E63946] px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-2" data-testid="login-error">
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-medium text-[#5C5C59] uppercase tracking-wider">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@esempio.it"
                required
                className="rounded-xl border-[#E5E5E3] focus:ring-1 focus:ring-[#0F4C5C] focus:border-[#0F4C5C] h-12"
                data-testid="login-email-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-medium text-[#5C5C59] uppercase tracking-wider">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="rounded-xl border-[#E5E5E3] focus:ring-1 focus:ring-[#0F4C5C] focus:border-[#0F4C5C] h-12 pr-10"
                  data-testid="login-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A19E] hover:text-[#5C5C59] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0F4C5C] hover:bg-[#0F4C5C]/90 text-white rounded-xl h-12 text-sm font-medium shadow-lg shadow-[#0F4C5C]/20 transition-all duration-200 hover:shadow-xl hover:shadow-[#0F4C5C]/30"
              data-testid="login-submit-btn"
            >
              {loading ? 'Accesso in corso...' : 'Accedi'}
              {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-[#5C5C59]">
            Non hai un account?{' '}
            <Link to="/register" className="text-[#0F4C5C] font-medium hover:underline" data-testid="register-link">
              Registrati
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
