import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { resetPassword } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('La password deve avere almeno 8 caratteri'); return; }
    if (password !== confirmPassword) { setError('Le password non corrispondono'); return; }
    setLoading(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Link non valido o scaduto');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6" data-testid="reset-password-page">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 shadow-sm text-center max-w-md">
          <h1 className="text-xl font-bold text-[#0F172A] mb-3">Link non valido</h1>
          <p className="text-sm text-[#475569] mb-5">Il link di reset non e valido. Richiedi un nuovo link.</p>
          <Link to="/forgot-password"><Button className="bg-[#0A192F] hover:bg-[#0B243B] rounded-xl text-sm">Richiedi nuovo link</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6" data-testid="reset-password-page">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
          {!success ? (
            <>
              <div className="w-14 h-14 rounded-2xl bg-[#0A192F]/5 flex items-center justify-center mb-6">
                <Lock className="w-7 h-7 text-[#0A192F]" strokeWidth={1.5} />
              </div>
              <h1 className="text-xl font-bold text-[#0F172A] mb-2 tracking-tight">Nuova password</h1>
              <p className="text-sm text-[#475569] mb-6">Inserisci la tua nuova password. Deve avere almeno 8 caratteri.</p>

              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 text-sm">{error}</div>}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-[#475569] uppercase tracking-wider">Nuova Password</Label>
                  <div className="relative">
                    <Input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 caratteri" required className="rounded-xl border-[#E2E8F0] h-12 text-sm pr-10" data-testid="reset-password-input" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569]">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-[#475569] uppercase tracking-wider">Conferma Password</Label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Ripeti la password" required className="rounded-xl border-[#E2E8F0] h-12 text-sm" data-testid="reset-confirm-input" />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-[#0A192F] hover:bg-[#0B243B] text-white rounded-xl h-12 text-sm font-semibold" data-testid="reset-submit-btn">
                  {loading ? 'Aggiornamento...' : 'Reimposta password'}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-5">
                <CheckCircle className="w-7 h-7 text-emerald-600" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-bold text-[#0F172A] mb-2">Password aggiornata</h2>
              <p className="text-sm text-[#475569] mb-6">La tua password e stata reimpostata con successo.</p>
              <Link to="/login"><Button className="bg-[#0A192F] hover:bg-[#0B243B] rounded-xl text-sm" data-testid="go-login-btn">Accedi</Button></Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
