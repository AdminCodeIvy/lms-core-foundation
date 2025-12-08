import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { taxService } from '@/services/taxService';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { TaxAssessment } from '@/types/tax';

export default function TaxPaymentNew() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState<TaxAssessment | null>(null);

  const [formData, setFormData] = useState({
    payment_date: new Date() as Date,
    amount_paid: '',
    payment_method: 'CASH',
    receipt_number: '',
    notes: '',
  });

  useEffect(() => {
    if (assessmentId) {
      fetchAssessment();
    }
  }, [assessmentId]);

  const fetchAssessment = async () => {
    try {
      const data = await taxService.getAssessment(assessmentId!);
      setAssessment(data);
    } catch (error: any) {
      console.error('Error fetching assessment:', error);
      toast({
        title: 'Error',
        description: 'Failed to load assessment details',
        variant: 'destructive'
      });
    }
  };

  const generateReceiptNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 90000) + 10000;
    setFormData(prev => ({ ...prev, receipt_number: `RCP-${year}-${random}` }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if assessment has a property assigned
      if (!assessment?.property_id) {
        toast({
          title: 'Property Required',
          description: 'This tax assessment does not have a property assigned yet. Please edit the assessment and add a property before adding payments.',
          variant: 'default' // Changed from 'destructive' to show as info/warning
        });
        setLoading(false);
        return;
      }

      if (!formData.amount_paid || parseFloat(formData.amount_paid) <= 0) {
        toast({
          title: 'Error',
          description: 'Payment amount must be greater than 0',
          variant: 'destructive'
        });
        return;
      }

      if (assessment && parseFloat(formData.amount_paid) > assessment.outstanding_amount) {
        toast({
          title: 'Error',
          description: 'Payment amount cannot exceed outstanding amount',
          variant: 'destructive'
        });
        return;
      }

      const payload = {
        payment_date: format(formData.payment_date, 'yyyy-MM-dd'),
        amount_paid: parseFloat(formData.amount_paid),
        payment_method: formData.payment_method,
        receipt_number: formData.receipt_number,
        notes: formData.notes || null,
      };

      // Create payment via backend
      const data = await taxService.createPayment(assessmentId!, payload);

      // Check if fully paid
      const updatedAssessment = await taxService.getAssessment(assessmentId!);
      const isFullyPaid = updatedAssessment.outstanding_amount === 0;

      if (isFullyPaid) {
        toast({
          title: '🎉 Tax Fully Paid!',
          description: 'The tax assessment is now fully paid',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Payment recorded successfully',
        });
      }

      navigate(`/tax/${assessmentId}`);
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to record payment',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const amountPaid = formData.amount_paid ? parseFloat(formData.amount_paid) : 0;
  const isPartialPayment = assessment && amountPaid > 0 && amountPaid < assessment.outstanding_amount;

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/tax/${assessmentId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Assessment
        </Button>
        <h1 className="text-3xl font-bold mt-2">Record Payment</h1>
      </div>

      {/* Assessment Summary */}
      {assessment && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Assessment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Property Reference:</span>
              <span className="font-medium">{assessment.property?.reference_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax Year:</span>
              <span className="font-medium">{assessment.tax_year}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Assessed Amount:</span>
              <span className="font-medium">{formatCurrency(assessment.assessed_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Already Paid:</span>
              <span className="font-medium text-green-600">{formatCurrency(assessment.paid_amount)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="font-semibold">Outstanding Amount:</span>
              <span className="font-bold text-destructive">{formatCurrency(assessment.outstanding_amount)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Payment Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.payment_date, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.payment_date}
                    onSelect={(date) => date && setFormData(prev => ({ ...prev, payment_date: date }))}
                    initialFocus
                    className="pointer-events-auto"
                    disabled={(date) => date > new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount_paid">Amount Paid *</Label>
              <Input
                id="amount_paid"
                type="number"
                step="0.01"
                value={formData.amount_paid}
                onChange={(e) => setFormData(prev => ({ ...prev, amount_paid: e.target.value }))}
                required
              />
              {isPartialPayment && (
                <p className="text-sm text-orange-600">
                  ⚠️ This is a partial payment. Outstanding will be {
                    formatCurrency(assessment.outstanding_amount - amountPaid)
                  }
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method *</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CHECK">Check</SelectItem>
                  <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                  <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="receipt_number">Receipt Number *</Label>
              <div className="flex gap-2">
                <Input
                  id="receipt_number"
                  value={formData.receipt_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, receipt_number: e.target.value }))}
                  placeholder="RCP-2024-12345"
                  required
                />
                <Button type="button" variant="outline" onClick={generateReceiptNumber}>
                  Generate
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional notes about this payment"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/tax/${assessmentId}`)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Recording...' : 'Record Payment'}
          </Button>
        </div>
      </form>
    </div>
  );
}
