import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';

interface Property {
  id: string;
  reference_id: string;
  parcel_number: string;
  status: string;
  district: { code: string; name: string };
  updated_at: string;
}

export default function PropertyList() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [districtFilter, setDistrictFilter] = useState(searchParams.get('district') || 'all');
  const [showArchived, setShowArchived] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    fetchDistricts();
    fetchProperties();
  }, [search, statusFilter, districtFilter, showArchived, pagination.page]);

  const fetchDistricts = async () => {
    const { data } = await supabase
      .from('districts')
      .select('id, code, name')
      .eq('is_active', true)
      .order('name');
    
    if (data) setDistricts(data);
  };

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...(statusFilter && statusFilter !== 'all' && { status: statusFilter }),
        ...(districtFilter && districtFilter !== 'all' && { district_id: districtFilter }),
        ...(showArchived && { show_archived: 'true' })
      });

      const { data, error } = await supabase.functions.invoke('get-properties', {
        body: Object.fromEntries(params)
      });

      if (error) throw error;

      setProperties(data.data || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast.error('Failed to fetch properties');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-500';
      case 'SUBMITTED': return 'bg-blue-500';
      case 'APPROVED': return 'bg-green-500';
      case 'REJECTED': return 'bg-red-500';
      case 'ARCHIVED': return 'bg-gray-700';
      default: return 'bg-gray-500';
    }
  };

  const canCreate = ['INPUTTER', 'ADMINISTRATOR'].includes(profile?.role || '');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Properties</h1>
          <p className="text-muted-foreground">
            Manage property records and workflow
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => navigate('/properties/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Property
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by reference ID or parcel number"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={districtFilter} onValueChange={setDistrictFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Districts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Districts</SelectItem>
                {districts.map(district => (
                  <SelectItem key={district.id} value={district.id}>
                    {district.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>

            {['APPROVER', 'ADMINISTRATOR'].includes(profile?.role || '') && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showArchived"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="showArchived" className="text-sm">
                  Show Archived
                </label>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr className="bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium">Reference ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Parcel Number</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">District</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Updated</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-6 w-20" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-8 w-16 ml-auto" /></td>
                    </tr>
                  ))
                ) : properties.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      No properties found. {canCreate && 'Create your first property.'}
                    </td>
                  </tr>
                ) : (
                  properties.map((property) => (
                    <tr
                      key={property.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/properties/${property.id}`)}
                    >
                      <td className="px-4 py-3 font-medium">{property.reference_id}</td>
                      <td className="px-4 py-3">{property.parcel_number}</td>
                      <td className="px-4 py-3">{property.district?.name}</td>
                      <td className="px-4 py-3">
                        <Badge className={getStatusColor(property.status)}>
                          {property.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(property.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/properties/${property.id}`);
                          }}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-4">
              <div className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} properties
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
