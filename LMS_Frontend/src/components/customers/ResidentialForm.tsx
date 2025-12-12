import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { residentialSchema, type ResidentialFormData } from '@/lib/customer-validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ResidentialFormProps {
  defaultValues?: Partial<ResidentialFormData>;
  onSubmit: (data: ResidentialFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export const ResidentialForm = ({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
}: ResidentialFormProps) => {
  const form = useForm<ResidentialFormData>({
    resolver: zodResolver(residentialSchema),
    defaultValues: defaultValues || {
      property_id: '',
      size: '',
      floor: '',
      file_number: '',
      address: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Residential Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="property_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property ID <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter Property ID" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Size</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter size (optional)" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="floor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Floor</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter floor (optional)" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="file_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>File Number</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter file number (optional)" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter address (optional)" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex gap-4 justify-end">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save as Draft'}
          </Button>
        </div>
      </form>
    </Form>
  );
};
