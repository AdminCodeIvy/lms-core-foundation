import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CheckCircle2 } from 'lucide-react';

interface ApproveConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  referenceId: string;
  loading?: boolean;
  entityType?: 'customer' | 'property';
}

export const ApproveConfirmationDialog = ({
  open,
  onOpenChange,
  onConfirm,
  referenceId,
  loading = false,
  entityType = 'customer'
}: ApproveConfirmationDialogProps) => {
  const entityLabel = entityType === 'customer' ? 'Customer' : 'Property';
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <AlertDialogTitle>Approve {entityLabel}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-4">
            <p>
              Are you sure you want to approve this {entityType}?
            </p>
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm font-medium">Reference ID: {referenceId}</p>
            </div>
            <p className="text-destructive text-sm font-medium">
              This action cannot be undone.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className="bg-success hover:bg-success/90"
          >
            {loading ? 'Approving...' : 'Approve'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
