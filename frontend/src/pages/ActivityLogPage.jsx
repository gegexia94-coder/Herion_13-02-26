import { useState, useEffect } from 'react';
import { getActivityLogs } from '@/services/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  History, 
  Filter,
  Bot,
  FileText,
  Upload,
  User,
  Bell,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const CATEGORY_ICONS = {
  auth: User,
  practice: FileText,
  document: Upload,
  agent: Bot,
  orchestration: Bot,
  notification: Bell
};

const CATEGORY_COLORS = {
  auth: { bg: 'bg-violet-50', text: 'text-violet-600' },
  practice: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  document: { bg: 'bg-amber-50', text: 'text-amber-600' },
  agent: { bg: 'bg-sky-50', text: 'text-sky-600' },
  orchestration: { bg: 'bg-[#0A192F]/10', text: 'text-[#0A192F]' },
  notification: { bg: 'bg-red-50', text: 'text-red-600' }
};

const CATEGORY_LABELS = {
  auth: 'Autenticazione',
  practice: 'Pratiche',
  document: 'Documenti',
  agent: 'Herion AI',
  orchestration: 'Orchestrazione AI',
  notification: 'Notifiche'
};

export default function ActivityLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expandedLogs, setExpandedLogs] = useState(new Set());

  useEffect(() => {
    loadLogs();
  }, [categoryFilter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const category = categoryFilter === 'all' ? null : categoryFilter;
      const response = await getActivityLogs(100, category);
      setLogs(response.data);
    } catch (error) {
      console.error('Error loading activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (logId) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const groupLogsByDate = (logs) => {
    const groups = {};
    logs.forEach(log => {
      const date = format(new Date(log.timestamp), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(log);
    });
    return groups;
  };

  const groupedLogs = groupLogsByDate(logs);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A192F]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="activity-log-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#111110] mb-1">Attività</h1>
          <p className="text-sm text-[#5C5C59]">
            Registro completo di tutte le azioni. Trasparenza totale.
          </p>
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48 rounded-xl border-[#E5E5E3] h-10" data-testid="category-filter">
            <Filter className="w-4 h-4 mr-2 text-[#A1A19E]" />
            <SelectValue placeholder="Filtra" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">Tutte le categorie</SelectItem>
            <SelectItem value="auth">Autenticazione</SelectItem>
            <SelectItem value="practice">Pratiche</SelectItem>
            <SelectItem value="document">Documenti</SelectItem>
            <SelectItem value="agent">Herion AI</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Activity Log */}
      <div className="bg-white rounded-2xl border border-[#E5E5E3]/60 p-6 shadow-sm">
        {logs.length > 0 ? (
          <ScrollArea className="h-[600px]">
            {Object.entries(groupedLogs).map(([date, dateLogs]) => (
              <div key={date} className="mb-8 last:mb-0">
                <div className="sticky top-0 bg-white py-2 mb-4 z-10">
                  <p className="text-sm font-semibold text-[#111110]">
                    {format(new Date(date), 'EEEE, d MMMM yyyy', { locale: it })}
                  </p>
                </div>

                <div className="space-y-3 pl-4 border-l-2 border-[#E5E5E3]/60">
                  {dateLogs.map((log, index) => {
                    const IconComponent = CATEGORY_ICONS[log.category] || History;
                    const colors = CATEGORY_COLORS[log.category] || { bg: 'bg-gray-50', text: 'text-gray-600' };
                    const isExpanded = expandedLogs.has(log.id);

                    return (
                      <div 
                        key={log.id} 
                        className="relative animate-fade-in"
                        style={{ animationDelay: `${index * 30}ms` }}
                        data-testid={`log-entry-${log.id}`}
                      >
                        {/* Timeline Dot */}
                        <div className={`absolute -left-[25px] top-4 w-3 h-3 rounded-full border-2 border-white ${colors.bg}`} />

                        {/* Log Card */}
                        <div className="bg-[#FAFAFA] rounded-xl p-4 ml-4 hover:bg-[#F5F5F4] transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-lg ${colors.bg} flex items-center justify-center`}>
                                <IconComponent className={`w-4 h-4 ${colors.text}`} />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-[#111110] capitalize">
                                  {log.action.replace(/_/g, ' ')}
                                </p>
                                <p className="text-xs text-[#5C5C59]">
                                  {format(new Date(log.timestamp), 'HH:mm', { locale: it })} • {CATEGORY_LABELS[log.category] || log.category}
                                </p>
                              </div>
                            </div>
                            {log.details && Object.keys(log.details).length > 0 && (
                              <button
                                onClick={() => toggleExpand(log.id)}
                                className="p-1 rounded-lg hover:bg-white transition-colors"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-[#A1A19E]" /> : <ChevronDown className="w-4 h-4 text-[#A1A19E]" />}
                              </button>
                            )}
                          </div>

                          <p className="mt-2 text-sm text-[#5C5C59]">{log.explanation}</p>

                          {isExpanded && log.details && (
                            <div className="mt-3 p-3 bg-white rounded-lg border border-[#E5E5E3]/60 animate-fade-in">
                              <p className="text-[10px] font-medium text-[#5C5C59] uppercase tracking-wider mb-2">
                                Dettagli
                              </p>
                              <pre className="font-mono text-xs text-[#111110] whitespace-pre-wrap overflow-x-auto">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </ScrollArea>
        ) : (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-[#F5F5F4] flex items-center justify-center mx-auto mb-4">
              <History className="w-7 h-7 text-[#A1A19E]" />
            </div>
            <h3 className="text-lg font-medium text-[#111110] mb-2">Nessuna attività</h3>
            <p className="text-sm text-[#5C5C59]">
              Le attività verranno registrate qui quando utilizzerai il sistema.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
