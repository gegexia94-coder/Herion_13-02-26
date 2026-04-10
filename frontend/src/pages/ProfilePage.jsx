import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getProfile, updateProfile, changePassword } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, MapPin, Phone, Calendar, Shield, Save, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const CLIENT_TYPE_LABELS = { private: 'Privato', freelancer: 'Libero Professionista', company: 'Azienda' };

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editForm, setEditForm] = useState({ phone: '', country: '', city: '', address: '' });
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await getProfile();
      setProfile(res.data);
      setEditForm({
        phone: res.data.phone || '',
        country: res.data.country || 'IT',
        city: res.data.city || '',
        address: res.data.address || '',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile(editForm);
      await refreshUser();
      toast.success('Profilo aggiornato');
      loadProfile();
    } catch {
      toast.error("Errore nell'aggiornamento");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPw.length < 8) { toast.error('La password deve avere almeno 8 caratteri'); return; }
    if (pwForm.newPw !== pwForm.confirm) { toast.error('Le password non corrispondono'); return; }
    setPwLoading(true);
    try {
      await changePassword(pwForm.current, pwForm.newPw);
      toast.success('Password aggiornata');
      setPwForm({ current: '', newPw: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nel cambio password');
    } finally {
      setPwLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A192F]" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6" data-testid="profile-page">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight mb-1">Il Mio Profilo</h1>
        <p className="text-sm text-[#475569]">Gestisci le tue informazioni personali e la sicurezza del tuo account.</p>
      </div>

      {/* Account Info (read-only) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#0A192F]/5 flex items-center justify-center"><User className="w-5 h-5 text-[#0A192F]" strokeWidth={1.5} /></div>
          <div><h3 className="font-semibold text-[#0F172A] text-sm">Informazioni Account</h3><p className="text-xs text-[#475569]">Dati principali del tuo account</p></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><p className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1">Nome</p><p className="text-sm text-[#0F172A]">{profile?.first_name} {profile?.last_name}</p></div>
          <div><p className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1">Email</p><p className="text-sm text-[#0F172A]">{profile?.email}</p></div>
          <div><p className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1">Tipo Cliente</p><p className="text-sm text-[#0F172A]">{CLIENT_TYPE_LABELS[profile?.client_type] || profile?.client_type}</p></div>
          <div><p className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1">Data Registrazione</p><p className="text-sm text-[#0F172A]">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('it-IT') : '-'}</p></div>
          {profile?.fiscal_code && <div><p className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1">Codice Fiscale</p><p className="text-sm font-mono text-[#0F172A]">{profile.fiscal_code}</p></div>}
          {profile?.vat_number && <div><p className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1">Partita IVA</p><p className="text-sm font-mono text-[#0F172A]">{profile.vat_number}</p></div>}
        </div>
      </div>

      {/* Editable Info */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/10 flex items-center justify-center"><MapPin className="w-5 h-5 text-[#0A192F]" strokeWidth={1.5} /></div>
          <div><h3 className="font-semibold text-[#0F172A] text-sm">Contatti e Residenza</h3><p className="text-xs text-[#475569]">Aggiorna i tuoi dati di contatto</p></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label className="text-xs font-semibold text-[#475569] uppercase tracking-wider">Telefono</Label>
            <Input value={editForm.phone} onChange={e => setEditForm(p => ({...p, phone: e.target.value}))} className="rounded-xl border-[#E2E8F0] h-11 text-sm mt-1.5" data-testid="profile-phone-input" /></div>
          <div><Label className="text-xs font-semibold text-[#475569] uppercase tracking-wider">Paese</Label>
            <Input value={editForm.country} onChange={e => setEditForm(p => ({...p, country: e.target.value}))} className="rounded-xl border-[#E2E8F0] h-11 text-sm mt-1.5" data-testid="profile-country-input" /></div>
          <div><Label className="text-xs font-semibold text-[#475569] uppercase tracking-wider">Citta</Label>
            <Input value={editForm.city} onChange={e => setEditForm(p => ({...p, city: e.target.value}))} className="rounded-xl border-[#E2E8F0] h-11 text-sm mt-1.5" data-testid="profile-city-input" /></div>
          <div><Label className="text-xs font-semibold text-[#475569] uppercase tracking-wider">Indirizzo</Label>
            <Input value={editForm.address} onChange={e => setEditForm(p => ({...p, address: e.target.value}))} className="rounded-xl border-[#E2E8F0] h-11 text-sm mt-1.5" data-testid="profile-address-input" /></div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="bg-[#0A192F] hover:bg-[#0B243B] rounded-xl text-sm px-6" data-testid="profile-save-btn">
            <Save className="w-4 h-4 mr-2" />{saving ? 'Salvataggio...' : 'Salva modifiche'}
          </Button>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><Shield className="w-5 h-5 text-amber-600" strokeWidth={1.5} /></div>
          <div><h3 className="font-semibold text-[#0F172A] text-sm">Sicurezza</h3><p className="text-xs text-[#475569]">Cambia la tua password</p></div>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div><Label className="text-xs font-semibold text-[#475569] uppercase tracking-wider">Password Attuale</Label>
            <div className="relative mt-1.5">
              <Input type={showPw ? 'text' : 'password'} value={pwForm.current} onChange={e => setPwForm(p => ({...p, current: e.target.value}))} className="rounded-xl border-[#E2E8F0] h-11 text-sm pr-10" data-testid="profile-current-pw" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]">{showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
            </div></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs font-semibold text-[#475569] uppercase tracking-wider">Nuova Password</Label>
              <Input type="password" value={pwForm.newPw} onChange={e => setPwForm(p => ({...p, newPw: e.target.value}))} placeholder="Min. 8 caratteri" className="rounded-xl border-[#E2E8F0] h-11 text-sm mt-1.5" data-testid="profile-new-pw" /></div>
            <div><Label className="text-xs font-semibold text-[#475569] uppercase tracking-wider">Conferma</Label>
              <Input type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({...p, confirm: e.target.value}))} placeholder="Ripeti" className="rounded-xl border-[#E2E8F0] h-11 text-sm mt-1.5" data-testid="profile-confirm-pw" /></div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={pwLoading} variant="outline" className="rounded-xl border-[#E2E8F0] text-sm" data-testid="profile-change-pw-btn">
              {pwLoading ? 'Aggiornamento...' : 'Cambia password'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
