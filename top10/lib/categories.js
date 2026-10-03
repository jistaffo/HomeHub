// The list types a user can create. Each user gets at most one list per
// category, which is what makes comparing lists across friends meaningful.
// `min`/`max` are inclusive release-year bounds (null = unbounded).
export const CATEGORIES = [
  { id: 'all-time', name: 'All Time', blurb: 'The ten best, no rules.', min: null, max: null },
  { id: '20th-century', name: '20th Century', blurb: 'Released 1900–1999.', min: 1900, max: 1999 },
  { id: '21st-century', name: '21st Century', blurb: 'Released 2000 or later.', min: 2000, max: null },
  { id: '1980s', name: 'The 1980s', blurb: 'Released 1980–1989.', min: 1980, max: 1989 },
  { id: '1990s', name: 'The 1990s', blurb: 'Released 1990–1999.', min: 1990, max: 1999 },
  { id: '2000s', name: 'The 2000s', blurb: 'Released 2000–2009.', min: 2000, max: 2009 },
  { id: '2010s', name: 'The 2010s', blurb: 'Released 2010–2019.', min: 2010, max: 2019 },
  { id: '2020s', name: 'The 2020s', blurb: 'Released 2020–2029.', min: 2020, max: 2029 },
];

export const MAX_ITEMS = 10;

export function getCategory(id) {
  return CATEGORIES.find((c) => c.id === id) || null;
}

// OMDb years look like "1994", "2008–2013" (series) or "2019–". Use the first.
export function parseYear(year) {
  const m = String(year || '').match(/\d{4}/);
  return m ? Number(m[0]) : null;
}

export function yearFits(category, year) {
  const y = parseYear(year);
  if (y == null) return category.min == null && category.max == null;
  if (category.min != null && y < category.min) return false;
  if (category.max != null && y > category.max) return false;
  return true;
}
