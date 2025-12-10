import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { customerService } from '@/services/customerService';
import { lookupService } from '@/services/lookupService';
import { useToast } from '@/hooks/use-toast';
import { PersonForm } from '@/components/customers/PersonForm';
import { BusinessForm } from '@/components/customers/BusinessForm';
import { GovernmentForm } from '@/components/customers/GovernmentForm';
import { MosqueHospitalForm } from '@/components/customers/MosqueHospitalForm';
import { NonProfitForm } from '@/components/customers/NonProfitForm';
import { ContractorForm } from '@/components/customers/ContractorForm';
import { RentalForm } from '@/components/customers/RentalForm';
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
      const data = await customerService.getCustomer(id!);
      setCustomer(data);
    } catch (error: any) {
      console.error('Error fetching customer:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load customer' });
    } finally {
      setLoading(false);
    }
  };

  const fetchLookupData = async () => {
    try {
      const [districtsData, carriersData, countriesData] = await Promise.all([
        lookupService.getDistricts(),
        lookupService.getCarriers(),
        lookupService.getCountries(),
      ]);
      setDistricts(districtsData);
      setCarriers(carriersData);
      setCountries(countriesData);
    } catch (error: any) {
      console.error('Error fetching lookup data:', error);
    }
  };

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const updateData: any = {
        customer_type: customer?.customer_type,
      };

      // Add the appropriate data based on customer type
      if (customer?.customer_type === 'PERSON') {
        updateData.person_data = data;
      } else if (customer?.customer_type === 'BUSINESS') {
        updateData.business_data = data;
      } else if (customer?.customer_type === 'GOVERNMENT') {
        updateData.government_data = data;
      } else if (customer?.customer_type === 'MOSQUE_HOSPITAL') {
        updateData.mosque_hospital_data = data;
      } else if (customer?.customer_type === 'NON_PROFIT') {
        updateData.non_profit_data = data;
      } else if (customer?.customer_type === 'CONTRACTOR') {
        updateData.contractor_data = data;
      } else if (customer?.customer_type === 'RENTAL') {
        updateData.rental_data = data;
      }

      await customerService.updateCustomer(id!, updateData);

      toast({ title: 'Success', description: 'Customer updated successfully' });
      navigate(`/customers/${id}`);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.error || error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>;
  if (!customer) return <div>Customer not found</div>;

  // Check if customer has no type-specific data
  const hasNoData = !customer.person_data && !customer.business_data && !customer.government_data && 
                     !customer.mosque_hospital_data && !customer.non_profit_data && !customer.contractor_data && !customer.rental_data;
  
  if (hasNoData) {
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
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
          <h2 className="text-xl font-semibold text-destructive mb-2">Cannot Edit Customer</h2>
          <p className="text-muted-foreground">This customer ({customer.reference_id}) has no detailed information. It may have been created before Phase 2B was implemented. Please create a new customer instead.</p>
        </div>
      </div>
    );
  }

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
      {customer.customer_type === 'RENTAL' && customer.rental_data && <RentalForm defaultValues={{...customer.rental_data, date_of_birth: new Date(customer.rental_data.date_of_birth), issue_date: customer.rental_data.issue_date ? new Date(customer.rental_data.issue_date) : undefined, expiry_date: customer.rental_data.expiry_date ? new Date(customer.rental_data.expiry_date) : undefined}} onSubmit={handleSubmit} onCancel={() => navigate(`/customers/${id}`)} isSubmitting={isSubmitting} carriers={carriers} countries={countries} idTypes={ID_TYPES} />}
    </div>
  );
};

export default CustomerEdit;
