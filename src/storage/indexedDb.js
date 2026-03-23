const DB_NAME = "devmate-db";
const DB_VERSION = 1;
const SESSION_STORE = "session";
const HISTORY_STORE = "history";
const ACTIVE_SESSION_KEY = "active-session";

function openDb() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(SESSION_STORE)) {
        db.createObjectStore(SESSION_STORE);
      }

      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        const historyStore = db.createObjectStore(HISTORY_STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
        historyStore.createIndex("createdAt", "createdAt");
      }
    };
  });
}

function txPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveSession(session) {
  const db = await openDb();
  const tx = db.transaction(SESSION_STORE, "readwrite");
  tx.objectStore(SESSION_STORE).put(session, ACTIVE_SESSION_KEY);
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadSession() {
  const db = await openDb();
  const tx = db.transaction(SESSION_STORE, "readonly");
  const data = await txPromise(tx.objectStore(SESSION_STORE).get(ACTIVE_SESSION_KEY));
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  return data || null;
}

export async function appendHistory(entry) {
  const db = await openDb();
  const tx = db.transaction(HISTORY_STORE, "readwrite");
  tx.objectStore(HISTORY_STORE).add({
    ...entry,
    createdAt: entry.createdAt || Date.now(),
  });

  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function readHistory(limit = 25) {
  const db = await openDb();
  const tx = db.transaction(HISTORY_STORE, "readonly");
  const store = tx.objectStore(HISTORY_STORE);
  const request = store.getAll();
  const rows = await txPromise(request);

  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });

  return rows.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
}

export async function clearHistory() {
  const db = await openDb();
  const tx = db.transaction(HISTORY_STORE, "readwrite");
  tx.objectStore(HISTORY_STORE).clear();

  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
