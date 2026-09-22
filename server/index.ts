import { createGameServer } from './app.js';
const port = Number(process.env.PORT ?? 3001);
const app = createGameServer();
app.http.listen(port, '0.0.0.0', () => console.log(`Reversi server: http://localhost:${port}`));
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => { void app.close().then(() => process.exit(0)); });
