import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { DododirServer } from 'dododir/server';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const server = new DododirServer({
    port: 3001,
    staticDir: path.join(__dirname, 'dist'),
    staticCatchall: path.join(__dirname, 'dist/index.html'),
    dbPath: path.join(__dirname, 'chyp2.db'),
    authSecret: process.env.JWT_SECRET,
    turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY,
});
server.listen();