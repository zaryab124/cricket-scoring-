import React, { useEffect, useState } from 'react';
import { auditApi } from '../../api/auditApi.js';
import { AuditLog } from '../../types/index.js';
import { PageHeader } from '../../components/layout/PageHeader.js';
import { Table, Column } from '../../components/common/Table.js';
import { Badge } from '../../components/common/Badge.js';
import { Input } from '../../components/common/Input.js';
import { Search, ShieldAlert, FileText } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await auditApi.getAuditLogs({ search });
      if (res.data) setLogs(res.data);
    } catch {
      // Handled by global interceptor
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchLogs, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const columns: Column<AuditLog>[] = [
    {
      key: 'action',
      header: 'Action / Event',
      render: (log) => (
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
          <span className="font-bold text-white text-xs">{log.action}</span>
        </div>
      ),
    },
    {
      key: 'entity',
      header: 'Resource',
      render: (log) => (
        <Badge variant="slate" size="sm">
          {log.entity}
        </Badge>
      ),
    },
    {
      key: 'user',
      header: 'Actor',
      render: (log) => (
        <div className="text-xs">
          <p className="font-semibold text-slate-200">
            {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System Agent'}
          </p>
          <p className="text-[10px] text-slate-400">{log.user?.role || 'SYSTEM'}</p>
        </div>
      ),
    },
    {
      key: 'ipAddress',
      header: 'IP / Client',
      render: (log) => (
        <span className="text-xs text-slate-400 font-mono">
          {log.ipAddress || '127.0.0.1'}
        </span>
      ),
    },
    {
      key: 'details',
      header: 'Payload Details',
      render: (log) => (
        <span className="text-xs text-slate-400 font-mono truncate max-w-xs block">
          {log.details || '—'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Timestamp',
      render: (log) => (
        <span className="text-xs text-slate-400">
          {new Date(log.createdAt).toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security & System Audit Logs"
        subtitle="Immutable security trail of administrative actions, logins, entity mutations, and permissions."
        badge={
          <Badge variant="red" size="sm">
            Super Admin Only
          </Badge>
        }
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Audit Logs' }]}
      />

      <div className="flex items-center justify-between gap-4">
        <div className="max-w-md w-full">
          <Input
            placeholder="Search audit trail by action, resource, IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden border border-slate-800">
        <Table
          columns={columns}
          data={logs}
          keyExtractor={(l) => l.id}
          isLoading={isLoading}
          emptyTitle="No audit logs recorded"
          emptyDescription="Audit records will automatically populate as platform entities are mutated."
        />
      </div>
    </div>
  );
};
