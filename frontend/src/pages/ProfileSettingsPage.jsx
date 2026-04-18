import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/i18n/translations';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Lock, MapPin, Shield, Globe } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfileSettingsPage() {
  const { user, refreshUser } = useAuth();
  const { lang, switchLang } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    api.get('/auth/profile').then(r => { setProfile(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleProfileSave = async () => {
    setSaving(true);
    try {
      await api.put('/auth/profile', {
        phone: profile.phone, date_of_birth: profile.date_of_birth,
        country: profile.country, city: profile.city, address: profile.address
      });
      toast.success(t('profile_saved', lang));
      if (refreshUser) refreshUser();
    } catch (e) { toast.error(e.response?.data?.detail || 'Errore'); }
    finally { setSaving(false); }
  };

  const handlePasswordChange = async () => {
    if (pwForm.new_password !== pwForm.confirm_password) { toast.error(lang === 'en' ? 'Passwords do not match' : 'Le password non corrispondono'); return; }
    if (pwForm.new_password.length < 8) { toast.error(lang === 'en' ? 'Minimum 8 characters' : 'Minimo 8 caratteri'); return; }
    setPwLoading(true);
    try {
      await api.put('/auth/change-password', { current_password: pwForm.current_password, new_password: pwForm.new_password });
      toast.success(t('profile_pw_changed', lang));
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (e) { toast.error(e.response?.data?.detail || 'Errore'); }
    finally { setPwLoading(false); }
  };

  const roleLabel = { creator: 'Creator / Fondatore', admin: lang === 'en' ? 'Administrator' : 'Amministratore', user: lang === 'en' ? 'User' : 'Utente' };
  const clientLabel = { private: lang === 'en' ? 'Individual' : 'Privato', freelancer: lang === 'en' ? 'Freelancer' : 'Libero Professionista', company: lang === 'en' ? 'Company' : 'Azienda' };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A192F]" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6" data-testid="profile-settings-page">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#0A192F] flex items-center justify-center"><User className="w-5 h-5 text-[#3B82F6]" /></div>
        <div>
          <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">{t('profile_title', lang)}</h1>
          <p className="text-xs text-[#475569]">{lang === 'en' ? 'Manage your account information' : 'Gestisci le informazioni del tuo account'}</p>
        </div>
      </div>

      {/* Account Info (read-only) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4"><Shield className="w-4 h-4 text-[#0A192F]" /><h3 className="text-sm font-bold text-[#0F172A]">{lang === 'en' ? 'Account Identity' : 'Identita Account'}</h3></div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mb-1">{lang === 'en' ? 'Full name' : 'Nome completo'}</p>
            <p className="text-sm text-[#0F172A] font-medium">{profile?.name || `${profile?.first_name || ''} ${profile?.last_name || ''}`}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mb-1">Email</p>
            <p className="text-sm text-[#0F172A] font-medium">{profile?.email}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mb-1">{t('profile_role', lang)}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${profile?.is_creator ? 'bg-[#0A192F]/10 text-[#0A192F]' : profile?.role === 'admin' ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700'}`}>{roleLabel[profile?.role] || profile?.role}</span>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mb-1">{t('profile_client_type', lang)}</p>
            <p className="text-sm text-[#0F172A]">{clientLabel[profile?.client_type] || profile?.client_type}</p>
          </div>
        </div>
      </div>

      {/* Language Preference */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm" data-testid="language-preferences">
        <div className="flex items-center gap-2 mb-4"><Globe className="w-4 h-4 text-[#0ABFCF]" /><h3 className="text-sm font-bold text-[#0F172A]">{t('profile_preferences', lang)}</h3></div>
        <div>
          <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mb-1">{t('profile_language_label', lang)}</p>
          <p className="text-[11px] text-[var(--text-muted)] mb-3">{t('profile_language_desc', lang)}</p>
          <div className="flex gap-2">
            <button
              onClick={() => switchLang('it')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[12px] font-semibold transition-all ${
                lang === 'it'
                  ? 'border-[#0ABFCF] bg-[#0ABFCF]/5 text-[#0ABFCF] ring-1 ring-[#0ABFCF]'
                  : 'border-[var(--border-soft)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
              }`}
              data-testid="lang-select-it"
            >
              <span className="text-[14px]">IT</span>
              <span className="text-[11px] font-normal">{lang === 'en' ? 'Italian' : 'Italiano'}</span>
            </button>
            <button
              onClick={() => switchLang('en')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[12px] font-semibold transition-all ${
                lang === 'en'
                  ? 'border-[#0ABFCF] bg-[#0ABFCF]/5 text-[#0ABFCF] ring-1 ring-[#0ABFCF]'
                  : 'border-[var(--border-soft)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
              }`}
              data-testid="lang-select-en"
            >
              <span className="text-[14px]">EN</span>
              <span className="text-[11px] font-normal">English</span>
            </button>
          </div>
        </div>
      </div>

      {/* Editable Profile */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4"><MapPin className="w-4 h-4 text-[#0A192F]" /><h3 className="text-sm font-bold text-[#0F172A]">{t('profile_personal', lang)}</h3></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider">{lang === 'en' ? 'Phone' : 'Telefono'}</label>
            <Input value={profile?.phone || ''} onChange={e => setProfile({...profile, phone: e.target.value})} placeholder="+39..." className="mt-1 rounded-xl border-[#E2E8F0] h-10 text-sm" data-testid="phone-input" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider">{lang === 'en' ? 'Date of birth' : 'Data di nascita'}</label>
            <Input type="date" value={profile?.date_of_birth || ''} onChange={e => setProfile({...profile, date_of_birth: e.target.value})} className="mt-1 rounded-xl border-[#E2E8F0] h-10 text-sm" data-testid="dob-input" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider">{lang === 'en' ? 'City' : 'Citta'}</label>
            <Input value={profile?.city || ''} onChange={e => setProfile({...profile, city: e.target.value})} placeholder={lang === 'en' ? 'Milan, Rome...' : 'Roma, Milano...'} className="mt-1 rounded-xl border-[#E2E8F0] h-10 text-sm" data-testid="city-input" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider">{lang === 'en' ? 'Address' : 'Indirizzo'}</label>
            <Input value={profile?.address || ''} onChange={e => setProfile({...profile, address: e.target.value})} placeholder="Via..." className="mt-1 rounded-xl border-[#E2E8F0] h-10 text-sm" data-testid="address-input" />
          </div>
        </div>
        <Button onClick={handleProfileSave} disabled={saving} className="mt-4 bg-[#0A192F] hover:bg-[#0B243B] rounded-xl h-10 px-6 text-sm" data-testid="save-profile-btn">
          {saving ? t('profile_saving', lang) : t('profile_save', lang)}
        </Button>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4"><Lock className="w-4 h-4 text-[#0A192F]" /><h3 className="text-sm font-bold text-[#0F172A]">{t('profile_security', lang)}</h3></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider">{t('profile_pw_current', lang)}</label>
            <Input type="password" value={pwForm.current_password} onChange={e => setPwForm({...pwForm, current_password: e.target.value})} className="mt-1 rounded-xl border-[#E2E8F0] h-10 text-sm" data-testid="current-password-input" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider">{t('profile_pw_new', lang)}</label>
            <Input type="password" value={pwForm.new_password} onChange={e => setPwForm({...pwForm, new_password: e.target.value})} className="mt-1 rounded-xl border-[#E2E8F0] h-10 text-sm" data-testid="new-password-input" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider">{t('profile_pw_confirm', lang)}</label>
            <Input type="password" value={pwForm.confirm_password} onChange={e => setPwForm({...pwForm, confirm_password: e.target.value})} className="mt-1 rounded-xl border-[#E2E8F0] h-10 text-sm" data-testid="confirm-password-input" />
          </div>
        </div>
        <Button onClick={handlePasswordChange} disabled={pwLoading || !pwForm.current_password || !pwForm.new_password} variant="outline" className="mt-4 rounded-xl border-[#E2E8F0] h-10 px-6 text-sm" data-testid="change-password-btn">
          {pwLoading ? '...' : t('profile_pw_change', lang)}
        </Button>
      </div>
    </div>
  );
}
