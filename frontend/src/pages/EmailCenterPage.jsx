import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getEmailDrafts, getEmailSummary, submitEmailForReview, approveEmailDraft,
  sendEmailDraft, createEmailDraft, getPractices,
  getEmailTemplates, getEmailTemplateGroups, resolveEmailTemplate, createDraftFromTemplate,
} from '@/services/api';
import { Button } from '@/components/ui/button';
import {
  Mail, Send, Clock, CheckCircle, XCircle, AlertTriangle, Shield, RefreshCw,
  Plus, Eye, ArrowRight, FileText, Lock, LayoutTemplate, PenLine, ChevronRight,
  Users, Building2, Briefcase, ShieldAlert, ClipboardCheck, FileSignature, Package, Bell, KeyRound,
} from 'lucide-react';
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

const GROUP_ICONS = {
  private: Users, freelancer: Briefcase, company: Building2, blocked: ShieldAlert,
  approval: ClipboardCheck, delegation: FileSignature, delivery: Package, reminder: Bell, account: KeyRound,
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
      toast.error(err?.response?.data?.detail || "Errore nell'operazione");
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
                      {draft.template_name && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0F4C5C]/5 text-[#0F4C5C] font-medium">
                          {draft.template_name}
                        </span>
                      )}
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


/* ─────────────── CREATE DRAFT FORM (TEMPLATE + MANUAL) ─────────────── */

function CreateDraftForm({ onCreated }) {
  const [mode, setMode] = useState('template'); // 'template' | 'manual'

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden" data-testid="email-create-form">
      <div className="flex items-center gap-2 px-5 pt-5 pb-3">
        <Shield className="w-5 h-5 text-[#0F4C5C]" />
        <h3 className="text-sm font-bold text-[#0F172A]">Nuova Bozza Email</h3>
      </div>
      {/* Tab switcher */}
      <div className="flex border-b border-[#E2E8F0] px-5" data-testid="email-mode-tabs">
        <button
          onClick={() => setMode('template')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            mode === 'template'
              ? 'border-[#0F4C5C] text-[#0F4C5C]'
              : 'border-transparent text-[#94A3B8] hover:text-[#64748B]'
          }`}
          data-testid="email-mode-template"
        >
          <LayoutTemplate className="w-3.5 h-3.5" /> Da Template
        </button>
        <button
          onClick={() => setMode('manual')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            mode === 'manual'
              ? 'border-[#0F4C5C] text-[#0F4C5C]'
              : 'border-transparent text-[#94A3B8] hover:text-[#64748B]'
          }`}
          data-testid="email-mode-manual"
        >
          <PenLine className="w-3.5 h-3.5" /> Manuale
        </button>
      </div>

      <div className="p-5">
        {mode === 'template' ? <TemplateDraftFlow onCreated={onCreated} /> : <ManualDraftForm onCreated={onCreated} />}
      </div>
    </div>
  );
}


/* ─────────────── TEMPLATE DRAFT FLOW ─────────────── */

function TemplateDraftFlow({ onCreated }) {
  const [groups, setGroups] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [practices, setPractices] = useState([]);
  const [loadingInit, setLoadingInit] = useState(true);

  // Selection state
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedPractice, setSelectedPractice] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');

  // Resolve state
  const [resolved, setResolved] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [overrides, setOverrides] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      getEmailTemplateGroups(),
      getEmailTemplates(),
      getPractices(),
    ]).then(([gRes, tRes, pRes]) => {
      setGroups(gRes.data || []);
      setTemplates(tRes.data || []);
      setPractices(pRes.data || []);
    }).catch(() => toast.error('Errore nel caricamento dei template'))
      .finally(() => setLoadingInit(false));
  }, []);

  // Auto-resolve when template + practice change
  useEffect(() => {
    if (!selectedTemplate || !selectedPractice) {
      setResolved(null);
      return;
    }
    let cancelled = false;
    const doResolve = async () => {
      setResolving(true);
      try {
        const res = await resolveEmailTemplate(selectedTemplate.id, {
          practice_id: selectedPractice,
          extra: Object.keys(overrides).length > 0 ? overrides : null,
        });
        if (!cancelled) setResolved(res.data);
      } catch {
        if (!cancelled) toast.error('Errore nella risoluzione del template');
      } finally {
        if (!cancelled) setResolving(false);
      }
    };
    doResolve();
    return () => { cancelled = true; };
  }, [selectedTemplate, selectedPractice]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-resolve with overrides (debounced via button)
  const handleReResolve = async () => {
    if (!selectedTemplate || !selectedPractice) return;
    setResolving(true);
    try {
      const res = await resolveEmailTemplate(selectedTemplate.id, {
        practice_id: selectedPractice,
        extra: Object.keys(overrides).length > 0 ? overrides : null,
      });
      setResolved(res.data);
    } catch {
      toast.error('Errore nella risoluzione');
    } finally {
      setResolving(false);
    }
  };

  const handleCreateDraft = async () => {
    if (!selectedTemplate || !selectedPractice || !recipientEmail) {
      toast.error('Seleziona template, pratica e destinatario');
      return;
    }
    try {
      setSubmitting(true);
      await createDraftFromTemplate({
        template_id: selectedTemplate.id,
        practice_id: selectedPractice,
        recipient_email: recipientEmail,
        recipient_name: recipientName || undefined,
        extra_values: Object.keys(overrides).length > 0 ? overrides : undefined,
      });
      toast.success('Bozza creata dal template');
      onCreated();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Errore nella creazione');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTemplates = selectedGroup
    ? templates.filter(t => t.group === selectedGroup)
    : templates;

  if (loadingInit) {
    return (
      <div className="flex items-center justify-center py-10">
        <RefreshCw className="w-4 h-4 animate-spin text-[#0F4C5C]" />
        <span className="ml-2 text-xs text-[#64748B]">Caricamento template...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="template-draft-flow">
      {/* ── Step 1: Group browser ── */}
      <div>
        <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mb-2">1. Categoria template</p>
        <div className="flex flex-wrap gap-1.5" data-testid="template-group-selector">
          <button
            onClick={() => { setSelectedGroup(null); setSelectedTemplate(null); setResolved(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              !selectedGroup
                ? 'bg-[#0F4C5C] text-white shadow-sm'
                : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
            }`}
            data-testid="template-group-all"
          >
            Tutti ({templates.length})
          </button>
          {groups.map(g => {
            const GIcon = GROUP_ICONS[g.id] || FileText;
            return (
              <button key={g.id}
                onClick={() => { setSelectedGroup(g.id); setSelectedTemplate(null); setResolved(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedGroup === g.id
                    ? 'bg-[#0F4C5C] text-white shadow-sm'
                    : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                }`}
                data-testid={`template-group-${g.id}`}
              >
                <GIcon className="w-3 h-3" /> {g.label} ({g.count})
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Step 2: Template picker ── */}
      <div>
        <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mb-2">2. Seleziona template</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-1" data-testid="template-picker">
          {filteredTemplates.map(t => {
            const isSelected = selectedTemplate?.id === t.id;
            const GIcon = GROUP_ICONS[t.group] || FileText;
            return (
              <button key={t.id}
                onClick={() => { setSelectedTemplate(t); setOverrides({}); }}
                className={`text-left p-3 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-[#0F4C5C] bg-[#0F4C5C]/5 ring-1 ring-[#0F4C5C]/20'
                    : 'border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]'
                }`}
                data-testid={`template-item-${t.id}`}
              >
                <div className="flex items-start gap-2">
                  <GIcon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${isSelected ? 'text-[#0F4C5C]' : 'text-[#94A3B8]'}`} />
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold truncate ${isSelected ? 'text-[#0F4C5C]' : 'text-[#0F172A]'}`}>{t.name}</p>
                    <p className="text-[10px] text-[#94A3B8] mt-0.5 truncate">{t.group_label}</p>
                  </div>
                  {isSelected && <CheckCircle className="w-3.5 h-3.5 text-[#0F4C5C] ml-auto flex-shrink-0 mt-0.5" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Step 3: Practice + Recipient ── */}
      {selectedTemplate && (
        <div className="space-y-3">
          <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider">3. Pratica e destinatario</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-[#64748B] font-medium">Pratica</label>
              <select value={selectedPractice} onChange={(e) => setSelectedPractice(e.target.value)}
                className="w-full mt-1 rounded-lg border border-[#E2E8F0] px-3 py-2 text-xs text-[#0F172A] bg-white"
                data-testid="template-practice-select">
                <option value="">Seleziona pratica...</option>
                {practices.map(p => (
                  <option key={p.id} value={p.id}>{p.client_name} — {p.practice_type_label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[#64748B] font-medium">Email destinatario</label>
              <input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="email@esempio.it"
                className="w-full mt-1 rounded-lg border border-[#E2E8F0] px-3 py-2 text-xs text-[#0F172A]"
                data-testid="template-recipient-email" />
            </div>
            <div>
              <label className="text-[10px] text-[#64748B] font-medium">Nome destinatario <span className="text-[#94A3B8]">(opzionale)</span></label>
              <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Nome Cognome"
                className="w-full mt-1 rounded-lg border border-[#E2E8F0] px-3 py-2 text-xs text-[#0F172A]"
                data-testid="template-recipient-name" />
            </div>
          </div>
        </div>
      )}

      {/* ── Step 4: Live Preview ── */}
      {selectedTemplate && selectedPractice && (
        <div data-testid="template-preview-section">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider">4. Anteprima email</p>
            {resolving && <span className="text-[10px] text-[#94A3B8] flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Risoluzione...</span>}
          </div>

          {resolved ? (
            <div className="rounded-xl border border-[#E2E8F0] overflow-hidden">
              {/* Subject bar */}
              <div className="bg-[#F8FAFC] px-4 py-2.5 border-b border-[#E2E8F0]">
                <p className="text-[10px] text-[#94A3B8] font-medium">OGGETTO</p>
                <p className="text-sm font-semibold text-[#0F172A] mt-0.5" data-testid="template-preview-subject">{resolved.subject}</p>
              </div>
              {/* HTML body */}
              <div className="px-4 py-4 bg-white" data-testid="template-preview-body">
                <div
                  className="prose prose-sm max-w-none text-[#0F172A]"
                  style={{ fontSize: '14px', lineHeight: '1.6' }}
                  dangerouslySetInnerHTML={{ __html: resolved.body_html }}
                />
              </div>
              {/* Unresolved placeholders */}
              {resolved.unresolved_placeholders?.length > 0 && (
                <div className="bg-amber-50/60 border-t border-amber-200 px-4 py-3" data-testid="template-unresolved-section">
                  <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Campi da completare manualmente
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {resolved.unresolved_placeholders.map(ph => (
                      <div key={ph}>
                        <label className="text-[10px] text-amber-800 font-medium">[{ph}]</label>
                        <input
                          type="text"
                          value={overrides[ph] || ''}
                          onChange={(e) => setOverrides(prev => ({ ...prev, [ph]: e.target.value }))}
                          placeholder={`Inserisci ${ph}...`}
                          className="w-full mt-0.5 rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs text-[#0F172A] bg-white focus:ring-1 focus:ring-amber-300 focus:border-amber-300"
                          data-testid={`template-override-${ph}`}
                        />
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" onClick={handleReResolve}
                    className="mt-2 text-[10px] gap-1 border-amber-300 text-amber-700 hover:bg-amber-100 h-7"
                    disabled={resolving}
                    data-testid="template-re-resolve">
                    <RefreshCw className={`w-3 h-3 ${resolving ? 'animate-spin' : ''}`} /> Aggiorna anteprima
                  </Button>
                </div>
              )}
            </div>
          ) : resolving ? (
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-center py-8">
              <RefreshCw className="w-4 h-4 animate-spin text-[#0F4C5C]" />
              <span className="ml-2 text-xs text-[#64748B]">Generazione anteprima...</span>
            </div>
          ) : null}
        </div>
      )}

      {/* ── Step 5: Create button ── */}
      {selectedTemplate && selectedPractice && resolved && (
        <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
          <p className="text-[10px] text-[#94A3B8]">La bozza seguira il flusso: bozza → revisione → approvazione → invio</p>
          <Button onClick={handleCreateDraft} size="sm" className="gap-2 bg-[#0F4C5C]"
            disabled={submitting || !recipientEmail}
            data-testid="template-create-draft-btn">
            {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
            Crea Bozza da Template
          </Button>
        </div>
      )}
    </div>
  );
}


/* ─────────────── MANUAL DRAFT FORM (FALLBACK) ─────────────── */

function ManualDraftForm({ onCreated }) {
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
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="manual-draft-form">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Pratica</label>
          <select value={practiceId} onChange={(e) => setPracticeId(e.target.value)}
            className="w-full mt-1 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] bg-white"
            data-testid="manual-practice-select">
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
            className="w-full mt-1 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A]"
            data-testid="manual-recipient-input" />
        </div>
      </div>
      <div>
        <label className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Oggetto</label>
        <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
          placeholder="Oggetto email..."
          className="w-full mt-1 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A]"
          data-testid="manual-subject-input" />
      </div>
      <div>
        <label className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Corpo del messaggio</label>
        <textarea value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} rows={5}
          placeholder="Scrivi il contenuto dell'email..."
          className="w-full mt-1 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] resize-none"
          data-testid="manual-body-input" />
      </div>
      <div className="flex items-center justify-between pt-2">
        <p className="text-[10px] text-[#94A3B8]">La bozza sara sottoposta a verifica di conformita prima dell'invio</p>
        <Button type="submit" size="sm" className="gap-2 bg-[#0F4C5C]" disabled={submitting} data-testid="manual-create-submit">
          {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
          Crea Bozza
        </Button>
      </div>
    </form>
  );
}
