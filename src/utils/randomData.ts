import { v4 as uuidv4 } from 'uuid';

/** Generates a plausible value for a "format"-annotated string schema. */
export function generateStringByFormat(format: string | undefined): string {
  switch (format) {
    case 'date':
      return new Date().toISOString().slice(0, 10);
    case 'date-time':
      return new Date().toISOString();
    case 'uuid':
      return uuidv4();
    case 'email':
      return 'test@example.com';
    case 'password':
      return 'P@ssw0rd123!';
    case 'uri':
    case 'url':
      return 'https://example.com';
    case 'hostname':
      return 'example.com';
    case 'ipv4':
      return '192.168.1.1';
    case 'ipv6':
      return '::1';
    case 'byte':
      return btoa('sample');
    default:
      return 'string';
  }
}

export function randomInt(min = 1, max = 1000): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function isEmail(name: string): boolean {
  return /email/i.test(name);
}

export function isDateLike(name: string): boolean {
  return /(date|_at$|At$)/i.test(name);
}
