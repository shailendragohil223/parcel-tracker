// Loads server/.env (if present) using Node's built-in loader — works no matter which
// folder the app is started from. On hosting panels (GoDaddy etc.) you can instead set
// the same variables in the panel; values already set there are not overwritten.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const file = join(dirname(fileURLToPath(import.meta.url)), '..', '.env');
if (existsSync(file)) process.loadEnvFile(file);
