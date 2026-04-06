import dotenv from 'dotenv';

import { createApp } from './app';

dotenv.config();

const app = createApp();
const port = Number(process.env.PORT ?? 4000);

app.listen(port, () => {
  console.log(`[nutrition-api] listening on http://127.0.0.1:${port}`);
});
