import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, MapPin, Building, Ruler, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { ApproveConfirmationDialog } from './ApproveConfirmationDialog';
import { RejectFeedbackDialog } from './RejectFeedbackDialog';
import { useState } from 'react';

interface PropertyDetails {
  id: string;
  reference_id: string;
  parcel_number: string;
  status: string;
  size: number;
  is_building: boolean;
  is_downtown: boolean;
  has_property_wall: boolean;
  created_at: string;
  updated_at: string;
  district?: { name: string; code: string };
  sub_district?: { name: string };
  property_type?: { name: string };
  creator?: { full_name: string };
  boundaries?: {
    north_length: number;
    south_length: number;
    east_length: number;
    west_length: number;
    north_type: string;
    south_type: string;
    east_type: string;
    west_type: string;
  };
}

interface PropertyReviewPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: PropertyDetails | null;
  loading: boolean;
  onApprove: () => void;
  onReject: (feedback: string) => void;
  actionLoading: boolean;
}

const InfoItem = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div>
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="font-medium">{value || '-'}</p>
  </div>
);

export const PropertyReviewPanel = ({
  open,
  onOpenChange,
  property,
  loading,
  onApprove,
  onReject,
  actionLoading,
}: PropertyReviewPanelProps) => {
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

  const daysPending = property?.updated_at
    ? Math.ceil((Date.now() - new Date(property.updated_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Review Property</SheetTitle>
          </SheetHeader>

          {loading ? (
            <div className="space-y-4 mt-6">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : property ? (
            <div className="space-y-6 mt-6">
              {/* Header Info */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">{property.reference_id}</h2>
                  <Badge variant="secondary">{property.status}</Badge>
                </div>
                <p className="text-muted-foreground">
                  {property.district?.name} • {property.parcel_number}
                </p>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">District</span>
                  </div>
                  <p className="font-semibold">{property.district?.name}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Building className="h-4 w-4" />
                    <span className="text-sm">Type</span>
                  </div>
                  <p className="font-semibold">{property.is_building ? 'Building' : 'Empty Land'}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Ruler className="h-4 w-4" />
                    <span className="text-sm">Size</span>
                  </div>
                  <p className="font-semibold">{property.size} m²</p>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Shield className="h-4 w-4" />
                    <span className="text-sm">Property Wall</span>
                  </div>
                  <p className="font-semibold">{property.has_property_wall ? 'Yes' : 'No'}</p>
                </div>
              </div>

              {/* Property Details */}
              <div className="rounded-lg border p-4 space-y-4">
                <h3 className="font-semibold">Property Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem label="Reference ID" value={property.reference_id} />
                  <InfoItem label="Parcel Number" value={property.parcel_number} />
                  <InfoItem label="District" value={property.district?.name} />
                  <InfoItem label="Sub-District" value={property.sub_district?.name} />
                  <InfoItem 
                    label="Property Type" 
                    value={property.property_type?.name} 
                  />
                  <InfoItem 
                    label="Downtown" 
                    value={property.is_downtown ? 'Yes' : 'No'} 
                  />
                  <InfoItem label="Created By" value={property.creator?.full_name} />
                  <InfoItem 
                    label="Submitted Date" 
                    value={property.updated_at ? format(new Date(property.updated_at), 'MMM dd, yyyy HH:mm') : null} 
                  />
                </div>
              </div>

              {/* Boundaries */}
              {property.boundaries && (
                <div className="rounded-lg border p-4 space-y-4">
                  <h3 className="font-semibold">Boundaries</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-sm">
                      <p className="text-muted-foreground">North</p>
                      <p className="font-medium">{property.boundaries.north_length}m • {property.boundaries.north_type.replace('_', ' ')}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground">South</p>
                      <p className="font-medium">{property.boundaries.south_length}m • {property.boundaries.south_type.replace('_', ' ')}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground">East</p>
                      <p className="font-medium">{property.boundaries.east_length}m • {property.boundaries.east_type.replace('_', ' ')}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground">West</p>
                      <p className="font-medium">{property.boundaries.west_length}m • {property.boundaries.west_type.replace('_', ' ')}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Days Pending Warning */}
              <div className="py-2">
                {daysPending >= 4 ? (
                  <div className="rounded-lg bg-destructive/10 text-destructive p-3">
                    <p className="text-sm font-semibold">
                      ⚠️ This property has been pending for {daysPending} days
                    </p>
                  </div>
                ) : daysPending >= 2 ? (
                  <div className="rounded-lg bg-warning/10 text-warning p-3">
                    <p className="text-sm font-semibold">
                      Pending for {daysPending} days
                    </p>
                  </div>
                ) : null}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
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
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Property not found</p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Approve Dialog */}
      {property && (
        <ApproveConfirmationDialog
          open={approveDialogOpen}
          onOpenChange={setApproveDialogOpen}
          onConfirm={handleConfirmApprove}
          referenceId={property.reference_id}
          loading={actionLoading}
          entityType="property"
        />
      )}

      {/* Reject Dialog */}
      {property && (
        <RejectFeedbackDialog
          open={rejectDialogOpen}
          onOpenChange={setRejectDialogOpen}
          onConfirm={handleConfirmReject}
          referenceId={property.reference_id}
          loading={actionLoading}
          entityType="property"
        />
      )}
    </>
  );
};
