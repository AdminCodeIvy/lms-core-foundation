import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { ApproveConfirmationDialog } from './ApproveConfirmationDialog';
import { RejectFeedbackDialog } from './RejectFeedbackDialog';
import type { CustomerWithDetails } from '@/types/customer';
import { useNavigate } from 'react-router-dom';

interface ReviewPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: CustomerWithDetails | null;
  loading: boolean;
  onApprove: () => void;
  onReject: (feedback: string) => void;
  actionLoading?: boolean;
}

export const ReviewPanel = ({
  open,
  onOpenChange,
  customer,
  loading,
  onApprove,
  onReject,
  actionLoading = false
}: ReviewPanelProps) => {
  const navigate = useNavigate();
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  const InfoItem = ({ label, value }: { label: string; value: string | null | undefined }) => {
    if (!value) return null;
    return (
      <div className="py-2 border-b last:border-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    );
  };

  const daysPending = customer?.submitted_at
    ? Math.ceil((Date.now() - new Date(customer.submitted_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : customer ? (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  Review Customer {customer.reference_id}
                  <Badge>{customer.customer_type.replace('_', ' ')}</Badge>
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Submission Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Submission Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-0">
                    <InfoItem 
                      label="Submitted By" 
                      value={customer.created_by_user?.full_name} 
                    />
                    <InfoItem 
                      label="Submitted Date" 
                      value={customer.submitted_at ? format(new Date(customer.submitted_at), 'MMM dd, yyyy HH:mm') : null} 
                    />
                    <div className="py-2">
                      <p className="text-sm text-muted-foreground">Days Pending</p>
                      <p className={`font-bold ${daysPending > 2 ? 'text-destructive' : ''}`}>
                        {daysPending} days
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Customer Details */}
                {customer.customer_type === 'PERSON' && customer.person_data && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Customer Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-0">
                      <InfoItem 
                        label="Full Name" 
                        value={`${customer.person_data.first_name} ${customer.person_data.father_name} ${customer.person_data.grandfather_name}`} 
                      />
                      <InfoItem 
                        label="Date of Birth" 
                        value={format(new Date(customer.person_data.date_of_birth), 'MMM dd, yyyy')} 
                      />
                      <InfoItem label="Gender" value={customer.person_data.gender} />
                      <InfoItem label="Nationality" value={customer.person_data.nationality} />
                      <InfoItem label="Mobile Number" value={customer.person_data.mobile_number_1} />
                      <InfoItem label="Email" value={customer.person_data.email} />
                      <InfoItem label="ID Type" value={customer.person_data.id_type} />
                      <InfoItem label="ID Number" value={customer.person_data.id_number} />
                    </CardContent>
                  </Card>
                )}

                {customer.customer_type === 'BUSINESS' && customer.business_data && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Business Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-0">
                      <InfoItem label="Business Name" value={customer.business_data.business_name} />
                      <InfoItem label="Registration Number" value={customer.business_data.business_registration_number} />
                      <InfoItem label="License Number" value={customer.business_data.business_license_number} />
                      <InfoItem label="Contact Name" value={customer.business_data.contact_name} />
                      <InfoItem label="Mobile Number" value={customer.business_data.mobile_number_1} />
                      <InfoItem label="Email" value={customer.business_data.email} />
                      <InfoItem label="Address" value={customer.business_data.business_address} />
                    </CardContent>
                  </Card>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-4 border-t">
                  <Button
                    onClick={() => setApproveDialogOpen(true)}
                    disabled={actionLoading}
                    className="w-full bg-success hover:bg-success/90"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => setRejectDialogOpen(true)}
                    variant="destructive"
                    disabled={actionLoading}
                    className="w-full"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/customers/${customer.id}/edit`)}
                    disabled={actionLoading}
                    className="w-full"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => onOpenChange(false)}
                    disabled={actionLoading}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-muted-foreground">
              No customer selected
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ApproveConfirmationDialog
        open={approveDialogOpen}
        onOpenChange={setApproveDialogOpen}
        onConfirm={onApprove}
        referenceId={customer?.reference_id || ''}
        loading={actionLoading}
      />

      <RejectFeedbackDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        onConfirm={onReject}
        referenceId={customer?.reference_id || ''}
        loading={actionLoading}
      />
    </>
  );
};
