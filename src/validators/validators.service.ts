import { Injectable } from '@nestjs/common';

@Injectable()
export class ValidatorsService {

  validateEnumeration<T extends string | number>( value: unknown, enumeration: Record<string, T> | readonly T[], fieldName = 'value' ): string | null {
    const allowedValues = Array.isArray(enumeration) ? [...enumeration] : Object.values(enumeration);

    if (value === null || value === undefined) {
      return `${fieldName} is required`;
    }

    const isValid = allowedValues.includes(value as T);
    return isValid ? null : `${fieldName} must be one of: ${allowedValues.join(', ')}`;
  }

  validateInputData<T extends Record<string, unknown>>( payload: unknown, requiredFields: (keyof T)[] = [], payloadName = 'payload' ): string | null {
    if (payload === null || payload === undefined) {
      return `${payloadName} is required`;
    }

    if (typeof payload !== 'object' || Array.isArray(payload)) {
      return `${payloadName} must be an object`;
    }

    const record = payload as Record<string, unknown>;
    for (const field of requiredFields) {
      const value = record[field as string];
      if (value === null || value === undefined || value === '') {
        return `${String(field)} is required`;
      }
    }

    return null;
  }

  validateEmail(value: unknown, fieldName = 'email'): string | null {
    if (value === null || value === undefined) {
      return `${fieldName} is required`;
    }

    if (typeof value !== 'string') {
      return `${fieldName} must be a string`;
    }

    if (value.trim() === '') {
      return `${fieldName} is required`;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(value) ? null : `${fieldName} must be a valid email`;
  }

  validatePhoneNumber(value: unknown, fieldName = 'phoneNumber'): string | null {
    if (value === null || value === undefined) {
      return `${fieldName} is required`;
    }

    if (typeof value !== 'string') {
      return `${fieldName} must be a string`;
    }

    if (value.trim() === '') {
      return `${fieldName} is required`;
    }

    const phonePattern = /^\+?[0-9\s\-()]{7,20}$/;
    return phonePattern.test(value) ? null : `${fieldName} must be a valid phone number`;
  }
}
