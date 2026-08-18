import * as micro_schema from '@journeyapps/micro-schema';
import * as micro_errors from '@journeyapps/micro-errors';
import * as cross_stream from './cross-stream';
import type * as webstreams from 'stream/web';

export type StreamLike<T> = Iterable<T> | AsyncIterable<T>;

/**
 * Construct an AsyncIterator from a given ReadableStream.
 *
 * This is only really intended to be used from browser runtimes or within code intended to
 * be used cross-labs. This is because Node ReadableStreams already implement AsyncIterators
 */
export async function* iterableFromReadable<T = any>(readable: ReadableStream<T> | webstreams.ReadableStream<T>) {
  const reader = readable.getReader();

  try {
    while (true) {
      const res = await reader.read();
      if (res.done) {
        return;
      }
      yield res.value;
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Construct a ReadableStream from a given Iterable or AsyncIterable.
 *
 * If the given iterable is already a readable then this is a noop
 */
export const readableFrom = <T = any>(
  iterable: StreamLike<T>,
  strategy?: QueuingStrategy<T>
): webstreams.ReadableStream<T> => {
  if (iterable instanceof cross_stream.Readable) {
    return iterable;
  }

  let resume: (() => void) | undefined;
  return new cross_stream.Readable<T>(
    {
      start(controller) {
        void (async function () {
          for await (const chunk of iterable) {
            controller.enqueue(chunk);

            if (controller.desiredSize != null && controller.desiredSize <= 0) {
              await new Promise<void>((resolve) => {
                resume = resolve;
              });
            }
          }

          controller.close();
        })().catch((err) => {
          controller.error(err);
        });
      },
      async pull() {
        resume?.();
      }
    },
    strategy
  );
};

/**
 * Yield a generator that validates data flowing through it
 */
export async function* validateDataStream<T>(iterable: StreamLike<T>, validator: micro_schema.MicroValidator<T>) {
  for await (const chunk of iterable) {
    const res = validator.validate(chunk);
    if (!res.valid) {
      throw new micro_errors.ValidationError(res.errors);
    }
    yield chunk;
  }
}
