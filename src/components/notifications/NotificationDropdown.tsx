import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUp, Check, X, Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  title: string;
  message: string;
  entity_type: string;
  entity_id: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationDropdownProps {
  onNotificationRead: () => void;
  onClose: () => void;
}

export function NotificationDropdown({ onNotificationRead, onClose }: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get-notifications', {
        body: { recent: true },
      });

      if (error) throw error;

      setNotifications(data.data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Mark as read
      if (!notification.is_read) {
        await supabase.functions.invoke('mark-notification-read', {
          body: { notification_id: notification.id },
        });
        onNotificationRead();
      }

      // Navigate to entity
      if (notification.entity_type === 'CUSTOMER') {
        navigate(`/customers/${notification.entity_id}`);
      }

      onClose();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const { error } = await supabase.functions.invoke('mark-notification-read', {
        body: { mark_all: true },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      });

      fetchNotifications();
      onNotificationRead();
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to mark notifications as read',
      });
    }
  };

  const getNotificationIcon = (title: string) => {
    if (title.includes('Submitted')) {
      return <ArrowUp className="h-5 w-5 text-blue-600" />;
    } else if (title.includes('Approved')) {
      return <Check className="h-5 w-5 text-green-600" />;
    } else if (title.includes('Rejected')) {
      return <X className="h-5 w-5 text-red-600" />;
    }
    return <Bell className="h-5 w-5 text-muted-foreground" />;
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Separator />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Notifications</h3>
        {notifications.some((n) => !n.is_read) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllAsRead}
            className="text-xs"
          >
            Mark all as read
          </Button>
        )}
      </div>

      <Separator />

      {/* Notifications list */}
      {notifications.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
          <p>No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`w-full text-left p-3 rounded-lg hover:bg-accent transition-colors ${
                !notification.is_read ? 'bg-blue-50 dark:bg-blue-950/20' : ''
              }`}
            >
              <div className="flex gap-3">
                {/* Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getNotificationIcon(notification.title)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm">{notification.title}</p>
                    {!notification.is_read && (
                      <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <Separator />

      {/* Footer */}
      <Button
        variant="ghost"
        className="w-full"
        onClick={() => {
          navigate('/notifications');
          onClose();
        }}
      >
        View all notifications
      </Button>
    </div>
  );
}
