import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  getEmailDrafts, getEmailSummary, submitEmailForReview, approveEmailDraft,
  sendEmailDraft, createEmailDraft, getPractices, getPracticeWorkspace,
  getEmailTemplates, getEmailTemplateGroups, resolveEmailTemplate, createDraftFromTemplate,
} from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Mail, Send, Clock, CheckCircle, XCircle, AlertTriangle, Shield, RefreshCw,
  Plus, Eye, ArrowRight, FileText, Lock, PenLine, ChevronRight, ChevronDown,
  Bot, ExternalLink, Flag, UserCheck, Cog, Key, Info
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

export default function EmailCenterPage() {
  const { user } = useAuth();
  const [drafts, setDrafts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [practices, setPractices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [contextData, setContextData] = useState(null);
  const [contextLoading, setContextLoading] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'creator';

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const [draftsRes, summaryRes, practicesRes] = await Promise.all([
        getEmailDrafts(params), getEmailSummary(), getPractices(),
      ]);
      setDrafts(draftsRes.data);
      setSummary(summaryRes.data);
      setPractices(practicesRes.data);
    } catch (e) { console.warn('Fetch failed:', e?.message); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Load workspace context when a draft is selected
  const loadContext = async (draft) => {
    setSelectedDraft(draft);
    if (!draft?.practice_id) { setContextData(null); return; }
    setContextLoading(true);
    try {
      const ws = await getPracticeWorkspace(draft.practice_id);
      setContextData(ws.data);
    } catch { setContextData(null); }
    finally { setContextLoading(false); }
  };

  const handleAction = async (draftId, action) => {
    try {
      setActionLoading(draftId + action);
      if (action === 'review') await submitEmailForReview(draftId);
      else if (action === 'approve') await approveEmailDraft(draftId);
      else if (action === 'send') await sendEmailDraft(draftId);
      toast.success(action === 'send' ? 'Email inviata' : action === 'approve' ? 'Email approvata' : 'Inviata in revisione');
      fetchData();
    } catch (err) { toast.error(err?.response?.data?.detail || "Errore nell'operazione"); }
    finally { setActionLoading(null); }
  };

  // Count emails needing action
  const needsAction = (summary?.draft || 0) + (summary?.review || 0);

  return (
    <div className="space-y-5" data-testid="email-center-page">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[var(--text-primary)] tracking-tight" data-testid="email-center-title">Comunicazione</h1>
          <p className="text-[12px] text-[var(--text-secondary)]">Email, messaggi e notifiche legate alle tue pratiche</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} className="rounded-lg h-8 text-[11px] gap-1.5" style={{ borderColor: 'var(--border-soft)' }} data-testid="email-refresh">
            <RefreshCw className="w-3 h-3" />Aggiorna
          </Button>
          <Button size="sm" onClick={() => setShowCreate(!showCreate)} className="rounded-lg h-8 text-[11px] gap-1.5 bg-[var(--text-primary)] hover:bg-[#2a3040]" data-testid="email-new-btn">
            <Plus className="w-3 h-3" />Nuova
          </Button>
        </div>
      </div>

      {/* ── QUICK STATS ── */}
      {summary && (
        <div className="grid grid-cols-4 gap-2" data-testid="email-summary">
          {[
            { label: 'Richiedono azione', value: needsAction, color: needsAction > 0 ? 'text-amber-600' : 'text-[var(--text-muted)]', bg: needsAction > 0 ? 'bg-amber-50/50' : '' },
            { label: 'Inviate', value: summary.sent || 0, color: 'text-emerald-600', bg: '' },
            { label: 'Bloccate', value: (summary.failed || 0) + (summary.blocked || 0), color: (summary.failed || 0) + (summary.blocked || 0) > 0 ? 'text-red-500' : 'text-[var(--text-muted)]', bg: '' },
            { label: 'Totali', value: summary.total || 0, color: 'text-[var(--text-primary)]', bg: '' },
          ].map((s) => (
            <div key={s.label} className={`bg-white rounded-xl p-3 border ${s.bg}`} style={{ borderColor: 'var(--border-soft)' }}>
              <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{s.label}</p>
              <p className={`text-xl font-bold ${s.color} mt-0.5`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── FILTERS ── */}
      <div className="flex gap-1.5 flex-wrap" data-testid="email-filters">
        {[
          { key: 'all', label: 'Tutte' },
          { key: 'draft', label: 'Bozze' },
          { key: 'review', label: 'Revisione' },
          { key: 'approved', label: 'Approvate' },
          { key: 'sent', label: 'Inviate' },
          { key: 'failed', label: 'Problemi' },
        ].map((f) => (
          <Button key={f.key} variant={filter === f.key ? 'default' : 'outline'} size="sm"
            onClick={() => setFilter(f.key)}
            className={`rounded-lg h-7 text-[10px] px-3 ${filter === f.key ? 'bg-[var(--text-primary)] text-white' : ''}`}
            style={filter !== f.key ? { borderColor: 'var(--border-soft)' } : {}}
            data-testid={`email-filter-${f.key}`}>
            {f.label}
          </Button>
        ))}
      </div>

      {showCreate && <CreateDraftForm practices={practices} onCreated={() => { setShowCreate(false); fetchData(); }} />}

      {/* ── MAIN CONTENT ── */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><RefreshCw className="w-5 h-5 animate-spin text-[var(--text-muted)]" /></div>
      ) : drafts.length === 0 ? (
        <div className="bg-white rounded-xl border py-14 px-6 text-center" style={{ borderColor: 'var(--border-soft)' }} data-testid="email-empty">
          <Mail className="w-7 h-7 text-[var(--text-muted)] mx-auto mb-2.5 opacity-30" strokeWidth={1.5} />
          <p className="text-[13px] font-semibold text-[var(--text-primary)]">Nessuna comunicazione {filter !== 'all' ? STATUS_CONFIG[filter]?.label.toLowerCase() : ''}</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1 max-w-sm mx-auto">
            Le comunicazioni vengono create automaticamente durante le pratiche, oppure puoi crearne una manualmente.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
          {/* ── EMAIL LIST ── */}
          <div className="space-y-2" data-testid="email-list">
            {drafts.map((draft) => {
              const cfg = STATUS_CONFIG[draft.status] || STATUS_CONFIG.draft;
              const Icon = cfg.icon;
              const isSelected = selectedDraft?.id === draft.id;
              const practice = practices.find(p => p.id === draft.practice_id);
              return (
                <div
                  key={draft.id}
                  onClick={() => loadContext(draft)}
                  className={`bg-white rounded-xl border p-4 transition-all cursor-pointer hover:shadow-sm ${isSelected ? 'ring-2 ring-[#0ABFCF]/30 border-[#0ABFCF]/20' : ''}`}
                  style={{ borderColor: isSelected ? undefined : 'var(--border-soft)' }}
                  data-testid={`email-item-${draft.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="font-semibold text-[var(--text-primary)] text-[12px] truncate">{draft.subject}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        A: {draft.recipient_email}{draft.client_name ? ` | ${draft.client_name}` : ''}
                      </p>
                      {/* Practice link */}
                      {practice && (
                        <Link to={`/practices/${practice.id}`} className="inline-flex items-center gap-1 text-[9px] text-[#0ABFCF] font-medium mt-1 hover:underline" onClick={e => e.stopPropagation()}>
                          <FileText className="w-2.5 h-2.5" />{practice.practice_type_label} — {practice.client_name}
                        </Link>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-[9px] text-[var(--text-muted)]">
                        <span>{format(new Date(draft.created_at), 'dd MMM HH:mm', { locale: it })}</span>
                        {draft.attachment_doc_keys?.length > 0 && <span className="flex items-center gap-0.5"><FileText className="w-2.5 h-2.5" />{draft.attachment_doc_keys.length} allegati</span>}
                      </div>
                      {draft.compliance?.issues?.length > 0 && (
                        <div className="mt-1.5">
                          {draft.compliance.issues.slice(0, 2).map((issue, i) => (
                            <p key={i} className="text-[9px] text-red-600 flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" />{issue.label}</p>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {draft.status === 'draft' && (
                        <Button variant="outline" size="sm" className="text-[9px] gap-1 border-amber-200 text-amber-700 hover:bg-amber-50 h-6 px-2 rounded-lg"
                          onClick={(e) => { e.stopPropagation(); handleAction(draft.id, 'review'); }} disabled={!!actionLoading} data-testid={`email-review-${draft.id}`}>
                          {actionLoading === draft.id + 'review' ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Eye className="w-2.5 h-2.5" />}Revisione
                        </Button>
                      )}
                      {isAdmin && draft.status === 'review' && (
                        <Button variant="outline" size="sm" className="text-[9px] gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 h-6 px-2 rounded-lg"
                          onClick={(e) => { e.stopPropagation(); handleAction(draft.id, 'approve'); }} disabled={!!actionLoading} data-testid={`email-approve-${draft.id}`}>
                          {actionLoading === draft.id + 'approve' ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <CheckCircle className="w-2.5 h-2.5" />}Approva
                        </Button>
                      )}
                      {isAdmin && draft.status === 'approved' && (
                        <Button size="sm" className="text-[9px] gap-1 bg-[var(--text-primary)] h-6 px-2 rounded-lg"
                          onClick={(e) => { e.stopPropagation(); handleAction(draft.id, 'send'); }} disabled={!!actionLoading} data-testid={`email-send-${draft.id}`}>
                          {actionLoading === draft.id + 'send' ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Send className="w-2.5 h-2.5" />}Invia
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── CONTEXT PANEL (right) ── */}
          <div className="space-y-4" data-testid="context-panel">
            {selectedDraft ? (
              contextLoading ? (
                <div className="bg-white rounded-xl border p-6 text-center" style={{ borderColor: 'var(--border-soft)' }}>
                  <RefreshCw className="w-4 h-4 animate-spin text-[var(--text-muted)] mx-auto" />
                </div>
              ) : contextData ? (
                <ContextPanel data={contextData} draft={selectedDraft} />
              ) : (
                <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Mail className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Dettaglio</p>
                  </div>
                  <p className="text-[12px] font-semibold text-[var(--text-primary)]">{selectedDraft.subject}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">A: {selectedDraft.recipient_email}</p>
                  {selectedDraft.body_preview && (
                    <p className="text-[10px] text-[var(--text-secondary)] mt-2 whitespace-pre-wrap leading-relaxed">{selectedDraft.body_preview?.substring(0, 200)}...</p>
                  )}
                </div>
              )
            ) : (
              <div className="bg-white rounded-xl border p-6 text-center" style={{ borderColor: 'var(--border-soft)' }}>
                <Mail className="w-5 h-5 text-[var(--text-muted)] mx-auto mb-1.5 opacity-30" strokeWidth={1.5} />
                <p className="text-[11px] font-medium text-[var(--text-primary)]">Seleziona una comunicazione</p>
                <p className="text-[9px] text-[var(--text-muted)] mt-0.5">Vedrai il contesto della pratica collegata</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════
// CONTEXT PANEL — Workspace-driven
// ═══════════════════════════════════════

function ContextPanel({ data, draft }) {
  const ws = data;
  const guidance = ws.ui_guidance || {};
  const activity = ws.current_activity || {};
  const oa = ws.official_action;
  const delegation = ws.delegation || {};
  const proof = ws.proof_layer || {};
  const approval = ws.approval || {};
  const agent = ws.current_agent;
  const statusCfg = ws.user_status || { label: '', color: '#5B6475' };

  return (
    <div className="space-y-3">
      {/* Practice context */}
      <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="context-practice">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-3.5 h-3.5 text-[#0ABFCF]" />
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Pratica collegata</p>
        </div>
        <Link to={`/practices/${ws.practice_id}`} className="text-[12px] font-semibold text-[var(--text-primary)] hover:text-[#0ABFCF] transition-colors">
          {ws.practice_name}
        </Link>
        <p className="text-[10px] text-[var(--text-muted)]">{ws.client_name}</p>

        {/* Current step + status */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: statusCfg.color + '15', color: statusCfg.color }}>{statusCfg.label}</span>
          <span className="text-[9px] text-[var(--text-muted)]">Passo {(ws.current_step ?? 0) + 1} di 6</span>
        </div>

        {/* Who acts now */}
        {activity.user_action_required !== undefined && (
          <div className={`mt-2 p-2 rounded-lg text-[10px] ${activity.user_action_required ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-600'}`}>
            <span className="font-bold">{activity.user_action_required ? 'Richiede la tua azione' : 'Herion sta lavorando'}</span>
            {activity.required_action_label && <span className="ml-1">— {activity.required_action_label}</span>}
          </div>
        )}
      </div>

      {/* What's happening */}
      {guidance.headline && (
        <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="context-guidance">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-1.5">Situazione attuale</p>
          <p className="text-[11px] font-semibold text-[var(--text-primary)]">{guidance.headline}</p>
          <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{guidance.subheadline}</p>
          {guidance.next_step_detail && (
            <div className="mt-2 p-2 bg-[var(--bg-soft)] rounded-lg">
              <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase">{guidance.next_step_label}</p>
              <p className="text-[10px] font-semibold text-[var(--text-primary)]">{guidance.next_step_detail}</p>
            </div>
          )}
        </div>
      )}

      {/* Official action summary */}
      {oa && (
        <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="context-official">
          <div className="flex items-center gap-2 mb-2">
            <ExternalLink className="w-3 h-3 text-[var(--text-muted)]" />
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Ente</p>
          </div>
          <p className="text-[11px] font-semibold text-[var(--text-primary)]">{oa.entity_name}</p>
          <div className="flex items-center gap-3 mt-1.5 text-[9px]">
            <span className="text-[var(--text-muted)]">Chi agisce: <span className={`font-bold ${oa.requires_user_direct_step ? 'text-amber-600' : 'text-emerald-600'}`}>{oa.requires_user_direct_step ? 'Tu' : 'Herion'}</span></span>
            {oa.credentials_required && <span className="flex items-center gap-0.5 text-amber-600"><Key className="w-2.5 h-2.5" />SPID</span>}
          </div>
          {proof.expected && (
            <div className={`mt-2 p-1.5 rounded text-[9px] ${proof.status === 'received' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-600'}`}>
              {proof.status === 'received' ? 'Ricevuta registrata' : 'Ricevuta attesa'}
            </div>
          )}
        </div>
      )}

      {/* Active agent */}
      {agent && (
        <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="context-agent">
          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded flex items-center justify-center ${agent.status === 'completed' ? 'bg-emerald-50' : 'bg-blue-50'}`}>
              <Bot className={`w-3 h-3 ${agent.status === 'completed' ? 'text-emerald-500' : 'text-blue-500'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-[var(--text-primary)]">{agent.name}</p>
              <p className="text-[9px] text-[var(--text-muted)]">{agent.title}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════
// CREATE DRAFT FORM (simplified)
// ═══════════════════════════════════════

function CreateDraftForm({ practices, onCreated }) {
  const [subject, setSubject] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [practiceId, setPracticeId] = useState('');
  const [body, setBody] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!subject || !recipientEmail) { toast.error('Compila oggetto e destinatario'); return; }
    setCreating(true);
    try {
      await createEmailDraft({ subject, recipient_email: recipientEmail, body_html: `<p>${body}</p>`, practice_id: practiceId || undefined });
      toast.success('Bozza creata');
      onCreated();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Errore'); }
    finally { setCreating(false); }
  };

  return (
    <div className="bg-white rounded-xl border p-5 space-y-3" style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-card)' }} data-testid="create-draft-form">
      <p className="text-[12px] font-bold text-[var(--text-primary)]">Nuova comunicazione</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Oggetto</label>
          <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Oggetto..." className="rounded-lg h-8 text-[11px] mt-1" style={{ borderColor: 'var(--border-soft)' }} data-testid="draft-subject" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Destinatario</label>
          <Input value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="email@esempio.it" className="rounded-lg h-8 text-[11px] mt-1" style={{ borderColor: 'var(--border-soft)' }} data-testid="draft-email" />
        </div>
      </div>
      <div>
        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Pratica collegata (opzionale)</label>
        <select value={practiceId} onChange={e => setPracticeId(e.target.value)} className="w-full rounded-lg h-8 text-[11px] mt-1 border px-2 bg-white" style={{ borderColor: 'var(--border-soft)' }} data-testid="draft-practice">
          <option value="">Nessuna</option>
          {(practices || []).slice(0, 20).map(p => <option key={p.id} value={p.id}>{p.client_name} - {p.practice_type_label}</option>)}
        </select>
      </div>
      <div>
        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Messaggio</label>
        <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Scrivi il messaggio..." className="w-full rounded-lg text-[11px] mt-1 border p-2 min-h-[60px] resize-none" style={{ borderColor: 'var(--border-soft)' }} data-testid="draft-body" />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" className="rounded-lg h-8 text-[11px]" onClick={onCreated}>Annulla</Button>
        <Button size="sm" className="rounded-lg h-8 text-[11px] bg-[var(--text-primary)] hover:bg-[#2a3040]" onClick={handleCreate} disabled={creating} data-testid="draft-create-btn">
          {creating ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <PenLine className="w-3 h-3 mr-1" />}Crea bozza
        </Button>
      </div>
    </div>
  );
}
