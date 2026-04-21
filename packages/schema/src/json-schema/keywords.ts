import * as ajv from 'ajv';
import { ObjectId } from 'bson';

export const ObjectIdKeyword: ajv.KeywordDefinition = {
  keyword: 'bsonObjectId',
  metaSchema: { type: 'boolean' },
  error: {
    message: 'should be a valid ObjectId string'
  },
  code(context) {
    const fn = context.gen.scopeValue('func', {
      ref: ObjectId.isValid,
      code: ajv._`require('bson').ObjectId.isValid`
    });
    context.fail(ajv._`!${fn}(${context.data})`);
  }
};

export const BufferNodeType: ajv.KeywordDefinition = {
  keyword: 'nodeType',
  metaSchema: {
    type: 'string',
    enum: ['buffer', 'date']
  },
  error: {
    message: ({ schemaCode }) => {
      return ajv.str`should be a ${schemaCode}`;
    }
  },
  code(context) {
    switch (context.schema) {
      case 'buffer': {
        return context.fail(ajv._`!Buffer.isBuffer(${context.data})`);
      }
      case 'date': {
        return context.fail(ajv._`!(${context.data} instanceof Date)`);
      }
      default: {
        context.fail(ajv._`true`);
      }
    }
  }
};
