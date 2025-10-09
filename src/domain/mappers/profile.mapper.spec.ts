import { ProfileMapper } from './profile.mapper';
import { ProfileFactory } from '../../../test/factories/profile.factory';

describe('ProfileMapper', () => {
  describe('fromHairProfile', () => {
    it('should map all fields correctly', () => {
      // Arrange
      const haircareDto = ProfileFactory.createHaircareProfileDto();

      // Act
      const result = ProfileMapper.fromHairProfile(haircareDto);

      // Assert
      expect(result.primaryAttribute).toBe(haircareDto.hairColor);
      expect(result.concerns).toEqual(haircareDto.hairConcerns);
      expect(result.services).toEqual(haircareDto.services);
      expect(result.currentRoutine).toEqual(haircareDto.homeRoutine);
      expect(result.usagePatterns).toEqual(haircareDto.stylingRoutine);
      expect(result.serviceFrequency).toBe(haircareDto.salonFrequency);
      expect(result.recentChange).toBe(haircareDto.recentChange);
      expect(result.restrictions).toEqual(haircareDto.allergies);
      expect(result.additionalInfo).toBe(haircareDto.extraInfo);
    });

    it('should handle optional fields', () => {
      // Arrange
      const haircareDto = ProfileFactory.createHaircareProfileDto({
        allergies: undefined,
        extraInfo: undefined,
      });

      // Act
      const result = ProfileMapper.fromHairProfile(haircareDto);

      // Assert
      expect(result.restrictions).toBeUndefined();
      expect(result.additionalInfo).toBeUndefined();
    });

    it('should add custom attributes with original type', () => {
      // Arrange
      const haircareDto = ProfileFactory.createHaircareProfileDto();

      // Act
      const result = ProfileMapper.fromHairProfile(haircareDto);

      // Assert
      expect(result.customAttributes).toBeDefined();
      expect(result.customAttributes?.originalType).toBe('HaircareProfileDto');
    });

    it('should preserve empty arrays', () => {
      // Arrange
      const haircareDto = ProfileFactory.createHaircareProfileDto({
        services: [],
        homeRoutine: [],
        stylingRoutine: [],
      });

      // Act
      const result = ProfileMapper.fromHairProfile(haircareDto);

      // Assert
      expect(result.services).toEqual([]);
      expect(result.currentRoutine).toEqual([]);
      expect(result.usagePatterns).toEqual([]);
    });
  });

  describe('toHairProfile', () => {
    it('should reverse map all fields correctly', () => {
      // Arrange
      const customerProfile = ProfileFactory.createHaircareProfile();

      // Act
      const result = ProfileMapper.toHairProfile(customerProfile);

      // Assert
      expect(result.hairColor).toBe(customerProfile.primaryAttribute);
      expect(result.hairConcerns).toEqual(customerProfile.concerns);
      expect(result.services).toEqual(customerProfile.services);
      expect(result.homeRoutine).toEqual(customerProfile.currentRoutine);
      expect(result.stylingRoutine).toEqual(customerProfile.usagePatterns);
      expect(result.salonFrequency).toBe(customerProfile.serviceFrequency);
      expect(result.recentChange).toBe(customerProfile.recentChange);
      expect(result.allergies).toEqual(customerProfile.restrictions);
      expect(result.extraInfo).toBe(customerProfile.additionalInfo);
    });

    it('should use empty string for missing primaryAttribute', () => {
      // Arrange
      const customerProfile = ProfileFactory.createHaircareProfile({
        primaryAttribute: undefined,
      });

      // Act
      const result = ProfileMapper.toHairProfile(customerProfile);

      // Assert
      expect(result.hairColor).toBe('');
    });

    it('should use false for missing recentChange', () => {
      // Arrange
      const customerProfile = ProfileFactory.createHaircareProfile({
        recentChange: undefined,
      });

      // Act
      const result = ProfileMapper.toHairProfile(customerProfile);

      // Assert
      expect(result.recentChange).toBe(false);
    });

    it('should preserve undefined optional fields', () => {
      // Arrange
      const customerProfile = ProfileFactory.createHaircareProfile({
        restrictions: undefined,
        additionalInfo: undefined,
      });

      // Act
      const result = ProfileMapper.toHairProfile(customerProfile);

      // Assert
      expect(result.allergies).toBeUndefined();
      expect(result.extraInfo).toBeUndefined();
    });
  });

  describe('round-trip mapping', () => {
    it('should preserve data through forward and reverse mapping', () => {
      // Arrange
      const original = ProfileFactory.createHaircareProfileDto();

      // Act
      const customerProfile = ProfileMapper.fromHairProfile(original);
      const backToDto = ProfileMapper.toHairProfile(customerProfile);

      // Assert
      expect(backToDto).toMatchObject({
        hairColor: original.hairColor,
        hairConcerns: original.hairConcerns,
        services: original.services,
        homeRoutine: original.homeRoutine,
        stylingRoutine: original.stylingRoutine,
        salonFrequency: original.salonFrequency,
        recentChange: original.recentChange,
        allergies: original.allergies,
        extraInfo: original.extraInfo,
      });
    });
  });
});
