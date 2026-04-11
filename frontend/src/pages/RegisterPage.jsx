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
import { HerionMark } from '@/components/HerionLogo';
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

  useEffect(() => { getCountries().then(r => setCountries(r.data)).catch(() => {}); }, []);

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
    if (result.success) { toast.success('Account creato!'); navigate('/dashboard'); }
    else { toast.error('Errore', { description: result.error }); }
    setLoading(false);
  };

  const set = (field, value) => { setForm(prev => ({ ...prev, [field]: value })); if (errors[field]) setErrors(prev => ({ ...prev, [field]: null })); };
  const FieldError = ({ field }) => errors[field] ? <p className="text-[10px] text-red-500 flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" />{errors[field]}</p> : null;
  const showVat = form.client_type === 'freelancer' || form.client_type === 'company';
  const showCompany = form.client_type === 'company';
  const selectedCountry = countries.find(c => c.code === form.country);

  const inputClass = "rounded-lg h-10 text-[12px] mt-1";
  const labelClass = "text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider";
  const sectionClass = "text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-wider";

  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex items-start justify-center py-12 px-6" data-testid="register-page">
      <div className="w-full max-w-lg animate-fade-in-up">
        <div className="flex flex-col items-center mb-8">
          <HerionMark size={40} />
          <h2 className="text-xl font-bold text-[var(--text-primary)] mt-4 tracking-tight">Crea il tuo account</h2>
          <p className="text-[12px] text-[var(--text-secondary)] mt-1">Compila i campi per iniziare</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Personal */}
          <div className="space-y-3">
            <p className={sectionClass}>Informazioni Personali</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className={labelClass}>Nome *</Label><Input value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Mario" className={inputClass} style={{ borderColor: 'var(--border-soft)' }} data-testid="register-firstname-input" /><FieldError field="first_name" /></div>
              <div><Label className={labelClass}>Cognome *</Label><Input value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Rossi" className={inputClass} style={{ borderColor: 'var(--border-soft)' }} data-testid="register-lastname-input" /><FieldError field="last_name" /></div>
            </div>
            <div><Label className={labelClass}>Email *</Label><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="mario.rossi@esempio.it" className={inputClass} style={{ borderColor: 'var(--border-soft)' }} data-testid="register-email-input" /><FieldError field="email" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className={labelClass}>Telefono *</Label><Input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+39 333 1234567" className={inputClass} style={{ borderColor: 'var(--border-soft)' }} data-testid="register-phone-input" /><FieldError field="phone" /></div>
              <div><Label className={labelClass}>Data di Nascita *</Label><Input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} className={inputClass} style={{ borderColor: 'var(--border-soft)' }} data-testid="register-dob-input" /><FieldError field="date_of_birth" /></div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-3">
            <p className={sectionClass}>Residenza</p>
            <div><Label className={labelClass}>Paese *</Label>
              <Select value={form.country} onValueChange={v => set('country', v)}>
                <SelectTrigger className="rounded-lg h-10 text-[12px] mt-1" style={{ borderColor: 'var(--border-soft)' }} data-testid="register-country-select"><SelectValue placeholder="Seleziona" /></SelectTrigger>
                <SelectContent className="rounded-lg max-h-64">{countries.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}</SelectContent>
              </Select><FieldError field="country" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className={labelClass}>Citta *</Label><Input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Milano" className={inputClass} style={{ borderColor: 'var(--border-soft)' }} data-testid="register-city-input" /><FieldError field="city" /></div>
              <div><Label className={labelClass}>Indirizzo *</Label><Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Via Roma 1" className={inputClass} style={{ borderColor: 'var(--border-soft)' }} data-testid="register-address-input" /><FieldError field="address" /></div>
            </div>
          </div>

          {/* Client Type */}
          <div className="space-y-3">
            <p className={sectionClass}>Tipo di Cliente</p>
            <div className="grid grid-cols-3 gap-2">
              {CLIENT_TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => set('client_type', t.value)}
                  className={`p-3 border rounded-lg text-center transition-all ${form.client_type === t.value ? 'border-[var(--text-primary)] bg-[var(--hover-soft)] ring-1 ring-[var(--text-primary)]' : 'hover:border-[var(--text-secondary)]/30'}`}
                  style={{ borderColor: form.client_type === t.value ? undefined : 'var(--border-soft)' }}
                  data-testid={`client-type-${t.value}`}>
                  <t.icon className={`w-4 h-4 mx-auto mb-1 ${form.client_type === t.value ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`} strokeWidth={1.5} />
                  <p className="text-[11px] font-semibold text-[var(--text-primary)]">{t.label}</p>
                  <p className="text-[9px] text-[var(--text-muted)]">{t.desc}</p>
                </button>
              ))}
            </div>
            <FieldError field="client_type" />
          </div>

          {/* Fiscal */}
          <div className="space-y-3">
            <p className={sectionClass}>Dati Fiscali</p>
            {showVat && <div className="animate-fade-in"><Label className={labelClass}>Partita IVA *</Label><Input value={form.vat_number} onChange={e => set('vat_number', e.target.value)} placeholder="12345678901" className={`${inputClass} font-mono`} style={{ borderColor: 'var(--border-soft)' }} data-testid="register-vat-input" /><FieldError field="vat_number" /></div>}
            {showCompany && <div className="animate-fade-in"><Label className={labelClass}>Ragione Sociale *</Label><Input value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Herion S.r.l." className={inputClass} style={{ borderColor: 'var(--border-soft)' }} data-testid="register-company-input" /><FieldError field="company_name" /></div>}
            <div><Label className={labelClass}>{selectedCountry?.fiscal_id_label || 'Codice Fiscale'} *</Label><Input value={form.fiscal_code} onChange={e => set('fiscal_code', e.target.value.toUpperCase())} placeholder="RSSMRA85M01H501Z" className={`${inputClass} font-mono`} style={{ borderColor: 'var(--border-soft)' }} data-testid="register-fiscalcode-input" /><FieldError field="fiscal_code" /></div>
          </div>

          {/* Password */}
          <div className="space-y-3">
            <p className={sectionClass}>Sicurezza</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className={labelClass}>Password *</Label><div className="relative mt-1"><Input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min. 8 caratteri" className="rounded-lg h-10 text-[12px] pr-9" style={{ borderColor: 'var(--border-soft)' }} data-testid="register-password-input" /><button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">{showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button></div><FieldError field="password" /></div>
              <div><Label className={labelClass}>Conferma *</Label><div className="relative mt-1"><Input type={showCpw ? 'text' : 'password'} value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} placeholder="Ripeti" className="rounded-lg h-10 text-[12px] pr-9" style={{ borderColor: 'var(--border-soft)' }} data-testid="register-confirm-password-input" /><button type="button" onClick={() => setShowCpw(!showCpw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">{showCpw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button></div><FieldError field="confirmPassword" /></div>
            </div>
          </div>

          {/* Consent */}
          <div className="space-y-2.5">
            <div className="flex items-start space-x-2.5">
              <Checkbox id="privacy" checked={form.privacy_consent} onCheckedChange={c => set('privacy_consent', c)} className="mt-0.5 rounded" data-testid="register-privacy-checkbox" />
              <Label htmlFor="privacy" className="text-[11px] text-[var(--text-secondary)] cursor-pointer">Accetto l'<span className="text-[var(--text-primary)] font-medium">informativa privacy</span> *</Label>
            </div>
            <FieldError field="privacy_consent" />
            <div className="flex items-start space-x-2.5">
              <Checkbox id="terms" checked={form.terms_consent} onCheckedChange={c => set('terms_consent', c)} className="mt-0.5 rounded" data-testid="register-terms-checkbox" />
              <Label htmlFor="terms" className="text-[11px] text-[var(--text-secondary)] cursor-pointer">Accetto i <span className="text-[var(--text-primary)] font-medium">termini di servizio</span> *</Label>
            </div>
            <FieldError field="terms_consent" />
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-[var(--text-primary)] hover:bg-[#2a3040] text-white rounded-lg h-11 text-[13px] font-semibold" data-testid="register-submit-btn">
            {loading ? 'Creazione...' : 'Crea account'}
            {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </form>

        <p className="mt-6 text-center text-[12px] text-[var(--text-secondary)]">
          Hai gia un account? <Link to="/login" className="text-[var(--text-primary)] font-semibold hover:underline" data-testid="login-link">Accedi</Link>
        </p>
      </div>
    </div>
  );
}
