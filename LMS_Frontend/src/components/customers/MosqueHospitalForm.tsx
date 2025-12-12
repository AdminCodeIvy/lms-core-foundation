import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { mosqueHospitalSchema, type MosqueHospitalFormData } from '@/lib/customer-validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MosqueHospitalFormProps {
  defaultValues?: Partial<MosqueHospitalFormData>;
  onSubmit: (data: MosqueHospitalFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export const MosqueHospitalForm = ({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
}: MosqueHospitalFormProps) => {
  const form = useForm<MosqueHospitalFormData>({
    resolver: zodResolver(mosqueHospitalSchema),
    defaultValues: defaultValues || {
      property_id: '',
      full_mosque_hospital_name: '',
      mosque_registration_number: '',
      contact_name: '',
      mobile_number_1: '',
      email: '',
      mobile_number_2: '',
      address: '',
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
            <CardTitle>Mosque / Hospital Information</CardTitle>
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
              name="full_mosque_hospital_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Mosque or Hospital Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter full mosque or hospital name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mosque_registration_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mosque Registration Number <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter mosque registration number" />
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
