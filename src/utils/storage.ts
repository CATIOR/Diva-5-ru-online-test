import { Diva5ClinicalState, PatientInfoState } from '../types/diva5';
import { createInitialDiva5State } from './scoring';

export const LOCAL_STORAGE_KEY = 'diva5_clinical_state_v2';
export const SESSION_PDN_KEY = 'diva5_session_pdn_v2';
const IDB_NAME = 'diva5_clinical_db_v2';
const IDB_STORE = 'clinical_snapshots';
const IDB_RECORD_KEY = 'active_draft';

export interface SensitivePersonalData {
  fullName: string;
  birthDate: string;
  clinicianName: string;
  regNumber: string;
}

export function stripPersonalData(state: Diva5ClinicalState): Diva5ClinicalState {
  return {
    ...state,
    patient: {
      ...state.patient,
      fullName: '',
      birthDate: '',
      clinicianName: '',
      regNumber: ''
    }
  };
}

export function extractPersonalData(patient: PatientInfoState): SensitivePersonalData {
  return {
    fullName: patient.fullName || '',
    birthDate: patient.birthDate || '',
    clinicianName: patient.clinicianName || '',
    regNumber: patient.regNumber || ''
  };
}

function saveSessionPersonalData(pdn: SensitivePersonalData): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(SESSION_PDN_KEY, JSON.stringify(pdn));
    }
  } catch {
    // Ignore storage quota errors
  }
}

function loadSessionPersonalData(): SensitivePersonalData | null {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const raw = window.sessionStorage.getItem(SESSION_PDN_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          fullName: typeof parsed.fullName === 'string' ? parsed.fullName : '',
          birthDate: typeof parsed.birthDate === 'string' ? parsed.birthDate : '',
          clinicianName: typeof parsed.clinicianName === 'string' ? parsed.clinicianName : '',
          regNumber: typeof parsed.regNumber === 'string' ? parsed.regNumber : ''
        };
      }
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

function openClinicalIndexedDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      resolve(null);
      return;
    }
    try {
      const req = window.indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function replicateStateToIndexedDB(stateToStore: Diva5ClinicalState): Promise<void> {
  const db = await openClinicalIndexedDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(stateToStore, IDB_RECORD_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

export async function readStateFromIndexedDB(): Promise<Diva5ClinicalState | null> {
  const db = await openClinicalIndexedDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(IDB_RECORD_KEY);
      req.onsuccess = () => {
        db.close();
        const validated = validateAndHydrateState(req.result);
        resolve(validated);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

export function validateAndHydrateState(raw: unknown): Diva5ClinicalState | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<Diva5ClinicalState>;
  if (!candidate.patient || !candidate.symptoms || !candidate.impairmentDomains) {
    return null;
  }

  const base = createInitialDiva5State();

  // Merge patient safely
  const mergedPatient: PatientInfoState = {
    ...base.patient,
    ...candidate.patient,
    id: typeof candidate.patient.id === 'string' && candidate.patient.id.trim()
      ? candidate.patient.id
      : base.patient.id
  };

  // Merge symptoms safely so every A1..HI9 exists
  const mergedSymptoms = { ...base.symptoms };
  for (const key of Object.keys(base.symptoms)) {
    const incomingSym = candidate.symptoms?.[key];
    if (incomingSym && incomingSym.adult && incomingSym.childhood) {
      mergedSymptoms[key] = {
        adult: { ...base.symptoms[key].adult, ...incomingSym.adult },
        childhood: { ...base.symptoms[key].childhood, ...incomingSym.childhood }
      };
    }
  }

  // Merge impairment domains safely
  const mergedDomains = { ...base.impairmentDomains };
  for (const key of Object.keys(base.impairmentDomains)) {
    const incomingDom = candidate.impairmentDomains?.[key];
    if (incomingDom && incomingDom.adult && incomingDom.childhood) {
      mergedDomains[key] = {
        adult: { ...base.impairmentDomains[key].adult, ...incomingDom.adult },
        childhood: { ...base.impairmentDomains[key].childhood, ...incomingDom.childhood }
      };
    }
  }

  const hydrated: Diva5ClinicalState = {
    version: 2,
    lastSavedAt:
      typeof candidate.lastSavedAt === 'string'
        ? candidate.lastSavedAt
        : base.lastSavedAt,
    currentStepIndex:
      typeof candidate.currentStepIndex === 'number' &&
      candidate.currentStepIndex >= 0 &&
      candidate.currentStepIndex <= 22
        ? candidate.currentStepIndex
        : 0,
    patient: mergedPatient,
    settings: {
      ...base.settings,
      ...(candidate.settings || {})
    },
    symptoms: mergedSymptoms,
    criterionB: {
      ...base.criterionB,
      ...(candidate.criterionB || {})
    },
    impairmentDomains: mergedDomains,
    criterionCD: {
      ...base.criterionCD,
      ...(candidate.criterionCD || {})
    },
    dsm5Form: {
      ...base.dsm5Form,
      ...(candidate.dsm5Form || {})
    }
  };

  // If sessionOnlyPersonalData is active, overlay PDn from sessionStorage if available
  if (hydrated.settings.sessionOnlyPersonalData) {
    const sessionPdn = loadSessionPersonalData();
    if (sessionPdn) {
      hydrated.patient = {
        ...hydrated.patient,
        ...sessionPdn
      };
    }
  }

  return hydrated;
}

/**
 * Strictly synchronous save to localStorage (and sessionStorage for PDn when enabled),
 * plus non-blocking async backup to IndexedDB.
 */
export function saveClinicalStateSync(state: Diva5ClinicalState): string {
  const timestamp = new Date().toTimeString().slice(0, 8);
  const stateWithTime: Diva5ClinicalState = {
    ...state,
    lastSavedAt: timestamp
  };

  const persistentPayload = stateWithTime.settings.sessionOnlyPersonalData
    ? stripPersonalData(stateWithTime)
    : stateWithTime;

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(persistentPayload));
    }
    if (stateWithTime.settings.sessionOnlyPersonalData) {
      saveSessionPersonalData(extractPersonalData(stateWithTime.patient));
    } else if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(SESSION_PDN_KEY);
    }
  } catch {
    // Ignore storage quota errors
  }

  // Replicate stripped/safe payload to IndexedDB asynchronously
  void replicateStateToIndexedDB(persistentPayload);

  return timestamp;
}

export function loadClinicalStateSync(): Diva5ClinicalState | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return validateAndHydrateState(parsed);
    }
  } catch {
    return null;
  }
  return null;
}

export async function clearAllClinicalStorage(): Promise<Diva5ClinicalState> {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage?.removeItem(LOCAL_STORAGE_KEY);
      window.sessionStorage?.removeItem(SESSION_PDN_KEY);
    }
  } catch {
    // Ignore
  }

  const db = await openClinicalIndexedDB();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(IDB_RECORD_KEY);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          resolve();
        };
      } catch {
        db.close();
        resolve();
      }
    });
  }

  const fresh = createInitialDiva5State();
  saveClinicalStateSync(fresh);
  return fresh;
}
