import { createApp } from './app';

const app = createApp();
const port = Number(process.env.API_PORT ?? 8787);

Bun.serve({ fetch: app.fetch, port });
console.log(`Roundup API listening on http://localhost:${port}`);
