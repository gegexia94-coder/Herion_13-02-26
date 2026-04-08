import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HerionLogo } from '@/components/HerionLogo';
import { ArrowRight, Eye, EyeOff, CheckCircle, AlertCircle, User, Building2, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

const CLIENT_TYPES = [
  { value: 'private', label: 'Privato', icon: User, description: 'Persona fisica senza P.IVA' },
  { value: 'freelancer', label: 'Libero Professionista', icon: Briefcase, description: 'Lavoratore autonomo con P.IVA' },
  { value: 'company', label: 'Azienda', icon: Building2, description: 'Società o impresa' },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    clientType: '',
    vatNumber: '',
    fiscalCode: '',
    password: '',
    confirmPassword: '',
    privacyConsent: false,
    termsConsent: false,
  });
  
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.firstName.trim()) newErrors.firstName = 'Il nome è obbligatorio';
    if (!formData.lastName.trim()) newErrors.lastName = 'Il cognome è obbligatorio';
    
    if (!formData.email.trim()) {
      newErrors.email = 'L\'email è obbligatoria';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Inserisci un\'email valida';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Il telefono è obbligatorio';
    } else if (!/^[\d\s+()-]{8,20}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Inserisci un numero di telefono valido';
    }
    
    if (!formData.clientType) newErrors.clientType = 'Seleziona il tipo di cliente';
    
    if ((formData.clientType === 'freelancer' || formData.clientType === 'company') && !formData.vatNumber.trim()) {
      newErrors.vatNumber = 'La Partita IVA è obbligatoria';
    } else if (formData.vatNumber && !/^\d{11}$/.test(formData.vatNumber.replace(/\s/g, ''))) {
      newErrors.vatNumber = 'La Partita IVA deve essere di 11 cifre';
    }
    
    if (!formData.fiscalCode.trim()) {
      newErrors.fiscalCode = 'Il codice fiscale è obbligatorio';
    } else if (!/^[A-Z0-9]{16}$/i.test(formData.fiscalCode.replace(/\s/g, ''))) {
      newErrors.fiscalCode = 'Il codice fiscale deve essere di 16 caratteri';
    }
    
    if (!formData.password) {
      newErrors.password = 'La password è obbligatoria';
    } else if (formData.password.length < 8) {
      newErrors.password = 'La password deve avere almeno 8 caratteri';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Conferma la password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Le password non corrispondono';
    }
    
    if (!formData.privacyConsent) newErrors.privacyConsent = 'Accetta l\'informativa sulla privacy';
    if (!formData.termsConsent) newErrors.termsConsent = 'Accetta i termini di servizio';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Correggi gli errori nel modulo');
      return;
    }

    setLoading(true);
    
    const fullName = `${formData.firstName} ${formData.lastName}`.trim();
    const result = await register(formData.email, formData.password, fullName);
    
    if (result.success) {
      toast.success('Account creato con successo!', {
        description: 'Benvenuto in Herion'
      });
      navigate('/dashboard');
    } else {
      toast.error('Errore nella registrazione', {
        description: result.error
      });
    }
    
    setLoading(false);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const showVatField = formData.clientType === 'freelancer' || formData.clientType === 'company';

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex" data-testid="register-page">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-[#0F4C5C] via-[#0F4C5C] to-[#0A3640] text-white p-12 flex-col justify-between relative overflow-hidden">
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
          
          <h1 className="text-4xl font-semibold leading-tight mb-6">
            Inizia il tuo<br />percorso
          </h1>
          <p className="text-lg text-white/70 leading-relaxed max-w-md">
            Crea il tuo account per accedere alla gestione fiscale intelligente. Precisione e controllo in ogni operazione.
          </p>
        </div>
        
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3 text-white/60">
            <CheckCircle className="w-5 h-5 text-[#5DD9C1]" />
            <span className="text-sm">Assistenza AI trasparente</span>
          </div>
          <div className="flex items-center gap-3 text-white/60">
            <CheckCircle className="w-5 h-5 text-[#5DD9C1]" />
            <span className="text-sm">Ogni azione registrata</span>
          </div>
          <div className="flex items-center gap-3 text-white/60">
            <CheckCircle className="w-5 h-5 text-[#5DD9C1]" />
            <span className="text-sm">Supporto per privati, professionisti e aziende</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Registration Form */}
      <div className="w-full lg:w-[55%] flex items-center justify-center p-6 sm:p-8 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-lg">
          <div className="lg:hidden mb-8">
            <HerionLogo size="lg" />
          </div>
          
          <h2 className="text-2xl font-semibold text-[#111110] mb-2">Crea il tuo account</h2>
          <p className="text-[#5C5C59] mb-8">
            Compila i campi per registrarti a Herion.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-xs font-medium text-[#5C5C59] uppercase tracking-wider">Nome *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  placeholder="Mario"
                  className={`rounded-xl border-[#E5E5E3] h-12 ${errors.firstName ? 'border-[#E63946] focus:ring-[#E63946]' : 'focus:ring-[#0F4C5C]'}`}
                  data-testid="register-firstname-input"
                />
                {errors.firstName && <p className="text-xs text-[#E63946] flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.firstName}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-xs font-medium text-[#5C5C59] uppercase tracking-wider">Cognome *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  placeholder="Rossi"
                  className={`rounded-xl border-[#E5E5E3] h-12 ${errors.lastName ? 'border-[#E63946] focus:ring-[#E63946]' : 'focus:ring-[#0F4C5C]'}`}
                  data-testid="register-lastname-input"
                />
                {errors.lastName && <p className="text-xs text-[#E63946] flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.lastName}</p>}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-medium text-[#5C5C59] uppercase tracking-wider">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="mario.rossi@esempio.it"
                className={`rounded-xl border-[#E5E5E3] h-12 ${errors.email ? 'border-[#E63946] focus:ring-[#E63946]' : 'focus:ring-[#0F4C5C]'}`}
                data-testid="register-email-input"
              />
              {errors.email && <p className="text-xs text-[#E63946] flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.email}</p>}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs font-medium text-[#5C5C59] uppercase tracking-wider">Telefono *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+39 333 1234567"
                className={`rounded-xl border-[#E5E5E3] h-12 ${errors.phone ? 'border-[#E63946] focus:ring-[#E63946]' : 'focus:ring-[#0F4C5C]'}`}
                data-testid="register-phone-input"
              />
              {errors.phone && <p className="text-xs text-[#E63946] flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.phone}</p>}
            </div>

            {/* Client Type */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-[#5C5C59] uppercase tracking-wider">Tipo Cliente *</Label>
              <div className="grid grid-cols-3 gap-3">
                {CLIENT_TYPES.map((type) => {
                  const IconComponent = type.icon;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleChange('clientType', type.value)}
                      className={`p-4 border rounded-xl text-center transition-all duration-200 ${
                        formData.clientType === type.value 
                          ? 'border-[#0F4C5C] bg-[#0F4C5C]/5 ring-1 ring-[#0F4C5C]' 
                          : 'border-[#E5E5E3] hover:border-[#0F4C5C]/50'
                      }`}
                      data-testid={`client-type-${type.value}`}
                    >
                      <IconComponent className={`w-6 h-6 mx-auto mb-2 ${formData.clientType === type.value ? 'text-[#0F4C5C]' : 'text-[#A1A19E]'}`} />
                      <p className="text-xs font-medium text-[#111110]">{type.label}</p>
                    </button>
                  );
                })}
              </div>
              {errors.clientType && <p className="text-xs text-[#E63946] flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.clientType}</p>}
            </div>

            {/* VAT Number - Conditional */}
            {showVatField && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                <Label htmlFor="vatNumber" className="text-xs font-medium text-[#5C5C59] uppercase tracking-wider">
                  Partita IVA *
                </Label>
                <Input
                  id="vatNumber"
                  value={formData.vatNumber}
                  onChange={(e) => handleChange('vatNumber', e.target.value)}
                  placeholder="12345678901"
                  className={`rounded-xl border-[#E5E5E3] h-12 font-mono ${errors.vatNumber ? 'border-[#E63946] focus:ring-[#E63946]' : 'focus:ring-[#0F4C5C]'}`}
                  maxLength={11}
                  data-testid="register-vat-input"
                />
                {errors.vatNumber && <p className="text-xs text-[#E63946] flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.vatNumber}</p>}
              </div>
            )}

            {/* Fiscal Code */}
            <div className="space-y-2">
              <Label htmlFor="fiscalCode" className="text-xs font-medium text-[#5C5C59] uppercase tracking-wider">Codice Fiscale *</Label>
              <Input
                id="fiscalCode"
                value={formData.fiscalCode}
                onChange={(e) => handleChange('fiscalCode', e.target.value.toUpperCase())}
                placeholder="RSSMRA85M01H501Z"
                className={`rounded-xl border-[#E5E5E3] h-12 font-mono ${errors.fiscalCode ? 'border-[#E63946] focus:ring-[#E63946]' : 'focus:ring-[#0F4C5C]'}`}
                maxLength={16}
                data-testid="register-fiscalcode-input"
              />
              {errors.fiscalCode && <p className="text-xs text-[#E63946] flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.fiscalCode}</p>}
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-medium text-[#5C5C59] uppercase tracking-wider">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="Min. 8 caratteri"
                    className={`rounded-xl border-[#E5E5E3] h-12 pr-10 ${errors.password ? 'border-[#E63946] focus:ring-[#E63946]' : 'focus:ring-[#0F4C5C]'}`}
                    data-testid="register-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A19E] hover:text-[#5C5C59] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-[#E63946] flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.password}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-xs font-medium text-[#5C5C59] uppercase tracking-wider">Conferma *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    placeholder="Ripeti password"
                    className={`rounded-xl border-[#E5E5E3] h-12 pr-10 ${errors.confirmPassword ? 'border-[#E63946] focus:ring-[#E63946]' : 'focus:ring-[#0F4C5C]'}`}
                    data-testid="register-confirm-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A19E] hover:text-[#5C5C59] transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-[#E63946] flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.confirmPassword}</p>}
              </div>
            </div>

            {/* Consent Checkboxes */}
            <div className="space-y-4 pt-2">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="privacyConsent"
                  checked={formData.privacyConsent}
                  onCheckedChange={(checked) => handleChange('privacyConsent', checked)}
                  className="mt-0.5 rounded-md"
                  data-testid="register-privacy-checkbox"
                />
                <div>
                  <Label htmlFor="privacyConsent" className="text-sm text-[#5C5C59] cursor-pointer leading-relaxed">
                    Accetto l'<span className="text-[#0F4C5C] font-medium hover:underline">informativa sulla privacy</span> *
                  </Label>
                  {errors.privacyConsent && <p className="text-xs text-[#E63946] mt-1">{errors.privacyConsent}</p>}
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="termsConsent"
                  checked={formData.termsConsent}
                  onCheckedChange={(checked) => handleChange('termsConsent', checked)}
                  className="mt-0.5 rounded-md"
                  data-testid="register-terms-checkbox"
                />
                <div>
                  <Label htmlFor="termsConsent" className="text-sm text-[#5C5C59] cursor-pointer leading-relaxed">
                    Accetto i <span className="text-[#0F4C5C] font-medium hover:underline">termini di servizio</span> *
                  </Label>
                  {errors.termsConsent && <p className="text-xs text-[#E63946] mt-1">{errors.termsConsent}</p>}
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0F4C5C] hover:bg-[#0F4C5C]/90 text-white rounded-xl h-12 text-sm font-medium shadow-lg shadow-[#0F4C5C]/20 transition-all duration-200 hover:shadow-xl hover:shadow-[#0F4C5C]/30"
              data-testid="register-submit-btn"
            >
              {loading ? 'Creazione account...' : 'Crea account'}
              {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-[#5C5C59]">
            Hai già un account?{' '}
            <Link to="/login" className="text-[#0F4C5C] font-medium hover:underline" data-testid="login-link">
              Accedi
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
