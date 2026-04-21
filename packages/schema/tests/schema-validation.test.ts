import { describe, test, it, expect } from 'vitest';

import base_schema from './fixtures/schema';
import * as micro_schema from '../src';

const base_validator = micro_schema.createSchemaValidator(base_schema);

describe('json-schema-validation', () => {
  test('passes validation for json-schema', () => {
    const result = base_validator.validate({
      name: {
        a: '1',
        b: 'A'
      },
      b: {
        a: 2
      }
    });

    expect(result).toMatchSnapshot();
  });

  test('fails validation for json-schema', () => {
    const result1 = base_validator.validate({
      name: {
        a: '1',
        b: 'B'
      },
      b: {
        a: 2
      }
    });

    expect(result1).toMatchSnapshot();

    const result2 = base_validator.validate({
      name: {},
      b: {
        a: ''
      }
    });

    expect(result2).toMatchSnapshot();
  });

  test('passes validation with refs', () => {
    const result = base_validator.validate({
      name: {
        a: '1',
        b: 'A'
      },
      b: {
        a: 2
      },
      d: {
        prop: 'abc'
      }
    });

    expect(result).toMatchSnapshot();
  });

  test('fails validation for json-schema due to additional properties', () => {
    const result = base_validator.validate({
      name: {
        a: '1',
        b: 'A',
        c: 'additional property'
      },
      b: {
        a: 2
      }
    });

    expect(result).toMatchSnapshot();
  });

  test('passes json-schema validation with additional properties when allowed', () => {
    const validator = micro_schema.createSchemaValidator(base_schema, {
      allowAdditional: true
    });

    const result = validator.validate({
      name: {
        a: '1',
        b: 'A',
        c: 'additional property'
      },
      b: {
        a: 2
      }
    });

    expect(result).toMatchSnapshot();
  });

  const subschema = micro_schema.parseJSONSchema({
    definitions: {
      a: {
        type: 'string'
      },
      b: {
        type: 'object',
        properties: {
          a: { type: 'string' },
          b: { $ref: '#/definitions/a' }
        },
        required: ['b']
      }
    }
  });

  test('it should correctly validate subschemas', () => {
    const validator = subschema.definitions.b.validator();

    const res1 = validator.validate({
      a: 'a',
      b: 1
    });
    expect(res1).toMatchSnapshot();

    const res2 = validator.validate({
      a: 'a',
      b: 'b'
    });

    expect(res2.valid).toBe(true);
  });

  test('it correctly validates node types', () => {
    const validator = micro_schema.createSchemaValidator({
      type: 'object',
      properties: {
        a: {
          nodeType: 'buffer'
        },
        b: {
          nodeType: 'date'
        }
      },
      required: ['a']
    });

    const res = validator.validate({
      a: Buffer.from('123'),
      b: new Date()
    });
    expect(res.valid).toBe(true);

    const res2 = validator.validate({
      a: '123'
    });
    expect(res2.valid).toBe(false);
    expect(res2).toMatchSnapshot();
  });

  it('should validate bsonObjectId fields', () => {
    const validator = micro_schema.createSchemaValidator({
      type: 'object',
      properties: {
        id: { type: 'string', bsonObjectId: true }
      },
      required: ['id']
    });

    expect(validator.validate({ id: '507f1f77bcf86cd799439011' }).valid).toBe(true);
    expect(validator.validate({ id: 'not-an-objectid' }).valid).toBe(false);
    expect(validator.validate({ id: '507f1f77bcf86cd79943901' }).valid).toBe(false);
  });

  it('should fail to compile invalid node types', () => {
    try {
      micro_schema.createSchemaValidator({
        type: 'object',
        properties: {
          a: {
            nodeType: 'Buffer'
          },
          b: {
            nodeType: 'Date'
          },
          c: {
            nodeType: 'unknown'
          }
        },
        required: ['a', 'b', 'c']
      });
    } catch (err) {
      expect(err).toBeInstanceOf(micro_schema.SchemaValidatorError);
    }

    expect.assertions(1);
  });
});
