import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { businessSchema, type BusinessFormData } from '@/lib/customer-validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BusinessFormProps {
  defaultValues?: Partial<BusinessFormData>;
  onSubmit: (data: BusinessFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export const BusinessForm = ({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
}: BusinessFormProps) => {
  const form = useForm<BusinessFormData>({
    resolver: zodResolver(businessSchema),
    defaultValues: defaultValues || {
      property_id: '',
      business_name: '',
      business_license_number: '',
      business_address: '',
      rental_name: '',
      mobile_number_1: '',
      mobile_number_2: '',
      email: '',
      size: '',
      floor: '',
      file_number: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
            <p className="text-sm text-muted-foreground">
              Fields marked with * are required. All other fields are optional.
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="property_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property ID *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter Property ID (required)" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="business_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Business Name *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter full business name (required)" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="business_license_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business / Commercial License Number</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter license number (optional)" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="business_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Address</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter business address (optional)" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rental_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rental Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter rental name (optional)" />
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="mobile_number_1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Number</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="+252-612-345-678 (optional)" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mobile_number_2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Number 2</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="+252-612-345-679 (optional)" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="email@example.com (optional)" />
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
