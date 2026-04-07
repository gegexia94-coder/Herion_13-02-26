import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, ArrowRight, Eye, EyeOff } from 'lucide-react';

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
    <div className="min-h-screen bg-[#F9F9F8] flex" data-testid="login-page">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#001F54] text-white p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <FileText className="w-10 h-10" />
            <span className="text-2xl font-bold tracking-tight">AIC</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-6">
            Artificial<br />Commercialista
          </h1>
          <p className="text-lg text-white/80 leading-relaxed">
            Gestisci le tue pratiche fiscali con l'aiuto dell'intelligenza artificiale.
            Trasparenza totale, nessuna logica nascosta.
          </p>
        </div>
        <div className="space-y-4 text-sm text-white/60">
          <p>Ogni azione AI è registrata e spiegabile</p>
          <p>Nessuna raccolta dati senza consenso</p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <FileText className="w-8 h-8 text-[#001F54]" />
            <span className="text-xl font-bold text-[#001F54]">AIC</span>
          </div>
          
          <h2 className="heading-2 mb-2">Accedi</h2>
          <p className="body-text mb-8">
            Inserisci le tue credenziali per accedere al sistema.
          </p>

          {error && (
            <div className="bg-[#E63946]/10 border border-[#E63946] text-[#E63946] px-4 py-3 rounded-sm mb-6 text-sm" data-testid="login-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="label-text">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@esempio.it"
                required
                className="border-[#E5E5E3] focus:ring-1 focus:ring-[#001F54] rounded-sm"
                data-testid="login-email-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="label-text">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="border-[#E5E5E3] focus:ring-1 focus:ring-[#001F54] rounded-sm pr-10"
                  data-testid="login-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A19E] hover:text-[#5C5C59]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#001F54] hover:bg-[#001F54]/90 text-white rounded-sm h-11"
              data-testid="login-submit-btn"
            >
              {loading ? 'Accesso in corso...' : 'Accedi'}
              {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </form>

          <p className="mt-6 text-center body-text">
            Non hai un account?{' '}
            <Link to="/register" className="text-[#001F54] font-medium hover:underline" data-testid="register-link">
              Registrati
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
