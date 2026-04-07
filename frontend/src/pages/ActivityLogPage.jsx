import { useState, useEffect } from 'react';
import { getActivityLogs } from '@/services/api';
import { Button } from '@/components/ui/button';
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
  notification: Bell
};

const CATEGORY_COLORS = {
  auth: '#0F4C5C',
  practice: '#1A4331',
  document: '#D4A373',
  agent: '#5DD9C1',
  notification: '#E63946'
};

const CATEGORY_LABELS = {
  auth: 'Autenticazione',
  practice: 'Pratiche',
  document: 'Documenti',
  agent: 'Agenti AI',
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F4C5C]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="activity-log-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="heading-2 mb-2">Log Attività</h1>
          <p className="body-text">
            Registro completo di tutte le azioni eseguite nel sistema. Trasparenza totale.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48 border-[#E5E5E3] rounded-sm" data-testid="category-filter">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtra per categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le categorie</SelectItem>
              <SelectItem value="auth">Autenticazione</SelectItem>
              <SelectItem value="practice">Pratiche</SelectItem>
              <SelectItem value="document">Documenti</SelectItem>
              <SelectItem value="agent">Agenti AI</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Activity Log */}
      <div className="aic-card">
        {logs.length > 0 ? (
          <ScrollArea className="h-[600px]">
            {Object.entries(groupedLogs).map(([date, dateLogs]) => (
              <div key={date} className="mb-8 last:mb-0">
                <div className="sticky top-0 bg-white py-2 mb-4 border-b border-[#E5E5E3]">
                  <p className="text-sm font-semibold text-[#111110]">
                    {format(new Date(date), 'EEEE, d MMMM yyyy', { locale: it })}
                  </p>
                </div>

                <div className="space-y-4 pl-4">
                  {dateLogs.map((log, index) => {
                    const IconComponent = CATEGORY_ICONS[log.category] || History;
                    const color = CATEGORY_COLORS[log.category] || '#5C5C59';
                    const isExpanded = expandedLogs.has(log.id);

                    return (
                      <div 
                        key={log.id} 
                        className="relative pl-8 pb-4 border-l-2 border-[#E5E5E3] last:border-0 animate-fade-in"
                        style={{ animationDelay: `${index * 30}ms` }}
                        data-testid={`log-entry-${log.id}`}
                      >
                        {/* Timeline Dot */}
                        <div 
                          className="absolute left-[-9px] top-0 w-4 h-4 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${color}20` }}
                        >
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        </div>

                        {/* Log Content */}
                        <div className="aic-card p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-8 h-8 rounded-sm flex items-center justify-center"
                                style={{ backgroundColor: `${color}10` }}
                              >
                                <IconComponent className="w-4 h-4" style={{ color }} />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-[#111110] capitalize">
                                  {log.action.replace(/_/g, ' ')}
                                </p>
                                <p className="text-xs text-[#5C5C59]">
                                  {format(new Date(log.timestamp), 'HH:mm:ss', { locale: it })} • {CATEGORY_LABELS[log.category] || log.category}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => toggleExpand(log.id)}
                              className="text-[#5C5C59] hover:text-[#111110] transition-colors"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>

                          <p className="mt-2 text-sm text-[#5C5C59]">{log.explanation}</p>

                          {/* Expanded Details */}
                          {isExpanded && log.details && (
                            <div className="mt-4 p-3 bg-[#F9F9F8] rounded-sm animate-fade-in">
                              <p className="text-xs font-semibold text-[#5C5C59] uppercase tracking-wider mb-2">
                                Dettagli (Input/Output)
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
          <div className="text-center py-12">
            <History className="w-12 h-12 text-[#A1A19E] mx-auto mb-4" />
            <h3 className="heading-4 mb-2">Nessuna attività registrata</h3>
            <p className="body-text">
              Le attività verranno registrate qui quando utilizzerai il sistema.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
