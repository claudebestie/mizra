import { defineConfig } from 'astro/config';
import sitemap from './src/integrations/sitemap.ts';

export default defineConfig({
  site: 'https://getmizra.com',
  output: 'static',
  build: {
    format: 'directory'
  },
  trailingSlash: 'always',
  integrations: [sitemap()]
});
