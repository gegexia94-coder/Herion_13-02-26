import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Lock, Mail, Phone, MapPin, Building2, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfileSettingsPage() {
  const { user, refreshUser } = useAuth();
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
      toast.success('Profilo aggiornato');
      if (refreshUser) refreshUser();
    } catch (e) { toast.error(e.response?.data?.detail || 'Errore'); }
    finally { setSaving(false); }
  };

  const handlePasswordChange = async () => {
    if (pwForm.new_password !== pwForm.confirm_password) { toast.error('Le password non corrispondono'); return; }
    if (pwForm.new_password.length < 8) { toast.error('Minimo 8 caratteri'); return; }
    setPwLoading(true);
    try {
      await api.put('/auth/change-password', { current_password: pwForm.current_password, new_password: pwForm.new_password });
      toast.success('Password aggiornata');
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (e) { toast.error(e.response?.data?.detail || 'Errore'); }
    finally { setPwLoading(false); }
  };

  const roleLabel = { creator: 'Creator / Fondatore', admin: 'Amministratore', user: 'Utente' };
  const clientLabel = { private: 'Privato', freelancer: 'Libero Professionista', company: 'Azienda' };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F4C5C]" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6" data-testid="profile-settings-page">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#0F4C5C] flex items-center justify-center"><User className="w-5 h-5 text-[#5DD9C1]" /></div>
        <div>
          <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Profilo e Impostazioni</h1>
          <p className="text-xs text-[#475569]">Gestisci le informazioni del tuo account</p>
        </div>
      </div>

      {/* Account Info (read-only) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4"><Shield className="w-4 h-4 text-[#0F4C5C]" /><h3 className="text-sm font-bold text-[#0F172A]">Identita Account</h3></div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mb-1">Nome completo</p>
            <p className="text-sm text-[#0F172A] font-medium">{profile?.name || `${profile?.first_name || ''} ${profile?.last_name || ''}`}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mb-1">Email</p>
            <p className="text-sm text-[#0F172A] font-medium">{profile?.email}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mb-1">Ruolo</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${profile?.is_creator ? 'bg-[#0F4C5C]/10 text-[#0F4C5C]' : profile?.role === 'admin' ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700'}`}>{roleLabel[profile?.role] || profile?.role}</span>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mb-1">Tipo cliente</p>
            <p className="text-sm text-[#0F172A]">{clientLabel[profile?.client_type] || profile?.client_type}</p>
          </div>
          {profile?.creator_uuid && (
            <div>
              <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mb-1">Creator UUID</p>
              <p className="text-xs text-[#0F4C5C] font-mono">{profile?.creator_uuid}</p>
            </div>
          )}
        </div>
      </div>

      {/* Editable Profile */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4"><MapPin className="w-4 h-4 text-[#0F4C5C]" /><h3 className="text-sm font-bold text-[#0F172A]">Informazioni Personali</h3></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Telefono</label>
            <Input value={profile?.phone || ''} onChange={e => setProfile({...profile, phone: e.target.value})} placeholder="+39..." className="mt-1 rounded-xl border-[#E2E8F0] h-10 text-sm" data-testid="phone-input" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Data di nascita</label>
            <Input type="date" value={profile?.date_of_birth || ''} onChange={e => setProfile({...profile, date_of_birth: e.target.value})} className="mt-1 rounded-xl border-[#E2E8F0] h-10 text-sm" data-testid="dob-input" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Citta</label>
            <Input value={profile?.city || ''} onChange={e => setProfile({...profile, city: e.target.value})} placeholder="Roma, Milano..." className="mt-1 rounded-xl border-[#E2E8F0] h-10 text-sm" data-testid="city-input" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Indirizzo</label>
            <Input value={profile?.address || ''} onChange={e => setProfile({...profile, address: e.target.value})} placeholder="Via..." className="mt-1 rounded-xl border-[#E2E8F0] h-10 text-sm" data-testid="address-input" />
          </div>
        </div>
        <Button onClick={handleProfileSave} disabled={saving} className="mt-4 bg-[#0F4C5C] hover:bg-[#0b3844] rounded-xl h-10 px-6 text-sm" data-testid="save-profile-btn">
          {saving ? 'Salvataggio...' : 'Salva modifiche'}
        </Button>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4"><Lock className="w-4 h-4 text-[#0F4C5C]" /><h3 className="text-sm font-bold text-[#0F172A]">Sicurezza</h3></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Password attuale</label>
            <Input type="password" value={pwForm.current_password} onChange={e => setPwForm({...pwForm, current_password: e.target.value})} className="mt-1 rounded-xl border-[#E2E8F0] h-10 text-sm" data-testid="current-password-input" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Nuova password</label>
            <Input type="password" value={pwForm.new_password} onChange={e => setPwForm({...pwForm, new_password: e.target.value})} className="mt-1 rounded-xl border-[#E2E8F0] h-10 text-sm" data-testid="new-password-input" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Conferma password</label>
            <Input type="password" value={pwForm.confirm_password} onChange={e => setPwForm({...pwForm, confirm_password: e.target.value})} className="mt-1 rounded-xl border-[#E2E8F0] h-10 text-sm" data-testid="confirm-password-input" />
          </div>
        </div>
        <Button onClick={handlePasswordChange} disabled={pwLoading || !pwForm.current_password || !pwForm.new_password} variant="outline" className="mt-4 rounded-xl border-[#E2E8F0] h-10 px-6 text-sm" data-testid="change-password-btn">
          {pwLoading ? 'Aggiornamento...' : 'Aggiorna password'}
        </Button>
      </div>
    </div>
  );
}
