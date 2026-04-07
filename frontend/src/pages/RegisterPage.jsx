import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!consent) {
      setError('Devi accettare il consenso al trattamento dei dati.');
      return;
    }

    if (password.length < 6) {
      setError('La password deve contenere almeno 6 caratteri.');
      return;
    }

    setLoading(true);
    const result = await register(email, password, name);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F9F9F8] flex" data-testid="register-page">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#001F54] text-white p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <FileText className="w-10 h-10" />
            <span className="text-2xl font-bold tracking-tight">AIC</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-6">
            Inizia Oggi
          </h1>
          <p className="text-lg text-white/80 leading-relaxed">
            Crea il tuo account per accedere a tutti i servizi di gestione fiscale intelligente.
          </p>
        </div>
        <div className="space-y-4 text-sm text-white/60">
          <p>4 Agenti AI specializzati al tuo servizio</p>
          <p>Tracciamento completo di ogni operazione</p>
          <p>Supporto per tutte le pratiche fiscali</p>
        </div>
      </div>

      {/* Right Panel - Register Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <FileText className="w-8 h-8 text-[#001F54]" />
            <span className="text-xl font-bold text-[#001F54]">AIC</span>
          </div>
          
          <h2 className="heading-2 mb-2">Crea Account</h2>
          <p className="body-text mb-8">
            Compila i campi per registrarti al sistema.
          </p>

          {error && (
            <div className="bg-[#E63946]/10 border border-[#E63946] text-[#E63946] px-4 py-3 rounded-sm mb-6 text-sm" data-testid="register-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="label-text">Nome Completo</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mario Rossi"
                required
                className="border-[#E5E5E3] focus:ring-1 focus:ring-[#001F54] rounded-sm"
                data-testid="register-name-input"
              />
            </div>

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
                data-testid="register-email-input"
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
                  placeholder="Minimo 6 caratteri"
                  required
                  className="border-[#E5E5E3] focus:ring-1 focus:ring-[#001F54] rounded-sm pr-10"
                  data-testid="register-password-input"
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

            <div className="flex items-start space-x-3">
              <Checkbox
                id="consent"
                checked={consent}
                onCheckedChange={setConsent}
                className="mt-1"
                data-testid="register-consent-checkbox"
              />
              <Label htmlFor="consent" className="text-sm text-[#5C5C59] leading-relaxed cursor-pointer">
                Acconsento al trattamento dei miei dati personali secondo la normativa vigente. 
                Comprendo che ogni azione AI sarà registrata e trasparente.
              </Label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#001F54] hover:bg-[#001F54]/90 text-white rounded-sm h-11"
              data-testid="register-submit-btn"
            >
              {loading ? 'Registrazione in corso...' : 'Registrati'}
              {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </form>

          <p className="mt-6 text-center body-text">
            Hai già un account?{' '}
            <Link to="/login" className="text-[#001F54] font-medium hover:underline" data-testid="login-link">
              Accedi
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
