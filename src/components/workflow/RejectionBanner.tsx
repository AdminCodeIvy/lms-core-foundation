import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface RejectionBannerProps {
  approverName: string | null | undefined;
  rejectedDate: string;
  feedback: string;
  onEditClick: () => void;
}

export const RejectionBanner = ({
  approverName,
  rejectedDate,
  feedback,
  onEditClick
}: RejectionBannerProps) => {
  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="text-lg font-semibold">This customer was rejected</AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p>
          Rejected by <span className="font-medium">{approverName || 'Unknown'}</span> on{' '}
          <span className="font-medium">
            {format(new Date(rejectedDate), 'MMM dd, yyyy HH:mm')}
          </span>
        </p>
        <div className="bg-background/50 border border-destructive/20 rounded-md p-3">
          <p className="text-sm font-medium mb-1">Feedback:</p>
          <p className="text-sm">{feedback}</p>
        </div>
        <Button onClick={onEditClick} variant="outline" size="sm">
          Edit and Resubmit
        </Button>
      </AlertDescription>
    </Alert>
  );
};
