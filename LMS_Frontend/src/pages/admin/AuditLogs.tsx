import { useState, useEffect } from 'react';
import { adminService, AuditLog } from '@/services/adminService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { History, AlertCircle, Filter, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface User {
  id: string;
  full_name: string;
}

const AuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [entityType, setEntityType] = useState<string>('all');
  const [userId, setUserId] = useState<string>('all');
  const [action, setAction] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    fetchUsers();
    fetchLogs();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await adminService.getUsers();
      setUsers(data.map(u => ({ id: u.id, full_name: u.full_name })));
    } catch (err: any) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await adminService.getAuditLogs({
        entityType: entityType === 'all' ? undefined : entityType,
        userId: userId === 'all' ? undefined : userId,
        action: action === 'all' ? undefined : action,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit: 100,
        offset: 0,
      });

      setLogs(response.data);
    } catch (err: any) {
      console.error('Error fetching audit logs:', err);
      setError(err?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    fetchLogs();
  };

  const handleResetFilters = () => {
    setEntityType('all');
    setUserId('all');
    setAction('all');
    setStartDate('');
    setEndDate('');
    // Trigger fetch after state updates
    setTimeout(() => fetchLogs(), 0);
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

  const getEntityTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      customer: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      property: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      tax_assessment: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      tax_payment: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      user: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
    };

    return (
      <Badge variant="outline" className={colors[type] || ''}>
        {type.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const formatValue = (value: string | null) => {
    if (value === null || value === '') return <span className="text-muted-foreground italic">empty</span>;
    if (value === 'true') return <Badge variant="outline">Yes</Badge>;
    if (value === 'false') return <Badge variant="outline">No</Badge>;
    return <span className="font-mono text-sm">{value}</span>;
  };

  if (loading && logs.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">
            View all system activity and changes
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              System Audit Trail
            </CardTitle>
            <CardDescription>Loading audit logs...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground mt-1">
          View all system activity and changes
        </p>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>Filter audit logs by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entity-type">Entity Type</Label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger id="entity-type">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="property">Property</SelectItem>
                  <SelectItem value="tax_assessment">Tax Assessment</SelectItem>
                  <SelectItem value="tax_payment">Tax Payment</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="user">Changed By</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger id="user">
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="action">Action</Label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger id="action">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="submit">Submit</SelectItem>
                  <SelectItem value="approve">Approve</SelectItem>
                  <SelectItem value="reject">Reject</SelectItem>
                  <SelectItem value="archive">Archive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleApplyFilters} className="gap-2">
              <Filter className="h-4 w-4" />
              Apply Filters
            </Button>
            <Button onClick={handleResetFilters} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            System Audit Trail
          </CardTitle>
          <CardDescription>
            {logs.length === 0 
              ? 'No audit logs found' 
              : `${logs.length} audit log${logs.length !== 1 ? 's' : ''} found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No audit logs to display</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Entity Type</TableHead>
                    <TableHead>Entity ID</TableHead>
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
                      <TableCell>{getEntityTypeBadge(log.entity_type)}</TableCell>
                      <TableCell className="font-mono text-xs">{log.entity_id.substring(0, 8)}...</TableCell>
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
                        {log.user?.full_name || 'Unknown User'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogs;
