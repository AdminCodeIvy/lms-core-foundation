import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { customerService } from '@/services/customerService';
import { lookupService } from '@/services/lookupService';
import { useToast } from '@/hooks/use-toast';
import { CustomerTypeSelector } from './CustomerTypeSelector';
import { PersonForm } from '@/components/customers/PersonForm';
import { BusinessForm } from '@/components/customers/BusinessForm';
import { GovernmentForm } from '@/components/customers/GovernmentForm';
import { MosqueHospitalForm } from '@/components/customers/MosqueHospitalForm';
import { NonProfitForm } from '@/components/customers/NonProfitForm';
import { ContractorForm } from '@/components/customers/ContractorForm';
import { RentalForm } from '@/components/customers/RentalForm';
import { Button } from '@/components/ui/button';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { ArrowLeft } from 'lucide-react';
import type { CustomerType } from '@/types/customer-form';
import type {
  PersonFormData,
  BusinessFormData,
  GovernmentFormData,
  MosqueHospitalFormData,
  NonProfitFormData,
  ContractorFormData,
  RentalFormData,
} from '@/lib/customer-validation';

const ID_TYPES = [
  'Birth Certificate',
  'National ID Card',
  'Driving License',
  'Passport',
  'Business License',
];

const CustomerNew = () => {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { toast } = useToast();

  const [selectedType, setSelectedType] = useState<CustomerType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [districts, setDistricts] = useState<{ id: string; name: string }[]>([]);
  const [carriers, setCarriers] = useState<{ id: string; name: string }[]>([]);
  const [countries, setCountries] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchLookupData();
  }, []);

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
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load form data',
      });
    }
  };

  const handlePersonSubmit = async (data: PersonFormData) => {
    setIsSubmitting(true);
    try {
      const customer = await customerService.createCustomer({
        customer_type: 'PERSON',
        person_data: data,
      });

      toast({
        title: 'Success',
        description: 'Customer draft created successfully',
      });

      navigate(`/customers/${customer.id}`);
    } catch (error: any) {
      console.error('Error creating customer:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.error || error.message || 'Failed to create customer',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBusinessSubmit = async (data: BusinessFormData) => {
    setIsSubmitting(true);
    try {
      const customer = await customerService.createCustomer({
        customer_type: 'BUSINESS',
        business_data: data,
      });

      toast({
        title: 'Success',
        description: 'Customer draft created successfully',
      });

      navigate(`/customers/${customer.id}`);
    } catch (error: any) {
      console.error('Error creating customer:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.error || error.message || 'Failed to create customer',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGovernmentSubmit = async (data: GovernmentFormData) => {
    setIsSubmitting(true);
    try {
      const customer = await customerService.createCustomer({
        customer_type: 'GOVERNMENT',
        government_data: data,
      });

      toast({
        title: 'Success',
        description: 'Customer draft created successfully',
      });

      navigate(`/customers/${customer.id}`);
    } catch (error: any) {
      console.error('Error creating customer:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.error || error.message || 'Failed to create customer',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMosqueHospitalSubmit = async (data: MosqueHospitalFormData) => {
    setIsSubmitting(true);
    try {
      const customer = await customerService.createCustomer({
        customer_type: 'MOSQUE_HOSPITAL',
        mosque_hospital_data: data,
      });

      toast({
        title: 'Success',
        description: 'Customer draft created successfully',
      });

      navigate(`/customers/${customer.id}`);
    } catch (error: any) {
      console.error('Error creating customer:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.error || error.message || 'Failed to create customer',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNonProfitSubmit = async (data: NonProfitFormData) => {
    setIsSubmitting(true);
    try {
      const customer = await customerService.createCustomer({
        customer_type: 'NON_PROFIT',
        non_profit_data: data,
      });

      toast({
        title: 'Success',
        description: 'Customer draft created successfully',
      });

      navigate(`/customers/${customer.id}`);
    } catch (error: any) {
      console.error('Error creating customer:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.error || error.message || 'Failed to create customer',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContractorSubmit = async (data: ContractorFormData) => {
    setIsSubmitting(true);
    try {
      const customer = await customerService.createCustomer({
        customer_type: 'CONTRACTOR',
        contractor_data: data,
      });

      toast({
        title: 'Success',
        description: 'Customer draft created successfully',
      });

      navigate(`/customers/${customer.id}`);
    } catch (error: any) {
      console.error('Error creating customer:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.error || error.message || 'Failed to create customer',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRentalSubmit = async (data: RentalFormData) => {
    setIsSubmitting(true);
    try {
      const customer = await customerService.createCustomer({
        customer_type: 'RENTAL',
        rental_data: data,
      });

      toast({
        title: 'Success',
        description: 'Rental customer draft created successfully',
      });

      navigate(`/customers/${customer.id}`);
    } catch (error: any) {
      console.error('Error creating rental customer:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.error || error.message || 'Failed to create rental customer',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/customers');
  };

  const handleChangeType = () => {
    setSelectedType(null);
  };

  const getTypeLabel = (type: CustomerType) => {
    switch (type) {
      case 'PERSON':
        return 'Person';
      case 'BUSINESS':
        return 'Business';
      case 'GOVERNMENT':
        return 'Government';
      case 'MOSQUE_HOSPITAL':
        return 'Mosque/Hospital';
      case 'NON_PROFIT':
        return 'Non-Profit';
      case 'CONTRACTOR':
        return 'Contractor';
      case 'RENTAL':
        return 'Rental';
    }
  };

  if (!selectedType) {
    return <CustomerTypeSelector onSelectType={setSelectedType} />;
  }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/customers">Customers</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/customers/new">New</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{getTypeLabel(selectedType)}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">New {getTypeLabel(selectedType)} Customer</h1>
        </div>
        <Button variant="outline" onClick={handleChangeType}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Change Type
        </Button>
      </div>

      {selectedType === 'PERSON' && (
        <PersonForm
          onSubmit={handlePersonSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          districts={districts}
          carriers={carriers}
          countries={countries}
          idTypes={ID_TYPES}
        />
      )}

      {selectedType === 'BUSINESS' && (
        <BusinessForm
          onSubmit={handleBusinessSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          districts={districts}
          carriers={carriers}
        />
      )}

      {selectedType === 'GOVERNMENT' && (
        <GovernmentForm
          onSubmit={handleGovernmentSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          districts={districts}
          carriers={carriers}
        />
      )}

      {selectedType === 'MOSQUE_HOSPITAL' && (
        <MosqueHospitalForm
          onSubmit={handleMosqueHospitalSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          districts={districts}
          carriers={carriers}
        />
      )}

      {selectedType === 'NON_PROFIT' && (
        <NonProfitForm
          onSubmit={handleNonProfitSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          districts={districts}
          carriers={carriers}
        />
      )}

      {selectedType === 'CONTRACTOR' && (
        <ContractorForm
          onSubmit={handleContractorSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          carriers={carriers}
        />
      )}

      {selectedType === 'RENTAL' && (
        <RentalForm
          onSubmit={handleRentalSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          carriers={carriers}
          countries={countries}
          idTypes={ID_TYPES}
        />
      )}
    </div>
  );
};

export default CustomerNew;
