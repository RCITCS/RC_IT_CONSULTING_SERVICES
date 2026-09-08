export const slugify = (value = '') => String(value)
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

export const help = (title, summary, detail) => ({
  title,
  summary,
  detail,
  slug: slugify(title)
});
