import * as codecs from '@journeyapps/micro-codecs';
import * as schema_validator from './schema-validator';
import * as defs from '../definitions';
import * as t from 'ts-codec';

export type TsCodecValidator<
  C extends t.AnyCodec,
  T extends t.TransformTarget = t.TransformTarget.Encoded
> = T extends t.TransformTarget.Encoded ? defs.MicroValidator<t.Encoded<C>> : defs.MicroValidator<t.Decoded<C>>;

type ValidatorOptions<T extends t.TransformTarget> = Partial<Omit<t.BaseParserParams, 'target'>> & {
  target?: T;
};

/**
 * Create a validator from a given ts-codec codec
 */
export const createTsCodecValidator = <C extends t.AnyCodec, T extends t.TransformTarget = t.TransformTarget.Encoded>(
  codec: C,
  options?: ValidatorOptions<T>
): TsCodecValidator<C, T> => {
  const schema = t.generateJSONSchema(codec, {
    ...(options || {}),
    parsers: [...(options?.parsers ?? []), ...codecs.parsers]
  });
  return schema_validator.createSchemaValidator(schema);
};
