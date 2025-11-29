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
import { Plus, Search, Filter, Trash2, Archive, ArchiveRestore } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Property {
  id: string;
  reference_id: string;
  parcel_number: string;
  status: string;
  created_by: string;
  district: { code: string; name: string };
  updated_at: string;
}

export default function PropertyList() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [districtFilter, setDistrictFilter] = useState(searchParams.get('district') || 'all');
  const [showArchived, setShowArchived] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);
  const [deleting, setDeleting] = useState(false);
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

      // Build base query
      let query = supabase
        .from('properties')
        .select(
          `
          id,
          reference_id,
          parcel_number,
          status,
          created_by,
          updated_at,
          district:districts!properties_district_id_fkey(id, code, name)
        `,
          { count: 'exact' }
        )
        .order('created_at', { ascending: false });

      // Apply filters
      if (search) {
        query = query.or(
          `reference_id.ilike.%${search}%,parcel_number.ilike.%${search}%`
        );
      }

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      } else if (!showArchived) {
        // By default, hide archived properties
        query = query.neq('status', 'ARCHIVED');
      }

      if (districtFilter && districtFilter !== 'all') {
        query = query.eq('district_id', districtFilter);
      }

      // Apply pagination
      const from = (pagination.page - 1) * pagination.limit;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setProperties((data as unknown as Property[]) || []);
      const total = count ?? 0;
      setPagination((prev) => ({
        ...prev,
        total,
        totalPages: total > 0 ? Math.ceil(total / prev.limit) : 0,
      }));
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast.error('Failed to fetch properties');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (property: Property, e: React.MouseEvent) => {
    e.stopPropagation();
    setPropertyToDelete(property);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!propertyToDelete) return;

    try {
      setDeleting(true);
      console.log('Deleting property:', propertyToDelete.id, propertyToDelete.reference_id);

      // Fetch all photos for this property
      const { data: photos } = await supabase
        .from('property_photos')
        .select('photo_url')
        .eq('property_id', propertyToDelete.id);

      console.log('Found photos to delete:', photos?.length || 0);

      // Delete images from storage
      if (photos && photos.length > 0) {
        for (const photo of photos) {
          // Extract file path from URL
          const url = new URL(photo.photo_url);
          const pathParts = url.pathname.split('/property-photos/');
          if (pathParts.length > 1) {
            const filePath = pathParts[1];
            const { error: storageError } = await supabase.storage
              .from('property-photos')
              .remove([filePath]);
            
            if (storageError) {
              console.error('Error deleting photo from storage:', storageError);
            }
          }
        }
      }

      // Delete property (cascade will handle related records)
      const { error, data } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyToDelete.id)
        .select();

      console.log('Delete result:', { error, deletedCount: data?.length });

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('Property not deleted - permission denied or does not exist');
      }

      // Log the deletion to audit_logs
      if (user?.id) {
        const { error: auditError } = await supabase.from('audit_logs').insert({
          entity_type: 'property',
          entity_id: propertyToDelete.id,
          action: 'delete',
          field: null,
          old_value: propertyToDelete.reference_id,
          new_value: null,
          changed_by: user.id,
          timestamp: new Date().toISOString(),
        });

        if (auditError) {
          console.error('Audit log error:', auditError);
        }
      }

      toast.success('Property deleted successfully');
      setDeleteDialogOpen(false);
      setPropertyToDelete(null);
      fetchProperties();
    } catch (error: any) {
      console.error('Error deleting property:', error);
      toast.error(error.message || 'Failed to delete property');
    } finally {
      setDeleting(false);
    }
  };

  const canDelete = (property: Property) => {
    return profile?.role === 'ADMINISTRATOR' || 
           (property.status === 'DRAFT' && property.created_by === user?.id && profile?.role === 'INPUTTER');
  };

  const canArchive = () => {
    return ['APPROVER', 'ADMINISTRATOR'].includes(profile?.role || '');
  };

  const handleArchive = async (property: Property, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const isCurrentlyArchived = property.status === 'ARCHIVED';

      // Fetch latest property status and approval info
      const { data: fullProperty, error: fetchError } = await supabase
        .from('properties')
        .select('status, approved_by, reference_id')
        .eq('id', property.id)
        .single();

      if (fetchError || !fullProperty) {
        throw fetchError || new Error('Property not found');
      }

      let newStatus: string;
      if (isCurrentlyArchived) {
        if (fullProperty.status !== 'ARCHIVED') {
          throw new Error('Property is not archived');
        }
        newStatus = fullProperty.approved_by ? 'APPROVED' : 'DRAFT';
      } else {
        if (fullProperty.status === 'ARCHIVED') {
          throw new Error('Property is already archived');
        }
        newStatus = 'ARCHIVED';
      }

      const { error: updateError } = await supabase
        .from('properties')
        .update({ status: newStatus })
        .eq('id', property.id);

      if (updateError) {
        throw updateError;
      }

      // Audit log
      if (user?.id) {
        const { error: auditError } = await supabase.from('audit_logs').insert({
          entity_type: 'property',
          entity_id: property.id,
          action: isCurrentlyArchived ? 'unarchive' : 'archive',
          field: 'status',
          old_value: fullProperty.status,
          new_value: newStatus,
          changed_by: user.id,
          timestamp: new Date().toISOString(),
        });

        if (auditError) {
          console.error('Audit log error (archive property):', auditError);
        }
      }

      toast.success(isCurrentlyArchived ? 'Property unarchived successfully' : 'Property archived successfully');
      fetchProperties();
    } catch (err: any) {
      console.error('Error archiving property:', err);
      toast.error(err.message || 'Failed to archive property');
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
                        <div className="flex gap-2 justify-end">
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
                          {canArchive() && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => handleArchive(property, e)}
                              title={property.status === 'ARCHIVED' ? 'Unarchive' : 'Archive'}
                            >
                              {property.status === 'ARCHIVED' ? 
                                <ArchiveRestore className="h-4 w-4" /> : 
                                <Archive className="h-4 w-4" />
                              }
                            </Button>
                          )}
                          {canDelete(property) && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => handleDeleteClick(property, e)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete property <strong>{propertyToDelete?.reference_id}</strong>?
              This action cannot be undone. All associated data including images will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
