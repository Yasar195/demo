import { Test, TestingModule } from '@nestjs/testing';
import { ValidatorsService } from './validators.service';

describe('ValidatorsService', () => {
  let service: ValidatorsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ValidatorsService],
    }).compile();

    service = module.get<ValidatorsService>(ValidatorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateEnumeration', () => {
    enum RoleEnum {
      Admin = 'ADMIN',
      User = 'USER',
    }

    it('returns null when value is in an array', () => {
      const result = service.validateEnumeration('apple', ['apple', 'banana']);
      expect(result).toBeNull();
    });

    it('returns an error message when value is missing', () => {
      const result = service.validateEnumeration(undefined, ['apple', 'banana']);
      expect(result).toBe('value is required');
    });

    it('returns an error message when value is not allowed (array)', () => {
      const result = service.validateEnumeration('orange', ['apple', 'banana']);
      expect(result).toBe('value must be one of: apple, banana');
    });

    it('supports enums and uses custom field name in the error message', () => {
      const result = service.validateEnumeration('GUEST', RoleEnum, 'role');
      expect(result).toBe('role must be one of: ADMIN, USER');
    });

    it('returns null for valid enum value', () => {
      const result = service.validateEnumeration(RoleEnum.Admin, RoleEnum, 'role');
      expect(result).toBeNull();
    });
  });

  describe('validateInputData', () => {
    it('returns error when payload is missing', () => {
      const result = service.validateInputData(null);
      expect(result).toBe('payload is required');
    });

    it('returns error when payload is not an object', () => {
      const result = service.validateInputData('not-an-object');
      expect(result).toBe('payload must be an object');
    });

    it('returns error when payload is an array', () => {
      const result = service.validateInputData([]);
      expect(result).toBe('payload must be an object');
    });

    it('returns error when a required field is missing', () => {
      const result = service.validateInputData<{ name: string }>({}, ['name']);
      expect(result).toBe('name is required');
    });

    it('returns error when a required field is empty', () => {
      const result = service.validateInputData<{ name: string }>({ name: '' }, ['name']);
      expect(result).toBe('name is required');
    });

    it('returns null when payload satisfies requirements', () => {
      const result = service.validateInputData<{ name: string; age: number }>(
        { name: 'Alice', age: 30 },
        ['name', 'age'],
      );
      expect(result).toBeNull();
    });

    it('uses custom payload name in messages', () => {
      const result = service.validateInputData(null, [], 'body');
      expect(result).toBe('body is required');
    });
  });

  describe('validateEmail', () => {
    it('returns error when email is missing', () => {
      const result = service.validateEmail(null);
      expect(result).toBe('email is required');
    });

    it('returns error when email is not a string', () => {
      const result = service.validateEmail(123);
      expect(result).toBe('email must be a string');
    });

    it('returns error when email is empty', () => {
      const result = service.validateEmail('   ');
      expect(result).toBe('email is required');
    });

    it('returns error for invalid email format', () => {
      const result = service.validateEmail('invalid-email');
      expect(result).toBe('email must be a valid email');
    });

    it('returns null for valid email', () => {
      const result = service.validateEmail('user@example.com');
      expect(result).toBeNull();
    });

    it('uses custom field name in messages', () => {
      const result = service.validateEmail(null, 'contactEmail');
      expect(result).toBe('contactEmail is required');
    });
  });

  describe('validatePhoneNumber', () => {
    it('returns error when phone number is missing', () => {
      const result = service.validatePhoneNumber(null);
      expect(result).toBe('phoneNumber is required');
    });

    it('returns error when phone number is not a string', () => {
      const result = service.validatePhoneNumber(9876543210);
      expect(result).toBe('phoneNumber must be a string');
    });

    it('returns error when phone number is empty', () => {
      const result = service.validatePhoneNumber('   ');
      expect(result).toBe('phoneNumber is required');
    });

    it('returns error for invalid phone number format', () => {
      const result = service.validatePhoneNumber('abc123');
      expect(result).toBe('phoneNumber must be a valid phone number');
    });

    it('returns null for valid phone number', () => {
      const result = service.validatePhoneNumber('+1 234-567-8901');
      expect(result).toBeNull();
    });

    it('uses custom field name in messages', () => {
      const result = service.validatePhoneNumber(null, 'contactNumber');
      expect(result).toBe('contactNumber is required');
    });
  });
});
