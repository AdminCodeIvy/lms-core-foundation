import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, FileSearch, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ReviewPanel } from '@/components/workflow/ReviewPanel';
import type { CustomerWithDetails } from '@/types/customer';
import { Link, useNavigate } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface ReviewQueueItem {
  id: string;
  entity_type: 'CUSTOMER';
  reference_id: string;
  name: string;
  customer_type: string;
  submitted_by: string;
  submitted_by_name: string;
  submitted_at: string;
  days_pending: number;
}

export const ReviewQueue = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithDetails | null>(null);
  const [reviewPanelOpen, setReviewPanelOpen] = useState(false);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Check if user has access
  useEffect(() => {
    if (profile && !['APPROVER', 'ADMINISTRATOR'].includes(profile.role)) {
      navigate('/');
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'You do not have permission to access the review queue',
      });
    }
  }, [profile, navigate, toast]);

  useEffect(() => {
    fetchReviewQueue();
  }, []);

  const fetchReviewQueue = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('customers')
        .select(
          'id, reference_id, name, entity_type, submitted_at, created_by'
        )
        .eq('status', 'SUBMITTED')
        .order('submitted_at', { ascending: true })
        .limit(50);

      if (error) throw error;

      const items: ReviewQueueItem[] = (data || []).map((item: any) => {
        const submittedAt = item.submitted_at ? new Date(item.submitted_at) : new Date();
        const daysPending = Math.floor(
          (Date.now() - submittedAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          id: item.id,
          entity_type: 'CUSTOMER',
          reference_id: item.reference_id,
          name: item.name,
          customer_type: item.entity_type,
          submitted_by: item.created_by,
          submitted_by_name: 'Unknown',
          submitted_at: item.submitted_at,
          days_pending: daysPending,
        };
      });

      setItems(items);
    } catch (err: any) {
      console.error('Error fetching review queue:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          err?.message || 'Failed to load review queue',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (itemId: string) => {
    try {
      setCustomerLoading(true);
      setReviewPanelOpen(true);

      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          customer_person(*),
          customer_business(*,districts(name)),
          customer_government(*,districts(name)),
          customer_mosque_hospital(*,districts(name)),
          customer_non_profit(*,districts(name)),
          customer_contractor(*),
          created_by_user:users!customers_created_by_fkey(full_name),
          approved_by_user:users!customers_approved_by_fkey(full_name)
        `)
        .eq('id', itemId)
        .single();

      if (error) throw error;

      const transformedData: CustomerWithDetails = {
        ...data,
        person_data: data.customer_person?.[0],
        business_data: data.customer_business?.[0],
        government_data: data.customer_government?.[0],
        mosque_hospital_data: data.customer_mosque_hospital?.[0],
        non_profit_data: data.customer_non_profit?.[0],
        contractor_data: data.customer_contractor?.[0],
        created_by_user: data.created_by_user,
        approved_by_user: data.approved_by_user,
      };

      setSelectedCustomer(transformedData);
    } catch (err: any) {
      console.error('Error fetching customer:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load customer details',
      });
      setReviewPanelOpen(false);
    } finally {
      setCustomerLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedCustomer) return;

    try {
      setActionLoading(true);

      const { error } = await supabase.functions.invoke('approve-customer', {
        body: { entity_id: selectedCustomer.id }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Customer approved successfully',
      });

      setReviewPanelOpen(false);
      setSelectedCustomer(null);
      fetchReviewQueue();
    } catch (err: any) {
      console.error('Error approving customer:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to approve customer',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (feedback: string) => {
    if (!selectedCustomer) return;

    try {
      setActionLoading(true);

      const { error } = await supabase.functions.invoke('reject-customer', {
        body: { entity_id: selectedCustomer.id, feedback }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Customer rejected',
      });

      setReviewPanelOpen(false);
      setSelectedCustomer(null);
      fetchReviewQueue();
    } catch (err: any) {
      console.error('Error rejecting customer:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to reject customer',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const overdueItems = items.filter(item => item.days_pending > 2);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Review Queue</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Review Queue</h1>
        <p className="text-muted-foreground">Records pending your approval</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">
            All Submitted
            {items.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {items.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="customers">Customers Only</TabsTrigger>
          <TabsTrigger value="properties" disabled>
            Properties Only
            <Badge variant="outline" className="ml-2 text-xs">Phase 3</Badge>
          </TabsTrigger>
          <TabsTrigger value="overdue">
            Overdue
            {overdueItems.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {overdueItems.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <Alert>
              <FileSearch className="h-4 w-4" />
              <AlertDescription>No records pending approval</AlertDescription>
            </Alert>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Reference ID</TableHead>
                    <TableHead>Name/Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Submitted Date</TableHead>
                    <TableHead>Days Pending</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge variant="secondary">Customer</Badge>
                      </TableCell>
                      <TableCell className="font-mono">{item.reference_id}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.customer_type.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell>{item.submitted_by_name}</TableCell>
                      <TableCell>{format(new Date(item.submitted_at), 'MMM dd, yyyy HH:mm')}</TableCell>
                      <TableCell>
                        <span
                          className={`font-medium flex items-center gap-1 ${
                            item.days_pending >= 4
                              ? 'text-destructive'
                              : item.days_pending >= 2
                              ? 'text-warning'
                              : ''
                          }`}
                        >
                          {item.days_pending} days
                          {item.days_pending >= 4 && <AlertTriangle className="h-3 w-3" />}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button onClick={() => handleReview(item.id)}>Review</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="customers">
          {/* Same content as "all" for now since we only have customers */}
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <Alert>
              <FileSearch className="h-4 w-4" />
              <AlertDescription>No customers pending approval</AlertDescription>
            </Alert>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Submitted Date</TableHead>
                    <TableHead>Days Pending</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">{item.reference_id}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.customer_type.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell>{item.submitted_by_name}</TableCell>
                      <TableCell>{format(new Date(item.submitted_at), 'MMM dd, yyyy HH:mm')}</TableCell>
                      <TableCell>
                        <span
                          className={`font-medium flex items-center gap-1 ${
                            item.days_pending >= 4
                              ? 'text-destructive'
                              : item.days_pending >= 2
                              ? 'text-warning'
                              : ''
                          }`}
                        >
                          {item.days_pending} days
                          {item.days_pending >= 4 && <AlertTriangle className="h-3 w-3" />}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button onClick={() => handleReview(item.id)}>Review</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="overdue">
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : overdueItems.length === 0 ? (
            <Alert>
              <FileSearch className="h-4 w-4" />
              <AlertDescription>No overdue items</AlertDescription>
            </Alert>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Submitted Date</TableHead>
                    <TableHead>Days Pending</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">{item.reference_id}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.customer_type.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell>{item.submitted_by_name}</TableCell>
                      <TableCell>{format(new Date(item.submitted_at), 'MMM dd, yyyy HH:mm')}</TableCell>
                      <TableCell>
                        <span className="font-bold text-destructive flex items-center gap-1">
                          {item.days_pending} days
                          <AlertTriangle className="h-3 w-3" />
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button onClick={() => handleReview(item.id)}>Review</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ReviewPanel
        open={reviewPanelOpen}
        onOpenChange={setReviewPanelOpen}
        customer={selectedCustomer}
        loading={customerLoading}
        onApprove={handleApprove}
        onReject={handleReject}
        actionLoading={actionLoading}
      />
    </div>
  );
};
