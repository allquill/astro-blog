// URLs of uploaded images. The API serves the original at /api/public/media/<id> and resized copies
// at /api/public/media/<id>/<width>.<webp|jpg> (widths below only; see server/src/content/media.service.ts).
import type { MediaImage } from './content';

export const MEDIA_WIDTHS = [320, 640, 960, 1280, 1920] as const;
const ID = /\/api\/public\/media\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/\d+\.(?:webp|jpg))?$/;

export const mediaUrl = (id: string, width?: number, format: 'webp' | 'jpg' = 'webp') =>
  width ? `/api/public/media/${id}/${width}.${format}` : `/api/public/media/${id}`;

/** The media id of an image URL from a post body, or null for any other URL. */
export const mediaIdOf = (src: string) => ID.exec(src.split(/[?#]/)[0]!)?.[1] ?? null;

/** srcset for an image, with widths up to its own (never upscaled). */
export function srcset(id: string, width: number | undefined, widths: readonly number[] = MEDIA_WIDTHS) {
  const usable = widths.filter((w) => !width || w <= width);
  const list = usable.length ? usable : [widths[0]!];
  return list.map((w) => `${mediaUrl(id, w)} ${w}w`).join(', ');
}

/** The largest standard width not above the image's own, for src fallbacks and Open Graph. */
export function fitWidth(image: Pick<MediaImage, 'width'>, wanted: number) {
  const fits = MEDIA_WIDTHS.filter((w) => w <= Math.max(wanted, MEDIA_WIDTHS[0]) && (!image.width || w <= image.width));
  return fits[fits.length - 1] ?? MEDIA_WIDTHS[0];
}
