import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { propertyService } from '@/services/propertyService';
import { lookupService } from '@/services/lookupService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Filter, Trash2, Archive, ArchiveRestore, Building } from 'lucide-react';
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
    try {
      const data = await lookupService.getDistricts();
      setDistricts(data);
    } catch (error) {
      console.error('Error fetching districts:', error);
    }
  };

  const fetchProperties = async () => {
    try {
      setLoading(true);

      const response = await propertyService.getProperties({
        page: pagination.page,
        limit: pagination.limit,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        district: districtFilter !== 'all' ? districtFilter : undefined,
        search: search || undefined,
        showArchived,
      });

      setProperties(response.data || []);
      setPagination((prev) => ({
        ...prev,
        total: response.meta?.total || 0,
        totalPages: response.meta?.totalPages || 0,
      }));
    } catch (error: any) {
      console.error('Error fetching properties:', error);
      toast.error(error.message || 'Failed to fetch properties');
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
      await propertyService.deleteProperty(propertyToDelete.id);
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
      await propertyService.archiveProperty(property.id);
      const isCurrentlyArchived = property.status === 'ARCHIVED';
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
  const isViewer = profile?.role === 'VIEWER';

  // For viewers, only show approved properties
  useEffect(() => {
    if (isViewer && statusFilter === 'all') {
      setStatusFilter('APPROVED');
    }
  }, [isViewer]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isViewer ? 'Approved Properties' : 'Properties'}
          </h1>
          <p className="text-muted-foreground">
            {isViewer ? 'View approved property records' : 'Manage property records and workflow'}
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
      {!isViewer && (
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
                  <SelectItem value="all">All Status (Except Archived)</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="SUBMITTED">Submitted</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  {['APPROVER', 'ADMINISTRATOR'].includes(profile?.role || '') && (
                    <SelectItem value="ARCHIVED">Archived Only</SelectItem>
                  )}
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
      )}

      {/* Viewer Search */}
      {isViewer && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search properties..."
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* Viewer Card View */}
      {isViewer ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-4 w-full mb-4" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))
          ) : properties.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="p-12 text-center text-muted-foreground">
                No approved properties found.
              </CardContent>
            </Card>
          ) : (
            properties.map((property) => (
              <Card 
                key={property.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/properties/${property.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{property.reference_id}</h3>
                      <p className="text-sm text-muted-foreground">{property.parcel_number}</p>
                    </div>
                    <Badge className="bg-green-500">APPROVED</Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span>{property.district?.name}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Updated: {new Date(property.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/properties/${property.id}`);
                    }}
                  >
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        /* Table View for other roles */
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
      )}

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
