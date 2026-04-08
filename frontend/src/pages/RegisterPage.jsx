import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getCountries } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Eye, EyeOff, AlertCircle, User, Building2, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

const CLIENT_TYPES = [
  { value: 'private', label: 'Privato', icon: User, desc: 'Persona fisica' },
  { value: 'freelancer', label: 'Professionista', icon: Briefcase, desc: 'Lavoratore autonomo' },
  { value: 'company', label: 'Azienda', icon: Building2, desc: 'Societa o impresa' },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [countries, setCountries] = useState([]);

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', date_of_birth: '',
    country: 'IT', city: '', address: '', client_type: '',
    vat_number: '', fiscal_code: '', company_name: '',
    password: '', confirmPassword: '',
    privacy_consent: false, terms_consent: false,
  });

  const [errors, setErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCountries().then(r => setCountries(r.data)).catch(() => {});
  }, []);

  const validate = () => {
    const e = {};
    if (!form.first_name.trim()) e.first_name = 'Il nome e obbligatorio';
    if (!form.last_name.trim()) e.last_name = 'Il cognome e obbligatorio';
    if (!form.email.trim()) e.email = "L'email e obbligatoria";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email non valida';
    if (!form.phone.trim()) e.phone = 'Il telefono e obbligatorio';
    if (!form.date_of_birth) e.date_of_birth = 'La data di nascita e obbligatoria';
    if (!form.country) e.country = 'Il paese e obbligatorio';
    if (!form.city.trim()) e.city = 'La citta e obbligatoria';
    if (!form.address.trim()) e.address = "L'indirizzo e obbligatorio";
    if (!form.client_type) e.client_type = 'Seleziona il tipo di cliente';
    if ((form.client_type === 'freelancer' || form.client_type === 'company') && !form.vat_number.trim()) e.vat_number = 'La Partita IVA e obbligatoria';
    if (form.client_type === 'company' && !form.company_name.trim()) e.company_name = 'La ragione sociale e obbligatoria';
    if (!form.fiscal_code.trim()) e.fiscal_code = 'Il codice fiscale e obbligatorio';
    if (!form.password) e.password = 'La password e obbligatoria';
    else if (form.password.length < 8) e.password = 'Minimo 8 caratteri';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Le password non corrispondono';
    if (!form.privacy_consent) e.privacy_consent = "Accetta l'informativa privacy";
    if (!form.terms_consent) e.terms_consent = 'Accetta i termini di servizio';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) { toast.error('Correggi gli errori nel modulo'); return; }
    setLoading(true);
    const { confirmPassword: _, ...data } = form;
    const result = await register(data);
    if (result.success) {
      toast.success('Account creato con successo!');
      navigate('/dashboard');
    } else {
      toast.error('Errore nella registrazione', { description: result.error });
    }
    setLoading(false);
  };

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const FieldError = ({ field }) => errors[field] ? <p className="text-xs text-red-500 flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" />{errors[field]}</p> : null;

  const showVat = form.client_type === 'freelancer' || form.client_type === 'company';
  const showCompany = form.client_type === 'company';
  const selectedCountry = countries.find(c => c.code === form.country);

  return (
    <div className="min-h-screen bg-[#F7FAFC] flex" data-testid="register-page">
      <div className="hidden lg:flex lg:w-[42%] bg-[#0F4C5C] text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M0 0h40v40H0V0zm40 40h40v40H40V40z'/%3E%3C/g%3E%3C/svg%3E")`}} />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-20">
            <div className="w-11 h-11 rounded-xl bg-[#5DD9C1]/15 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M6 4V20" stroke="#5DD9C1" strokeWidth="2.5" strokeLinecap="round"/><path d="M18 4V20" stroke="#5DD9C1" strokeWidth="2.5" strokeLinecap="round"/><path d="M6 12H18" stroke="#5DD9C1" strokeWidth="2.5" strokeLinecap="round"/></svg>
            </div>
            <span className="text-xl font-bold tracking-tight">Herion</span>
          </div>
          <h1 className="text-3xl font-bold leading-tight mb-4 tracking-tight">Il tuo assistente<br />fiscale europeo</h1>
          <p className="text-sm text-white/60 leading-relaxed max-w-xs">
            Gestione fiscale intelligente, conformita garantita, documenti organizzati. Tutto in pochi clic.
          </p>
        </div>
        <div className="relative z-10 space-y-2.5 text-sm text-white/50">
          <p>Risparmio di tempo e meno confusione</p>
          <p>Processi chiari e guidati dall'AI</p>
          <p>Supporto per privati, professionisti e aziende</p>
        </div>
      </div>

      <div className="w-full lg:w-[58%] flex items-start justify-center p-6 sm:p-8 lg:p-10 overflow-y-auto">
        <div className="w-full max-w-xl animate-fade-in-up">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#0F4C5C] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 4V20" stroke="#5DD9C1" strokeWidth="2.5" strokeLinecap="round"/><path d="M18 4V20" stroke="#5DD9C1" strokeWidth="2.5" strokeLinecap="round"/><path d="M6 12H18" stroke="#5DD9C1" strokeWidth="2.5" strokeLinecap="round"/></svg>
            </div>
            <span className="text-lg font-bold text-[#0F172A]">Herion</span>
          </div>

          <h2 className="text-2xl font-bold text-[#0F172A] mb-1 tracking-tight">Crea il tuo account</h2>
          <p className="text-sm text-[#475569] mb-7">Compila i campi per iniziare con Herion.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Personal Info */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-[#0F4C5C] uppercase tracking-wider">Informazioni Personali</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs font-semibold text-[#475569] uppercase tracking-wider">Nome *</Label>
                  <Input value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Mario" className="rounded-xl border-[#E2E8F0] h-11 text-sm mt-1.5" data-testid="register-firstname-input" /><FieldError field="first_name" /></div>
                <div><Label className="text-xs font-semibold text-[#475569] uppercase tracking-wider">Cognome *</Label>
                  <Input value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Rossi" className="rounded-xl border-[#E2E8F0] h-11 text-sm mt-1.5" data-testid="register-lastname-input" /><FieldError field="last_name" /></div>
              </div>
              <div><Label className="text-xs font-semibold text-[#475569] uppercase tracking-wider">Email *</Label>
                <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="mario.rossi@esempio.it" className="rounded-xl border-[#E2E8F0] h-11 text-sm mt-1.5" data-testid="register-email-input" /><FieldError field="email" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs font-semibold text-[#475569] uppercase tracking-wider">Telefono *</Label>
                  <Input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+39 333 1234567" className="rounded-xl border-[#E2E8F0] h-11 text-sm mt-1.5" data-testid="register-phone-input" /><FieldError field="phone" /></div>
                <div><Label className="text-xs font-semibold text-[#475569] uppercase tracking-wider">Data di Nascita *</Label>
                  <Input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} className="rounded-xl border-[#E2E8F0] h-11 text-sm mt-1.5" data-testid="register-dob-input" /><FieldError field="date_of_birth" /></div>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4 pt-2">
              <p className="text-xs font-semibold text-[#0F4C5C] uppercase tracking-wider">Residenza</p>
              <div><Label className="text-xs font-semibold text-[#475569] uppercase tracking-wider">Paese *</Label>
                <Select value={form.country} onValueChange={v => set('country', v)}>
                  <SelectTrigger className="rounded-xl border-[#E2E8F0] h-11 text-sm mt-1.5" data-testid="register-country-select"><SelectValue placeholder="Seleziona paese" /></SelectTrigger>
                  <SelectContent className="rounded-xl max-h-64">{countries.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}</SelectContent>
                </Select><FieldError field="country" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs font-semibold text-[#475569] uppercase tracking-wider">Citta *</Label>
                  <Input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Milano" className="rounded-xl border-[#E2E8F0] h-11 text-sm mt-1.5" data-testid="register-city-input" /><FieldError field="city" /></div>
                <div><Label className="text-xs font-semibold text-[#475569] uppercase tracking-wider">Indirizzo *</Label>
                  <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Via Roma 1" className="rounded-xl border-[#E2E8F0] h-11 text-sm mt-1.5" data-testid="register-address-input" /><FieldError field="address" /></div>
              </div>
            </div>

            {/* Client Type */}
            <div className="space-y-4 pt-2">
              <p className="text-xs font-semibold text-[#0F4C5C] uppercase tracking-wider">Tipo di Cliente</p>
              <div className="grid grid-cols-3 gap-2.5">
                {CLIENT_TYPES.map(t => (
                  <button key={t.value} type="button" onClick={() => set('client_type', t.value)}
                    className={`p-3.5 border rounded-xl text-center transition-all duration-200 ${form.client_type === t.value ? 'border-[#0F4C5C] bg-[#0F4C5C]/[0.03] ring-1 ring-[#0F4C5C]' : 'border-[#E2E8F0] hover:border-[#0F4C5C]/30'}`}
                    data-testid={`client-type-${t.value}`}>
                    <t.icon className={`w-5 h-5 mx-auto mb-1.5 ${form.client_type === t.value ? 'text-[#0F4C5C]' : 'text-[#94A3B8]'}`} strokeWidth={1.5} />
                    <p className="text-xs font-semibold text-[#0F172A]">{t.label}</p>
                    <p className="text-[10px] text-[#475569] mt-0.5">{t.desc}</p>
                  </button>
                ))}
              </div>
              <FieldError field="client_type" />
            </div>

            {/* Fiscal Info */}
            <div className="space-y-4 pt-2">
              <p className="text-xs font-semibold text-[#0F4C5C] uppercase tracking-wider">Dati Fiscali</p>
              {showVat && (
                <div className="animate-fade-in"><Label className="text-xs font-semibold text-[#475569] uppercase tracking-wider">Partita IVA *</Label>
                  <Input value={form.vat_number} onChange={e => set('vat_number', e.target.value)} placeholder="12345678901" className="rounded-xl border-[#E2E8F0] h-11 text-sm font-mono mt-1.5" data-testid="register-vat-input" /><FieldError field="vat_number" /></div>
              )}
              {showCompany && (
                <div className="animate-fade-in"><Label className="text-xs font-semibold text-[#475569] uppercase tracking-wider">Ragione Sociale *</Label>
                  <Input value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Herion S.r.l." className="rounded-xl border-[#E2E8F0] h-11 text-sm mt-1.5" data-testid="register-company-input" /><FieldError field="company_name" /></div>
              )}
              <div><Label className="text-xs font-semibold text-[#475569] uppercase tracking-wider">{selectedCountry?.fiscal_id_label || 'Codice Fiscale'} *</Label>
                <Input value={form.fiscal_code} onChange={e => set('fiscal_code', e.target.value.toUpperCase())} placeholder="RSSMRA85M01H501Z" className="rounded-xl border-[#E2E8F0] h-11 text-sm font-mono mt-1.5" data-testid="register-fiscalcode-input" /><FieldError field="fiscal_code" /></div>
            </div>

            {/* Password */}
            <div className="space-y-4 pt-2">
              <p className="text-xs font-semibold text-[#0F4C5C] uppercase tracking-wider">Sicurezza</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs font-semibold text-[#475569] uppercase tracking-wider">Password *</Label>
                  <div className="relative mt-1.5">
                    <Input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min. 8 caratteri" className="rounded-xl border-[#E2E8F0] h-11 text-sm pr-10" data-testid="register-password-input" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]">{showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                  </div><FieldError field="password" /></div>
                <div><Label className="text-xs font-semibold text-[#475569] uppercase tracking-wider">Conferma *</Label>
                  <div className="relative mt-1.5">
                    <Input type={showCpw ? 'text' : 'password'} value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} placeholder="Ripeti" className="rounded-xl border-[#E2E8F0] h-11 text-sm pr-10" data-testid="register-confirm-password-input" />
                    <button type="button" onClick={() => setShowCpw(!showCpw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]">{showCpw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                  </div><FieldError field="confirmPassword" /></div>
              </div>
            </div>

            {/* Consent */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start space-x-3">
                <Checkbox id="privacy" checked={form.privacy_consent} onCheckedChange={c => set('privacy_consent', c)} className="mt-0.5 rounded" data-testid="register-privacy-checkbox" />
                <div><Label htmlFor="privacy" className="text-sm text-[#475569] cursor-pointer">Accetto l'<span className="text-[#0F4C5C] font-medium">informativa sulla privacy</span> *</Label><FieldError field="privacy_consent" /></div>
              </div>
              <div className="flex items-start space-x-3">
                <Checkbox id="terms" checked={form.terms_consent} onCheckedChange={c => set('terms_consent', c)} className="mt-0.5 rounded" data-testid="register-terms-checkbox" />
                <div><Label htmlFor="terms" className="text-sm text-[#475569] cursor-pointer">Accetto i <span className="text-[#0F4C5C] font-medium">termini di servizio</span> *</Label><FieldError field="terms_consent" /></div>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-[#0F4C5C] hover:bg-[#0b3844] text-white rounded-xl h-12 text-sm font-semibold shadow-sm" data-testid="register-submit-btn">
              {loading ? 'Creazione account...' : 'Crea account'}
              {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[#475569]">
            Hai gia un account? <Link to="/login" className="text-[#0F4C5C] font-semibold hover:underline" data-testid="login-link">Accedi</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
