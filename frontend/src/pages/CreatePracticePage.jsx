import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPractice } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowLeft,
  ArrowRight,
  User,
  Briefcase,
  Info,
  Building2,
  UserCircle
} from 'lucide-react';
import { toast } from 'sonner';

const PRACTICE_TYPES = [
  { value: 'vat_registration', label: 'Apertura Partita IVA', description: 'Registrazione di una nuova partita IVA' },
  { value: 'vat_closure', label: 'Chiusura Partita IVA', description: 'Chiusura di una partita IVA esistente' },
  { value: 'tax_declaration', label: 'Dichiarazione dei Redditi', description: 'Compilazione e invio della dichiarazione dei redditi' },
  { value: 'f24_payment', label: 'Versamento F24', description: 'Calcolo e pagamento tramite modello F24' },
  { value: 'inps_registration', label: 'Iscrizione INPS', description: 'Iscrizione alla gestione previdenziale INPS' },
  { value: 'other', label: 'Altra Pratica', description: 'Altre pratiche fiscali o amministrative' },
];

const CLIENT_TYPES = [
  { value: 'private', label: 'Privato', description: 'Persona fisica senza partita IVA', icon: UserCircle, requiresVat: false },
  { value: 'freelancer', label: 'Libero Professionista', description: 'Lavoratore autonomo con partita IVA', icon: User, requiresVat: true },
  { value: 'company', label: 'Azienda', description: 'Società o impresa', icon: Building2, requiresVat: true },
];

export default function CreatePracticePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    practice_type: '',
    client_type: '',
    client_name: '',
    fiscal_code: '',
    vat_number: '',
    description: '',
    additional_data: {}
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.practice_type || !formData.client_name || !formData.description || !formData.client_type) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    const selectedClientType = CLIENT_TYPES.find(t => t.value === formData.client_type);
    if (selectedClientType?.requiresVat && !formData.vat_number) {
      toast.error('La partita IVA è obbligatoria per questo tipo di cliente');
      return;
    }

    setLoading(true);
    try {
      const response = await createPractice(formData);
      toast.success('Pratica creata con successo!');
      navigate(`/practices/${response.data.id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nella creazione della pratica');
    } finally {
      setLoading(false);
    }
  };

  const selectedType = PRACTICE_TYPES.find(t => t.value === formData.practice_type);
  const selectedClientType = CLIENT_TYPES.find(t => t.value === formData.client_type);
  const showVatField = selectedClientType?.requiresVat;

  return (
    <div className="max-w-3xl mx-auto" data-testid="create-practice-page">
      {/* Header */}
      <div className="mb-8">
        <button 
          onClick={() => navigate('/practices')}
          className="flex items-center gap-2 text-sm text-[#5C5C59] hover:text-[#111110] mb-4"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          Torna alle pratiche
        </button>
        <h1 className="heading-2 mb-2">Nuova Pratica</h1>
        <p className="body-text">Crea una nuova pratica fiscale in pochi passaggi</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-[#0F4C5C]' : 'text-[#A1A19E]'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 1 ? 'bg-[#0F4C5C] text-white' : 'bg-[#E5E5E3] text-[#5C5C59]'}`}>1</div>
            <span className="text-sm font-medium hidden sm:inline">Tipo Pratica</span>
          </div>
          <div className="w-12 h-px bg-[#E5E5E3]" />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-[#0F4C5C]' : 'text-[#A1A19E]'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 2 ? 'bg-[#0F4C5C] text-white' : 'bg-[#E5E5E3] text-[#5C5C59]'}`}>2</div>
            <span className="text-sm font-medium hidden sm:inline">Dati Cliente</span>
          </div>
          <div className="w-12 h-px bg-[#E5E5E3]" />
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-[#0F4C5C]' : 'text-[#A1A19E]'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 3 ? 'bg-[#0F4C5C] text-white' : 'bg-[#E5E5E3] text-[#5C5C59]'}`}>3</div>
            <span className="text-sm font-medium hidden sm:inline">Riepilogo</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Practice Type */}
        {step === 1 && (
          <div className="aic-card animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <Briefcase className="w-5 h-5 text-[#0F4C5C]" />
              <h3 className="heading-4">Seleziona Tipo Pratica</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PRACTICE_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, practice_type: type.value })}
                  className={`p-4 border rounded-sm text-left transition-all duration-200 ${
                    formData.practice_type === type.value 
                      ? 'border-[#0F4C5C] bg-[#0F4C5C]/5' 
                      : 'border-[#E5E5E3] hover:border-[#0F4C5C]/50'
                  }`}
                  data-testid={`practice-type-${type.value}`}
                >
                  <p className="font-medium text-[#111110] mb-1">{type.label}</p>
                  <p className="text-sm text-[#5C5C59]">{type.description}</p>
                </button>
              ))}
            </div>

            <div className="flex justify-end mt-6">
              <Button 
                type="button" 
                onClick={() => setStep(2)}
                disabled={!formData.practice_type}
                className="bg-[#0F4C5C] hover:bg-[#0F4C5C]/90 rounded-sm"
                data-testid="next-step-1"
              >
                Continua <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Client Data */}
        {step === 2 && (
          <div className="aic-card animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <User className="w-5 h-5 text-[#0F4C5C]" />
              <h3 className="heading-4">Dati del Cliente</h3>
            </div>

            <div className="space-y-6">
              {/* Client Type Selection */}
              <div className="space-y-3">
                <Label className="label-text">Tipo Cliente *</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {CLIENT_TYPES.map((type) => {
                    const IconComponent = type.icon;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, client_type: type.value, vat_number: type.requiresVat ? formData.vat_number : '' })}
                        className={`p-4 border rounded-sm text-left transition-all duration-200 ${
                          formData.client_type === type.value 
                            ? 'border-[#0F4C5C] bg-[#0F4C5C]/5' 
                            : 'border-[#E5E5E3] hover:border-[#0F4C5C]/50'
                        }`}
                        data-testid={`client-type-${type.value}`}
                      >
                        <IconComponent className={`w-6 h-6 mb-2 ${formData.client_type === type.value ? 'text-[#0F4C5C]' : 'text-[#5C5C59]'}`} />
                        <p className="font-medium text-[#111110] text-sm">{type.label}</p>
                        <p className="text-xs text-[#5C5C59] mt-1">{type.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="client_name" className="label-text">Nome Cliente / Ragione Sociale *</Label>
                <Input
                  id="client_name"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  placeholder="Es: Mario Rossi / Rossi S.r.l."
                  className="border-[#E5E5E3] rounded-sm"
                  required
                  data-testid="client-name-input"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fiscal_code" className="label-text">Codice Fiscale</Label>
                  <Input
                    id="fiscal_code"
                    value={formData.fiscal_code}
                    onChange={(e) => setFormData({ ...formData, fiscal_code: e.target.value.toUpperCase() })}
                    placeholder="RSSMRA85M01H501Z"
                    className="border-[#E5E5E3] rounded-sm font-mono"
                    maxLength={16}
                    data-testid="fiscal-code-input"
                  />
                </div>

                {showVatField && (
                  <div className="space-y-2 animate-fade-in">
                    <Label htmlFor="vat_number" className="label-text">
                      Partita IVA {selectedClientType?.requiresVat && <span className="text-[#E63946]">*</span>}
                    </Label>
                    <Input
                      id="vat_number"
                      value={formData.vat_number}
                      onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
                      placeholder="12345678901"
                      className="border-[#E5E5E3] rounded-sm font-mono"
                      maxLength={11}
                      required={selectedClientType?.requiresVat}
                      data-testid="vat-number-input"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="label-text">Descrizione della Pratica *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrivi brevemente la pratica e le esigenze del cliente..."
                  className="border-[#E5E5E3] rounded-sm min-h-[120px]"
                  required
                  data-testid="description-input"
                />
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setStep(1)}
                className="rounded-sm"
                data-testid="back-step-2"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Indietro
              </Button>
              <Button 
                type="button" 
                onClick={() => setStep(3)}
                disabled={!formData.client_name || !formData.description || !formData.client_type || (selectedClientType?.requiresVat && !formData.vat_number)}
                className="bg-[#0F4C5C] hover:bg-[#0F4C5C]/90 rounded-sm"
                data-testid="next-step-2"
              >
                Continua <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Summary */}
        {step === 3 && (
          <div className="aic-card animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <Info className="w-5 h-5 text-[#0F4C5C]" />
              <h3 className="heading-4">Riepilogo Pratica</h3>
            </div>

            <div className="space-y-6">
              <div className="p-4 bg-[#F9F9F8] rounded-sm border border-[#E5E5E3]">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="label-text mb-1">Tipo Pratica</p>
                    <p className="font-medium text-[#111110]">{selectedType?.label}</p>
                  </div>
                  <div>
                    <p className="label-text mb-1">Tipo Cliente</p>
                    <p className="font-medium text-[#111110]">{selectedClientType?.label}</p>
                  </div>
                  <div>
                    <p className="label-text mb-1">Cliente</p>
                    <p className="font-medium text-[#111110]">{formData.client_name}</p>
                  </div>
                  {formData.fiscal_code && (
                    <div>
                      <p className="label-text mb-1">Codice Fiscale</p>
                      <p className="font-mono text-[#111110]">{formData.fiscal_code}</p>
                    </div>
                  )}
                  {formData.vat_number && (
                    <div>
                      <p className="label-text mb-1">Partita IVA</p>
                      <p className="font-mono text-[#111110]">{formData.vat_number}</p>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-[#E5E5E3]">
                  <p className="label-text mb-1">Descrizione</p>
                  <p className="text-[#111110]">{formData.description}</p>
                </div>
              </div>

              <div className="p-4 bg-[#0F4C5C]/5 rounded-sm border border-[#0F4C5C]/20">
                <div className="flex items-start gap-3">
                  <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="mt-0.5">
                    <rect x="4" y="4" width="40" height="40" rx="8" fill="#0F4C5C" />
                    <path d="M24 10L38 24L24 38L18 32L26 24L18 16L24 10Z" fill="#5DD9C1" />
                  </svg>
                  <div>
                    <p className="font-medium text-[#111110] mb-1">Cosa succede dopo?</p>
                    <p className="text-sm text-[#5C5C59]">
                      Una volta creata la pratica, potrai caricare documenti e utilizzare TaxPilot AI per analizzare, validare e gestire la pratica in modo trasparente.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setStep(2)}
                className="rounded-sm"
                data-testid="back-step-3"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Indietro
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-[#0F4C5C] hover:bg-[#0F4C5C]/90 rounded-sm"
                data-testid="submit-practice"
              >
                {loading ? 'Creazione in corso...' : 'Crea Pratica'}
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
