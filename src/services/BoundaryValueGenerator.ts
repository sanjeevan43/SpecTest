export class BoundaryValueGenerator {
  /**
   * Returns a set of boundary string test variants.
   */
  public static getBoundaryStrings(maxLength: number = 128): Record<string, string> {
    return {
      empty: '',
      singleChar: 'a',
      unicode: '𐍈 𐎀 𐤀 𐦀',
      emoji: '🌟🔥💻⚡✨',
      sqlInjection: "' OR '1'='1",
      xss: '<script>alert("xss")</script>',
      whitespaceOnly: '     ',
      maxLen: 'a'.repeat(maxLength),
      overMaxLen: 'a'.repeat(maxLength + 20),
    };
  }

  /**
   * Returns a set of boundary numeric test variants.
   */
  public static getBoundaryNumbers(): Record<string, number> {
    return {
      zero: 0,
      one: 1,
      negativeOne: -1,
      float: 1.25,
      largeInt: 2147483647,
      negativeLargeInt: -2147483648,
    };
  }

  /**
   * Returns boundary array variants.
   */
  public static getBoundaryArrays(sampleItem: unknown, maxArraySize: number = 10): Record<string, unknown[] | null> {
    return {
      emptyArray: [],
      singleItemArray: [sampleItem],
      largeArray: Array.from({ length: maxArraySize }, () => sampleItem),
    };
  }

  /**
   * Returns boundary object variants.
   */
  public static getBoundaryObjects(): Record<string, Record<string, unknown>> {
    return {
      emptyObject: {},
      unknownFieldsObject: {
        __additional_unknown_field_1__: 'value',
        __additional_unknown_field_2__: 12345,
      },
    };
  }
}
