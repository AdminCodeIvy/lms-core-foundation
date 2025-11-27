import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { XCircle } from 'lucide-react';

interface RejectFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (feedback: string) => void;
  referenceId: string;
  loading?: boolean;
  entityType?: 'customer' | 'property';
}

export const RejectFeedbackDialog = ({
  open,
  onOpenChange,
  onConfirm,
  referenceId,
  loading = false,
  entityType = 'customer'
}: RejectFeedbackDialogProps) => {
  const entityLabel = entityType === 'customer' ? 'Customer' : 'Property';
  
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (feedback.trim().length < 10) {
      setError('Feedback must be at least 10 characters');
      return;
    }
    onConfirm(feedback);
    setFeedback('');
    setError('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setFeedback('');
      setError('');
    }
    onOpenChange(newOpen);
  };

  const handleFeedbackChange = (value: string) => {
    setFeedback(value);
    if (value.trim().length >= 10) {
      setError('');
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>Reject {entityLabel}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-4">
            <p>Please provide feedback for the rejection</p>
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm font-medium">Reference ID: {referenceId}</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="feedback">
            Feedback <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="feedback"
            placeholder={`Explain why this ${entityType} is being rejected and what needs to be corrected...`}
            value={feedback}
            onChange={(e) => handleFeedbackChange(e.target.value)}
            disabled={loading}
            maxLength={500}
            rows={5}
            className={error ? 'border-destructive' : ''}
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <p>Be specific to help the Inputter make corrections</p>
            <p>{feedback.length} / 500</p>
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={feedback.trim().length < 10 || loading}
            className="bg-destructive hover:bg-destructive/90"
          >
            {loading ? 'Rejecting...' : 'Reject'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
