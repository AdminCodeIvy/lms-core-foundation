import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { PersonForm } from '@/components/customers/PersonForm';
import { BusinessForm } from '@/components/customers/BusinessForm';
import { GovernmentForm } from '@/components/customers/GovernmentForm';
import { MosqueHospitalForm } from '@/components/customers/MosqueHospitalForm';
import { NonProfitForm } from '@/components/customers/NonProfitForm';
import { ContractorForm } from '@/components/customers/ContractorForm';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Skeleton } from '@/components/ui/skeleton';
import type { CustomerWithDetails } from '@/types/customer';

const ID_TYPES = ['Birth Certificate', 'National ID Card', 'Driving License', 'Passport', 'Business License'];

const CustomerEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [customer, setCustomer] = useState<CustomerWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [districts, setDistricts] = useState<{ id: string; name: string }[]>([]);
  const [carriers, setCarriers] = useState<{ id: string; name: string }[]>([]);
  const [countries, setCountries] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchCustomer();
    fetchLookupData();
  }, [id]);

  const fetchCustomer = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`*, customer_person(*), customer_business(*), customer_government(*), customer_mosque_hospital(*), customer_non_profit(*), customer_contractor(*)`)
        .eq('id', id)
        .single();

      if (error) throw error;
      setCustomer({ ...data, person_data: data.customer_person?.[0], business_data: data.customer_business?.[0], government_data: data.customer_government?.[0], mosque_hospital_data: data.customer_mosque_hospital?.[0], non_profit_data: data.customer_non_profit?.[0], contractor_data: data.customer_contractor?.[0] });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load customer' });
    } finally {
      setLoading(false);
    }
  };

  const fetchLookupData = async () => {
    const [d, c, co] = await Promise.all([supabase.from('districts').select('id, name').order('name'), supabase.from('carriers').select('id, name').order('name'), supabase.from('countries').select('id, name').order('name')]);
    if (d.data) setDistricts(d.data);
    if (c.data) setCarriers(c.data);
    if (co.data) setCountries(co.data);
  };

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const table = `customer_${customer?.customer_type.toLowerCase()}`;
      const { error } = await supabase.from(table).update(data).eq('customer_id', id);
      if (error) throw error;
      toast({ title: 'Success', description: 'Customer updated successfully' });
      navigate(`/customers/${id}`);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>;
  if (!customer) return <div>Customer not found</div>;

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink asChild><Link to="/">Home</Link></BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink asChild><Link to="/customers">Customers</Link></BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink asChild><Link to={`/customers/${id}`}>{customer.reference_id}</Link></BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Edit</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="text-3xl font-bold">Edit Customer {customer.reference_id}</h1>

      {customer.customer_type === 'PERSON' && customer.person_data && <PersonForm defaultValues={{...customer.person_data, date_of_birth: new Date(customer.person_data.date_of_birth), issue_date: new Date(customer.person_data.issue_date), expiry_date: new Date(customer.person_data.expiry_date)}} onSubmit={handleSubmit} onCancel={() => navigate(`/customers/${id}`)} isSubmitting={isSubmitting} districts={districts} carriers={carriers} countries={countries} idTypes={ID_TYPES} />}
      {customer.customer_type === 'BUSINESS' && customer.business_data && <BusinessForm defaultValues={customer.business_data} onSubmit={handleSubmit} onCancel={() => navigate(`/customers/${id}`)} isSubmitting={isSubmitting} districts={districts} carriers={carriers} />}
      {customer.customer_type === 'GOVERNMENT' && customer.government_data && <GovernmentForm defaultValues={customer.government_data} onSubmit={handleSubmit} onCancel={() => navigate(`/customers/${id}`)} isSubmitting={isSubmitting} districts={districts} carriers={carriers} />}
      {customer.customer_type === 'MOSQUE_HOSPITAL' && customer.mosque_hospital_data && <MosqueHospitalForm defaultValues={customer.mosque_hospital_data} onSubmit={handleSubmit} onCancel={() => navigate(`/customers/${id}`)} isSubmitting={isSubmitting} districts={districts} carriers={carriers} />}
      {customer.customer_type === 'NON_PROFIT' && customer.non_profit_data && <NonProfitForm defaultValues={customer.non_profit_data} onSubmit={handleSubmit} onCancel={() => navigate(`/customers/${id}`)} isSubmitting={isSubmitting} districts={districts} carriers={carriers} />}
      {customer.customer_type === 'CONTRACTOR' && customer.contractor_data && <ContractorForm defaultValues={customer.contractor_data} onSubmit={handleSubmit} onCancel={() => navigate(`/customers/${id}`)} isSubmitting={isSubmitting} carriers={carriers} />}
    </div>
  );
};

export default CustomerEdit;
