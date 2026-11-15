import crypto from 'node:crypto';
import { initializeApp as initializeAdminApp, getApps as getAdminApps } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore, FieldValue as AdminFieldValue } from 'firebase-admin/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

export const adminApp = getAdminApps().length
  ? getAdminApps()[0]
  : initializeAdminApp({ projectId: firebaseConfig.projectId });

export const adminAuth = getAdminAuth(adminApp);
export const rawAdminDb = getAdminFirestore(adminApp, firebaseConfig.firestoreDatabaseId);

const FIRESTORE_DOC_ROOT = `projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents`;
const FIRESTORE_REST_BASE = `https://firestore.googleapis.com/v1/${FIRESTORE_DOC_ROOT}`;

// Sentinel wrappers so callers don't depend on Admin SDK internals when running via REST
const INCREMENT_SYM = Symbol('asvore_increment');
const ARRAY_UNION_SYM = Symbol('asvore_array_union');

export interface IncrementSentinel {
  [INCREMENT_SYM]: number;
}
export interface ArrayUnionSentinel {
  [ARRAY_UNION_SYM]: unknown[];
}

export const ServerFieldValue = {
  increment(n: number): any {
    return { [INCREMENT_SYM]: n };
  },
  arrayUnion(...elements: unknown[]): any {
    return { [ARRAY_UNION_SYM]: elements };
  },
};

function isIncrement(v: unknown): v is IncrementSentinel {
  return Boolean(v && typeof v === 'object' && INCREMENT_SYM in v);
}

function isArrayUnion(v: unknown): v is ArrayUnionSentinel {
  return Boolean(v && typeof v === 'object' && ARRAY_UNION_SYM in v);
}

function mapAdminSentinels(obj: any): any {
  if (isIncrement(obj)) return AdminFieldValue.increment(obj[INCREMENT_SYM]);
  if (isArrayUnion(obj)) return AdminFieldValue.arrayUnion(...obj[ARRAY_UNION_SYM]);
  if (Array.isArray(obj)) return obj.map(mapAdminSentinels);
  if (obj && typeof obj === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) out[k] = mapAdminSentinels(v);
    }
    return out;
  }
  return obj;
}

let adminSdkProbePromise: Promise<boolean> | null = null;
export async function canUseAdminSdk(): Promise<boolean> {
  if (!adminSdkProbePromise) {
    adminSdkProbePromise = (async () => {
      try {
        await rawAdminDb.collection('products').where('published', '==', true).limit(1).get();
        return true;
      } catch {
        return false;
      }
    })();
  }
  return adminSdkProbePromise;
}

export function extractBearerToken(req?: { headers?: Record<string, any> } | null): string | undefined {
  const header = req?.headers?.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    const t = header.slice('Bearer '.length).trim();
    return t || undefined;
  }
  return undefined;
}

export async function verifyFirebaseIdToken(token: string): Promise<{
  uid: string;
  email: string;
  emailVerified: boolean;
  name?: string;
} | null> {
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email || '',
      emailVerified: Boolean(decoded.email_verified),
      name: decoded.name || '',
    };
  } catch {
    try {
      const resp = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: token }),
        }
      );
      if (!resp.ok) return null;
      const json = (await resp.json()) as any;
      const u = json?.users?.[0];
      if (!u?.localId) return null;
      return {
        uid: String(u.localId),
        email: String(u.email || ''),
        emailVerified: Boolean(u.emailVerified),
        name: String(u.displayName || ''),
      };
    } catch {
      return null;
    }
  }
}

// Firestore REST Value Serialization
function toFirestoreValue(val: unknown): Record<string, any> {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return { doubleValue: 0 };
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (val instanceof Date) return { timestampValue: val.toISOString() };
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.filter((v) => v !== undefined).map((v) => toFirestoreValue(v)),
      },
    };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function toFirestoreFields(obj: Record<string, unknown>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) fields[k] = toFirestoreValue(v);
  }
  return fields;
}

function fromFirestoreValue(val: any): any {
  if (!val || typeof val !== 'object') return null;
  if ('nullValue' in val) return null;
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('stringValue' in val) return String(val.stringValue);
  if ('timestampValue' in val) return String(val.timestampValue);
  if ('arrayValue' in val) {
    return Array.isArray(val.arrayValue?.values) ? val.arrayValue.values.map(fromFirestoreValue) : [];
  }
  if ('mapValue' in val) {
    return fromFirestoreFields(val.mapValue?.fields || {});
  }
  return null;
}

function fromFirestoreFields(fields: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields || {})) {
    out[k] = fromFirestoreValue(v);
  }
  return out;
}

function makeRestId(): string {
  return crypto.randomBytes(12).toString('hex');
}

function buildRestHeaders(idToken?: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (idToken) headers.Authorization = `Bearer ${idToken}`;
  return headers;
}

async function restFetchJson(url: string, init: RequestInit): Promise<{ status: number; ok: boolean; data: any }> {
  const resp = await fetch(url, init);
  const text = await resp.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { status: resp.status, ok: resp.ok, data };
}

function buildCommitWrite(
  docPath: string,
  payload: Record<string, any>,
  mode: 'set_replace' | 'set_merge' | 'update'
): Record<string, any> {
  const docName = `${FIRESTORE_DOC_ROOT}/${docPath}`;
  const regularFields: Record<string, any> = {};
  const transforms: any[] = [];

  for (const [k, v] of Object.entries(payload || {})) {
    if (v === undefined) continue;
    if (isIncrement(v)) {
      transforms.push({
        fieldPath: k,
        increment: toFirestoreValue(v[INCREMENT_SYM]),
      });
    } else if (isArrayUnion(v)) {
      transforms.push({
        fieldPath: k,
        appendMissingElements: {
          values: v[ARRAY_UNION_SYM].map((item) => toFirestoreValue(item)),
        },
      });
    } else {
      regularFields[k] = v;
    }
  }

  const regularKeys = Object.keys(regularFields);
  const currentDocument = mode === 'update' ? { exists: true } : undefined;

  if (regularKeys.length > 0) {
    const write: Record<string, any> = {
      update: {
        name: docName,
        fields: toFirestoreFields(regularFields),
      },
    };
    if (mode !== 'set_replace') {
      write.updateMask = { fieldPaths: regularKeys };
    }
    if (transforms.length > 0) {
      write.updateTransforms = transforms;
    }
    if (currentDocument) write.currentDocument = currentDocument;
    return write;
  }

  return {
    transform: {
      document: docName,
      fieldTransforms: transforms,
    },
    ...(currentDocument ? { currentDocument } : {}),
  };
}

export interface DocSnap {
  exists: boolean;
  id: string;
  data: () => Record<string, any> | undefined;
  ref: DocRef;
}

export interface QueryDocSnap extends DocSnap {
  exists: true;
  data: () => Record<string, any>;
}

export interface QuerySnap {
  empty: boolean;
  size: number;
  docs: QueryDocSnap[];
}

export interface DocRef {
  id: string;
  path: string;
  get: () => Promise<DocSnap>;
  set: (data: Record<string, any>, opts?: { merge?: boolean }) => Promise<void>;
  update: (data: Record<string, any>) => Promise<void>;
  delete: () => Promise<void>;
  collection: (subCol: string) => ColRef;
}

export interface QueryRef {
  where: (field: string, op: '==', value: unknown) => QueryRef;
  limit: (n: number) => QueryRef;
  get: () => Promise<QuerySnap>;
}

export interface ColRef extends QueryRef {
  doc: (id?: string) => DocRef;
  add: (data: Record<string, any>) => Promise<DocRef>;
}

export interface ServerDb {
  collection: (colPath: string) => ColRef;
  batch: () => {
    set: (ref: DocRef, data: Record<string, any>, opts?: { merge?: boolean }) => void;
    update: (ref: DocRef, data: Record<string, any>) => void;
    commit: () => Promise<void>;
  };
  runTransaction: <T>(
    fn: (tx: {
      get: (ref: DocRef) => Promise<DocSnap>;
      set: (ref: DocRef, data: Record<string, any>, opts?: { merge?: boolean }) => void;
      update: (ref: DocRef, data: Record<string, any>) => void;
    }) => Promise<T>
  ) => Promise<T>;
}

function createRestDb(idToken?: string): ServerDb {
  const apiKeyParam = `key=${encodeURIComponent(firebaseConfig.apiKey)}`;

  async function commitWrites(writes: Record<string, any>[]) {
    if (!writes.length) return;
    // Chunk writes in groups of 400 to respect Firestore commit limit of 500
    for (let i = 0; i < writes.length; i += 400) {
      const chunk = writes.slice(i, i + 400);
      const { ok, status, data } = await restFetchJson(`${FIRESTORE_REST_BASE}:commit?${apiKeyParam}`, {
        method: 'POST',
        headers: buildRestHeaders(idToken),
        body: JSON.stringify({ writes: chunk }),
      });
      if (!ok) {
        const msg = data?.error?.message || `Firestore commit failed (${status})`;
        const err: any = new Error(msg);
        err.code = status === 403 ? 7 : status;
        throw err;
      }
    }
  }

  function makeDocRef(colPath: string, docId: string): DocRef {
    const fullPath = `${colPath}/${docId}`;
    const ref: DocRef = {
      id: docId,
      path: fullPath,
      async get(): Promise<DocSnap> {
        const { ok, status, data } = await restFetchJson(`${FIRESTORE_REST_BASE}/${fullPath}?${apiKeyParam}`, {
          method: 'GET',
          headers: buildRestHeaders(idToken),
        });
        if (status === 404) {
          return { exists: false, id: docId, data: () => undefined, ref };
        }
        if (!ok) {
          const msg = data?.error?.message || `Firestore get failed (${status})`;
          const err: any = new Error(msg);
          err.code = status === 403 ? 7 : status;
          throw err;
        }
        const parsed = fromFirestoreFields(data?.fields || {});
        return { exists: true, id: docId, data: () => parsed, ref };
      },
      async set(data: Record<string, any>, opts?: { merge?: boolean }) {
        await commitWrites([buildCommitWrite(fullPath, data, opts?.merge ? 'set_merge' : 'set_replace')]);
      },
      async update(data: Record<string, any>) {
        await commitWrites([buildCommitWrite(fullPath, data, 'update')]);
      },
      async delete() {
        const { ok, status, data } = await restFetchJson(`${FIRESTORE_REST_BASE}/${fullPath}?${apiKeyParam}`, {
          method: 'DELETE',
          headers: buildRestHeaders(idToken),
        });
        if (!ok && status !== 404) {
          const msg = data?.error?.message || `Firestore delete failed (${status})`;
          const err: any = new Error(msg);
          err.code = status === 403 ? 7 : status;
          throw err;
        }
      },
      collection(subCol: string): ColRef {
        return makeColRef(`${fullPath}/${subCol}`);
      },
    };
    return ref;
  }

  function makeQueryRef(
    colPath: string,
    filters: { field: string; value: unknown }[],
    limitVal?: number
  ): QueryRef {
    return {
      where(field: string, _op: '==', value: unknown) {
        return makeQueryRef(colPath, [...filters, { field, value }], limitVal);
      },
      limit(n: number) {
        return makeQueryRef(colPath, filters, n);
      },
      async get(): Promise<QuerySnap> {
        const segments = colPath.split('/').filter(Boolean);
        const collectionId = segments[segments.length - 1];
        const parentSegments = segments.slice(0, -1);
        const runQueryUrl =
          parentSegments.length > 0
            ? `${FIRESTORE_REST_BASE}/${parentSegments.join('/')}:runQuery?${apiKeyParam}`
            : `${FIRESTORE_REST_BASE}:runQuery?${apiKeyParam}`;

        const structuredQuery: Record<string, any> = {
          from: [{ collectionId }],
        };
        if (filters.length === 1) {
          structuredQuery.where = {
            fieldFilter: {
              field: { fieldPath: filters[0].field },
              op: 'EQUAL',
              value: toFirestoreValue(filters[0].value),
            },
          };
        } else if (filters.length > 1) {
          structuredQuery.where = {
            compositeFilter: {
              op: 'AND',
              filters: filters.map((f) => ({
                fieldFilter: {
                  field: { fieldPath: f.field },
                  op: 'EQUAL',
                  value: toFirestoreValue(f.value),
                },
              })),
            },
          };
        }
        if (limitVal !== undefined) {
          structuredQuery.limit = limitVal;
        }

        const { ok, status, data } = await restFetchJson(runQueryUrl, {
          method: 'POST',
          headers: buildRestHeaders(idToken),
          body: JSON.stringify({ structuredQuery }),
        });
        if (!ok) {
          const msg = data?.error?.message || `Firestore query failed (${status})`;
          const err: any = new Error(msg);
          err.code = status === 403 ? 7 : status;
          throw err;
        }
        const rows = Array.isArray(data) ? data : [];
        const docs: QueryDocSnap[] = [];
        for (const row of rows) {
          if (row?.document?.name) {
            const nameParts = String(row.document.name).split('/');
            const docId = nameParts[nameParts.length - 1];
            const parsed = fromFirestoreFields(row.document.fields || {});
            const ref = makeDocRef(colPath, docId);
            docs.push({
              exists: true,
              id: docId,
              data: () => parsed,
              ref,
            });
          }
        }
        return {
          empty: docs.length === 0,
          size: docs.length,
          docs,
        };
      },
    };
  }

  function makeColRef(colPath: string): ColRef {
    const q = makeQueryRef(colPath, []);
    return {
      ...q,
      doc(id?: string): DocRef {
        return makeDocRef(colPath, id || makeRestId());
      },
      async add(data: Record<string, any>): Promise<DocRef> {
        const ref = makeDocRef(colPath, makeRestId());
        await ref.set(data);
        return ref;
      },
    };
  }

  return {
    collection: makeColRef,
    batch() {
      const writes: Record<string, any>[] = [];
      return {
        set(ref: DocRef, data: Record<string, any>, opts?: { merge?: boolean }) {
          writes.push(buildCommitWrite(ref.path, data, opts?.merge ? 'set_merge' : 'set_replace'));
        },
        update(ref: DocRef, data: Record<string, any>) {
          writes.push(buildCommitWrite(ref.path, data, 'update'));
        },
        async commit() {
          await commitWrites(writes);
        },
      };
    },
    async runTransaction(fn) {
      const writes: Record<string, any>[] = [];
      const tx = {
        get: (ref: DocRef) => ref.get(),
        set: (ref: DocRef, data: Record<string, any>, opts?: { merge?: boolean }) => {
          writes.push(buildCommitWrite(ref.path, data, opts?.merge ? 'set_merge' : 'set_replace'));
        },
        update: (ref: DocRef, data: Record<string, any>) => {
          writes.push(buildCommitWrite(ref.path, data, 'update'));
        },
      };
      const result = await fn(tx);
      await commitWrites(writes);
      return result;
    },
  };
}

function wrapAdminDb(): ServerDb {
  function wrapDocRef(nativeRef: FirebaseFirestore.DocumentReference): DocRef {
    const ref: DocRef = {
      id: nativeRef.id,
      path: nativeRef.path,
      async get() {
        const snap = await nativeRef.get();
        return {
          exists: snap.exists,
          id: snap.id,
          data: () => snap.data(),
          ref,
        };
      },
      async set(data: Record<string, any>, opts?: { merge?: boolean }) {
        if (opts?.merge) {
          await nativeRef.set(mapAdminSentinels(data), { merge: true });
        } else {
          await nativeRef.set(mapAdminSentinels(data));
        }
      },
      async update(data: Record<string, any>) {
        await nativeRef.update(mapAdminSentinels(data));
      },
      async delete() {
        await nativeRef.delete();
      },
      collection(subCol: string) {
        return wrapColRef(nativeRef.collection(subCol));
      },
    };
    return ref;
  }

  function wrapQuery(nativeQuery: FirebaseFirestore.Query): QueryRef {
    return {
      where(field: string, op: '==', value: unknown) {
        return wrapQuery(nativeQuery.where(field, op, value));
      },
      limit(n: number) {
        return wrapQuery(nativeQuery.limit(n));
      },
      async get() {
        const snap = await nativeQuery.get();
        return {
          empty: snap.empty,
          size: snap.size,
          docs: snap.docs.map((d) => ({
            exists: true as const,
            id: d.id,
            data: () => d.data(),
            ref: wrapDocRef(d.ref),
          })),
        };
      },
    };
  }

  function wrapColRef(nativeCol: FirebaseFirestore.CollectionReference): ColRef {
    const q = wrapQuery(nativeCol);
    return {
      ...q,
      doc(id?: string) {
        return wrapDocRef(id ? nativeCol.doc(id) : nativeCol.doc());
      },
      async add(data: Record<string, any>) {
        const created = await nativeCol.add(mapAdminSentinels(data));
        return wrapDocRef(created);
      },
    };
  }

  return {
    collection: (colPath: string) => wrapColRef(rawAdminDb.collection(colPath)),
    batch() {
      const b = rawAdminDb.batch();
      return {
        set(ref: DocRef, data: Record<string, any>, opts?: { merge?: boolean }) {
          const nativeRef = rawAdminDb.doc(ref.path);
          if (opts?.merge) b.set(nativeRef, mapAdminSentinels(data), { merge: true });
          else b.set(nativeRef, mapAdminSentinels(data));
        },
        update(ref: DocRef, data: Record<string, any>) {
          b.update(rawAdminDb.doc(ref.path), mapAdminSentinels(data));
        },
        async commit() {
          await b.commit();
        },
      };
    },
    async runTransaction(fn) {
      return rawAdminDb.runTransaction(async (tx) => {
        const wrappedTx = {
          async get(ref: DocRef) {
            const snap = await tx.get(rawAdminDb.doc(ref.path));
            return {
              exists: snap.exists,
              id: snap.id,
              data: () => snap.data(),
              ref,
            };
          },
          set(ref: DocRef, data: Record<string, any>, opts?: { merge?: boolean }) {
            const nativeRef = rawAdminDb.doc(ref.path);
            if (opts?.merge) tx.set(nativeRef, mapAdminSentinels(data), { merge: true });
            else tx.set(nativeRef, mapAdminSentinels(data));
          },
          update(ref: DocRef, data: Record<string, any>) {
            tx.update(rawAdminDb.doc(ref.path), mapAdminSentinels(data));
          },
        };
        return fn(wrappedTx);
      });
    },
  };
}

const cachedAdminWrapper = wrapAdminDb();

export async function getServerDb(idToken?: string): Promise<ServerDb> {
  if (await canUseAdminSdk()) {
    return cachedAdminWrapper;
  }
  return createRestDb(idToken);
}
