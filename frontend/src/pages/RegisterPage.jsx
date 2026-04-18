import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/i18n/translations';
import { getCountries } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ArrowRight, ArrowLeft, Eye, EyeOff, AlertCircle, User, Building2,
  Briefcase, HelpCircle, Shield, Lock, Globe, CheckCircle2, Users
} from 'lucide-react';
import { HerionBrand } from '@/components/HerionLogo';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { toast } from 'sonner';

const STEPS = [
  { key: 'personal', nameKey: 'reg_step1_name', msgKey: 'reg_step1_msg' },
  { key: 'fiscal', nameKey: 'reg_step2_name', msgKey: 'reg_step2_msg' },
  { key: 'security', nameKey: 'reg_step3_name', msgKey: 'reg_step3_msg' },
];

const CLIENT_TYPES = [
  { value: 'private', labelKey: 'client_private', descKey: 'client_private_desc', advKey: 'adv_private', icon: User },
  { value: 'freelancer', labelKey: 'client_freelancer', descKey: 'client_freelancer_desc', advKey: 'adv_freelancer', icon: Briefcase },
  { value: 'company', labelKey: 'client_company', descKey: 'client_company_desc', advKey: 'adv_company', icon: Building2 },
];

function FieldTip({ tipKey, lang }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="ml-1.5 inline-flex" tabIndex={-1}>
            <HelpCircle className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-[#0ABFCF] transition-colors" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[260px] text-[11px] leading-relaxed bg-[var(--text-primary)] text-white rounded-lg px-3 py-2">
          {t(tipKey, lang)}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { lang } = useLanguage();
  const [countries, setCountries] = useState([]);
  const [step, setStep] = useState(0);
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

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const validateStep = (s) => {
    const e = {};
    if (s === 0) {
      if (!form.first_name.trim()) e.first_name = t('err_required_first_name', lang);
      if (!form.last_name.trim()) e.last_name = t('err_required_last_name', lang);
      if (!form.email.trim()) e.email = t('err_required_email', lang);
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = t('err_invalid_email', lang);
      if (!form.phone.trim()) e.phone = t('err_required_phone', lang);
      if (!form.date_of_birth) e.date_of_birth = t('err_required_dob', lang);
    } else if (s === 1) {
      if (!form.country) e.country = t('err_required_country', lang);
      if (!form.city.trim()) e.city = t('err_required_city', lang);
      if (!form.address.trim()) e.address = t('err_required_address', lang);
      if (!form.client_type) e.client_type = t('err_required_client_type', lang);
      if ((form.client_type === 'freelancer' || form.client_type === 'company') && !form.vat_number.trim()) e.vat_number = t('err_required_vat', lang);
      if (form.client_type === 'company' && !form.company_name.trim()) e.company_name = t('err_required_company', lang);
      if (!form.fiscal_code.trim()) e.fiscal_code = t('err_required_fiscal', lang);
    } else if (s === 2) {
      if (!form.password) e.password = t('err_required_password', lang);
      else if (form.password.length < 8) e.password = t('err_password_min', lang);
      if (form.password !== form.confirmPassword) e.confirmPassword = t('err_password_mismatch', lang);
      if (!form.privacy_consent) e.privacy_consent = t('err_required_privacy', lang);
      if (!form.terms_consent) e.terms_consent = t('err_required_terms', lang);
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (validateStep(step)) setStep(s => Math.min(s + 1, 2));
  };
  const back = () => setStep(s => Math.max(s - 1, 0));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(2)) { toast.error(t('err_fix_form', lang)); return; }
    setLoading(true);
    const { confirmPassword: _, ...data } = form;
    const result = await register(data);
    if (result.success) { toast.success(t('reg_success', lang)); navigate('/dashboard'); }
    else { toast.error('Errore', { description: result.error }); }
    setLoading(false);
  };

  const FieldError = ({ field }) => errors[field] ? (
    <p className="text-[10px] text-red-500 flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" />{errors[field]}</p>
  ) : null;

  const showVat = form.client_type === 'freelancer' || form.client_type === 'company';
  const showCompany = form.client_type === 'company';
  const selectedCountry = countries.find(c => c.code === form.country);

  const inputClass = "rounded-xl h-10 text-[12px] mt-1 border-[var(--border-soft)] focus:ring-[#0ABFCF] focus:border-[#0ABFCF]";
  const labelClass = "text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center";
  const progress = ((step + 1) / 3) * 100;

  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex items-start justify-center py-10 px-6" data-testid="register-page">
      <div className="w-full max-w-lg">

        {/* Header — Logo + Language */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/" data-testid="register-logo-link">
            <HerionBrand size={38} showText />
          </Link>
          <LanguageSwitcher />
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight" data-testid="register-title">
            {t('reg_title', lang)}
          </h2>
          <p className="text-[12px] text-[var(--text-secondary)] mt-1">{t('reg_subtitle', lang)}</p>
        </div>

        {/* Progress bar */}
        <div className="mb-6" data-testid="register-progress">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((s, i) => (
              <button
                key={s.key}
                type="button"
                onClick={() => { if (i < step) setStep(i); }}
                className={`flex items-center gap-1.5 text-[11px] font-semibold transition-colors ${
                  i <= step ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
                } ${i < step ? 'cursor-pointer hover:text-[#0ABFCF]' : ''}`}
                data-testid={`step-label-${i}`}
              >
                <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center transition-all ${
                  i < step
                    ? 'bg-[#0ABFCF] text-white'
                    : i === step
                      ? 'bg-[var(--text-primary)] text-white'
                      : 'bg-[var(--border-soft)] text-[var(--text-muted)]'
                }`}>
                  {i < step ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
                </span>
                <span className="hidden sm:inline">{t(s.nameKey, lang)}</span>
              </button>
            ))}
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #0ABFCF, #C4D9FF)' }}
            />
          </div>
          <p className="text-[11px] text-[#0ABFCF] font-medium text-center mt-2" data-testid="step-motivation">
            {t(STEPS[step].msgKey, lang)}
          </p>
        </div>

        {/* Form card */}
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-2xl border p-6 space-y-4" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-soft)' }}>

            {/* ═══ STEP 1: PERSONAL ═══ */}
            {step === 0 && (
              <div className="space-y-3 animate-fade-in" data-testid="step-0">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className={labelClass}>{t('reg_first_name', lang)} *</Label>
                    <Input value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder={t('reg_ph_first_name', lang)} className={inputClass} data-testid="register-firstname-input" />
                    <FieldError field="first_name" />
                  </div>
                  <div>
                    <Label className={labelClass}>{t('reg_last_name', lang)} *</Label>
                    <Input value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder={t('reg_ph_last_name', lang)} className={inputClass} data-testid="register-lastname-input" />
                    <FieldError field="last_name" />
                  </div>
                </div>
                <div>
                  <Label className={labelClass}>{t('reg_email', lang)} *</Label>
                  <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder={t('reg_ph_email', lang)} className={inputClass} data-testid="register-email-input" />
                  <FieldError field="email" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className={labelClass}>{t('reg_phone', lang)} *</Label>
                    <Input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder={t('reg_ph_phone', lang)} className={inputClass} data-testid="register-phone-input" />
                    <FieldError field="phone" />
                  </div>
                  <div>
                    <Label className={labelClass}>{t('reg_dob', lang)} *</Label>
                    <Input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} className={inputClass} data-testid="register-dob-input" />
                    <FieldError field="date_of_birth" />
                  </div>
                </div>
              </div>
            )}

            {/* ═══ STEP 2: FISCAL PROFILE ═══ */}
            {step === 1 && (
              <div className="space-y-4 animate-fade-in" data-testid="step-1">
                {/* Residence */}
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{t('reg_section_residence', lang)}</p>
                <div>
                  <Label className={labelClass}>{t('reg_country', lang)} *</Label>
                  <Select value={form.country} onValueChange={v => set('country', v)}>
                    <SelectTrigger className="rounded-xl h-10 text-[12px] mt-1 border-[var(--border-soft)]" data-testid="register-country-select">
                      <SelectValue placeholder={t('reg_select_placeholder', lang)} />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg max-h-64">
                      {countries.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FieldError field="country" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className={labelClass}>{t('reg_city', lang)} *</Label>
                    <Input value={form.city} onChange={e => set('city', e.target.value)} placeholder={t('reg_ph_city', lang)} className={inputClass} data-testid="register-city-input" />
                    <FieldError field="city" />
                  </div>
                  <div>
                    <Label className={labelClass}>{t('reg_address', lang)} *<FieldTip tipKey="tip_address" lang={lang} /></Label>
                    <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder={t('reg_ph_address', lang)} className={inputClass} data-testid="register-address-input" />
                    <FieldError field="address" />
                  </div>
                </div>

                {/* Client type */}
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider pt-1">{t('reg_section_client_type', lang)}</p>
                <div className="grid grid-cols-3 gap-2">
                  {CLIENT_TYPES.map(ct => {
                    const active = form.client_type === ct.value;
                    return (
                      <button key={ct.value} type="button" onClick={() => set('client_type', ct.value)}
                        className={`p-3 border rounded-xl text-center transition-all duration-200 ${
                          active
                            ? 'border-[#0ABFCF] bg-[#0ABFCF]/5 ring-1 ring-[#0ABFCF]'
                            : 'border-[var(--border-soft)] hover:border-[var(--text-secondary)]/30'
                        }`}
                        data-testid={`client-type-${ct.value}`}
                      >
                        <ct.icon className={`w-4 h-4 mx-auto mb-1 ${active ? 'text-[#0ABFCF]' : 'text-[var(--text-muted)]'}`} strokeWidth={1.5} />
                        <p className={`text-[11px] font-semibold ${active ? 'text-[#0ABFCF]' : 'text-[var(--text-primary)]'}`}>{t(ct.labelKey, lang)}</p>
                        <p className="text-[9px] text-[var(--text-muted)]">{t(ct.descKey, lang)}</p>
                      </button>
                    );
                  })}
                </div>
                <FieldError field="client_type" />

                {/* Dynamic advantage */}
                {form.client_type && (
                  <div className="p-3 rounded-xl bg-[#0ABFCF]/5 border border-[#0ABFCF]/15 animate-fade-in" data-testid="client-advantage">
                    <p className="text-[11px] text-[#0ABFCF] font-medium leading-relaxed flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      {t(CLIENT_TYPES.find(c => c.value === form.client_type)?.advKey, lang)}
                    </p>
                  </div>
                )}

                {/* Fiscal fields */}
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider pt-1">{t('reg_section_fiscal', lang)}</p>
                {showVat && (
                  <div className="animate-fade-in">
                    <Label className={labelClass}>{t('reg_vat_number', lang)} *<FieldTip tipKey="tip_vat" lang={lang} /></Label>
                    <Input value={form.vat_number} onChange={e => set('vat_number', e.target.value)} placeholder={t('reg_ph_vat', lang)} className={`${inputClass} font-mono`} data-testid="register-vat-input" />
                    <FieldError field="vat_number" />
                  </div>
                )}
                {showCompany && (
                  <div className="animate-fade-in">
                    <Label className={labelClass}>{t('reg_company_name', lang)} *</Label>
                    <Input value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder={t('reg_ph_company', lang)} className={inputClass} data-testid="register-company-input" />
                    <FieldError field="company_name" />
                  </div>
                )}
                <div>
                  <Label className={labelClass}>{selectedCountry?.fiscal_id_label || t('reg_fiscal_code', lang)} *<FieldTip tipKey="tip_fiscal_code" lang={lang} /></Label>
                  <Input value={form.fiscal_code} onChange={e => set('fiscal_code', e.target.value.toUpperCase())} placeholder={t('reg_ph_fiscal', lang)} className={`${inputClass} font-mono`} data-testid="register-fiscalcode-input" />
                  <FieldError field="fiscal_code" />
                </div>
              </div>
            )}

            {/* ═══ STEP 3: SECURITY ═══ */}
            {step === 2 && (
              <div className="space-y-4 animate-fade-in" data-testid="step-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className={labelClass}>{t('reg_password', lang)} *</Label>
                    <div className="relative mt-1">
                      <Input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)} placeholder={t('reg_ph_password', lang)} className="rounded-xl h-10 text-[12px] pr-9 border-[var(--border-soft)]" data-testid="register-password-input" />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">{showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button>
                    </div>
                    <FieldError field="password" />
                  </div>
                  <div>
                    <Label className={labelClass}>{t('reg_confirm_password', lang)} *</Label>
                    <div className="relative mt-1">
                      <Input type={showCpw ? 'text' : 'password'} value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} placeholder={t('reg_ph_confirm', lang)} className="rounded-xl h-10 text-[12px] pr-9 border-[var(--border-soft)]" data-testid="register-confirm-password-input" />
                      <button type="button" onClick={() => setShowCpw(!showCpw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">{showCpw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button>
                    </div>
                    <FieldError field="confirmPassword" />
                  </div>
                </div>

                {/* Consent */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-start space-x-2.5">
                    <Checkbox id="privacy" checked={form.privacy_consent} onCheckedChange={c => set('privacy_consent', c)} className="mt-0.5 rounded" data-testid="register-privacy-checkbox" />
                    <Label htmlFor="privacy" className="text-[11px] text-[var(--text-secondary)] cursor-pointer">{t('reg_privacy', lang)} *</Label>
                  </div>
                  <FieldError field="privacy_consent" />
                  <div className="flex items-start space-x-2.5">
                    <Checkbox id="terms" checked={form.terms_consent} onCheckedChange={c => set('terms_consent', c)} className="mt-0.5 rounded" data-testid="register-terms-checkbox" />
                    <Label htmlFor="terms" className="text-[11px] text-[var(--text-secondary)] cursor-pointer">{t('reg_terms', lang)} *</Label>
                  </div>
                  <FieldError field="terms_consent" />
                </div>

                {/* Trust badges */}
                <div className="flex items-center justify-center gap-4 pt-2 pb-1" data-testid="trust-badges">
                  <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
                    <Lock className="w-3 h-3" />
                    {t('trust_encryption', lang)}
                  </div>
                  <div className="w-px h-3 bg-[var(--border-soft)]" />
                  <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
                    <Shield className="w-3 h-3" />
                    {t('trust_gdpr', lang)}
                  </div>
                  <div className="w-px h-3 bg-[var(--border-soft)]" />
                  <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
                    <Globe className="w-3 h-3" />
                    {t('trust_eu', lang)}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center gap-3 pt-2">
              {step > 0 && (
                <Button type="button" variant="outline" onClick={back} className="rounded-xl h-10 px-5 text-[12px] font-medium gap-1.5" data-testid="register-back-btn">
                  <ArrowLeft className="w-3.5 h-3.5" />{t('reg_back', lang)}
                </Button>
              )}
              {step < 2 ? (
                <Button type="button" onClick={next} className="flex-1 rounded-xl h-10 text-[12px] font-semibold gap-1.5 bg-[var(--text-primary)] hover:bg-[#2a3040] text-white" data-testid="register-next-btn">
                  {t('reg_next', lang)}<ArrowRight className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button type="submit" disabled={loading} className="flex-1 bg-[#0ABFCF] hover:bg-[#09a8b6] text-white rounded-xl h-10 text-[12px] font-semibold gap-1.5" data-testid="register-submit-btn">
                  {loading ? t('reg_submitting', lang) : t('reg_submit', lang)}
                  {!loading && <ArrowRight className="w-3.5 h-3.5" />}
                </Button>
              )}
            </div>
          </div>
        </form>

        {/* Human connection + Social proof */}
        <div className="mt-5 space-y-3">
          <div className="flex items-start gap-2.5 px-1" data-testid="trust-human">
            <Users className="w-3.5 h-3.5 text-[#0ABFCF] mt-0.5 shrink-0" />
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{t('trust_human', lang)}</p>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] text-center" data-testid="trust-social-proof">
            {t('trust_social_proof', lang)}
          </p>
        </div>

        {/* Login link */}
        <p className="mt-5 text-center text-[12px] text-[var(--text-secondary)]">
          {t('reg_has_account', lang)}{' '}
          <Link to="/login" className="text-[#0ABFCF] font-semibold hover:underline" data-testid="login-link">
            {t('reg_login_link', lang)}
          </Link>
        </p>
      </div>
    </div>
  );
}
