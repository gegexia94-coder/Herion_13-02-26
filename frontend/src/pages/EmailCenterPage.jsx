import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getEmailDrafts, getEmailSummary, submitEmailForReview, approveEmailDraft, sendEmailDraft, createEmailDraft, getPractices } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Mail, Send, Clock, CheckCircle, XCircle, AlertTriangle, Shield, RefreshCw, Plus, Eye, ArrowRight, FileText, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  draft: { label: 'Bozza', color: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200', icon: FileText },
  review: { label: 'In Revisione', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: Clock },
  approved: { label: 'Approvata', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle },
  sending: { label: 'In Invio', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: Send },
  sent: { label: 'Inviata', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle },
  failed: { label: 'Fallita', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: XCircle },
  blocked: { label: 'Bloccata', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: Lock },
};

export default function EmailCenterPage() {
  const { user } = useAuth();
  const [drafts, setDrafts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'creator';

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const [draftsRes, summaryRes] = await Promise.all([
        getEmailDrafts(params),
        getEmailSummary(),
      ]);
      setDrafts(draftsRes.data);
      setSummary(summaryRes.data);
    } catch {
      toast.error('Errore nel caricamento delle email');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async (draftId, action) => {
    try {
      setActionLoading(draftId + action);
      if (action === 'review') await submitEmailForReview(draftId);
      else if (action === 'approve') await approveEmailDraft(draftId);
      else if (action === 'send') await sendEmailDraft(draftId);
      toast.success(action === 'send' ? 'Email inviata' : action === 'approve' ? 'Email approvata' : 'Inviata in revisione');
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Errore nell\'operazione');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6" data-testid="email-center-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight" data-testid="email-center-title">Centro Email</h1>
          <p className="text-sm text-[#64748B] mt-1">Bozze, revisione, approvazione e invio controllato</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-2" data-testid="email-refresh">
            <RefreshCw className="w-4 h-4" /> Aggiorna
          </Button>
          <Button size="sm" onClick={() => setShowCreate(!showCreate)} className="gap-2 bg-[#0F4C5C]" data-testid="email-new-btn">
            <Plus className="w-4 h-4" /> Nuova Bozza
          </Button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-7 gap-2" data-testid="email-summary">
          {[
            { label: 'Totali', value: summary.total, color: 'text-[#0F4C5C]' },
            { label: 'Bozze', value: summary.draft, color: 'text-sky-600' },
            { label: 'Revisione', value: summary.review, color: 'text-amber-600' },
            { label: 'Approvate', value: summary.approved, color: 'text-emerald-600' },
            { label: 'Inviate', value: summary.sent, color: 'text-emerald-700' },
            { label: 'Fallite', value: summary.failed, color: 'text-red-600' },
            { label: 'Bloccate', value: summary.blocked, color: 'text-red-500' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl p-3 border border-[#E2E8F0]/50">
              <p className="text-[10px] text-[#64748B] font-medium">{s.label}</p>
              <p className={`text-xl font-bold ${s.color} mt-0.5`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 flex-wrap" data-testid="email-filters">
        {['all', 'draft', 'review', 'approved', 'sent', 'failed', 'blocked'].map((f) => (
          <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm"
            onClick={() => setFilter(f)}
            className={filter === f ? 'bg-[#0F4C5C] text-white' : ''} data-testid={`email-filter-${f}`}>
            {f === 'all' ? 'Tutte' : (STATUS_CONFIG[f]?.label || f)}
          </Button>
        ))}
      </div>

      {showCreate && <CreateDraftForm onCreated={() => { setShowCreate(false); fetchData(); }} />}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-5 h-5 animate-spin text-[#0F4C5C]" />
          <span className="ml-2 text-sm text-[#64748B]">Caricamento...</span>
        </div>
      ) : drafts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#E2E8F0]" data-testid="email-empty">
          <Mail className="w-10 h-10 text-[#5DD9C1] mx-auto mb-3" />
          <p className="text-[#0F172A] font-medium">Nessuna email {filter !== 'all' ? STATUS_CONFIG[filter]?.label.toLowerCase() : ''}</p>
          <p className="text-sm text-[#64748B] mt-1">Crea una bozza per iniziare</p>
        </div>
      ) : (
        <div className="space-y-3" data-testid="email-list">
          {drafts.map((draft) => {
            const cfg = STATUS_CONFIG[draft.status] || STATUS_CONFIG.draft;
            const Icon = cfg.icon;
            return (
              <div key={draft.id} className={`bg-white rounded-xl border ${cfg.border} p-4 transition-all hover:shadow-md`} data-testid={`email-item-${draft.id}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-[#0F172A] text-sm truncate">{draft.subject}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <p className="text-xs text-[#64748B]">
                      A: {draft.recipient_email} {draft.client_name ? `| ${draft.client_name}` : ''}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[#94A3B8]">
                      <span>{format(new Date(draft.created_at), 'dd MMM yyyy HH:mm', { locale: it })}</span>
                      {draft.attachment_doc_keys?.length > 0 && (
                        <span className="flex items-center gap-0.5"><FileText className="w-3 h-3" />{draft.attachment_doc_keys.length} allegati</span>
                      )}
                      {draft.sent_at && <span className="text-emerald-600">Inviata: {format(new Date(draft.sent_at), 'dd MMM HH:mm', { locale: it })}</span>}
                      {draft.send_error && <span className="text-red-500 truncate max-w-[200px]">{draft.send_error}</span>}
                    </div>
                    {/* Compliance issues */}
                    {draft.compliance?.issues?.length > 0 && (
                      <div className="mt-2 space-y-0.5">
                        {draft.compliance.issues.map((issue, i) => (
                          <p key={i} className="text-[10px] text-red-600 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />{issue.label}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {draft.status === 'draft' && (
                      <Button variant="outline" size="sm" className="text-[10px] gap-1 border-amber-200 text-amber-700 hover:bg-amber-50 h-7 px-2"
                        onClick={() => handleAction(draft.id, 'review')} disabled={!!actionLoading} data-testid={`email-review-${draft.id}`}>
                        {actionLoading === draft.id + 'review' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />} Revisione
                      </Button>
                    )}
                    {isAdmin && draft.status === 'review' && (
                      <Button variant="outline" size="sm" className="text-[10px] gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 h-7 px-2"
                        onClick={() => handleAction(draft.id, 'approve')} disabled={!!actionLoading} data-testid={`email-approve-${draft.id}`}>
                        {actionLoading === draft.id + 'approve' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />} Approva
                      </Button>
                    )}
                    {isAdmin && draft.status === 'approved' && (
                      <Button size="sm" className="text-[10px] gap-1 bg-[#0F4C5C] h-7 px-2"
                        onClick={() => handleAction(draft.id, 'send')} disabled={!!actionLoading} data-testid={`email-send-${draft.id}`}>
                        {actionLoading === draft.id + 'send' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Invia
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


function CreateDraftForm({ onCreated }) {
  const [practices, setPractices] = useState([]);
  const [practiceId, setPracticeId] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getPractices().then(r => setPractices(r.data || [])).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!practiceId || !recipientEmail || !subject || !bodyHtml) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }
    try {
      setSubmitting(true);
      await createEmailDraft({
        practice_id: practiceId,
        recipient_email: recipientEmail,
        subject,
        body_html: `<p>${bodyHtml.replace(/\n/g, '</p><p>')}</p>`,
      });
      toast.success('Bozza creata');
      onCreated();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Errore nella creazione');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4" data-testid="email-create-form">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="w-5 h-5 text-[#0F4C5C]" />
        <h3 className="text-sm font-bold text-[#0F172A]">Nuova Bozza Email</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Pratica</label>
          <select value={practiceId} onChange={(e) => setPracticeId(e.target.value)}
            className="w-full mt-1 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] bg-white" data-testid="email-practice-select">
            <option value="">Seleziona pratica...</option>
            {practices.map(p => (
              <option key={p.id} value={p.id}>{p.client_name} — {p.practice_type_label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Email destinatario</label>
          <input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="email@esempio.it"
            className="w-full mt-1 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A]" data-testid="email-recipient-input" />
        </div>
      </div>
      <div>
        <label className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Oggetto</label>
        <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
          placeholder="Oggetto email..."
          className="w-full mt-1 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A]" data-testid="email-subject-input" />
      </div>
      <div>
        <label className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Corpo del messaggio</label>
        <textarea value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} rows={5}
          placeholder="Scrivi il contenuto dell'email..."
          className="w-full mt-1 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] resize-none" data-testid="email-body-input" />
      </div>
      <div className="flex items-center justify-between pt-2">
        <p className="text-[10px] text-[#94A3B8]">La bozza sara sottoposta a verifica di conformita prima dell'invio</p>
        <Button type="submit" size="sm" className="gap-2 bg-[#0F4C5C]" disabled={submitting} data-testid="email-create-submit">
          {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
          Crea Bozza
        </Button>
      </div>
    </form>
  );
}
