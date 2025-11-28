import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { CustomerTypeSelector } from './CustomerTypeSelector';
import { PersonForm } from '@/components/customers/PersonForm';
import { BusinessForm } from '@/components/customers/BusinessForm';
import { GovernmentForm } from '@/components/customers/GovernmentForm';
import { MosqueHospitalForm } from '@/components/customers/MosqueHospitalForm';
import { NonProfitForm } from '@/components/customers/NonProfitForm';
import { ContractorForm } from '@/components/customers/ContractorForm';
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
      const [districtsRes, carriersRes, countriesRes] = await Promise.all([
        supabase.from('districts').select('id, name').order('name'),
        supabase.from('carriers').select('id, name').order('name'),
        supabase.from('countries').select('id, name').order('name'),
      ]);

      if (districtsRes.data) setDistricts(districtsRes.data);
      if (carriersRes.data) setCarriers(carriersRes.data);
      if (countriesRes.data) setCountries(countriesRes.data);
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
      // Create customer record
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert({
          customer_type: 'PERSON',
          status: 'DRAFT',
          created_by: user?.id,
        })
        .select()
        .single();

      if (customerError) throw customerError;

      // Create person data
      const { error: personError } = await supabase
        .from('customer_person')
        .insert({
          customer_id: customer.id,
          ...data,
        });

      if (personError) throw personError;

      // Create activity log for draft creation
      await supabase.from('activity_logs').insert({
        entity_type: 'CUSTOMER',
        entity_id: customer.id,
        action: 'CREATED',
        performed_by: user?.id,
        metadata: {
          reference_id: customer.reference_id,
          customer_type: 'PERSON',
          status: 'DRAFT'
        }
      });

      // Create audit log for draft creation
      await supabase.from('audit_logs').insert({
        entity_type: 'customer',
        entity_id: customer.id,
        action: 'create',
        field: 'status',
        old_value: null,
        new_value: 'DRAFT',
        changed_by: user?.id
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
        description: error.message || 'Failed to create customer',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBusinessSubmit = async (data: BusinessFormData) => {
    setIsSubmitting(true);
    try {
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert({
          customer_type: 'BUSINESS',
          status: 'DRAFT',
          created_by: user?.id,
        })
        .select()
        .single();

      if (customerError) throw customerError;

      const { error: businessError } = await supabase
        .from('customer_business')
        .insert({
          customer_id: customer.id,
          ...data,
        });

      if (businessError) throw businessError;

      // Create activity log for draft creation
      await supabase.from('activity_logs').insert({
        entity_type: 'CUSTOMER',
        entity_id: customer.id,
        action: 'CREATED',
        performed_by: user?.id,
        metadata: {
          reference_id: customer.reference_id,
          customer_type: 'BUSINESS',
          status: 'DRAFT'
        }
      });

      // Create audit log for draft creation
      await supabase.from('audit_logs').insert({
        entity_type: 'customer',
        entity_id: customer.id,
        action: 'create',
        field: 'status',
        old_value: null,
        new_value: 'DRAFT',
        changed_by: user?.id
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
        description: error.message || 'Failed to create customer',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGovernmentSubmit = async (data: GovernmentFormData) => {
    setIsSubmitting(true);
    try {
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert({
          customer_type: 'GOVERNMENT',
          status: 'DRAFT',
          created_by: user?.id,
        })
        .select()
        .single();

      if (customerError) throw customerError;

      const { error: govError } = await supabase
        .from('customer_government')
        .insert({
          customer_id: customer.id,
          ...data,
        });

      if (govError) throw govError;

      // Create activity log for draft creation
      await supabase.from('activity_logs').insert({
        entity_type: 'CUSTOMER',
        entity_id: customer.id,
        action: 'CREATED',
        performed_by: user?.id,
        metadata: {
          reference_id: customer.reference_id,
          customer_type: 'GOVERNMENT',
          status: 'DRAFT'
        }
      });

      // Create audit log for draft creation
      await supabase.from('audit_logs').insert({
        entity_type: 'customer',
        entity_id: customer.id,
        action: 'create',
        field: 'status',
        old_value: null,
        new_value: 'DRAFT',
        changed_by: user?.id
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
        description: error.message || 'Failed to create customer',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMosqueHospitalSubmit = async (data: MosqueHospitalFormData) => {
    setIsSubmitting(true);
    try {
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert({
          customer_type: 'MOSQUE_HOSPITAL',
          status: 'DRAFT',
          created_by: user?.id,
        })
        .select()
        .single();

      if (customerError) throw customerError;

      const { error: mhError } = await supabase
        .from('customer_mosque_hospital')
        .insert({
          customer_id: customer.id,
          ...data,
        });

      if (mhError) throw mhError;

      // Create activity log for draft creation
      await supabase.from('activity_logs').insert({
        entity_type: 'CUSTOMER',
        entity_id: customer.id,
        action: 'CREATED',
        performed_by: user?.id,
        metadata: {
          reference_id: customer.reference_id,
          customer_type: 'MOSQUE_HOSPITAL',
          status: 'DRAFT'
        }
      });

      // Create audit log for draft creation
      await supabase.from('audit_logs').insert({
        entity_type: 'customer',
        entity_id: customer.id,
        action: 'create',
        field: 'status',
        old_value: null,
        new_value: 'DRAFT',
        changed_by: user?.id
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
        description: error.message || 'Failed to create customer',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNonProfitSubmit = async (data: NonProfitFormData) => {
    setIsSubmitting(true);
    try {
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert({
          customer_type: 'NON_PROFIT',
          status: 'DRAFT',
          created_by: user?.id,
        })
        .select()
        .single();

      if (customerError) throw customerError;

      const { error: npError } = await supabase
        .from('customer_non_profit')
        .insert({
          customer_id: customer.id,
          ...data,
        });

      if (npError) throw npError;

      // Create activity log for draft creation
      await supabase.from('activity_logs').insert({
        entity_type: 'CUSTOMER',
        entity_id: customer.id,
        action: 'CREATED',
        performed_by: user?.id,
        metadata: {
          reference_id: customer.reference_id,
          customer_type: 'NON_PROFIT',
          status: 'DRAFT'
        }
      });

      // Create audit log for draft creation
      await supabase.from('audit_logs').insert({
        entity_type: 'customer',
        entity_id: customer.id,
        action: 'create',
        field: 'status',
        old_value: null,
        new_value: 'DRAFT',
        changed_by: user?.id
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
        description: error.message || 'Failed to create customer',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContractorSubmit = async (data: ContractorFormData) => {
    setIsSubmitting(true);
    try {
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert({
          customer_type: 'CONTRACTOR',
          status: 'DRAFT',
          created_by: user?.id,
        })
        .select()
        .single();

      if (customerError) throw customerError;

      const { error: contractorError } = await supabase
        .from('customer_contractor')
        .insert({
          customer_id: customer.id,
          ...data,
        });

      if (contractorError) throw contractorError;

      // Create activity log for draft creation
      await supabase.from('activity_logs').insert({
        entity_type: 'CUSTOMER',
        entity_id: customer.id,
        action: 'CREATED',
        performed_by: user?.id,
        metadata: {
          reference_id: customer.reference_id,
          customer_type: 'CONTRACTOR',
          status: 'DRAFT'
        }
      });

      // Create audit log for draft creation
      await supabase.from('audit_logs').insert({
        entity_type: 'customer',
        entity_id: customer.id,
        action: 'create',
        field: 'status',
        old_value: null,
        new_value: 'DRAFT',
        changed_by: user?.id
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
        description: error.message || 'Failed to create customer',
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
    </div>
  );
};

export default CustomerNew;
