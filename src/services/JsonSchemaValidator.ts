import type { ApiSchema, ParsedApiDocument } from '../types';
import type { ValidationError } from '../models/ValidationError';
import { TypeChecker } from '../utils/TypeChecker';
import { SchemaResolver } from '../utils/SchemaResolver';

export class JsonSchemaValidator {
  /**
   * Validates value against schema, appending errors/warnings to arrays.
   */
  public static validate(
    value: unknown,
    schema: ApiSchema,
    document: ParsedApiDocument,
    path: string,
    errors: ValidationError[],
    warnings: ValidationError[],
    settings: {
      ignoreOptionalFields: boolean;
      ignoreAdditionalProperties: boolean;
      strictMode: boolean;
    },
    depth: number = 0
  ): void {
    if (depth > 25) {
      // Prevent stack overflow on circular structures
      return;
    }

    if (!schema) return;

    // Resolve ref if any
    const resolvedSchema = SchemaResolver.resolve(schema, document);

    const nullable = resolvedSchema.nullable || false;
    
    // Check Nullable
    if (value === null || value === undefined) {
      if (!nullable) {
        errors.push({
          path,
          errorType: 'type_mismatch',
          expected: resolvedSchema.type || 'any',
          actual: 'null',
          message: `Property at ${path} is null or missing, but schema does not mark it as nullable.`,
          suggestion: 'Ensure the API returns a default value or mark the schema field as nullable: true.',
        });
      }
      return;
    }

    // Type checking
    if (resolvedSchema.type) {
      const typeMatches = TypeChecker.check(value, resolvedSchema.type, nullable);
      if (!typeMatches) {
        errors.push({
          path,
          errorType: 'type_mismatch',
          expected: resolvedSchema.type,
          actual: TypeChecker.getFriendlyType(value),
          message: `Type mismatch at path "${path}": expected type ${resolvedSchema.type}, but received ${TypeChecker.getFriendlyType(value)}.`,
          suggestion: `Ensure the database/payload maps values correctly to type ${resolvedSchema.type}.`,
        });
        return; // Skip further checks if type is completely mismatched
      }
    }

    // Check Enums
    if (resolvedSchema.enum && Array.isArray(resolvedSchema.enum)) {
      if (!resolvedSchema.enum.includes(value)) {
        errors.push({
          path,
          errorType: 'enum_violation',
          expected: `One of [${resolvedSchema.enum.join(', ')}]`,
          actual: String(value),
          message: `Value "${value}" at path "${path}" is not in the list of allowed enum values.`,
          suggestion: `Update the backend to return one of the declared enums: [${resolvedSchema.enum.join(', ')}].`,
        });
      }
    }

    // String format/pattern/length validations
    if (typeof value === 'string' && resolvedSchema.type === 'string') {
      this.validateString(value, resolvedSchema, path, errors);
    }

    // Number limits validations
    if (typeof value === 'number' && (resolvedSchema.type === 'number' || resolvedSchema.type === 'integer')) {
      this.validateNumber(value, resolvedSchema, path, errors);
    }

    // Array validations
    if (Array.isArray(value) && resolvedSchema.type === 'array') {
      this.validateArray(value, resolvedSchema, document, path, errors, warnings, settings, depth);
    }

    // Object properties validations
    if (typeof value === 'object' && value !== null && !Array.isArray(value) && resolvedSchema.type === 'object') {
      this.validateObject(value as Record<string, unknown>, resolvedSchema, document, path, errors, warnings, settings, depth);
    }

    // Combinators support
    this.validateCombinators(value, resolvedSchema, document, path, errors, warnings, settings, depth);
  }

  private static validateString(
    value: string,
    schema: ApiSchema,
    path: string,
    errors: ValidationError[]
  ): void {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push({
        path,
        errorType: 'value_out_of_bounds',
        expected: `Length >= ${schema.minLength}`,
        actual: `Length = ${value.length}`,
        message: `String length violation at path "${path}": minLength is ${schema.minLength}, but got length ${value.length}.`,
        suggestion: `Ensure input string values satisfy the minimum character count of ${schema.minLength}.`,
      });
    }

    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push({
        path,
        errorType: 'value_out_of_bounds',
        expected: `Length <= ${schema.maxLength}`,
        actual: `Length = ${value.length}`,
        message: `String length violation at path "${path}": maxLength is ${schema.maxLength}, but got length ${value.length}.`,
        suggestion: `Validate inputs at the server level to truncate or reject strings longer than ${schema.maxLength} characters.`,
      });
    }

    if (schema.pattern) {
      try {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(value)) {
          errors.push({
            path,
            errorType: 'format_violation',
            expected: `Regex pattern ${schema.pattern}`,
            actual: value,
            message: `Pattern mismatch at path "${path}": value "${value}" does not match regex pattern /${schema.pattern}/.`,
            suggestion: 'Fix string generation patterns to conform to the specified regex rules.',
          });
        }
      } catch {}
    }

    if (schema.format) {
      this.validateFormat(value, schema.format, path, errors);
    }
  }

  private static validateFormat(
    value: string,
    format: string,
    path: string,
    errors: ValidationError[]
  ): void {
    let isValid = true;
    let desc = '';

    if (format === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      isValid = emailRegex.test(value);
      desc = 'valid email address format';
    } else if (format === 'uuid') {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      isValid = uuidRegex.test(value);
      desc = 'valid RFC4122 UUID format';
    } else if (format === 'date') {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      isValid = dateRegex.test(value) && !isNaN(Date.parse(value));
      desc = 'valid date format (YYYY-MM-DD)';
    } else if (format === 'date-time') {
      isValid = !isNaN(Date.parse(value));
      desc = 'valid ISO 8601 date-time format';
    } else if (format === 'uri') {
      try {
        new URL(value);
        isValid = true;
      } catch {
        isValid = false;
      }
      desc = 'valid absolute URI link';
    }

    if (!isValid) {
      errors.push({
        path,
        errorType: 'format_violation',
        expected: desc,
        actual: value,
        message: `Format mismatch at path "${path}": expected ${desc}, but got "${value}".`,
        suggestion: `Verify that database entries or model generators correctly output format matching standard "${format}".`,
      });
    }
  }

  private static validateNumber(
    value: number,
    schema: ApiSchema,
    path: string,
    errors: ValidationError[]
  ): void {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push({
        path,
        errorType: 'value_out_of_bounds',
        expected: `>= ${schema.minimum}`,
        actual: String(value),
        message: `Value boundary violation at path "${path}": minimum is ${schema.minimum}, but got value ${value}.`,
        suggestion: `Ensure returned numeric values satisfy the minimum threshold constraint of ${schema.minimum}.`,
      });
    }

    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push({
        path,
        errorType: 'value_out_of_bounds',
        expected: `<= ${schema.maximum}`,
        actual: String(value),
        message: `Value boundary violation at path "${path}": maximum is ${schema.maximum}, but got value ${value}.`,
        suggestion: `Ensure returned numeric values do not exceed the maximum threshold constraint of ${schema.maximum}.`,
      });
    }
  }

  private static validateArray(
    value: unknown[],
    schema: ApiSchema,
    document: ParsedApiDocument,
    path: string,
    errors: ValidationError[],
    warnings: ValidationError[],
    settings: any,
    depth: number
  ): void {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push({
        path,
        errorType: 'value_out_of_bounds',
        expected: `Array size >= ${schema.minItems}`,
        actual: `Size = ${value.length}`,
        message: `Array items count violation at path "${path}": minItems is ${schema.minItems}, but got size ${value.length}.`,
        suggestion: `Ensure the list is pre-filled with at least ${schema.minItems} elements.`,
      });
    }

    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push({
        path,
        errorType: 'value_out_of_bounds',
        expected: `Array size <= ${schema.maxItems}`,
        actual: `Size = ${value.length}`,
        message: `Array items count violation at path "${path}": maxItems is ${schema.maxItems}, but got size ${value.length}.`,
        suggestion: `Add pagination limits or validation controls on size limit of ${schema.maxItems}.`,
      });
    }

    if (schema.uniqueItems) {
      const stringified = value.map((item) => JSON.stringify(item));
      const hasDuplicates = new Set(stringified).size !== stringified.length;
      if (hasDuplicates) {
        errors.push({
          path,
          errorType: 'value_out_of_bounds',
          expected: 'Unique array items',
          actual: 'Array contains duplicate elements',
          message: `Array unique items constraint violated at path "${path}".`,
          suggestion: 'Ensure that no duplicate objects or values are appended to this collection.',
        });
      }
    }

    if (schema.items) {
      value.forEach((item, index) => {
        this.validate(
          item,
          schema.items!,
          document,
          `${path}[${index}]`,
          errors,
          warnings,
          settings,
          depth + 1
        );
      });
    }
  }

  private static validateObject(
    value: Record<string, unknown>,
    schema: ApiSchema,
    document: ParsedApiDocument,
    path: string,
    errors: ValidationError[],
    warnings: ValidationError[],
    settings: any,
    depth: number
  ): void {
    const properties = schema.properties || {};
    const required = schema.required || [];

    // Check required properties (skip if ignoreOptionalFields is true and strict is false)
    if (!settings.ignoreOptionalFields) {
      required.forEach((reqProp) => {
        if (value[reqProp] === undefined) {
          errors.push({
            path: `${path}.${reqProp}`,
            errorType: 'missing_property',
            expected: 'Property present',
            actual: 'missing',
            message: `Required property "${reqProp}" is missing at object path "${path}".`,
            suggestion: `Ensure the database record maps all fields or verify serializer configurations in the controller.`,
          });
        }
      });
    }

    // Validate declared properties
    for (const key of Object.keys(value)) {
      if (properties[key] !== undefined) {
        this.validate(
          value[key],
          properties[key],
          document,
          `${path}.${key}`,
          errors,
          warnings,
          settings,
          depth + 1
        );
      } else {
        // Additional properties check
        if (!settings.ignoreAdditionalProperties) {
          const err: ValidationError = {
            path: `${path}.${key}`,
            errorType: 'unexpected_property',
            expected: 'Declared property in spec schema',
            actual: typeof value[key],
            message: `Unexpected property "${key}" returned at object path "${path}" that is not documented in schema specifications.`,
            suggestion: 'Add the property to the OpenAPI documentation or filter it out of the JSON response serialization.',
          };
          if (settings.strictMode) {
            errors.push(err);
          } else {
            warnings.push({ ...err, isWarning: true });
          }
        }
      }
    }
  }

  private static validateCombinators(
    value: unknown,
    schema: any,
    document: ParsedApiDocument,
    path: string,
    errors: ValidationError[],
    warnings: ValidationError[],
    settings: any,
    depth: number
  ): void {
    // oneOf validation
    if (schema.oneOf && Array.isArray(schema.oneOf)) {
      let matchCount = 0;
      schema.oneOf.forEach((subSchema: any) => {
        const subErrors: ValidationError[] = [];
        this.validate(value, subSchema, document, path, subErrors, [], settings, depth + 1);
        if (subErrors.length === 0) {
          matchCount++;
        }
      });

      if (matchCount !== 1) {
        errors.push({
          path,
          errorType: 'type_mismatch',
          expected: 'Matches exactly one of the oneOf schema declarations',
          actual: `Matched ${matchCount} sub-schemas`,
          message: `oneOf constraint violated at path "${path}": expected to match exactly 1 sub-schema, but matched ${matchCount}.`,
          suggestion: 'Verify that discriminator fields or structural boundaries differentiate the sub-types cleanly.',
        });
      }
    }

    // anyOf validation
    if (schema.anyOf && Array.isArray(schema.anyOf)) {
      let matched = false;
      schema.anyOf.forEach((subSchema: any) => {
        const subErrors: ValidationError[] = [];
        this.validate(value, subSchema, document, path, subErrors, [], settings, depth + 1);
        if (subErrors.length === 0) {
          matched = true;
        }
      });

      if (!matched) {
        errors.push({
          path,
          errorType: 'type_mismatch',
          expected: 'Matches at least one of the anyOf schema declarations',
          actual: 'Matched 0 sub-schemas',
          message: `anyOf constraint violated at path "${path}": expected to match at least 1 sub-schema, but matched 0.`,
          suggestion: 'Ensure the response matches one of the declared polymorphic types.',
        });
      }
    }

    // allOf validation
    if (schema.allOf && Array.isArray(schema.allOf)) {
      schema.allOf.forEach((subSchema: any, index: number) => {
        this.validate(value, subSchema, document, `${path}.allOf[${index}]`, errors, warnings, settings, depth + 1);
      });
    }

    // not validation
    if (schema.not) {
      const subErrors: ValidationError[] = [];
      this.validate(value, schema.not, document, path, subErrors, [], settings, depth + 1);
      if (subErrors.length === 0) {
        errors.push({
          path,
          errorType: 'type_mismatch',
          expected: 'Does not match the forbidden "not" schema definition',
          actual: 'Matched forbidden schema',
          message: `not constraint violated at path "${path}": received value matched forbidden schema constraints.`,
          suggestion: 'Ensure that the returned payload conforms to allowed properties only.',
        });
      }
    }
  }
}
