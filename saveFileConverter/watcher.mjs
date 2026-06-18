import fs from 'fs/promises';
import { watch } from 'fs';
import zlib from 'zlib';
import { promisify } from 'util';

// Macht das zlib-Inflate asynchron nutzbar
const inflateRawAsync = promisify(zlib.inflateRaw);
const inflateAsync = promisify(zlib.inflate);

// Change <YOUR_STEAM_ID>
const WATCH_DIR = 'C:/Program Files (x86)/Steam/userdata/<YOUR_STEAM_ID>/1631270/remote/Saved/SaveGames/PlanerTool/';
const OUTPUT_NAME = './data/gameData.json';
let timeoutId = null;

/**
 * Decompresses zlib data (tries standard zlib first, falls back to raw deflate)
 * @param {Buffer} compressedData 
 * @returns {Promise<string>}
 */
async function decompressZlibRaw(compressedData) {
    try {
        // Versuch 1: Standard Zlib (mit Header)
        const decompressedBuffer = await inflateAsync(compressedData);
        return decompressedBuffer.toString('utf8');
    } catch (error) {
        console.log(`[INFO] Standard zlib failed (${error.message}), trying raw deflate...`);
        // Versuch 2: Fallback auf Raw Deflate (ohne Header)
        const decompressedBuffer = await inflateRawAsync(compressedData);
        return decompressedBuffer.toString('utf8');
    }
}

/**
 * Loads a .sav file and extracts the JSON content to memory
 * @param {string} filePath - Path to the .sav file
 * @returns {Promise<{filePath: string, jsonContent: string}>} SaveFile object
 */
async function loadSaveFile(filePath) {
    console.log(`[FILE] Operation: LoadSaveFile on ${filePath}`);

    try {
        // Liest die Datei komplett in ein Buffer-Objekt
        const fileData = await fs.readFile(filePath);
        console.log(`[INFO] Read ${fileData.length} bytes from save file`);

        if (fileData.length < 4) {
            console.error("[ERROR] Save file too small");
            throw new Error("Save file is too small. Expected at least 4 bytes for JSON size header.");
        }

        // Liest die ersten 4 Bytes als 32-Bit-Integer (Little-Endian)
        const jsonSize = fileData.readInt32LE(0);
        console.log(`[INFO] JSON size from header: ${jsonSize} bytes`);

        // Schneidet die komprimierten Daten ab Byte 4 aus dem Buffer
        const compressedData = fileData.subarray(4);

        // Dekomprimiert die Daten (Deflate ohne Zlib-Header)
        const jsonContent = await decompressZlibRaw(compressedData);
        console.log(`[INFO] Decompressed JSON content: ${jsonContent.length} characters`);

        return {
            filePath: filePath,
            jsonContent: jsonContent
        };

    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`[ERROR] Save file not found: ${filePath}`);
            throw new Error(`Save file not found: ${filePath}`);
        }
        throw error;
    }
}

async function getLatestSaveFile(dirPath) {
    try {
        const files = await fs.readdir(dirPath);
        // Filtere nur .sav Dateien heraus
        const savFiles = files.filter(file => file.endsWith('.sav'));

        if (savFiles.length === 0) {
            return null;
        }

        let latestFile = null;
        let latestMtime = 0;

        // Iteriere durch alle .sav Dateien und vergleiche das Änderungsdatum
        for (const file of savFiles) {
            const fullPath = `${dirPath}/${file}`;
            const stats = await fs.stat(fullPath);
            
            if (stats.mtimeMs > latestMtime) {
                latestMtime = stats.mtimeMs;
                latestFile = fullPath;
            }
        }

        return latestFile;
    } catch (error) {
        console.error("[ERROR] Fehler beim Ermitteln der neuesten .sav-Datei:", error.message);
        return null;
    }
}
async function processSaveFile() {
    try {
        // 1. Finde die aktuellste .sav Datei im Ordner
        const latestSavePath = await getLatestSaveFile(WATCH_DIR);

        if (!latestSavePath) {
            console.warn(`[WARN] Keine .sav-Dateien in ${WATCH_DIR} gefunden.`);
            return;
        }

        console.log(`[INFO] Verarbeite die neueste Datei: ${latestSavePath}`);

        // 2. Datei laden, filtern und schreiben
        const result = await loadSaveFile(latestSavePath);
        const filteredResult = await filterSaveFile(result);
        
        await fs.writeFile(OUTPUT_NAME, JSON.stringify(filteredResult, null, 4), 'utf8');
        console.log(`[SUCCESS] Saved decompressed data successfully to ${OUTPUT_NAME}`);
    } catch (error) {
        console.error('[FATAL] Process failed:', error.message);
    }
}

async function filterSaveFile(rawData) {
    console.log('[FILE] Operation: filterSaveFile...');

    try {
        // 1. Die generierte 0.json einlesen
        //const rawData = await fs.readFile('0.json', 'utf8');
        const json = JSON.parse(rawData.jsonContent);

        // 2. Pfad zu den baseCoreSaveData-Objekten sicher auflösen
        const baseCoreSaveData = json?.itemData?.BaseCoreReplicationHelperSaveData?.baseCoreSaveData || [];
        const customNames = json?.itemData?.CrBuildingCustomNameSubsystem?.customNames || [];
        const entities = json?.itemData?.Mass?.entities || [];

        // Filtern der Entities
        const filteredEntities = Object.keys(customNames).reduce((acc, id) => {
            if (entities[id]) {
                // entityConfigDataPath kürzen
                const fullPath = entities[id].spawnData?.entityConfigDataPath;
                // Holt den Text nach dem letzten Punkt, falls der Pfad existiert
                const shortName = fullPath ? fullPath.split('.').pop() : null;
                
                
                //acc[id] = entities[id];
                acc[id] = {
                    fragmentValues: [],//entities[id].fragmentValues || [],
                    entityConfigDataPath: shortName,
                    numItems: 0
                };


        // Wenn es der ResourceRedistributor ist, berechne die Item-Mengen
        if ((shortName === "DA_ResourceRedistributor" || 
                shortName === "DA_UniversalStorage" ||
                shortName === "DA_Storage" ||
                shortName === "DA_PackageSender") && 
                entities[id].fragmentValues) {
            const itemsSummary = {};
            let totalCount = 0;

            entities[id].fragmentValues.forEach(value => {
                // Findet den Default-Namen und den dazugehörigen Count
                const matches = value.matchAll(/Default__([a-zA-Z0-9_]+)'",Count=(\d+)/g);
                for (const match of matches) {
                    const itemType = match[1];          // z. B. "I_TitaniumBar_C"
                    const itemCount = parseInt(match[2], 10); // z. B. 100

                    // Addiert den Wert für diesen spezifischen Item-Typ auf
                    itemsSummary[itemType] = (itemsSummary[itemType] || 0) + itemCount;
                    totalCount += itemCount;
                }
            });

            // Speichert die Ergebnisse im Objekt ab
            acc[id].itemTypes = itemsSummary; // Enthält z.B. { I_TitaniumBar_C: 383 }
            acc[id].numItems = totalCount;     // Gesamtsumme aller Items (383)
        }
            }
            return acc;
        }, {});
        

        console.log(`[INFO] Found ${baseCoreSaveData.length} objects in baseCoreSaveData.`);

        // 3. Die neue, gefilterte Zielstruktur aufbauen
        const filteredResult = {
            gameVersion: {
                major: json?.gameVersion?.major ?? 0,
                minor: json?.gameVersion?.minor ?? 0,
                pATCH: json?.gameVersion?.pATCH ?? 0
            },
            itemData: {
                BaseCoreReplicationHelperSaveData: {
                    baseCoreSaveData: baseCoreSaveData,
                },
                CrBuildingCustomNameSubsystem: {
                    customNames: customNames
                },
                EnviroWaveTimer: {
                    nextWaveTimer: json?.itemData?.EnviroWaveTimer?.nextWaveTimer ?? 0,
                    numWaves: json?.itemData?.EnviroWaveTimer?.numWaves ?? 0
                },
                Mass: {
                    electricitySubsystemCustomState: {
                        highestConsumedElectricity: json?.itemData?.Mass?.electricitySubsystemCustomState?.highestConsumedElectricity ?? 0,
                        highestProducedElectricity: json?.itemData?.Mass?.electricitySubsystemCustomState?.highestProducedElectricity ?? 0
                    }
                },
                entities: filteredEntities
            }   
        };

        // 4. Als "3_filtered.json" abspeichern (schön formatiert mit Einrückung)
        //await fs.writeFile('0_filtered.json', JSON.stringify(filteredResult, null, 4), 'utf8');
        console.log('[SUCCESS] Filtered data saved to 0_filtered.json');

            // Werte aus gameData.json in bases.json kopieren
            const fileData = await fs.readFile("data\\bases.json");
            const bases = JSON.parse(fileData);
            
            for (const base of bases.bases) {
                for (const building of base.buildings) {
                    if (!building.name) continue;
                    
                    // Find the entity key that maps to this building name
                    let entityId = null;
                    for (const [key, value] of Object.entries(customNames)) {
                        if (value === building.name) {
                            entityId = key;
                            break;
                        }
                    }
                    
                    if (entityId && filteredEntities[entityId] && "numItems" in filteredEntities[entityId]) {
                        if (filteredEntities[entityId].entityConfigDataPath == 'DA_PackageSender') {
                            building.storedInput = filteredEntities[entityId].numItems;
                        } else {
                            building.storedOutput = filteredEntities[entityId].numItems;
                        }
                    }
                }
            }
            await fs.writeFile("data\\bases.json", JSON.stringify(bases, null, 4), 'utf8');


        return filteredResult

    } catch (error) {
        console.error('[FATAL] Filtering failed:', error.message);
    }
}

// --- INITIALER START beim Skriptaufruf ---
console.log(`Überwachung für ${WATCH_DIR} gestartet...`);
await processSaveFile(); 

// --- WATCHER INITIALISIEREN ---
// Wichtig: fs.watch wird aus dem synchronen 'fs' Modul importiert, da es stabiler für Event-Handling ist
watch(WATCH_DIR, (eventType, filename) => {
    if (!filename || !filename.endsWith('.sav')) return;

    // Bestehenden Timer löschen, falls die Datei innerhalb der 10s erneut geändert wird
    if (timeoutId) {
        clearTimeout(timeoutId);
    }

    // Neuen Timer für 10 Sekunden (10000 ms) setzen
    timeoutId = setTimeout(async () => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] Die Datei "${filename}" wurde vor 10 Sekunden geändert. JSON extrahieren...`);
        
        // Dynamische Pfade für die geänderte Datei erstellen
        const dynamicInputPath = `${WATCH_DIR}/${filename}`;
        const dynamicOutputPath = filename.replace('.sav', '.json'); 
        
         try {
            // Logik direkt mit den dynamischen Pfaden ausführen
            const result = await loadSaveFile(dynamicInputPath);
            const filteredResult = await filterSaveFile(result)
            await fs.writeFile(OUTPUT_NAME, JSON.stringify(filteredResult, null, 4), 'utf8');
            console.log(`[SUCCESS] Saved decompressed data successfully to ${dynamicOutputPath}`);


        } catch (error) {
            console.error('[FATAL] Process failed for file:', filename, error.message);
        }
        // Führt die Extraktion nach Ablauf des Timers aus
        //await processSaveFile();


    }, 10000);
});

