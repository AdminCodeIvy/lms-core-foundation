import { supabase } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export class LookupService {
  // Get all districts
  async getDistricts() {
    const { data, error } = await supabase
      .from('districts')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw new AppError(error.message, 500);
    return data;
  }

  // Get sub-districts by district ID
  async getSubDistricts(districtId?: string) {
    let query = supabase
      .from('sub_districts')
      .select('*')
      .order('id', { ascending: true });

    if (districtId) {
      query = query.eq('district_id', districtId);
    }

    const { data, error } = await query;

    if (error) throw new AppError(error.message, 500);
    return data;
  }

  // Get all property types
  async getPropertyTypes() {
    const { data, error } = await supabase
      .from('property_types')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw new AppError(error.message, 500);
    return data;
  }

  // Get all carriers
  async getCarriers() {
    const { data, error } = await supabase
      .from('carriers')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw new AppError(error.message, 500);
    return data;
  }

  // Get all countries
  async getCountries() {
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw new AppError(error.message, 500);
    return data;
  }

  // Admin: Create district
  async createDistrict(districtData: any) {
    const { data, error } = await supabase
      .from('districts')
      .insert(districtData)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);
    return data;
  }

  // Admin: Update district
  async updateDistrict(id: string, districtData: any) {
    const { data, error } = await supabase
      .from('districts')
      .update(districtData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);
    return data;
  }

  // Admin: Delete district
  async deleteDistrict(id: string) {
    const { error } = await supabase.from('districts').delete().eq('id', id);

    if (error) throw new AppError(error.message, 500);
  }

  // Admin: Create sub-district
  async createSubDistrict(subDistrictData: any) {
    const { data, error } = await supabase
      .from('sub_districts')
      .insert(subDistrictData)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);
    return data;
  }

  // Admin: Update sub-district
  async updateSubDistrict(id: string, subDistrictData: any) {
    const { data, error } = await supabase
      .from('sub_districts')
      .update(subDistrictData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);
    return data;
  }

  // Admin: Delete sub-district
  async deleteSubDistrict(id: string) {
    const { error } = await supabase.from('sub_districts').delete().eq('id', id);

    if (error) throw new AppError(error.message, 500);
  }

  // Admin: Create property type
  async createPropertyType(propertyTypeData: any) {
    const { data, error } = await supabase
      .from('property_types')
      .insert(propertyTypeData)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);
    return data;
  }

  // Admin: Update property type
  async updatePropertyType(id: string, propertyTypeData: any) {
    const { data, error } = await supabase
      .from('property_types')
      .update(propertyTypeData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);
    return data;
  }

  // Admin: Delete property type
  async deletePropertyType(id: string) {
    const { error } = await supabase.from('property_types').delete().eq('id', id);

    if (error) throw new AppError(error.message, 500);
  }

  // Admin: Create carrier
  async createCarrier(carrierData: any) {
    const { data, error } = await supabase
      .from('carriers')
      .insert(carrierData)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);
    return data;
  }

  // Admin: Update carrier
  async updateCarrier(id: string, carrierData: any) {
    const { data, error } = await supabase
      .from('carriers')
      .update(carrierData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);
    return data;
  }

  // Admin: Delete carrier
  async deleteCarrier(id: string) {
    const { error } = await supabase.from('carriers').delete().eq('id', id);

    if (error) throw new AppError(error.message, 500);
  }

  // Admin: Create country
  async createCountry(countryData: any) {
    const { data, error } = await supabase
      .from('countries')
      .insert(countryData)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);
    return data;
  }

  // Admin: Update country
  async updateCountry(id: string, countryData: any) {
    const { data, error } = await supabase
      .from('countries')
      .update(countryData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);
    return data;
  }

  // Admin: Delete country
  async deleteCountry(id: string) {
    const { error } = await supabase.from('countries').delete().eq('id', id);

    if (error) throw new AppError(error.message, 500);
  }
}
