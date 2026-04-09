import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
      if (result.data?.is_creator) {
        navigate('/creator');
      } else {
        navigate('/dashboard');
      }
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F7FAFC] flex" data-testid="login-page">
      <div className="hidden lg:flex lg:w-1/2 bg-[#0F4C5C] text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M0 0h40v40H0V0zm40 40h40v40H40V40z'/%3E%3C/g%3E%3C/svg%3E")`}} />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-20">
            <div className="w-11 h-11 rounded-xl bg-[#5DD9C1]/15 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M6 4V20" stroke="#5DD9C1" strokeWidth="2.5" strokeLinecap="round"/><path d="M18 4V20" stroke="#5DD9C1" strokeWidth="2.5" strokeLinecap="round"/><path d="M6 12H18" stroke="#5DD9C1" strokeWidth="2.5" strokeLinecap="round"/></svg>
            </div>
            <span className="text-xl font-bold tracking-tight">Herion</span>
          </div>

          <h1 className="text-4xl font-bold leading-[1.15] mb-5 tracking-tight">
            Precisione.<br />Controllo.<br />Sicurezza.
          </h1>
          <p className="text-base text-white/60 leading-relaxed max-w-sm">
            La piattaforma europea per la gestione fiscale intelligente. Assistenza AI trasparente per professionisti e imprese.
          </p>
        </div>

        <div className="relative z-10 space-y-3">
          {[
            { icon: Shield, title: "Trasparenza totale", desc: "Ogni azione AI e registrata e verificabile" },
            { icon: Sparkles, title: "5 agenti AI specializzati", desc: "Analisi, validazione, conformita, documenti, comunicazione" },
            { icon: BarChart3, title: "Pronto per l'Europa", desc: "Supporto multi-paese per la conformita fiscale" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3.5 p-3.5 bg-white/[0.04] rounded-xl border border-white/[0.06]">
              <div className="w-9 h-9 rounded-lg bg-[#5DD9C1]/15 flex items-center justify-center flex-shrink-0">
                <item.icon className="w-4.5 h-4.5 text-[#5DD9C1]" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-white/50">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-fade-in-up">
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-10 h-10 rounded-xl bg-[#0F4C5C] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 4V20" stroke="#5DD9C1" strokeWidth="2.5" strokeLinecap="round"/><path d="M18 4V20" stroke="#5DD9C1" strokeWidth="2.5" strokeLinecap="round"/><path d="M6 12H18" stroke="#5DD9C1" strokeWidth="2.5" strokeLinecap="round"/></svg>
            </div>
            <span className="text-lg font-bold text-[#0F172A]">Herion</span>
          </div>

          <h2 className="text-2xl font-bold text-[#0F172A] mb-1.5 tracking-tight">Bentornato</h2>
          <p className="text-[#475569] text-sm mb-8">Accedi al tuo account Herion</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm" data-testid="login-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold text-[#475569] uppercase tracking-wider">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@esempio.it" required className="rounded-xl border-[#E2E8F0] h-12 text-sm focus:border-[#0F4C5C] focus:ring-1 focus:ring-[#0F4C5C]" data-testid="login-email-input" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold text-[#475569] uppercase tracking-wider">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="La tua password" required className="rounded-xl border-[#E2E8F0] h-12 text-sm pr-10 focus:border-[#0F4C5C] focus:ring-1 focus:ring-[#0F4C5C]" data-testid="login-password-input" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569] transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs font-medium text-[#0F4C5C] hover:underline" data-testid="forgot-password-link">
                Password dimenticata?
              </Link>
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-[#0F4C5C] hover:bg-[#0b3844] text-white rounded-xl h-12 text-sm font-semibold shadow-sm transition-all duration-200 hover:shadow-md" data-testid="login-submit-btn">
              {loading ? 'Accesso in corso...' : 'Accedi'}
              {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-[#475569]">
            Non hai un account?{' '}
            <Link to="/register" className="text-[#0F4C5C] font-semibold hover:underline" data-testid="register-link">Registrati</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
