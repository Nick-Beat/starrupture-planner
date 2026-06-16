/// <reference types="node" />
import type { Plugin } from 'vite';
import * as fs from 'node:fs';
import * as path from 'node:path';

const DATA_DIR = path.resolve(__dirname, '..', 'data');

function ensureDataDir(): void {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

export function filePersistPlugin(): Plugin {
    return {
        name: 'file-persist-plugin',
        configureServer(server) {
            ensureDataDir();

            server.middlewares.use((req, res, next) => {
                if (!req.url?.startsWith('/api/persist/')) {
                    return next();
                }

                const key = req.url.replace('/api/persist/', '');
                const filePath = path.join(DATA_DIR, `${key}.json`);

                if (req.method === 'GET') {
                    try {
                        const content = fs.existsSync(filePath)
                            ? fs.readFileSync(filePath, 'utf-8')
                            : null;
                        res.setHeader('Content-Type', 'application/json');
                        res.writeHead(200);
                        res.end(JSON.stringify(content));
                    } catch (e) {
                        console.error('file-persist: read error', e);
                        res.writeHead(500);
                        res.end('Internal server error');
                    }
                    return;
                }

                if (req.method === 'POST') {
                    let body = '';
                    req.on('data', (chunk: Buffer) => {
                        body += chunk.toString();
                    });
                    req.on('end', () => {
                        try {
                            ensureDataDir();
                            fs.writeFileSync(filePath, body, 'utf-8');
                            res.setHeader('Content-Type', 'application/json');
                            res.writeHead(200);
                            res.end(JSON.stringify({ ok: true }));
                        } catch (e) {
                            console.error('file-persist: write error', e);
                            res.writeHead(500);
                            res.end('Internal server error');
                        }
                    });
                    return;
                }

                res.writeHead(405);
                res.end('Method not allowed');
            });
        },
    };
}
