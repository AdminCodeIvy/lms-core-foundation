/**
 * Property Bulk Upload Handler
 */

import { supabase } from '../../../config/database';
import { getValue, isEmpty, isValidUUID, cleanUUID } from '../utils';
import { PropertyData } from '../types';

export class PropertyHandler {
  /**
   * Validate property fields
   */
  static validate(record: any, errors: string[]): void {
    // REQUIRED FIELDS
    
    // District ID (required)
    const districtId = getValue(record, 'district_id', 'District ID', 'District');
    if (isEmpty(districtId)) {
      errors.push('District ID is required for properties');
    }

    // Size (required)
    const size = getValue(record, 'size', 'Size');
    if (isEmpty(size)) {
      errors.push('Size is required for properties');
    }

    // OPTIONAL FIELDS - Validate format if provided
    
    // Property Type ID (optional)
    const propertyTypeId = getValue(record, 'property_type_id', 'Property Type ID');
    if (!isEmpty(propertyTypeId) && !isValidUUID(propertyTypeId)) {
      errors.push('Property Type ID must be a valid UUID if provided');
    }

    // Sub District ID (optional)
    const subDistrictId = getValue(record, 'sub_district_id', 'Sub District ID');
    if (!isEmpty(subDistrictId) && !isValidUUID(subDistrictId)) {
      errors.push('Sub District ID must be a valid UUID if provided');
    }

    // Validate boundary data if provided (all or nothing)
    const boundaryFields = ['north_length', 'south_length', 'east_length', 'west_length'];
    const providedBoundaryFields = boundaryFields.filter(field => !isEmpty(getValue(record, field)));
    
    if (providedBoundaryFields.length > 0 && providedBoundaryFields.length < 4) {
      errors.push('If boundary data is provided, all four sides (north, south, east, west) must be specified');
    }

    // Validate coordinates if provided
    const latitude = getValue(record, 'latitude', 'Latitude');
    const longitude = getValue(record, 'longitude', 'Longitude');
    
    if (!isEmpty(latitude) && isEmpty(longitude)) {
      errors.push('If latitude is provided, longitude must also be provided');
    }
    
    if (!isEmpty(longitude) && isEmpty(latitude)) {
      errors.push('If longitude is provided, latitude must also be provided');
    }

    if (!isEmpty(latitude) && (isNaN(Number(latitude)) || Number(latitude) < -90 || Number(latitude) > 90)) {
      errors.push('Latitude must be a valid number between -90 and 90');
    }

    if (!isEmpty(longitude) && (isNaN(Number(longitude)) || Number(longitude) < -180 || Number(longitude) > 180)) {
      errors.push('Longitude must be a valid number between -180 and 180');
    }
  }

  /**
   * Create property in database
   */
  static async create(data: any, userId: string): Promise<any> {
    // Look up customer by reference ID if provided (optional for draft)
    let customerId = null;
    const customerReferenceId = getValue(data, 'customer_reference_id', 'Customer Reference ID');
    
    if (customerReferenceId && !String(customerReferenceId).includes('optional')) {
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('reference_id', customerReferenceId)
        .single();

      if (customerError || !customer) {
        console.warn(`Customer with reference ID ${customerReferenceId} not found - creating property without customer`);
        // Don't throw error - customer is optional for draft
      } else {
        customerId = customer.id;
      }
    }

    // Generate reference ID and parcel number
    const { count } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true });

    const nextNumber = (count || 0) + 1;
    const referenceId = `PROP-2025-${String(nextNumber).padStart(5, '0')}`;
    const parcelNumber = `PARCEL-2025-${String(nextNumber).padStart(5, '0')}`;

    // Separate boundary data from property data
    const boundaryData = {
      north_length: getValue(data, 'north_length', 'North Length'),
      north_adjacent_type: getValue(data, 'north_type', 'north_adjacent_type', 'North Type'),
      south_length: getValue(data, 'south_length', 'South Length'),
      south_adjacent_type: getValue(data, 'south_type', 'south_adjacent_type', 'South Type'),
      east_length: getValue(data, 'east_length', 'East Length'),
      east_adjacent_type: getValue(data, 'east_type', 'east_adjacent_type', 'East Type'),
      west_length: getValue(data, 'west_length', 'West Length'),
      west_adjacent_type: getValue(data, 'west_type', 'west_adjacent_type', 'West Type'),
    };

    // Prepare property data - remove fields that don't belong in properties table
    const propertyData = { ...data };
    delete propertyData.customer_reference_id;
    delete propertyData.north_length;
    delete propertyData.north_type;
    delete propertyData.north_adjacent_type;
    delete propertyData.south_length;
    delete propertyData.south_type;
    delete propertyData.south_adjacent_type;
    delete propertyData.east_length;
    delete propertyData.east_type;
    delete propertyData.east_adjacent_type;
    delete propertyData.west_length;
    delete propertyData.west_type;
    delete propertyData.west_adjacent_type;
    
    // Clean UUID fields - convert placeholders to null
    propertyData.district_id = cleanUUID(propertyData.district_id);
    propertyData.sub_district_id = cleanUUID(propertyData.sub_district_id);
    propertyData.property_type_id = cleanUUID(propertyData.property_type_id);
    
    // Validate required district_id
    if (!propertyData.district_id) {
      throw new Error('district_id is required and must be a valid UUID');
    }
    
    // Combine coordinates if latitude and longitude are provided
    const latitude = getValue(data, 'latitude', 'Latitude');
    const longitude = getValue(data, 'longitude', 'Longitude');
    
    if (latitude && longitude) {
      propertyData.coordinates = `POINT(${longitude} ${latitude})`;
      delete propertyData.latitude;
      delete propertyData.longitude;
    }

    // Insert property
    const { data: property, error } = await supabase
      .from('properties')
      .insert({
        ...propertyData,
        reference_id: referenceId,
        parcel_number: parcelNumber,
        status: 'DRAFT',
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Create property ownership if customer was provided
    if (customerId) {
      const { error: ownershipError } = await supabase
        .from('property_ownership')
        .insert({
          property_id: property.id,
          customer_id: customerId,
          ownership_type: 'OWNER',
          ownership_percentage: 100,
          start_date: new Date().toISOString().split('T')[0],
          is_current: true,
        });

      if (ownershipError) {
        console.error('Failed to create ownership:', ownershipError.message);
        // Don't fail the whole operation for ownership issues
      }
    }

    // Create boundary data if provided
    const hasBoundaryData = Object.values(boundaryData).some(value => !isEmpty(value));
    if (hasBoundaryData) {
      const { error: boundaryError } = await supabase
        .from('property_boundaries')
        .insert({
          property_id: property.id,
          ...boundaryData,
        });

      if (boundaryError) {
        console.error('Failed to create boundary data:', boundaryError.message);
        // Don't fail the whole operation for boundary issues
      }
    }

    return property;
  }

  /**
   * Get template data for properties
   */
  static getTemplate(): { headers: string[]; example: Record<string, any> } {
    return {
      headers: [
        'property_type_id',
        'district_id',
        'sub_district_id',
        'property_location',
        'size',
        'is_building',
        'number_of_floors',
        'door_number',
        'road_name',
      ],
      example: {
        property_type_id: 'uuid-here',
        district_id: 'uuid-here',
        sub_district_id: 'uuid-here',
        property_location: '123 Main Street',
        size: 250,
        is_building: true,
        number_of_floors: 2,
        door_number: '123',
        road_name: 'Main Street',
      },
    };
  }
}