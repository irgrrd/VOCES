import { HistoryItem, SystemAssets, SystemAssetsV4, CulturalLocation, CulturalElement, Theme, NarrativePreset } from "../types";
// FIX: Removed unused and incorrect imports. The members 'GUERRERO_LOCATIONS', 'DEFAULT_CULTURAL_ELEMENTS', and 'DEFAULT_THEMES' are not exported from '../constants'.
import { DEFAULT_ASSETS_V4 } from "../constants";

const HISTORY_KEY = 'voces_guerrero_history_v1';
const ASSETS_KEY_V2 = 'voces_guerrero_assets_v2';
const ASSETS_KEY_V4 = 'voces_guerrero_assets_v4';

// --- HELPERS ---

export const slugify = (text: string): string => {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
};

// --- MIGRATION LOGIC ---

const migrateV2toV4 = (): SystemAssetsV4 => {
  console.log("Iniciando migración de Assets V2 a V4...");
  const now = Date.now();
  let v2Data: any = {};
  
  try {
    const rawV2 = localStorage.getItem(ASSETS_KEY_V2);
    if (rawV2) v2Data = JSON.parse(rawV2);
  } catch (e) {
    console.error("Error leyendo V2 assets:", e);
  }

  const baseAssets = JSON.parse(JSON.stringify(DEFAULT_ASSETS_V4)) as SystemAssetsV4;

  const mergeStrings = (
    v2List: string[] | undefined, 
    v4List: {id:string, label:string, source:string}[], 
    factory: (lbl:string)=>any
  ) => {
    if (!Array.isArray(v2List)) return;
    const existingIds = new Set(v4List.map(i => i.id));
    
    v2List.forEach(label => {
      const id = slugify(label);
      if (!existingIds.has(id)) {
        v4List.push({
          ...factory(label),
          id,
          label,
          source: 'user', // Asumimos user generated si viene de storage
          updatedAt: now
        });
        existingIds.add(id);
      }
    });
  };

  mergeStrings(v2Data.locations, baseAssets.locations, (l) => ({ region: 'General' }));
  mergeStrings(v2Data.culturalElements, baseAssets.culturalElements, (l) => ({ category: 'otro' }));
  mergeStrings(v2Data.themes, baseAssets.themes, (l) => ({}));

  return baseAssets;
};

// --- PUBLIC API V4 (Rich Data) ---

export const loadAssetsV4 = (): SystemAssetsV4 => {
  try {
    const raw = localStorage.getItem(ASSETS_KEY_V4);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.version === '4') {
        // Validación mínima de estructura
        return {
          ...DEFAULT_ASSETS_V4, 
          ...parsed,
          locations: parsed.locations || DEFAULT_ASSETS_V4.locations,
          themes: parsed.themes || DEFAULT_ASSETS_V4.themes,
          presets: parsed.presets || DEFAULT_ASSETS_V4.presets
        };
      }
    }
  } catch (e) {
    console.error("Error cargando V4 assets:", e);
  }
  
  // Si no hay V4, intentamos migrar V2
  const migrated = migrateV2toV4();
  saveAssetsV4(migrated);
  return migrated;
};

export const saveAssetsV4 = (assets: SystemAssetsV4): void => {
  try {
    const toSave = { ...assets, updatedAt: Date.now() };
    localStorage.setItem(ASSETS_KEY_V4, JSON.stringify(toSave));
  } catch (e) {
    console.error("Error guardando V4 assets:", e);
  }
};

export const resetAssetsV4 = (): SystemAssetsV4 => {
  localStorage.removeItem(ASSETS_KEY_V4);
  const defaults = JSON.parse(JSON.stringify(DEFAULT_ASSETS_V4));
  saveAssetsV4(defaults);
  return defaults;
};

// --- IMPORT / EXPORT ---

export const exportAssetsV4 = (): string => {
  const assets = loadAssetsV4();
  return JSON.stringify(assets, null, 2);
};

export const importAssetsV4 = (json: string, mode: 'merge' | 'replace'): SystemAssetsV4 => {
  let imported: SystemAssetsV4;
  try {
    imported = JSON.parse(json);
    if (imported.version !== '4') throw new Error("Versión incorrecta");
  } catch (e) {
    throw new Error("JSON inválido o corrupto");
  }

  if (mode === 'replace') {
    saveAssetsV4(imported);
    return imported;
  }

  // MERGE LOGIC
  const current = loadAssetsV4();
  const mergeList = (curr: any[], imp: any[]) => {
    const map = new Map(curr.map(i => [i.id, i]));
    imp.forEach(i => {
      // Si existe y el importado es más reciente, sobrescribe.
      if (!map.has(i.id) || i.updatedAt > (map.get(i.id)?.updatedAt || 0)) {
        map.set(i.id, i);
      }
    });
    return Array.from(map.values());
  };

  const merged: SystemAssetsV4 = {
    version: '4',
    updatedAt: Date.now(),
    locations: mergeList(current.locations, imported.locations),
    culturalElements: mergeList(current.culturalElements, imported.culturalElements),
    themes: mergeList(current.themes, imported.themes),
    presets: mergeList(current.presets || [], imported.presets || [])
  };

  saveAssetsV4(merged);
  return merged;
};

// --- LEGACY COMPATIBILITY BRIDGE (UI Consumption) ---

export const toLegacyAssetsView = (v4: SystemAssetsV4): SystemAssets => {
  return {
    locations: v4.locations.filter(i => !i.hidden).map(i => i.label),
    culturalElements: v4.culturalElements.filter(i => !i.hidden).map(i => i.label),
    themes: v4.themes.filter(i => !i.hidden).map(i => i.label)
  };
};

export const getSystemAssets = (): SystemAssets => {
  const v4 = loadAssetsV4();
  return toLegacyAssetsView(v4);
};

export const resetSystemAssets = (): SystemAssets => {
  const v4 = resetAssetsV4();
  return toLegacyAssetsView(v4);
};

export const saveSystemAssets = (assets: SystemAssets): void => {
  console.warn("Legacy saveSystemAssets called. Use AssetManagerModal for persistent edits.");
};

// --- HISTORY (UNCHANGED) ---

export const getHistory = (): HistoryItem[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryItem[];
  } catch (error) {
    return [];
  }
};

export const saveToHistory = (item: HistoryItem): void => {
  try {
    const current = getHistory();
    const updated = [item, ...current].slice(0, 50);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Storage full?", error);
  }
};

export const deleteFromHistory = (id: string): HistoryItem[] => {
  const current = getHistory();
  const updated = current.filter(item => item.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return updated;
};
