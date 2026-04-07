import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

import { createApp } from './app';

const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../../.env'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

const app = createApp();
const port = Number(process.env.PORT ?? 4000);

app.listen(port, () => {
  console.log(`[nutrition-api] listening on http://127.0.0.1:${port}`);
});
