import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { HerionMark } from '@/components/HerionLogo';
import { DEMO_ACCOUNTS, LOCAL_DEV_MODE } from '@/config/devMode';

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
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="flex flex-col items-center mb-10">
          <HerionMark size={44} />
          <h2 className="text-xl font-bold text-[var(--text-primary)] mt-5 tracking-tight">Bentornato</h2>
          <p className="text-[var(--text-secondary)] text-[13px] mt-1">Accedi al tuo account Herion</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-5 text-[12px]" data-testid="login-error">
            {error}
          </div>
        )}

        {LOCAL_DEV_MODE && (
          <div className="bg-white border rounded-xl p-3.5 mb-5" style={{ borderColor: 'var(--border-soft)' }} data-testid="local-dev-banner">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-wider">Local UX Mode</p>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-[var(--surface-accent-1)]/25 text-[var(--text-primary)] font-semibold">
                Demo Access
              </span>
            </div>
            <div className="space-y-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => { setEmail(account.email); setPassword(account.password); }}
                  className="w-full text-left rounded-lg border px-3 py-2 hover:bg-[var(--hover-soft)] transition-colors"
                  style={{ borderColor: 'var(--border-soft)' }}
                  data-testid={`demo-account-${account.role}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12px] font-semibold text-[var(--text-primary)]">{account.label}</p>
                    <span className="text-[10px] text-[var(--text-muted)] uppercase">{account.role}</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{account.email}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@esempio.it" required className="rounded-lg h-11 text-[13px] mt-1.5" style={{ borderColor: 'var(--border-soft)' }} data-testid="login-email-input" />
          </div>

          <div>
            <Label htmlFor="password" className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Password</Label>
            <div className="relative mt-1.5">
              <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="La tua password" required className="rounded-lg h-11 text-[13px] pr-10" style={{ borderColor: 'var(--border-soft)' }} data-testid="login-password-input" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline" data-testid="forgot-password-link">
              Password dimenticata?
            </Link>
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-[var(--text-primary)] hover:bg-[#2a3040] text-white rounded-lg h-11 text-[13px] font-semibold shadow-sm transition-all" data-testid="login-submit-btn">
            {loading ? 'Accesso...' : 'Accedi'}
            {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </form>

        <p className="mt-8 text-center text-[12px] text-[var(--text-secondary)]">
          Non hai un account?{' '}
          <Link to="/register" className="text-[var(--text-primary)] font-semibold hover:underline" data-testid="register-link">Registrati</Link>
        </p>
      </div>
    </div>
  );
}
