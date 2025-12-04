import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Cloud, RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface SyncStats {
  total: number;
  synced: number;
  pending: number;
  failed: number;
}

interface FailedSync {
  id: string;
  property_id: string;
  property_reference: string;
  error_message: string;
  last_attempt: string;
  retry_count: number;
}

export default function AgoSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState<SyncStats>({
    total: 0,
    synced: 0,
    pending: 0,
    failed: 0,
  });
  const [failedSyncs, setFailedSyncs] = useState<FailedSync[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('connected');

  const isAdmin = user?.role === 'ADMINISTRATOR';

  useEffect(() => {
    if (isAdmin) {
      loadSyncStats();
      loadFailedSyncs();
    }
  }, [isAdmin]);

  const loadSyncStats = async () => {
    try {
      setLoading(true);

      // Get sync statistics
      const { data, error } = await supabase
        .from('properties')
        .select('ago_sync_status', { count: 'exact' });

      if (error) throw error;

      const total = data?.length || 0;
      const synced = data?.filter(p => p.ago_sync_status === 'SYNCED').length || 0;
      const failed = data?.filter(p => p.ago_sync_status === 'ERROR').length || 0;
      const pending = total - synced - failed;

      setStats({ total, synced, pending, failed });
    } catch (error: any) {
      console.error('Error loading sync stats:', error);
      toast.error('Failed to load sync statistics');
    } finally {
      setLoading(false);
    }
  };

  const loadFailedSyncs = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          id,
          reference_id,
          ago_sync_error,
          last_sync_at
        `)
        .eq('ago_sync_status', 'ERROR')
        .order('last_sync_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const formatted: FailedSync[] = (data || []).map(p => ({
        id: p.id,
        property_id: p.id,
        property_reference: p.reference_id,
        error_message: p.ago_sync_error || 'Unknown error',
        last_attempt: p.last_sync_at || new Date().toISOString(),
        retry_count: 0, // Would need to join with ago_sync_retries table
      }));

      setFailedSyncs(formatted);
    } catch (error: any) {
      console.error('Error loading failed syncs:', error);
      toast.error('Failed to load failed syncs');
    }
  };

  const handleTestConnection = async () => {
    setSyncing(true);
    try {
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock result (90% success rate)
      if (Math.random() > 0.1) {
        setConnectionStatus('connected');
        toast.success('Connection test successful');
      } else {
        setConnectionStatus('disconnected');
        toast.error('Connection test failed');
      }
    } catch (error: any) {
      console.error('Connection test error:', error);
      toast.error('Failed to test connection');
    } finally {
      setSyncing(false);
    }
  };

  const handleRetrySync = async (propertyId: string) => {
    try {
      const { error } = await supabase.functions.invoke('mock-ago-sync', {
        body: { propertyId },
      });

      if (error) throw error;

      toast.success('Retry initiated');
      loadSyncStats();
      loadFailedSyncs();
    } catch (error: any) {
      console.error('Retry error:', error);
      toast.error(error.message || 'Failed to retry sync');
    }
  };

  const handleRetryAll = async () => {
    setSyncing(true);
    try {
      const propertyIds = failedSyncs.map(s => s.property_id);
      
      for (const propertyId of propertyIds) {
        await supabase.functions.invoke('mock-ago-sync', {
          body: { propertyId },
        });
      }

      toast.success(`Initiated retry for ${propertyIds.length} properties`);
      loadSyncStats();
      loadFailedSyncs();
    } catch (error: any) {
      console.error('Retry all error:', error);
      toast.error('Failed to retry all syncs');
    } finally {
      setSyncing(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access AGO settings. Only administrators can view this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Cloud className="h-8 w-8" />
          ArcGIS Online Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage property synchronization with ArcGIS Online
        </p>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Status</CardTitle>
          <CardDescription>Service URL and connection health</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Service URL</p>
              <p className="text-sm text-muted-foreground">https://services.arcgis.com/pilot/LMS</p>
            </div>
            <Badge variant={connectionStatus === 'connected' ? 'default' : 'destructive'}>
              {connectionStatus === 'connected' ? (
                <>
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Connected
                </>
              ) : (
                <>
                  <XCircle className="mr-1 h-3 w-3" />
                  Disconnected
                </>
              )}
            </Badge>
          </div>

          <div>
            <p className="text-sm font-medium">Last Sync</p>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleString()}
            </p>
          </div>

          <Button onClick={handleTestConnection} disabled={syncing} variant="outline">
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            Test Connection
          </Button>
        </CardContent>
      </Card>

      {/* Sync Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-600">Synced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.synced}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0 ? Math.round((stats.synced / stats.total) * 100) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-600">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.failed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Failed Syncs Table */}
      {failedSyncs.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Failed Syncs</CardTitle>
                <CardDescription>
                  Properties that failed to sync to ArcGIS Online
                </CardDescription>
              </div>
              <Button
                onClick={handleRetryAll}
                disabled={syncing || failedSyncs.length === 0}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                Retry All Failed
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property Reference</TableHead>
                  <TableHead>Error Message</TableHead>
                  <TableHead>Last Attempt</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failedSyncs.map((sync) => (
                  <TableRow key={sync.id}>
                    <TableCell className="font-medium">
                      {sync.property_reference}
                    </TableCell>
                    <TableCell className="max-w-md truncate text-red-600">
                      {sync.error_message}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(sync.last_attempt), { addSuffix: true })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRetrySync(sync.property_id)}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Retry
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Info Alert */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Pilot Mode:</strong> This system uses a mock AGO sync for demonstration purposes.
          Properties are marked as synced but not actually published to ArcGIS Online.
          Failed syncs are randomly generated for testing the retry mechanism.
        </AlertDescription>
      </Alert>
    </div>
  );
}
