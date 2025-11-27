import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, ArrowUp, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface Notification {
  id: string;
  title: string;
  message: string;
  entity_type: string;
  entity_id: string;
  is_read: boolean;
  created_at: string;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Build query
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      // Apply filter
      if (filter === 'unread') {
        query = query.eq('is_read', false);
      } else if (filter === 'read') {
        query = query.eq('is_read', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load notifications',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Notification marked as read',
      });

      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to mark notification as read',
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      });

      fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to mark notifications as read',
      });
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }

    if (notification.entity_type === 'CUSTOMER') {
      navigate(`/customers/${notification.entity_id}`);
    } else if (notification.entity_type === 'PROPERTY') {
      navigate(`/properties/${notification.entity_id}`);
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

  return (
    <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Notifications</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Notifications</h1>
          {notifications.some((n) => !n.is_read) && (
            <Button onClick={handleMarkAllAsRead}>Mark all as read</Button>
          )}
        </div>

        {/* Filters */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread</TabsTrigger>
            <TabsTrigger value="read">Read</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Card key={i} className="p-4">
                    <div className="flex gap-4">
                      <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <Card className="p-12 text-center">
                <Bell className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground">No notifications yet</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <Card
                    key={notification.id}
                    className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${
                      !notification.is_read ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0">
                        {getNotificationIcon(notification.title)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold">{notification.title}</p>
                          {!notification.is_read && (
                            <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(notification.created_at), 'MMM dd, yyyy hh:mm a')}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNotificationClick(notification);
                          }}
                        >
                          View
                        </Button>
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notification.id);
                            }}
                          >
                            Mark as read
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="unread" className="mt-6">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Card key={i} className="p-4">
                    <div className="flex gap-4">
                      <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <Card className="p-12 text-center">
                <Bell className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground">No unread notifications</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <Card
                    key={notification.id}
                    className="p-4 cursor-pointer hover:shadow-md transition-shadow bg-blue-50 dark:bg-blue-950/20 border-blue-200"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        {getNotificationIcon(notification.title)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold">{notification.title}</p>
                          <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-1" />
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(notification.created_at), 'MMM dd, yyyy hh:mm a')}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNotificationClick(notification);
                          }}
                        >
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                        >
                          Mark as read
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="read" className="mt-6">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Card key={i} className="p-4">
                    <div className="flex gap-4">
                      <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <Card className="p-12 text-center">
                <Bell className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground">No read notifications</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <Card
                    key={notification.id}
                    className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        {getNotificationIcon(notification.title)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">{notification.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(notification.created_at), 'MMM dd, yyyy hh:mm a')}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNotificationClick(notification);
                        }}
                      >
                        View
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
  );
}
