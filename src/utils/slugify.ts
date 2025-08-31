/**
 * Converts a string to a URL-friendly slug
 * @param text - The text to convert to a slug
 * @returns A URL-friendly slug
 */
// export const slugify = (text: string): string => {
//   return text
//     .toLowerCase()
//     .trim()
//     .replace(/[äöüß]/g, (match) => {
//       const replacements: { [key: string]: string } = {
//         'ä': 'ae',
//         'ö': 'oe',
//         'ü': 'ue',
//         'ß': 'ss'
//       };
//       return replacements[match] || match;
//     })
//     .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
//     .replace(/\s+/g, '-') // Replace spaces with hyphens
//     .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
//     .replace(/^-|-$/g, ''); // Remove leading and trailing hyphens
// };
export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}