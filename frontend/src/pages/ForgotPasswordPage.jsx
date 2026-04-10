import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Si e verificato un errore');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6" data-testid="forgot-password-page">
      <div className="w-full max-w-md animate-fade-in-up">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-[#475569] hover:text-[#0F172A] mb-8 transition-colors" data-testid="back-to-login">
          <ArrowLeft className="w-4 h-4" /> Torna al login
        </Link>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
          {!sent ? (
            <>
              <div className="w-14 h-14 rounded-2xl bg-[#0A192F]/5 flex items-center justify-center mb-6">
                <Mail className="w-7 h-7 text-[#0A192F]" strokeWidth={1.5} />
              </div>
              <h1 className="text-xl font-bold text-[#0F172A] mb-2 tracking-tight">Password dimenticata?</h1>
              <p className="text-sm text-[#475569] mb-6 leading-relaxed">
                Inserisci il tuo indirizzo email e ti invieremo un link per reimpostare la password.
              </p>

              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 text-sm">{error}</div>}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold text-[#475569] uppercase tracking-wider">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@esempio.it" required className="rounded-xl border-[#E2E8F0] h-12 text-sm" data-testid="forgot-email-input" />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-[#0A192F] hover:bg-[#0B243B] text-white rounded-xl h-12 text-sm font-semibold" data-testid="forgot-submit-btn">
                  {loading ? 'Invio in corso...' : 'Invia link di reset'}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-5">
                <CheckCircle className="w-7 h-7 text-emerald-600" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-bold text-[#0F172A] mb-2">Controlla la tua email</h2>
              <p className="text-sm text-[#475569] leading-relaxed mb-6">
                Se l'indirizzo <span className="font-medium text-[#0F172A]">{email}</span> e registrato, riceverai un link per reimpostare la password.
              </p>
              <Link to="/login">
                <Button variant="outline" className="rounded-xl border-[#E2E8F0] text-sm" data-testid="back-login-btn">
                  Torna al login
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
