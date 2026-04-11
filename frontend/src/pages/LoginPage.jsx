import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { HerionBrand } from '@/components/HerionLogo';

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
      navigate(result.data?.is_creator ? '/creator' : '/dashboard');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center px-6" data-testid="login-page">
      <div className="w-full max-w-[360px] animate-fade-in-up">
        {/* Single brand block — logo + name, no duplication */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <HerionBrand size={40} showText />
        </div>

        <div className="bg-white rounded-2xl border p-6" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-soft)' }}>
          <p className="text-[15px] font-bold text-[var(--text-primary)] mb-1">Accedi</p>
          <p className="text-[12px] text-[var(--text-muted)] mb-5">Inserisci le tue credenziali per continuare</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg mb-4 text-[11px]" data-testid="login-error">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@esempio.it" required className="rounded-xl h-10 text-[13px] mt-1" style={{ borderColor: 'var(--border-soft)' }} data-testid="login-email-input" />
            </div>
            <div>
              <Label htmlFor="password" className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Password</Label>
              <div className="relative mt-1">
                <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="La tua password" required className="rounded-xl h-10 text-[13px] pr-10" style={{ borderColor: 'var(--border-soft)' }} data-testid="login-password-input" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline" data-testid="forgot-password-link">Password dimenticata?</Link>
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-[#0ABFCF] hover:bg-[#09a8b6] text-white rounded-xl h-10 text-[13px] font-semibold" data-testid="login-submit-btn">
              {loading ? 'Accesso...' : 'Accedi'}
              {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </form>
        </div>

        <p className="mt-5 text-center text-[12px] text-[var(--text-secondary)]">
          Non hai un account? <Link to="/register" className="text-[#0ABFCF] font-semibold hover:underline" data-testid="register-link">Registrati</Link>
        </p>
      </div>
    </div>
  );
}
