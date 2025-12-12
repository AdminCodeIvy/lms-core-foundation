import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, User, Building2, Phone, Mail, IdCard, Calendar, MapPin, Edit } from 'lucide-react';
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

const InfoItem = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div>
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="font-medium">{value || '-'}</p>
  </div>
);

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

  const handleApprove = () => {
    setApproveDialogOpen(true);
  };

  const handleReject = () => {
    setRejectDialogOpen(true);
  };

  const handleConfirmApprove = () => {
    onApprove();
    setApproveDialogOpen(false);
  };

  const handleConfirmReject = (feedback: string) => {
    onReject(feedback);
    setRejectDialogOpen(false);
  };

  const daysPending = customer?.submitted_at
    ? Math.ceil((Date.now() - new Date(customer.submitted_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[9999]">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => onOpenChange(false)}
          />
          <div className="absolute inset-0 flex h-full w-full flex-col bg-background p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
            <button
              type="button"
              className="absolute right-6 top-6 rounded-full border border-border bg-background/80 p-1 text-muted-foreground hover:bg-muted"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
            <div className="mt-8 mb-6">
              <h2 className="text-2xl font-bold">Review Customer</h2>
            </div>

          {loading ? (
            <div className="space-y-4 mt-6">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : customer ? (
            <div className="space-y-6 mt-6">
              {/* Header Info */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">{customer.reference_id}</h2>
                  <Badge variant="secondary">{customer.status}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{customer.customer_type.replace('_', ' ')}</Badge>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <User className="h-4 w-4" />
                    <span className="text-sm">Type</span>
                  </div>
                  <p className="font-semibold">{customer.customer_type.replace('_', ' ')}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">Submitted</span>
                  </div>
                  <p className="font-semibold">
                    {customer.submitted_at ? format(new Date(customer.submitted_at), 'MMM dd, yyyy') : '-'}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <User className="h-4 w-4" />
                    <span className="text-sm">Created By</span>
                  </div>
                  <p className="font-semibold">{customer.created_by_user?.full_name || '-'}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">Days Pending</span>
                  </div>
                  <p className={`font-semibold ${daysPending > 2 ? 'text-destructive' : ''}`}>
                    {daysPending} days
                  </p>
                </div>
              </div>

              {/* PERSON Details */}
              {customer.customer_type === 'PERSON' && customer.person_data && (
                <>
                  <div className="rounded-lg border p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Personal Information</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InfoItem 
                        label="PR-ID" 
                        value={customer.person_data.pr_id} 
                      />
                      <InfoItem 
                        label="Full Name" 
                        value={customer.person_data.full_name} 
                      />
                      <InfoItem 
                        label="Mother's Name" 
                        value={customer.person_data.mothers_name} 
                      />
                      <InfoItem 
                        label="Date of Birth" 
                        value={format(new Date(customer.person_data.date_of_birth), 'MMM dd, yyyy')} 
                      />
                      <InfoItem label="POB" value={customer.person_data.place_of_birth} />
                      <InfoItem label="Gender" value={customer.person_data.gender} />
                      <InfoItem label="Nationality" value={customer.person_data.nationality} />
                    </div>
                  </div>

                  <div className="rounded-lg border p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Contact Information</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InfoItem label="Mobile Number 1" value={customer.person_data.mobile_number_1} />
                      <InfoItem label="Email" value={customer.person_data.email} />
                    </div>
                  </div>

                  <div className="rounded-lg border p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <IdCard className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Identification</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InfoItem label="ID Type" value={customer.person_data.id_type} />
                      {customer.person_data.id_number && (
                        <InfoItem label="ID Number" value={customer.person_data.id_number} />
                      )}
                      {customer.person_data.place_of_issue && (
                        <InfoItem label="Place of Issue" value={customer.person_data.place_of_issue} />
                      )}
                      {customer.person_data.issue_date && (
                        <InfoItem 
                          label="Issue Date" 
                          value={format(new Date(customer.person_data.issue_date), 'MMM dd, yyyy')} 
                        />
                      )}
                      {customer.person_data.expiry_date && (
                        <InfoItem 
                          label="Expiry Date" 
                          value={format(new Date(customer.person_data.expiry_date), 'MMM dd, yyyy')} 
                        />
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* BUSINESS Details */}
              {customer.customer_type === 'BUSINESS' && customer.business_data && (
                <>
                  <div className="rounded-lg border p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Business Information</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InfoItem label="Business Name" value={customer.business_data.business_name} />
                      <InfoItem label="Registration Number" value={customer.business_data.business_registration_number} />
                      <InfoItem label="License Number" value={customer.business_data.business_license_number} />
                      <InfoItem label="Business Address" value={customer.business_data.business_address} />
                      <InfoItem label="Street" value={customer.business_data.street} />
                      <InfoItem label="District" value={customer.business_data.districts?.name} />
                      <InfoItem label="Section" value={customer.business_data.section} />
                      <InfoItem label="Block" value={customer.business_data.block} />
                    </div>
                  </div>

                  <div className="rounded-lg border p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Contact Information</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InfoItem label="Contact Name" value={customer.business_data.contact_name} />
                      <InfoItem label="Mobile Number 1" value={customer.business_data.mobile_number_1} />
                      <InfoItem label="Mobile Number 2" value={customer.business_data.mobile_number_2} />
                      <InfoItem label="Carrier Network" value={customer.business_data.carrier_network} />
                      <InfoItem label="Email" value={customer.business_data.email} />
                    </div>
                  </div>
                </>
              )}

              {/* GOVERNMENT Details */}
              {customer.customer_type === 'GOVERNMENT' && customer.government_data && (
                <>
                  <div className="rounded-lg border p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Department Information</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InfoItem label="Department Name" value={customer.government_data.full_department_name} />
                      <InfoItem label="Department Address" value={customer.government_data.department_address} />
                      <InfoItem label="Street" value={customer.government_data.street} />
                      <InfoItem label="District" value={customer.government_data.districts?.name} />
                      <InfoItem label="Section" value={customer.government_data.section} />
                      <InfoItem label="Block" value={customer.government_data.block} />
                    </div>
                  </div>

                  <div className="rounded-lg border p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Contact Information</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InfoItem label="Contact Name" value={customer.government_data.contact_name} />
                      <InfoItem label="Mobile Number 1" value={customer.government_data.mobile_number_1} />
                      <InfoItem label="Carrier 1" value={customer.government_data.carrier_mobile_1} />
                      <InfoItem label="Mobile Number 2" value={customer.government_data.mobile_number_2} />
                      <InfoItem label="Carrier 2" value={customer.government_data.carrier_mobile_2} />
                      <InfoItem label="Email" value={customer.government_data.email} />
                    </div>
                  </div>
                </>
              )}

              {/* MOSQUE/HOSPITAL Details */}
              {customer.customer_type === 'MOSQUE_HOSPITAL' && customer.mosque_hospital_data && (
                <>
                  <div className="rounded-lg border p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Organization Information</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InfoItem label="Full Name" value={customer.mosque_hospital_data.full_name} />
                      <InfoItem label="Registration Number" value={customer.mosque_hospital_data.registration_number} />
                      <InfoItem label="Address" value={customer.mosque_hospital_data.address} />
                      <InfoItem label="District" value={customer.mosque_hospital_data.districts?.name} />
                      <InfoItem label="Section" value={customer.mosque_hospital_data.section} />
                      <InfoItem label="Block" value={customer.mosque_hospital_data.block} />
                    </div>
                  </div>

                  <div className="rounded-lg border p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Contact Information</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InfoItem label="Contact Name" value={customer.mosque_hospital_data.contact_name} />
                      <InfoItem label="Mobile Number 1" value={customer.mosque_hospital_data.mobile_number_1} />
                      <InfoItem label="Carrier 1" value={customer.mosque_hospital_data.carrier_mobile_1} />
                      <InfoItem label="Mobile Number 2" value={customer.mosque_hospital_data.mobile_number_2} />
                      <InfoItem label="Carrier 2" value={customer.mosque_hospital_data.carrier_mobile_2} />
                      <InfoItem label="Email" value={customer.mosque_hospital_data.email} />
                    </div>
                  </div>
                </>
              )}

              {/* NON-PROFIT Details */}
              {customer.customer_type === 'NON_PROFIT' && customer.non_profit_data && (
                <>
                  <div className="rounded-lg border p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Non-Profit Information</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InfoItem label="Organization Name" value={customer.non_profit_data.full_non_profit_name} />
                      <InfoItem label="Registration Number" value={customer.non_profit_data.registration_number} />
                      <InfoItem label="License Number" value={customer.non_profit_data.license_number} />
                      <InfoItem label="Address" value={customer.non_profit_data.address} />
                      <InfoItem label="District" value={customer.non_profit_data.districts?.name} />
                      <InfoItem label="Section" value={customer.non_profit_data.section} />
                      <InfoItem label="Block" value={customer.non_profit_data.block} />
                    </div>
                  </div>

                  <div className="rounded-lg border p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Contact Information</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InfoItem label="Contact Name" value={customer.non_profit_data.contact_name} />
                      <InfoItem label="Mobile Number 1" value={customer.non_profit_data.mobile_number_1} />
                      <InfoItem label="Carrier 1" value={customer.non_profit_data.carrier_mobile_1} />
                      <InfoItem label="Mobile Number 2" value={customer.non_profit_data.mobile_number_2} />
                      <InfoItem label="Carrier 2" value={customer.non_profit_data.carrier_mobile_2} />
                      <InfoItem label="Email" value={customer.non_profit_data.email} />
                    </div>
                  </div>
                </>
              )}

              {/* RESIDENTIAL Details */}
              {customer.customer_type === 'RESIDENTIAL' && customer.residential_data && (
                <div className="rounded-lg border p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Residential Information</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoItem label="PR-ID" value={customer.residential_data.pr_id} />
                    <InfoItem label="Size" value={customer.residential_data.size} />
                    <InfoItem label="Floor" value={customer.residential_data.floor} />
                    <InfoItem label="File Number" value={customer.residential_data.file_number} />
                    <InfoItem label="Address" value={customer.residential_data.address} />
                  </div>
                </div>
              )}

              {/* Days Pending Warning */}
              {daysPending >= 4 ? (
                <div className="rounded-lg bg-destructive/10 text-destructive p-3">
                  <p className="text-sm font-semibold">
                    ⚠️ This customer has been pending for {daysPending} days
                  </p>
                </div>
              ) : daysPending >= 2 ? (
                <div className="rounded-lg bg-warning/10 text-warning p-3">
                  <p className="text-sm font-semibold">
                    Pending for {daysPending} days
                  </p>
                </div>
              ) : null}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-4 border-t">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleReject}
                    disabled={actionLoading}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleApprove}
                    disabled={actionLoading}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => navigate(`/customers/${customer.id}/edit`)}
                  disabled={actionLoading}
                  className="w-full"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No customer selected</p>
            </div>
          )}
        </div>
      </div>
      )}


      {customer && (
        <>
          <ApproveConfirmationDialog
            open={approveDialogOpen}
            onOpenChange={setApproveDialogOpen}
            onConfirm={handleConfirmApprove}
            referenceId={customer.reference_id}
            loading={actionLoading}
          />

          <RejectFeedbackDialog
            open={rejectDialogOpen}
            onOpenChange={setRejectDialogOpen}
            onConfirm={handleConfirmReject}
            referenceId={customer.reference_id}
            loading={actionLoading}
          />
        </>
      )}
    </>
  );
};
