import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  initializeFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { RoomData, ClinicalTemplate } from '../types';
import { getInitialRoomData, getDefaultClinicalTemplates } from '../constants';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with offline multi-tab persistence
const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
export const db = initializeFirestore(
  app,
  {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  },
  dbId
);

const ROOMS_COLLECTION = 'rooms';
const TEMPLATES_COLLECTION = 'templates';

/**
 * Subscribe to real-time changes in the rooms collection.
 * Works both ONLINE (syncing with cloud) and OFFLINE (reading from IndexedDB cache).
 */
export const subscribeRooms = (
  onData: (rooms: RoomData[]) => void,
  onError?: (err: Error) => void
) => {
  const roomsRef = collection(db, ROOMS_COLLECTION);

  return onSnapshot(
    roomsRef,
    (snapshot) => {
      const roomList: RoomData[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data) {
          roomList.push({ id: docSnap.id, ...data } as RoomData);
        }
      });

      // Sort rooms logically by roomNumber or id safely
      roomList.sort((a, b) => (a.roomNumber || '').toString().localeCompare((b.roomNumber || '').toString(), undefined, { numeric: true }));

      // If database is empty on first boot, initialize with default initial rooms or local storage
      if (snapshot.empty && !snapshot.metadata.hasPendingWrites) {
        const savedLocal = localStorage.getItem('station_kardex_rooms_v1');
        let initial: RoomData[] = [];
        if (savedLocal) {
          try {
            const parsed = JSON.parse(savedLocal);
            if (Array.isArray(parsed)) {
              initial = parsed;
            } else {
              initial = getInitialRoomData();
            }
          } catch {
            initial = getInitialRoomData();
          }
        } else {
          initial = getInitialRoomData();
        }
        if (Array.isArray(initial) && initial.length > 0) {
          saveAllRooms(initial).catch(console.error);
        }
        onData(Array.isArray(initial) ? initial : []);
      } else {
        onData(Array.isArray(roomList) ? roomList : []);
      }
    },
    (error) => {
      console.error('[Firebase Sync Error]:', error);
      if (onError) onError(error);
    }
  );
};

/**
 * Helper to strip undefined values which cause Firestore setDoc errors.
 */
const sanitizeForFirestore = <T>(data: T): T => {
  return JSON.parse(JSON.stringify(data));
};

/**
 * Save or update a single room document in Firestore.
 * Queued automatically in IndexedDB when offline, synced when online!
 */
export const saveRoomToFirestore = async (room: RoomData) => {
  try {
    const roomRef = doc(db, ROOMS_COLLECTION, room.id);
    const cleanRoom = sanitizeForFirestore(room);
    await setDoc(roomRef, cleanRoom);
  } catch (err) {
    console.error(`[Firebase] Error saving room ${room.id}:`, err);
  }
};

/**
 * Save multiple rooms.
 */
export const saveAllRooms = async (rooms: RoomData[]) => {
  try {
    await Promise.all(rooms.map((r) => saveRoomToFirestore(r)));
  } catch (err) {
    console.error('[Firebase] Error saving all rooms:', err);
  }
};

/**
 * Delete a room document from Firestore.
 */
export const deleteRoomFromFirestore = async (roomId: string) => {
  try {
    const roomRef = doc(db, ROOMS_COLLECTION, roomId);
    await deleteDoc(roomRef);
  } catch (err) {
    console.error(`[Firebase] Error deleting room ${roomId}:`, err);
  }
};

let hasSeededDefaults = localStorage.getItem('clinical_templates_seeded_v1') === 'true';

/**
 * Subscribe to real-time changes in the templates collection.
 */
export const subscribeTemplates = (
  onData: (templates: ClinicalTemplate[]) => void,
  onError?: (err: Error) => void
) => {
  const tmplRef = collection(db, TEMPLATES_COLLECTION);

  return onSnapshot(
    tmplRef,
    async (snapshot) => {
      const tmplList: ClinicalTemplate[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data) {
          tmplList.push({ id: docSnap.id, ...data } as ClinicalTemplate);
        }
      });

      if (snapshot.empty && !snapshot.metadata.hasPendingWrites && !hasSeededDefaults) {
        hasSeededDefaults = true;
        localStorage.setItem('clinical_templates_seeded_v1', 'true');
        const defaults = getDefaultClinicalTemplates();
        onData(defaults);
        try {
          await Promise.all(
            defaults.map((tmpl) =>
              setDoc(doc(db, TEMPLATES_COLLECTION, tmpl.id), sanitizeForFirestore(tmpl), { merge: true })
            )
          );
        } catch (e) {
          console.error('[Firebase] Failed to seed initial templates to Firestore:', e);
        }
      } else {
        if (!snapshot.empty) {
          hasSeededDefaults = true;
          localStorage.setItem('clinical_templates_seeded_v1', 'true');
        }
        onData(tmplList);
      }
    },
    (error) => {
      console.error('[Firebase Templates Error]:', error);
      if (onError) onError(error);
    }
  );
};

export const saveTemplateToFirestore = async (template: ClinicalTemplate) => {
  try {
    const tmplRef = doc(db, TEMPLATES_COLLECTION, template.id);
    const cleanTemplate = sanitizeForFirestore(template);
    await setDoc(tmplRef, cleanTemplate, { merge: true });
  } catch (err) {
    console.error(`[Firebase] Error saving template ${template.id}:`, err);
  }
};

export const deleteTemplateFromFirestore = async (templateId: string) => {
  try {
    const tmplRef = doc(db, TEMPLATES_COLLECTION, templateId);
    await deleteDoc(tmplRef);
  } catch (err) {
    console.error(`[Firebase] Error deleting template ${templateId}:`, err);
  }
};
