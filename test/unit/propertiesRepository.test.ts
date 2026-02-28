import {
  createProperty,
  listPropertiesByOwner,
  getPropertyById,
  updateProperty,
  archiveProperty,
  type Property,
  type CreatePropertyPayload,
  type UpdatePropertyPayload,
} from '../../src/db/postgres/propertiesRepository';

// Mock the entire database client module to avoid certificate import issues
jest.mock('../../src/db/postgres/client', () => ({
  query: jest.fn(),
}));

import { query } from '../../src/db/postgres/client';

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('propertiesRepository', () => {
  const mockProperty: Property = {
    id: 'test-property-id',
    owner_manager_sub: 'test-manager-sub',
    name: 'Test Property',
    address_line1: '123 Test St',
    address_line2: 'Apt 4',
    suburb: 'Testville',
    state: 'TS',
    postcode: '12345',
    country: 'AU',
    timezone: 'Australia/Sydney',
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createProperty', () => {
    it('should create a property successfully', async () => {
      const payload: CreatePropertyPayload = {
        name: 'Test Property',
        address_line1: '123 Test St',
        suburb: 'Testville',
        state: 'TS',
        postcode: '12345',
        country: 'AU',
      };

      mockQuery.mockResolvedValue([mockProperty]);

      const result = await createProperty('test-manager-sub', payload);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO properties'),
        expect.arrayContaining([
          expect.any(String), // id (UUID)
          'test-manager-sub',
          payload.name,
          payload.address_line1,
          null, // address_line2
          payload.suburb,
          payload.state,
          payload.postcode,
          payload.country,
          null, // timezone
        ])
      );
      expect(result).toEqual(mockProperty);
    });

    it('should throw error if creation fails', async () => {
      const payload: CreatePropertyPayload = {
        name: 'Test Property',
        address_line1: '123 Test St',
        suburb: 'Testville',
        state: 'TS',
        postcode: '12345',
        country: 'AU',
      };

      mockQuery.mockResolvedValue([]);

      await expect(createProperty('test-manager-sub', payload)).rejects.toThrow(
        'Failed to create property'
      );
    });
  });

  describe('listPropertiesByOwner', () => {
    it('should list active properties for owner', async () => {
      mockQuery.mockResolvedValue([mockProperty]);

      const result = await listPropertiesByOwner('test-manager-sub');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE owner_manager_sub = $1 AND archived_at IS NULL'),
        ['test-manager-sub']
      );
      expect(result).toEqual([mockProperty]);
    });

    it('should include archived properties when requested', async () => {
      mockQuery.mockResolvedValue([mockProperty]);

      const result = await listPropertiesByOwner('test-manager-sub', {
        includeArchived: true,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE owner_manager_sub = $1'),
        ['test-manager-sub']
      );
      expect(result).toEqual([mockProperty]);
    });
  });

  describe('getPropertyById', () => {
    it('should return property when found', async () => {
      mockQuery.mockResolvedValue([mockProperty]);

      const result = await getPropertyById('test-property-id');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM properties WHERE id = $1',
        ['test-property-id']
      );
      expect(result).toEqual(mockProperty);
    });

    it('should return null when property not found', async () => {
      mockQuery.mockResolvedValue([]);

      const result = await getPropertyById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('updateProperty', () => {
    it('should update property with provided fields', async () => {
      const patch: UpdatePropertyPayload = {
        name: 'Updated Property',
        suburb: 'New Suburb',
      };

      mockQuery.mockResolvedValue([mockProperty]);

      const result = await updateProperty(
        'test-property-id',
        'test-manager-sub',
        patch
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE properties'),
        expect.arrayContaining([
          'Updated Property',
          'New Suburb',
          'test-property-id',
          'test-manager-sub',
        ])
      );
      expect(result).toEqual(mockProperty);
    });

    it('should throw error when no fields provided', async () => {
      await expect(
        updateProperty('test-property-id', 'test-manager-sub', {})
      ).rejects.toThrow('No fields to update');
    });

    it('should throw error when property not found or not owned', async () => {
      const patch: UpdatePropertyPayload = { name: 'Updated Property' };

      mockQuery.mockResolvedValue([]);

      await expect(
        updateProperty('test-property-id', 'test-manager-sub', patch)
      ).rejects.toThrow(
        'Property not found, not owned by specified manager, or already archived'
      );
    });
  });

  describe('archiveProperty', () => {
    it('should archive property successfully', async () => {
      mockQuery.mockResolvedValue([mockProperty]);

      const result = await archiveProperty(
        'test-property-id',
        'test-manager-sub'
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE properties'),
        ['test-property-id', 'test-manager-sub']
      );
      expect(result).toEqual(mockProperty);
    });

    it('should throw error when property not found or not owned', async () => {
      mockQuery.mockResolvedValue([]);

      await expect(
        archiveProperty('test-property-id', 'test-manager-sub')
      ).rejects.toThrow(
        'Property not found, not owned by specified manager, or already archived'
      );
    });
  });
});
