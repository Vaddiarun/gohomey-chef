/**
 * Shrinks a picked photo before upload: resize and re-encode as JPEG.
 * `quality` on expo-image-picker only applies to JPEG sources — PNGs and
 * screenshots came through at full size and the upload proxy answered 413.
 */
import { requireOptionalNativeModule } from 'expo';

type Compressed = { uri: string; name: string; type: string; width?: number; height?: number };

/**
 * The API proxy (api.gohomeyy.store) rejects request bodies over ~1 MB and
 * step-3 sends three files in one request, so each photo targets ≤ 280 KB.
 */
export const TARGET_IMAGE_BYTES = 280 * 1024;

export const byteSize = async (uri: string): Promise<number> => {
  try {
    const res = await fetch(uri);
    return (await res.blob()).size;
  } catch {
    return 0;
  }
};

/**
 * True when the installed build contains the native manipulator. Checked
 * without throwing, so an older dev build never shows a red error screen.
 */
export const canCompressImages = (): boolean => requireOptionalNativeModule('ExpoImageManipulator') != null;

const encode = async (uri: string, width: number | undefined, maxWidth: number, compress: number) => {
  // Required lazily, and only after canCompressImages() — importing it on a
  // build without the native module throws at import time.
  const { ImageManipulator, SaveFormat } = require('expo-image-manipulator');
  const ctx = ImageManipulator.manipulate(uri);
  if (!width || width > maxWidth) {
    ctx.resize({ width: maxWidth });
  }
  const image = await ctx.renderAsync();
  return image.saveAsync({ compress, format: SaveFormat.JPEG });
};

const asIs = (uri: string): Compressed => {
  const original = uri.split('/').pop() || 'photo.jpg';
  const ext = /\.(\w+)$/.exec(original)?.[1]?.toLowerCase() || 'jpeg';
  return { uri, name: original, type: `image/${ext === 'jpg' ? 'jpeg' : ext}` };
};

/** Never throws: returns the original file when compression isn't possible. */
export const compressImage = async (uri: string, width?: number): Promise<Compressed> => {
  if (!canCompressImages()) {
    console.log('compressImage: native module missing — rebuild the app to enable compression');
    return asIs(uri);
  }
  const name = `${(uri.split('/').pop() || 'photo').replace(/\.\w+$/, '')}.jpg`;
  try {
    // Progressively smaller passes until the photo fits the budget.
    const passes: [number, number][] = [[1280, 0.6], [1024, 0.5], [800, 0.4]];
    let out: any;
    for (const [maxWidth, compress] of passes) {
      out = await encode(uri, width, maxWidth, compress);
      if ((await byteSize(out.uri)) <= TARGET_IMAGE_BYTES) break;
    }
    return { uri: out.uri, name, type: 'image/jpeg', width: out.width, height: out.height };
  } catch (err) {
    console.log('compressImage failed, using original:', (err as Error)?.message);
    return asIs(uri);
  }
};
