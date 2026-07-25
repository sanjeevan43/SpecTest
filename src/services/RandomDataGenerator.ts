export class RandomDataGenerator {
  private seed: string;
  private state: number;

  constructor(seed: string = 'antigravity') {
    this.seed = seed;
    this.state = this.hashSeed(seed);
  }

  private hashSeed(seed: string): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return hash || 123456789;
  }

  /**
   * Generates a pseudo-random float between 0 and 1.
   */
  public next(): number {
    const x = Math.sin(this.state++) * 10000;
    return x - Math.floor(x);
  }

  /**
   * Generates a pseudo-random integer in [min, max] range.
   */
  public nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Generates a random alphanumeric string of target length.
   */
  public nextString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(this.next() * chars.length));
    }
    return result;
  }

  public nextEmail(): string {
    return `${this.nextString(8).toLowerCase()}@example.com`;
  }

  public nextUuid(): string {
    const hex = '0123456789abcdef';
    let uuid = '';
    for (let i = 0; i < 36; i++) {
      if (i === 8 || i === 13 || i === 18 || i === 23) {
        uuid += '-';
      } else if (i === 14) {
        uuid += '4';
      } else {
        uuid += hex.charAt(Math.floor(this.next() * hex.length));
      }
    }
    return uuid;
  }

  public nextDate(): string {
    // Generate date within last 1 year
    const yearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
    const randMs = this.nextInt(yearAgo, Date.now());
    return new Date(randMs).toISOString().split('T')[0];
  }

  public nextDateTime(): string {
    const yearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
    const randMs = this.nextInt(yearAgo, Date.now());
    return new Date(randMs).toISOString();
  }

  public pick<T>(arr: T[]): T {
    const idx = this.nextInt(0, arr.length - 1);
    return arr[idx];
  }
}
