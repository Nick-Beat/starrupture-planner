import type { RuptureTimer } from './db';


export type saveGameDataBundle = {
    nextWaveTimer: unknown;
    numWaves: unknown;
};

function saveGameDataFileUrl(file: string): string {
    const base = import.meta.env.BASE_URL;
    const prefix = base.endsWith('/') ? base : `${base}/`;
    return `${prefix}data/${file}`;
}

async function fetchJson<T>(url: string): Promise<T> {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed to load ${url} (${res.status})`);
    }
    return res.json() as Promise<T>;
}

export async function loadSaveGameDataVersion(): Promise<saveGameDataBundle> {
    const [nextWaveTimer, numWaves] = await Promise.all([
        // return wavetimer
    ]);

    const bundle: saveGameDataBundle = { nextWaveTimer, numWaves};
    return bundle;
}

