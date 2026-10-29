// Images for an event: new `images` array, falling back to the old single banner_url.
export const eventImages = (e) =>
  Array.isArray(e.images) && e.images.length ? e.images : e.banner_url ? [e.banner_url] : [];

// Cloudinary delivery URLs get auto format/quality + a max width. Other URLs pass through.
export const optimize = (url, w = 800) =>
  typeof url === 'string' && url.includes('res.cloudinary.com')
    ? url.replace(/\/upload\/(v\d+\/)/, `/upload/f_auto,q_auto,w_${w}/$1`)
    : url;
