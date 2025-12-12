import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { nonProfitSchema, type NonProfitFormData } from '@/lib/customer-validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface NonProfitFormProps {
  defaultValues?: Partial<NonProfitFormData>;
  onSubmit: (data: NonProfitFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export const NonProfitForm = ({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
}: NonProfitFormProps) => {
  const form = useForm<NonProfitFormData>({
    resolver: zodResolver(nonProfitSchema),
    defaultValues: defaultValues || {
      property_id: '',
      ngo_name: '',
      ngo_registration_number: '',
      contact_name: '',
      mobile_number_1: '',
      email: '',
      mobile_number_2: '',
      size: '',
      floor: '',
      address: '',
      file_number: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>NGO Information</CardTitle>
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
              name="ngo_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NGO Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter NGO name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ngo_registration_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NGO Registration Number <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter NGO registration number" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contact_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter contact name" />
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
                  <FormLabel>Contact Number <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="+252-612-345-678" />
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
                  <FormLabel>Email <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="email@example.com" />
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
