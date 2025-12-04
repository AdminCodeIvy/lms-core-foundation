import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { User, Building2, Landmark, Hospital, Heart, HardHat } from 'lucide-react';
import type { CustomerType } from '@/types/customer-form';

interface CustomerTypeOption {
  type: CustomerType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const customerTypes: CustomerTypeOption[] = [
  {
    type: 'PERSON',
    title: 'Person / Individual',
    description: 'Individual property owner or stakeholder',
    icon: User,
  },
  {
    type: 'BUSINESS',
    title: 'Business / Commercial',
    description: 'Commercial business or company',
    icon: Building2,
  },
  {
    type: 'GOVERNMENT',
    title: 'Government Property',
    description: 'Government ministry or department',
    icon: Landmark,
  },
  {
    type: 'MOSQUE_HOSPITAL',
    title: 'Mosque / Hospital',
    description: 'Public property - religious or healthcare',
    icon: Hospital,
  },
  {
    type: 'NON_PROFIT',
    title: 'Non-Profit',
    description: 'NGO or non-profit organization',
    icon: Heart,
  },
  {
    type: 'CONTRACTOR',
    title: 'Contractor',
    description: 'Construction service provider',
    icon: HardHat,
  },
];

interface CustomerTypeSelectorProps {
  onSelectType: (type: CustomerType) => void;
}

export const CustomerTypeSelector = ({ onSelectType }: CustomerTypeSelectorProps) => {
  const [selectedType, setSelectedType] = useState<CustomerType | null>(null);

  const handleSelectType = (type: CustomerType) => {
    setSelectedType(type);
    onSelectType(type);
  };

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
            <BreadcrumbPage>New</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-3xl font-bold">New Customer</h1>
        <p className="text-muted-foreground mt-1">Select customer type to continue</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {customerTypes.map((customerType) => {
          const Icon = customerType.icon;
          const isSelected = selectedType === customerType.type;
          
          return (
            <Card
              key={customerType.type}
              className={`cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 ${
                isSelected ? 'border-primary shadow-md' : ''
              }`}
              onClick={() => handleSelectType(customerType.type)}
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${isSelected ? 'bg-primary/10' : 'bg-muted'}`}>
                    <Icon className={`h-8 w-8 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl">{customerType.title}</CardTitle>
                    <CardDescription className="mt-1">{customerType.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
