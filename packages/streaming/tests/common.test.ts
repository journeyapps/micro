import { describe, test, expect } from 'vitest';

import * as micro_schema from '@journeyapps/micro-schema';
import * as micro_errors from '@journeyapps/micro-errors';
import * as micro_streaming from '../src';
import * as _ from 'lodash';

describe('common', () => {
  test('it should concatenate two streams', async () => {
    async function* one() {
      for (let i = 0; i < 10; i++) {
        yield {
          value: i
        };
      }
    }

    async function* two() {
      for (let i = 0; i < 10; i++) {
        yield {
          value: 10 + i
        };
      }
    }

    const concat_stream = micro_streaming.concat(one(), two());
    expect(await micro_streaming.drain(concat_stream)).toMatchSnapshot();
  });

  test('it should validate stream data', async () => {
    function* generateLessThan10() {
      for (const i of _.range(10)) {
        yield {
          item: i
        };
      }
    }

    function* generateGreaterThan10() {
      for (const i of _.range(15)) {
        yield {
          item: i
        };
      }
    }

    const validator: micro_schema.MicroValidator<{ item: number }> = {
      validate: (datum) => {
        if (datum.item < 10) {
          return {
            valid: true
          };
        }

        return {
          valid: false,
          errors: ['not less than 10']
        };
      }
    };

    const validated_correct = micro_streaming.validateDataStream(generateLessThan10(), validator);
    await micro_streaming.drain(validated_correct);

    const validated_incorrect = micro_streaming.validateDataStream(generateGreaterThan10(), validator);
    await expect(micro_streaming.drain(validated_incorrect)).rejects.toThrowError(micro_errors.ValidationError);
  });
});
