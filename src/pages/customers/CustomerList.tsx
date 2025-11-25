import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Download, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { CustomerListItem, CustomerType, CustomerStatus } from '@/types/customer';

const CustomerList = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 50;

  const canCreate = profile?.role === 'INPUTTER' || profile?.role === 'ADMINISTRATOR';
  const canExport = profile?.role === 'APPROVER' || profile?.role === 'ADMINISTRATOR';

  useEffect(() => {
    fetchCustomers();
  }, [page, searchQuery, typeFilter, statusFilter]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('customers')
        .select(`
          id,
          reference_id,
          customer_type,
          status,
          updated_at,
          customer_person(first_name, father_name),
          customer_business(business_name),
          customer_government(full_department_name),
          customer_mosque_hospital(full_name),
          customer_non_profit(full_non_profit_name),
          customer_contractor(full_contractor_name)
        `, { count: 'exact' });

      // Apply filters
      if (typeFilter !== 'ALL') {
        query = query.eq('customer_type', typeFilter);
      }

      if (statusFilter !== 'ALL') {
        query = query.eq('status', statusFilter);
      }

      // Apply search (reference_id or name)
      if (searchQuery) {
        query = query.or(`reference_id.ilike.%${searchQuery}%`);
      }

      // Pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to).order('updated_at', { ascending: false });

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      // Transform data to include name
      const transformedData: CustomerListItem[] = (data || []).map((customer: any) => {
        let name = 'Unknown';
        
        switch (customer.customer_type) {
          case 'PERSON':
            if (customer.customer_person && customer.customer_person.length > 0) {
              const person = customer.customer_person[0];
              name = `${person.first_name} ${person.father_name}`;
            }
            break;
          case 'BUSINESS':
            if (customer.customer_business && customer.customer_business.length > 0) {
              name = customer.customer_business[0].business_name;
            }
            break;
          case 'GOVERNMENT':
            if (customer.customer_government && customer.customer_government.length > 0) {
              name = customer.customer_government[0].full_department_name;
            }
            break;
          case 'MOSQUE_HOSPITAL':
            if (customer.customer_mosque_hospital && customer.customer_mosque_hospital.length > 0) {
              name = customer.customer_mosque_hospital[0].full_name;
            }
            break;
          case 'NON_PROFIT':
            if (customer.customer_non_profit && customer.customer_non_profit.length > 0) {
              name = customer.customer_non_profit[0].full_non_profit_name;
            }
            break;
          case 'CONTRACTOR':
            if (customer.customer_contractor && customer.customer_contractor.length > 0) {
              name = customer.customer_contractor[0].full_contractor_name;
            }
            break;
        }

        return {
          id: customer.id,
          reference_id: customer.reference_id,
          customer_type: customer.customer_type,
          status: customer.status,
          name,
          updated_at: customer.updated_at,
        };
      });

      setCustomers(transformedData);
      setTotalPages(Math.ceil((count || 0) / limit));
    } catch (err: any) {
      console.error('Error fetching customers:', err);
      setError(err.message);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load customers',
      });
    } finally {
      setLoading(false);
    }
  };

  const getTypeBadgeColor = (type: CustomerType) => {
    switch (type) {
      case 'PERSON': return 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20';
      case 'BUSINESS': return 'bg-green-500/10 text-green-500 hover:bg-green-500/20';
      case 'GOVERNMENT': return 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20';
      case 'MOSQUE_HOSPITAL': return 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20';
      case 'NON_PROFIT': return 'bg-teal-500/10 text-teal-500 hover:bg-teal-500/20';
      case 'CONTRACTOR': return 'bg-pink-500/10 text-pink-500 hover:bg-pink-500/20';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getStatusBadgeVariant = (status: CustomerStatus) => {
    switch (status) {
      case 'DRAFT': return 'secondary';
      case 'SUBMITTED': return 'default';
      case 'APPROVED': return 'default';
      case 'REJECTED': return 'destructive';
      default: return 'secondary';
    }
  };

  const formatCustomerType = (type: CustomerType) => {
    return type.replace('_', '/');
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Customers</h1>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
            <Button variant="outline" size="sm" onClick={fetchCustomers} className="mt-2">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground mt-1">
            Manage customer records and ownership information
          </p>
        </div>
        <div className="flex gap-2">
          {canExport && (
            <Button variant="outline" disabled>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
          {canCreate && (
            <Button disabled>
              <Plus className="h-4 w-4 mr-2" />
              New Customer
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or reference ID"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={typeFilter} onValueChange={(value) => { setTypeFilter(value); setPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="PERSON">Person</SelectItem>
              <SelectItem value="BUSINESS">Business</SelectItem>
              <SelectItem value="GOVERNMENT">Government</SelectItem>
              <SelectItem value="MOSQUE_HOSPITAL">Mosque/Hospital</SelectItem>
              <SelectItem value="NON_PROFIT">Non-Profit</SelectItem>
              <SelectItem value="CONTRACTOR">Contractor</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="SUBMITTED">Submitted</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  No customers found. Create your first customer.
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow
                  key={customer.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/customers/${customer.id}`)}
                >
                  <TableCell className="font-mono">{customer.reference_id}</TableCell>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>
                    <Badge className={getTypeBadgeColor(customer.customer_type)}>
                      {formatCustomerType(customer.customer_type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(customer.status)}>
                      {customer.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(customer.updated_at), 'MMM dd, yyyy')}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/customers/${customer.id}`);
                    }}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <div className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default CustomerList;
