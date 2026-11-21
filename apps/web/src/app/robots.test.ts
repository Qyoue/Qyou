import robots from './robots';
import sitemap from './sitemap';

describe('robots and sitemap', () => {
  it('disallows authenticated/private routes', () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rules.disallow).toEqual(expect.arrayContaining(['/queue', '/settings/', '/operator/', '/onboarding/']));
    expect(result.sitemap).toBe('https://qyou.com/sitemap.xml');
  });

  it('sitemap only includes public routes', () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toEqual(expect.arrayContaining(['https://qyou.com/', 'https://qyou.com/login']));
    expect(urls.some((u) => u.includes('/queue'))).toBe(false);
    expect(urls.some((u) => u.includes('/settings'))).toBe(false);
  });
});
