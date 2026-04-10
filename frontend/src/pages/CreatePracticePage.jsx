import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPractice } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  ArrowLeft,
  ArrowRight,
  User,
  Briefcase,
  Info,
  Building2,
  UserCircle,
  CheckCircle,
  FileText
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
  { value: 'private', label: 'Privato', description: 'Persona fisica senza P.IVA', icon: UserCircle, requiresVat: false },
  { value: 'freelancer', label: 'Professionista', description: 'Con Partita IVA', icon: User, requiresVat: true },
  { value: 'company', label: 'Azienda', description: 'Società o impresa', icon: Building2, requiresVat: true },
];

export default function CreatePracticePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [formData, setFormData] = useState({
    practice_type: '',
    client_type: '',
    client_name: '',
    fiscal_code: '',
    vat_number: '',
    description: '',
    additional_data: {}
  });

  const handleSubmit = async () => {
    setShowConfirmDialog(false);
    setLoading(true);
    
    try {
      const response = await createPractice(formData);
      toast.success('Pratica creata con successo', {
        description: 'La pratica è stata registrata nel sistema'
      });
      navigate(`/practices/${response.data.id}`);
    } catch (error) {
      toast.error('Errore nella creazione', {
        description: error.response?.data?.detail || 'Si è verificato un errore'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.practice_type || !formData.client_name || !formData.description || !formData.client_type) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    const selectedClientType = CLIENT_TYPES.find(t => t.value === formData.client_type);
    if (selectedClientType?.requiresVat && !formData.vat_number) {
      toast.error('La partita IVA è obbligatoria');
      return;
    }

    setShowConfirmDialog(true);
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
          className="flex items-center gap-2 text-sm text-[#5C5C59] hover:text-[#111110] mb-4 transition-colors"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          Torna alle pratiche
        </button>
        <h1 className="text-2xl font-semibold text-[#111110] mb-2">Nuova Pratica</h1>
        <p className="text-sm text-[#5C5C59]">Crea una nuova pratica fiscale in pochi passaggi</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-10">
        <div className="flex items-center gap-3">
          {[1, 2, 3].map((num) => (
            <div key={num} className="flex items-center">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold transition-all ${
                step >= num 
                  ? 'bg-[#0A192F] text-white shadow-lg shadow-[#0A192F]/20' 
                  : 'bg-[#F5F5F4] text-[#A1A19E]'
              }`}>
                {step > num ? <CheckCircle className="w-5 h-5" /> : num}
              </div>
              {num < 3 && (
                <div className={`w-16 h-1 mx-2 rounded-full transition-colors ${
                  step > num ? 'bg-[#0A192F]' : 'bg-[#E5E5E3]'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleFormSubmit}>
        {/* Step 1: Practice Type */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-[#E5E5E3]/60 p-6 shadow-sm animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#0A192F]/5 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-[#0A192F]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#111110]">Tipo Pratica</h3>
                <p className="text-xs text-[#5C5C59]">Seleziona il tipo di pratica da creare</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PRACTICE_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, practice_type: type.value })}
                  className={`p-4 border rounded-xl text-left transition-all duration-200 ${
                    formData.practice_type === type.value 
                      ? 'border-[#0A192F] bg-[#0A192F]/5 ring-1 ring-[#0A192F]' 
                      : 'border-[#E5E5E3] hover:border-[#0A192F]/50 hover:bg-[#FAFAFA]'
                  }`}
                  data-testid={`practice-type-${type.value}`}
                >
                  <p className="font-medium text-[#111110] text-sm mb-1">{type.label}</p>
                  <p className="text-xs text-[#5C5C59]">{type.description}</p>
                </button>
              ))}
            </div>

            <div className="flex justify-end mt-6">
              <Button 
                type="button" 
                onClick={() => setStep(2)}
                disabled={!formData.practice_type}
                className="bg-[#0A192F] hover:bg-[#0A192F]/90 rounded-xl shadow-lg shadow-[#0A192F]/20"
                data-testid="next-step-1"
              >
                Continua <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Client Data */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-[#E5E5E3]/60 p-6 shadow-sm animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#0A192F]/5 flex items-center justify-center">
                <User className="w-5 h-5 text-[#0A192F]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#111110]">Dati Cliente</h3>
                <p className="text-xs text-[#5C5C59]">Inserisci le informazioni del cliente</p>
              </div>
            </div>

            <div className="space-y-5">
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
                        onClick={() => setFormData({ ...formData, client_type: type.value, vat_number: type.requiresVat ? formData.vat_number : '' })}
                        className={`p-4 border rounded-xl text-center transition-all duration-200 ${
                          formData.client_type === type.value 
                            ? 'border-[#0A192F] bg-[#0A192F]/5 ring-1 ring-[#0A192F]' 
                            : 'border-[#E5E5E3] hover:border-[#0A192F]/50'
                        }`}
                        data-testid={`client-type-${type.value}`}
                      >
                        <IconComponent className={`w-6 h-6 mx-auto mb-2 ${formData.client_type === type.value ? 'text-[#0A192F]' : 'text-[#A1A19E]'}`} />
                        <p className="text-xs font-medium text-[#111110]">{type.label}</p>
                        <p className="text-[10px] text-[#5C5C59] mt-0.5">{type.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Client Name */}
              <div className="space-y-2">
                <Label htmlFor="client_name" className="text-xs font-medium text-[#5C5C59] uppercase tracking-wider">Nome / Ragione Sociale *</Label>
                <Input
                  id="client_name"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  placeholder="Es: Mario Rossi / Rossi S.r.l."
                  className="rounded-xl border-[#E5E5E3] h-11"
                  required
                  data-testid="client-name-input"
                />
              </div>

              {/* Fiscal Code & VAT */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fiscal_code" className="text-xs font-medium text-[#5C5C59] uppercase tracking-wider">Codice Fiscale</Label>
                  <Input
                    id="fiscal_code"
                    value={formData.fiscal_code}
                    onChange={(e) => setFormData({ ...formData, fiscal_code: e.target.value.toUpperCase() })}
                    placeholder="RSSMRA85M01H501Z"
                    className="rounded-xl border-[#E5E5E3] h-11 font-mono"
                    maxLength={16}
                    data-testid="fiscal-code-input"
                  />
                </div>

                {showVatField && (
                  <div className="space-y-2 animate-in slide-in-from-left-2 duration-200">
                    <Label htmlFor="vat_number" className="text-xs font-medium text-[#5C5C59] uppercase tracking-wider">
                      Partita IVA *
                    </Label>
                    <Input
                      id="vat_number"
                      value={formData.vat_number}
                      onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
                      placeholder="12345678901"
                      className="rounded-xl border-[#E5E5E3] h-11 font-mono"
                      maxLength={11}
                      required={selectedClientType?.requiresVat}
                      data-testid="vat-number-input"
                    />
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-medium text-[#5C5C59] uppercase tracking-wider">Descrizione *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrivi brevemente la pratica..."
                  className="rounded-xl border-[#E5E5E3] min-h-[100px] resize-none"
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
                className="rounded-xl"
                data-testid="back-step-2"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Indietro
              </Button>
              <Button 
                type="button" 
                onClick={() => setStep(3)}
                disabled={!formData.client_name || !formData.description || !formData.client_type || (selectedClientType?.requiresVat && !formData.vat_number)}
                className="bg-[#0A192F] hover:bg-[#0A192F]/90 rounded-xl shadow-lg shadow-[#0A192F]/20"
                data-testid="next-step-2"
              >
                Continua <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Summary */}
        {step === 3 && (
          <div className="bg-white rounded-2xl border border-[#E5E5E3]/60 p-6 shadow-sm animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#0A192F]/5 flex items-center justify-center">
                <Info className="w-5 h-5 text-[#0A192F]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#111110]">Riepilogo</h3>
                <p className="text-xs text-[#5C5C59]">Verifica i dati prima di creare la pratica</p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="p-5 bg-[#FAFAFA] rounded-xl border border-[#E5E5E3]/60">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-[#5C5C59] uppercase tracking-wider mb-1">Tipo Pratica</p>
                    <p className="text-sm font-medium text-[#111110]">{selectedType?.label}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#5C5C59] uppercase tracking-wider mb-1">Tipo Cliente</p>
                    <p className="text-sm font-medium text-[#111110]">{selectedClientType?.label}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#5C5C59] uppercase tracking-wider mb-1">Cliente</p>
                    <p className="text-sm font-medium text-[#111110]">{formData.client_name}</p>
                  </div>
                  {formData.fiscal_code && (
                    <div>
                      <p className="text-xs font-medium text-[#5C5C59] uppercase tracking-wider mb-1">Codice Fiscale</p>
                      <p className="text-sm font-mono text-[#111110]">{formData.fiscal_code}</p>
                    </div>
                  )}
                  {formData.vat_number && (
                    <div>
                      <p className="text-xs font-medium text-[#5C5C59] uppercase tracking-wider mb-1">Partita IVA</p>
                      <p className="text-sm font-mono text-[#111110]">{formData.vat_number}</p>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-[#E5E5E3]/60">
                  <p className="text-xs font-medium text-[#5C5C59] uppercase tracking-wider mb-1">Descrizione</p>
                  <p className="text-sm text-[#111110]">{formData.description}</p>
                </div>
              </div>

              <div className="p-4 bg-[#0A192F]/5 rounded-xl border border-[#0A192F]/10">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-[#0A192F] mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[#111110] mb-1">Dopo la creazione</p>
                    <p className="text-xs text-[#5C5C59]">
                      Potrai caricare documenti e utilizzare Herion AI per analizzare e gestire la pratica.
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
                className="rounded-xl"
                data-testid="back-step-3"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Indietro
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-[#0A192F] hover:bg-[#0A192F]/90 rounded-xl shadow-lg shadow-[#0A192F]/20"
                data-testid="submit-practice"
              >
                {loading ? 'Creazione...' : 'Crea Pratica'}
              </Button>
            </div>
          </div>
        )}
      </form>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="rounded-2xl border-[#E5E5E3]/60 shadow-2xl max-w-md">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-xl bg-[#0A192F]/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-[#0A192F]" />
            </div>
            <AlertDialogTitle className="text-xl font-semibold text-center">Conferma creazione</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[#5C5C59]">
              Stai per creare una pratica <span className="font-medium text-[#111110]">"{selectedType?.label}"</span> per <span className="font-medium text-[#111110]">{formData.client_name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 sm:gap-3">
            <AlertDialogCancel className="rounded-xl border-[#E5E5E3] hover:bg-[#F5F5F4] flex-1">
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSubmit}
              className="bg-[#0A192F] hover:bg-[#0A192F]/90 rounded-xl flex-1"
              data-testid="confirm-create-btn"
            >
              Conferma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
