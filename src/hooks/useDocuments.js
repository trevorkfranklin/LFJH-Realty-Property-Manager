const DB_NAME     = 'lfjh_db';
const STORE       = 'documents';
const PHOTO_STORE = 'property_photos';
const VERSION     = 2;

let _db = null;
function getDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('tenantId', 'tenantId', { unique: false });
      }
      if (!db.objectStoreNames.contains(PHOTO_STORE)) {
        db.createObjectStore(PHOTO_STORE, { keyPath: 'propertyId' });
      }
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror   = () => reject(req.error);
  });
}

export const DOC_CATEGORIES = [
  'Lease Application',
  'Lease',
  'Lease Extension',
  'Move-In Inspection',
  'Move-Out Inspection',
  'Photo',
  'Correspondence',
  'Other',
];

export const DOC_CATEGORY_COLOR = {
  'Lease Application':  'text-blue-400',
  'Lease':              'text-emerald-400',
  'Lease Extension':    'text-cyan-400',
  'Move-In Inspection': 'text-yellow-400',
  'Move-Out Inspection':'text-orange-400',
  'Photo':              'text-purple-400',
  'Correspondence':     'text-slate-400',
  'Other':              'text-slate-500',
};

// Load metadata only (no binary data) for a tenant
export async function listDocs(tenantId) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).index('tenantId').getAll(tenantId);
    req.onsuccess = () =>
      resolve(
        req.result
          .map(({ data: _d, ...meta }) => meta)   // strip binary from state
          .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
      );
    req.onerror = () => reject(req.error);
  });
}

export async function saveDoc(tenantId, file, category) {
  const data = await file.arrayBuffer();
  const doc  = {
    id:          crypto.randomUUID(),
    tenantId,
    name:        file.name,
    mimeType:    file.type || 'application/octet-stream',
    size:        file.size,
    category,
    uploadedAt:  new Date().toISOString(),
    data,
  };
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add(doc);
    tx.oncomplete = resolve;
    tx.onerror    = () => reject(tx.error);
  });
}

export async function deleteDoc(id) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = resolve;
    tx.onerror    = () => reject(tx.error);
  });
}

export async function openDoc(id, mimeType, name) {
  const db = await getDB();
  const rec = await new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
  if (!rec) return;
  const blob = new Blob([rec.data], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const previewable = mimeType.startsWith('image/') || mimeType === 'application/pdf';
  if (previewable) {
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } else {
    const a    = document.createElement('a');
    a.href     = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5_000);
  }
}

// ── Property photo helpers ────────────────────────────────────────────────────

export async function savePropertyPhoto(propertyId, file) {
  const data = await file.arrayBuffer();
  const db   = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE, 'readwrite');
    tx.objectStore(PHOTO_STORE).put({ propertyId, data, mimeType: file.type, name: file.name });
    tx.oncomplete = resolve;
    tx.onerror    = () => reject(tx.error);
  });
}

export async function getPropertyPhotoUrl(propertyId) {
  const db  = await getDB();
  const rec = await new Promise((resolve, reject) => {
    const req = db.transaction(PHOTO_STORE, 'readonly').objectStore(PHOTO_STORE).get(propertyId);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
  if (!rec) return null;
  const blob = new Blob([rec.data], { type: rec.mimeType });
  return URL.createObjectURL(blob);
}

export async function deletePropertyPhoto(propertyId) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE, 'readwrite');
    tx.objectStore(PHOTO_STORE).delete(propertyId);
    tx.oncomplete = resolve;
    tx.onerror    = () => reject(tx.error);
  });
}
