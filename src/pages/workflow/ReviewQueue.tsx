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
  entity_type: 'CUSTOMER' | 'PROPERTY';
  reference_id: string;
  name: string;
  customer_type?: string;
  property_type?: string;
  district?: string;
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

      // Fetch customers with SUBMITTED status
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id, reference_id, customer_type, submitted_at, created_by, status')
        .eq('status', 'SUBMITTED')
        .order('submitted_at', { ascending: true })
        .limit(50);

      if (customersError) throw customersError;

      // Fetch properties with SUBMITTED status
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select(`
          id, 
          reference_id, 
          parcel_number, 
          updated_at, 
          created_by, 
          status,
          districts(name),
          property_types(name)
        `)
        .eq('status', 'SUBMITTED')
        .order('updated_at', { ascending: true })
        .limit(50);

      if (propertiesError) throw propertiesError;

      // For each customer, fetch the name from the appropriate table
      const customerItemsPromises = (customers || []).map(async (customer: any) => {
        let name = 'Unknown';
        
        // Fetch name based on customer type
        if (customer.customer_type === 'PERSON') {
          const { data } = await supabase
            .from('customer_person')
            .select('first_name, father_name, grandfather_name')
            .eq('customer_id', customer.id)
            .single();
          if (data) {
            name = `${data.first_name} ${data.father_name} ${data.grandfather_name}`;
          }
        } else if (customer.customer_type === 'BUSINESS') {
          const { data } = await supabase
            .from('customer_business')
            .select('business_name')
            .eq('customer_id', customer.id)
            .single();
          if (data) name = data.business_name;
        } else if (customer.customer_type === 'GOVERNMENT') {
          const { data } = await supabase
            .from('customer_government')
            .select('full_department_name')
            .eq('customer_id', customer.id)
            .single();
          if (data) name = data.full_department_name;
        } else if (customer.customer_type === 'MOSQUE_HOSPITAL') {
          const { data } = await supabase
            .from('customer_mosque_hospital')
            .select('full_name')
            .eq('customer_id', customer.id)
            .single();
          if (data) name = data.full_name;
        } else if (customer.customer_type === 'NON_PROFIT') {
          const { data } = await supabase
            .from('customer_non_profit')
            .select('full_non_profit_name')
            .eq('customer_id', customer.id)
            .single();
          if (data) name = data.full_non_profit_name;
        } else if (customer.customer_type === 'CONTRACTOR') {
          const { data } = await supabase
            .from('customer_contractor')
            .select('full_contractor_name')
            .eq('customer_id', customer.id)
            .single();
          if (data) name = data.full_contractor_name;
        }

        const submittedAt = customer.submitted_at ? new Date(customer.submitted_at) : new Date();
        const daysPending = Math.floor(
          (Date.now() - submittedAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          id: customer.id,
          entity_type: 'CUSTOMER' as const,
          reference_id: customer.reference_id,
          name,
          customer_type: customer.customer_type,
          submitted_by: customer.created_by,
          submitted_by_name: 'Unknown',
          submitted_at: customer.submitted_at,
          days_pending: daysPending,
        };
      });

      // Transform properties into review queue items
      const propertyItems: ReviewQueueItem[] = (properties || []).map((property: any) => {
        const submittedAt = property.updated_at ? new Date(property.updated_at) : new Date();
        const daysPending = Math.floor(
          (Date.now() - submittedAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          id: property.id,
          entity_type: 'PROPERTY' as const,
          reference_id: property.reference_id,
          name: property.parcel_number,
          property_type: property.property_types?.name || 'Unknown',
          district: property.districts?.name || 'Unknown',
          submitted_by: property.created_by,
          submitted_by_name: 'Unknown',
          submitted_at: property.updated_at,
          days_pending: daysPending,
        };
      });

      const customerItems = await Promise.all(customerItemsPromises);
      
      // Combine and sort by submitted_at
      const allItems = [...customerItems, ...propertyItems].sort((a, b) => 
        new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
      );
      
      setItems(allItems);
    } catch (err: any) {
      console.error('Error fetching review queue:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err?.message || 'Failed to load review queue',
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

      // Update customer status to APPROVED
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          status: 'APPROVED',
          approved_by: profile?.id
        })
        .eq('id', selectedCustomer.id);

      if (updateError) throw updateError;

      // Create activity log
      await supabase.from('activity_logs').insert({
        entity_type: 'CUSTOMER',
        entity_id: selectedCustomer.id,
        action: 'APPROVED',
        performed_by: profile?.id,
        metadata: {
          reference_id: selectedCustomer.reference_id,
          customer_type: selectedCustomer.customer_type
        }
      });

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

      // Update customer status to REJECTED
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          status: 'REJECTED',
          rejection_feedback: feedback
        })
        .eq('id', selectedCustomer.id);

      if (updateError) throw updateError;

      // Create activity log
      await supabase.from('activity_logs').insert({
        entity_type: 'CUSTOMER',
        entity_id: selectedCustomer.id,
        action: 'REJECTED',
        performed_by: profile?.id,
        metadata: {
          reference_id: selectedCustomer.reference_id,
          customer_type: selectedCustomer.customer_type,
          feedback
        }
      });

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
          <TabsTrigger value="properties">
            Properties Only
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
                        <Badge variant={item.entity_type === 'CUSTOMER' ? 'secondary' : 'default'}>
                          {item.entity_type === 'CUSTOMER' ? 'Customer' : 'Property'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{item.reference_id}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {item.entity_type === 'CUSTOMER' 
                            ? item.customer_type?.replace('_', ' ') 
                            : `${item.property_type} - ${item.district}`}
                        </Badge>
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
                        {item.entity_type === 'CUSTOMER' ? (
                          <Button onClick={() => handleReview(item.id)}>Review</Button>
                        ) : (
                          <Button onClick={() => navigate(`/properties/${item.id}`)}>Review</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="customers">
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : items.filter(i => i.entity_type === 'CUSTOMER').length === 0 ? (
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
                  {items.filter(i => i.entity_type === 'CUSTOMER').map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">{item.reference_id}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.customer_type?.replace('_', ' ')}</Badge>
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

        <TabsContent value="properties">
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : items.filter(i => i.entity_type === 'PROPERTY').length === 0 ? (
            <Alert>
              <FileSearch className="h-4 w-4" />
              <AlertDescription>No properties pending approval</AlertDescription>
            </Alert>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference ID</TableHead>
                    <TableHead>Parcel Number</TableHead>
                    <TableHead>Type & District</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Submitted Date</TableHead>
                    <TableHead>Days Pending</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.filter(i => i.entity_type === 'PROPERTY').map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">{item.reference_id}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.property_type} - {item.district}</Badge>
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
                        <Button onClick={() => navigate(`/properties/${item.id}`)}>Review</Button>
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
