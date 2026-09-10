import React, { useEffect, useState } from 'react';
import { notificationApi } from '../../api/notificationApi.js';
import { NotificationItem } from '../../types/index.js';
import { useToast } from '../../hooks/useToast.js';
import { PageHeader } from '../../components/layout/PageHeader.js';
import { Card } from '../../components/common/Card.js';
import { Button } from '../../components/common/Button.js';
import { Badge } from '../../components/common/Badge.js';
import { LoadingState } from '../../components/feedback/LoadingState.js';
import { EmptyState } from '../../components/feedback/EmptyState.js';
import { Bell, Check, Info, AlertTriangle, Activity, Trophy } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const { success, error: toastError } = useToast();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await notificationApi.getNotifications();
      if (res.data) setNotifications(res.data);
    } catch (err: any) {
      toastError(err.message || 'Failed to fetch notifications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      success('Marked as read');
    } catch (err: any) {
      toastError(err.message || 'Failed to update notification');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      success('All notifications marked as read');
    } catch (err: any) {
      toastError(err.message || 'Failed to mark all as read');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'MATCH_UPDATE':
        return <Activity className="w-5 h-5 text-emerald-400" />;
      case 'TOURNAMENT':
        return <Trophy className="w-5 h-5 text-amber-400" />;
      case 'ROLE_ASSIGNMENT':
        return <AlertTriangle className="w-5 h-5 text-purple-400" />;
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification Center"
        subtitle="Match alerts, role assignments, tournament schedules, and system messages."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Notifications' }]}
        actions={
          notifications.some((n) => !n.isRead) && (
            <Button
              variant="outline"
              size="sm"
              icon={<Check className="w-4 h-4" />}
              onClick={handleMarkAllAsRead}
            >
              Mark All as Read
            </Button>
          )
        }
      />

      {isLoading ? (
        <LoadingState message="Loading notifications..." />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-8 h-8 text-slate-400" />}
          title="No notifications"
          description="You are completely caught up. New alerts will appear here."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={`transition-all ${
                !n.isRead
                  ? 'border-emerald-500/40 bg-pitch-900/90 shadow-glow-emerald/10'
                  : 'border-slate-800/80 bg-pitch-950/40'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-pitch-950 border border-slate-800 shrink-0">
                    {getNotificationIcon(n.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-bold text-white">{n.title}</h4>
                      {!n.isRead && (
                        <Badge variant="emerald" size="sm">
                          New
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{n.message}</p>
                    <p className="text-[10px] text-slate-500 mt-2">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {!n.isRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkAsRead(n.id)}
                    className="shrink-0 text-slate-400 hover:text-white"
                  >
                    Mark read
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
