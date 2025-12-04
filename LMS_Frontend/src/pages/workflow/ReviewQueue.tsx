import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { workflowService } from '@/services/workflowService';
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
import { PropertyReviewPanel } from '@/components/workflow/PropertyReviewPanel';
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
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [reviewPanelOpen, setReviewPanelOpen] = useState(false);
  const [propertyPanelOpen, setPropertyPanelOpen] = useState(false);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [propertyLoading, setPropertyLoading] = useState(false);
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

      // Fetch review queue from backend
      const response = await workflowService.getReviewQueue({ limit: 50 });
      setItems(response.data || []);
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

  const handleReview = (itemId: string) => {
    navigate(`/review-queue/${itemId}`);
  };

  const handleApprove = async () => {
    if (!selectedCustomer) return;

    try {
      setActionLoading(true);
      await workflowService.approveCustomer(selectedCustomer.id);

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
      await workflowService.rejectCustomer(selectedCustomer.id, feedback);

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

  const handleReviewProperty = (propertyId: string) => {
    navigate(`/review-queue/${propertyId}`);
  };

  const handleApproveProperty = async () => {
    if (!selectedProperty) return;

    try {
      setActionLoading(true);
      await workflowService.approveProperty(selectedProperty.id);

      toast({
        title: 'Success',
        description: 'Property approved successfully',
      });

      setPropertyPanelOpen(false);
      setSelectedProperty(null);
      fetchReviewQueue();
    } catch (err: any) {
      console.error('Error approving property:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err?.message || 'Failed to approve property',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectProperty = async (feedback: string) => {
    if (!selectedProperty) return;

    try {
      setActionLoading(true);
      await workflowService.rejectProperty(selectedProperty.id, feedback);

      toast({
        title: 'Success',
        description: 'Property rejected',
      });

      setPropertyPanelOpen(false);
      setSelectedProperty(null);
      fetchReviewQueue();
    } catch (err: any) {
      console.error('Error rejecting property:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err?.message || 'Failed to reject property',
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
                          <Button onClick={() => handleReviewProperty(item.id)}>Review</Button>
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
                        <Button onClick={() => handleReviewProperty(item.id)}>Review</Button>
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
                        <Badge variant="outline">
                          {item.entity_type === 'CUSTOMER' 
                            ? item.customer_type?.replace('_', ' ') 
                            : `${item.property_type} - ${item.district}`}
                        </Badge>
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
                        {item.entity_type === 'CUSTOMER' ? (
                          <Button onClick={() => handleReview(item.id)}>Review</Button>
                        ) : (
                          <Button onClick={() => handleReviewProperty(item.id)}>Review</Button>
                        )}
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

      <PropertyReviewPanel
        open={propertyPanelOpen}
        onOpenChange={setPropertyPanelOpen}
        property={selectedProperty}
        loading={propertyLoading}
        onApprove={handleApproveProperty}
        onReject={handleRejectProperty}
        actionLoading={actionLoading}
      />
    </div>
  );
};
