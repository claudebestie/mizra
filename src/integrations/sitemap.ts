import type { AstroIntegration } from 'astro';
import { writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

function findHtmlFiles(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      findHtmlFiles(full, files);
    } else if (entry === 'index.html') {
      files.push(full);
    }
  }
  return files;
}

export default function sitemapIntegration(): AstroIntegration {
  return {
    name: 'mizra-sitemap',
    hooks: {
      'astro:build:done': ({ dir }) => {
        const distDir = dir.pathname.replace(/\/$/, '');
        const site = 'https://getmizra.com';
        const today = new Date().toISOString().split('T')[0];

        // Find all HTML files in dist
        const htmlFiles = findHtmlFiles(distDir);
        const urls: { loc: string; priority: string; changefreq: string }[] = [];

        for (const file of htmlFiles) {
          const rel = relative(distDir, file).replace(/index\.html$/, '').replace(/\\/g, '/');
          const path = '/' + rel;

          // Determine priority based on path
          let priority = '0.5';
          let changefreq = 'monthly';

          if (path === '/') {
            priority = '1.0';
            changefreq = 'weekly';
          } else if (path.includes('-website-builder/')) {
            priority = '0.8';
          } else if (path.startsWith('/services/')) {
            priority = '0.8';
          } else if (path.startsWith('/pricing/')) {
            priority = '0.9';
          } else if (path.startsWith('/free-audit/')) {
            priority = '0.9';
          } else if (path.includes('-website-examples/')) {
            priority = '0.7';
          } else if (path.includes('-website-')) {
            priority = '0.7';
          } else if (path.startsWith('/examples/')) {
            priority = '0.7';
          } else if (path.startsWith('/blog/')) {
            priority = '0.6';
          }

          urls.push({ loc: `${site}${path}`, priority, changefreq });
        }

        // Sort: homepage first, then by priority descending
        urls.sort((a, b) => {
          if (a.loc === `${site}/`) return -1;
          if (b.loc === `${site}/`) return 1;
          return parseFloat(b.priority) - parseFloat(a.priority);
        });

        // Generate sitemap XML
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

        writeFileSync(join(distDir, 'sitemap.xml'), xml);
        console.log(`[sitemap] Generated sitemap.xml with ${urls.length} URLs`);

        // Generate robots.txt
        const robots = `User-agent: *
Allow: /

Sitemap: ${site}/sitemap.xml
`;
        writeFileSync(join(distDir, 'robots.txt'), robots);
        console.log('[sitemap] Generated robots.txt');
      },
    },
  };
}
