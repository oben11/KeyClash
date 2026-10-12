// Entry point for `npm start` / `npm run dev`: just starts the server from index.ts.
import { join } from 'path';
import { startServer } from './index';

const { port } = await startServer({ port: Number(process.env.PORT) || 3001, distDir: join(process.cwd(), 'dist') });
console.log(`Keyclash server on :${port}`);
