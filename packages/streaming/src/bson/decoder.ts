import * as buffer_array from './buffer-array';
import * as stream from '../core/cross-stream';
import * as constants from './constants';
import * as bson from 'bson';

export type BSONStreamDecoderParams<T> = {
  deserialize_options?: bson.DeserializeOptions;
  require_terminator?: boolean;

  writableStrategy?: QueuingStrategy<Buffer>;
  readableStrategy?: QueuingStrategy<T>;
};
export const createBSONStreamDecoder = <T = any>(params?: BSONStreamDecoderParams<T>) => {
  const buffer = buffer_array.createReadableBufferArray();
  let frame_size: null | number = null;

  function* decodeFrames() {
    while (true) {
      if (frame_size === null) {
        frame_size = buffer.peek(4)?.readInt32LE(0) || null;
      }
      if (frame_size === null) {
        break;
      }
      if (buffer.size() < frame_size) {
        break;
      }

      const frame = buffer.read(frame_size);
      if (!frame) {
        break;
      }

      frame_size = null;
      yield bson.deserialize(frame, {
        promoteBuffers: true,
        validation: {
          utf8: false
        },
        ...(params?.deserialize_options || {})
      });
    }
  }

  let writableStrategy = params?.writableStrategy;
  if (!writableStrategy) {
    writableStrategy = new stream.ByteLengthStrategy({
      highWaterMark: 1024 * 16
    });
  }

  return new stream.Transform<Buffer, T>(
    {
      transform(chunk, controller) {
        buffer.push(chunk);
        for (const frame of decodeFrames()) {
          controller.enqueue(frame as T);
        }
      },
      flush(controller) {
        for (const frame of decodeFrames()) {
          controller.enqueue(frame as T);
        }

        const tail = buffer.peek(4);
        if (tail && Buffer.compare(constants.TERMINATOR, tail) === 0) {
          return;
        }
        if (params?.require_terminator === false) {
          return;
        }

        throw new Error('stream did not complete successfully');
      }
    },
    writableStrategy,
    params?.readableStrategy
  );
};
