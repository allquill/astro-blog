import { BRAND_700, BRAND_COLORS, DEFAULT_BRAND, type BrandColor } from '../content/content.constants';

// The brand colour e-mails are drawn in. E-mails are rendered synchronously from many places, so the
// current colour is kept here; SiteContentService sets it at start-up and whenever the site settings are
// read or saved (one API process, so this is the saved value).
let current: BrandColor = DEFAULT_BRAND;

export function setEmailBrand(name: string | undefined) {
  current = (BRAND_COLORS as readonly string[]).includes(name ?? '') ? (name as BrandColor) : DEFAULT_BRAND;
}

/** The 700 of the site's brand colour, as hex. */
export const emailBrand = () => BRAND_700[current];
