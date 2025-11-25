import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase, District, SubDistrict, PropertyType, Carrier, Country } from '@/lib/supabase';
import { Plus, Edit, X } from 'lucide-react';

const LookupManagement = () => {
  const [districts, setDistricts] = useState<District[]>([]);
  const [subDistricts, setSubDistricts] = useState<SubDistrict[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Dialog states
  const [districtDialog, setDistrictDialog] = useState(false);
  const [subDistrictDialog, setSubDistrictDialog] = useState(false);
  const [propertyTypeDialog, setPropertyTypeDialog] = useState(false);
  const [carrierDialog, setCarrierDialog] = useState(false);
  const [countryDialog, setCountryDialog] = useState(false);

  // Form states
  const [districtForm, setDistrictForm] = useState({ id: '', code: '', name: '', is_active: true });
  const [subDistrictForm, setSubDistrictForm] = useState({ id: '', district_id: '', name: '', is_active: true });
  const [propertyTypeForm, setPropertyTypeForm] = useState({ id: '', name: '', category: '', is_active: true });
  const [carrierForm, setCarrierForm] = useState({ id: '', name: '', is_active: true });
  const [countryForm, setCountryForm] = useState({ id: '', code: '', name: '' });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    await Promise.all([
      fetchDistricts(),
      fetchSubDistricts(),
      fetchPropertyTypes(),
      fetchCarriers(),
      fetchCountries(),
    ]);
  };

  const fetchDistricts = async () => {
    try {
      const { data, error } = await supabase
        .from('districts')
        .select('*')
        .order('name');
      if (error) throw error;
      setDistricts(data || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch districts: ' + error.message,
      });
    }
  };

  const fetchSubDistricts = async () => {
    try {
      const { data, error } = await supabase
        .from('sub_districts')
        .select('*')
        .order('name');
      if (error) throw error;
      setSubDistricts(data || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch sub-districts: ' + error.message,
      });
    }
  };

  const fetchPropertyTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('property_types')
        .select('*')
        .order('name');
      if (error) throw error;
      setPropertyTypes(data || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch property types: ' + error.message,
      });
    }
  };

  const fetchCarriers = async () => {
    try {
      const { data, error } = await supabase
        .from('carriers')
        .select('*')
        .order('name');
      if (error) throw error;
      setCarriers(data || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch carriers: ' + error.message,
      });
    }
  };

  const fetchCountries = async () => {
    try {
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .order('name');
      if (error) throw error;
      setCountries(data || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch countries: ' + error.message,
      });
    }
  };

  // District handlers
  const handleSaveDistrict = async () => {
    try {
      setLoading(true);
      if (districtForm.id) {
        const { error } = await supabase
          .from('districts')
          .update({ code: districtForm.code, name: districtForm.name, is_active: districtForm.is_active })
          .eq('id', districtForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('districts')
          .insert({ code: districtForm.code, name: districtForm.name, is_active: districtForm.is_active });
        if (error) throw error;
      }
      toast({ title: 'Success', description: 'District saved successfully' });
      setDistrictDialog(false);
      setDistrictForm({ id: '', code: '', name: '', is_active: true });
      fetchDistricts();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDistrictStatus = async (district: District) => {
    try {
      const { error } = await supabase
        .from('districts')
        .update({ is_active: !district.is_active })
        .eq('id', district.id);
      if (error) throw error;
      toast({ title: 'Success', description: 'District status updated' });
      fetchDistricts();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  // SubDistrict handlers
  const handleSaveSubDistrict = async () => {
    try {
      setLoading(true);
      if (subDistrictForm.id) {
        const { error } = await supabase
          .from('sub_districts')
          .update({ district_id: subDistrictForm.district_id, name: subDistrictForm.name, is_active: subDistrictForm.is_active })
          .eq('id', subDistrictForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('sub_districts')
          .insert({ district_id: subDistrictForm.district_id, name: subDistrictForm.name, is_active: subDistrictForm.is_active });
        if (error) throw error;
      }
      toast({ title: 'Success', description: 'Sub-district saved successfully' });
      setSubDistrictDialog(false);
      setSubDistrictForm({ id: '', district_id: '', name: '', is_active: true });
      fetchSubDistricts();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  // PropertyType handlers
  const handleSavePropertyType = async () => {
    try {
      setLoading(true);
      if (propertyTypeForm.id) {
        const { error } = await supabase
          .from('property_types')
          .update({ name: propertyTypeForm.name, category: propertyTypeForm.category, is_active: propertyTypeForm.is_active })
          .eq('id', propertyTypeForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('property_types')
          .insert({ name: propertyTypeForm.name, category: propertyTypeForm.category, is_active: propertyTypeForm.is_active });
        if (error) throw error;
      }
      toast({ title: 'Success', description: 'Property type saved successfully' });
      setPropertyTypeDialog(false);
      setPropertyTypeForm({ id: '', name: '', category: '', is_active: true });
      fetchPropertyTypes();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Carrier handlers
  const handleSaveCarrier = async () => {
    try {
      setLoading(true);
      if (carrierForm.id) {
        const { error } = await supabase
          .from('carriers')
          .update({ name: carrierForm.name, is_active: carrierForm.is_active })
          .eq('id', carrierForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('carriers')
          .insert({ name: carrierForm.name, is_active: carrierForm.is_active });
        if (error) throw error;
      }
      toast({ title: 'Success', description: 'Carrier saved successfully' });
      setCarrierDialog(false);
      setCarrierForm({ id: '', name: '', is_active: true });
      fetchCarriers();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Country handlers
  const handleSaveCountry = async () => {
    try {
      setLoading(true);
      if (countryForm.id) {
        const { error } = await supabase
          .from('countries')
          .update({ code: countryForm.code, name: countryForm.name })
          .eq('id', countryForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('countries')
          .insert({ code: countryForm.code, name: countryForm.name });
        if (error) throw error;
      }
      toast({ title: 'Success', description: 'Country saved successfully' });
      setCountryDialog(false);
      setCountryForm({ id: '', code: '', name: '' });
      fetchCountries();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Lookup Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage system lookup tables and reference data
        </p>
      </div>

      <Tabs defaultValue="districts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="districts">Districts</TabsTrigger>
          <TabsTrigger value="sub-districts">Sub-Districts</TabsTrigger>
          <TabsTrigger value="property-types">Property Types</TabsTrigger>
          <TabsTrigger value="carriers">Carriers</TabsTrigger>
          <TabsTrigger value="countries">Countries</TabsTrigger>
        </TabsList>

        {/* Districts Tab */}
        <TabsContent value="districts">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Districts</CardTitle>
                  <CardDescription>Manage district codes and names</CardDescription>
                </div>
                <Button size="sm" className="gap-2" onClick={() => {
                  setDistrictForm({ id: '', code: '', name: '', is_active: true });
                  setDistrictDialog(true);
                }}>
                  <Plus className="h-4 w-4" />
                  Add District
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {districts.map((district) => (
                    <TableRow key={district.id}>
                      <TableCell className="font-medium">{district.code}</TableCell>
                      <TableCell>{district.name}</TableCell>
                      <TableCell>
                        <Badge variant={district.is_active ? 'default' : 'secondary'}>
                          {district.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => {
                            setDistrictForm(district);
                            setDistrictDialog(true);
                          }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleToggleDistrictStatus(district)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sub-Districts Tab */}
        <TabsContent value="sub-districts">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Sub-Districts</CardTitle>
                  <CardDescription>Manage sub-district names within districts</CardDescription>
                </div>
                <Button size="sm" className="gap-2" onClick={() => {
                  setSubDistrictForm({ id: '', district_id: '', name: '', is_active: true });
                  setSubDistrictDialog(true);
                }}>
                  <Plus className="h-4 w-4" />
                  Add Sub-District
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>District</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subDistricts.map((subDistrict) => (
                    <TableRow key={subDistrict.id}>
                      <TableCell>
                        {districts.find((d) => d.id === subDistrict.district_id)?.name || 'Unknown'}
                      </TableCell>
                      <TableCell>{subDistrict.name}</TableCell>
                      <TableCell>
                        <Badge variant={subDistrict.is_active ? 'default' : 'secondary'}>
                          {subDistrict.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => {
                          setSubDistrictForm(subDistrict);
                          setSubDistrictDialog(true);
                        }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Property Types Tab */}
        <TabsContent value="property-types">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Property Types</CardTitle>
                  <CardDescription>Manage property categories and types</CardDescription>
                </div>
                <Button size="sm" className="gap-2" onClick={() => {
                  setPropertyTypeForm({ id: '', name: '', category: '', is_active: true });
                  setPropertyTypeDialog(true);
                }}>
                  <Plus className="h-4 w-4" />
                  Add Property Type
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {propertyTypes.map((propertyType) => (
                    <TableRow key={propertyType.id}>
                      <TableCell className="font-medium">{propertyType.name}</TableCell>
                      <TableCell>{propertyType.category}</TableCell>
                      <TableCell>
                        <Badge variant={propertyType.is_active ? 'default' : 'secondary'}>
                          {propertyType.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => {
                          setPropertyTypeForm(propertyType);
                          setPropertyTypeDialog(true);
                        }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Carriers Tab */}
        <TabsContent value="carriers">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Carriers</CardTitle>
                  <CardDescription>Manage mobile network carriers</CardDescription>
                </div>
                <Button size="sm" className="gap-2" onClick={() => {
                  setCarrierForm({ id: '', name: '', is_active: true });
                  setCarrierDialog(true);
                }}>
                  <Plus className="h-4 w-4" />
                  Add Carrier
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {carriers.map((carrier) => (
                    <TableRow key={carrier.id}>
                      <TableCell className="font-medium">{carrier.name}</TableCell>
                      <TableCell>
                        <Badge variant={carrier.is_active ? 'default' : 'secondary'}>
                          {carrier.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => {
                          setCarrierForm(carrier);
                          setCarrierDialog(true);
                        }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Countries Tab */}
        <TabsContent value="countries">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Countries</CardTitle>
                  <CardDescription>Manage country codes and names</CardDescription>
                </div>
                <Button size="sm" className="gap-2" onClick={() => {
                  setCountryForm({ id: '', code: '', name: '' });
                  setCountryDialog(true);
                }}>
                  <Plus className="h-4 w-4" />
                  Add Country
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {countries.map((country) => (
                    <TableRow key={country.id}>
                      <TableCell className="font-medium">{country.code}</TableCell>
                      <TableCell>{country.name}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => {
                          setCountryForm(country);
                          setCountryDialog(true);
                        }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* District Dialog */}
      <Dialog open={districtDialog} onOpenChange={setDistrictDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{districtForm.id ? 'Edit District' : 'Add District'}</DialogTitle>
            <DialogDescription>Enter district code and name</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input value={districtForm.code} onChange={(e) => setDistrictForm({ ...districtForm, code: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={districtForm.name} onChange={(e) => setDistrictForm({ ...districtForm, name: e.target.value })} />
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" checked={districtForm.is_active} onChange={(e) => setDistrictForm({ ...districtForm, is_active: e.target.checked })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDistrictDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveDistrict} disabled={loading}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SubDistrict Dialog */}
      <Dialog open={subDistrictDialog} onOpenChange={setSubDistrictDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{subDistrictForm.id ? 'Edit Sub-District' : 'Add Sub-District'}</DialogTitle>
            <DialogDescription>Select district and enter name</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>District *</Label>
              <Select value={subDistrictForm.district_id} onValueChange={(value) => setSubDistrictForm({ ...subDistrictForm, district_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select district" />
                </SelectTrigger>
                <SelectContent>
                  {districts.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={subDistrictForm.name} onChange={(e) => setSubDistrictForm({ ...subDistrictForm, name: e.target.value })} />
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" checked={subDistrictForm.is_active} onChange={(e) => setSubDistrictForm({ ...subDistrictForm, is_active: e.target.checked })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubDistrictDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveSubDistrict} disabled={loading}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PropertyType Dialog */}
      <Dialog open={propertyTypeDialog} onOpenChange={setPropertyTypeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{propertyTypeForm.id ? 'Edit Property Type' : 'Add Property Type'}</DialogTitle>
            <DialogDescription>Enter property type name and category</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={propertyTypeForm.name} onChange={(e) => setPropertyTypeForm({ ...propertyTypeForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Input value={propertyTypeForm.category} onChange={(e) => setPropertyTypeForm({ ...propertyTypeForm, category: e.target.value })} />
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" checked={propertyTypeForm.is_active} onChange={(e) => setPropertyTypeForm({ ...propertyTypeForm, is_active: e.target.checked })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPropertyTypeDialog(false)}>Cancel</Button>
            <Button onClick={handleSavePropertyType} disabled={loading}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Carrier Dialog */}
      <Dialog open={carrierDialog} onOpenChange={setCarrierDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{carrierForm.id ? 'Edit Carrier' : 'Add Carrier'}</DialogTitle>
            <DialogDescription>Enter carrier name</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={carrierForm.name} onChange={(e) => setCarrierForm({ ...carrierForm, name: e.target.value })} />
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" checked={carrierForm.is_active} onChange={(e) => setCarrierForm({ ...carrierForm, is_active: e.target.checked })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCarrierDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveCarrier} disabled={loading}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Country Dialog */}
      <Dialog open={countryDialog} onOpenChange={setCountryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{countryForm.id ? 'Edit Country' : 'Add Country'}</DialogTitle>
            <DialogDescription>Enter country code and name</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input value={countryForm.code} onChange={(e) => setCountryForm({ ...countryForm, code: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={countryForm.name} onChange={(e) => setCountryForm({ ...countryForm, name: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCountryDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveCountry} disabled={loading}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LookupManagement;
