import { useState, useEffect } from 'react';
import { adminService } from '@/services/adminService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { History, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_by: string;
  timestamp: string;
  users: {
    id: string;
    full_name: string;
  };
}

interface AuditLogViewerProps {
  entityType: 'customer' | 'property' | 'tax_assessment' | 'tax_payment' | 'user';
  entityId: string;
  title?: string;
}

export const AuditLogViewer = ({ entityType, entityId, title = 'Activity Log' }: AuditLogViewerProps) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [entityType, entityId]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await adminService.getAuditLogs({
        entityType,
        // Backend expects entity_id in filters
      });

      // Filter by entity_id on client side if backend doesn't support it
      const filteredLogs = response.data.filter(log => log.entity_id === entityId);
      
      setLogs(filteredLogs);
    } catch (err: any) {
      console.error('Error fetching audit logs:', err);
      setError(err.message || 'Failed to load activity log');
    } finally {
      setLoading(false);
    }
  };
  const getActionBadge = (action: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      create: 'default',
      update: 'secondary',
      delete: 'destructive',
      submit: 'outline',
      approve: 'default',
      reject: 'destructive',
      archive: 'secondary',
    };

    return (
      <Badge variant={variants[action] || 'outline'} className="capitalize">
        {action}
      </Badge>
    );
  };

  const formatValue = (value: string | null) => {
    if (value === null || value === '') return <span className="text-muted-foreground italic">empty</span>;
    if (value === 'true') return <Badge variant="outline">Yes</Badge>;
    if (value === 'false') return <Badge variant="outline">No</Badge>;
    return <span className="font-mono text-sm">{value}</span>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>Loading activity history...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>
          {logs.length === 0 
            ? 'No activity recorded yet' 
            : `${logs.length} change${logs.length !== 1 ? 's' : ''} recorded`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No activity to display</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Field</TableHead>
                  <TableHead>Old Value</TableHead>
                  <TableHead>New Value</TableHead>
                  <TableHead>Changed By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>
                      {log.field ? (
                        <span className="font-medium">{log.field.replace(/_/g, ' ')}</span>
                      ) : (
                        <span className="text-muted-foreground italic">—</span>
                      )}
                    </TableCell>
                    <TableCell>{formatValue(log.old_value)}</TableCell>
                    <TableCell>{formatValue(log.new_value)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {log.users?.full_name || 'Unknown User'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
