// A tiny in-memory stand-in for the parts of the Supabase client this app uses.
// Used only in sample mode: reads come from the fictional dataset, writes are
// applied to memory for the session and never leave the browser.
import type { SupabaseClient } from '@supabase/supabase-js';
import { SAMPLE_USER, buildSampleTables } from './sampleData';

type Row = Record<string, unknown>;
type Pred = (row: Row) => boolean;

let tables: Record<string, Row[]> = {};
let idCounter = 0;
const newId = () => `sample-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

function coerce(v: string): unknown {
  if (v === 'null') return null;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return v;
}

// Loose equality so numeric strings from `.or()` filters match numbers.
// eslint-disable-next-line eqeqeq
const same = (a: unknown, b: unknown) => a == b;

// Parses PostgREST `.or()` syntax: "a.eq.1,and(b.eq.2,c.eq.3)"
function parseOr(expr: string): Pred {
  const parts: string[] = [];
  let depth = 0;
  let buf = '';
  for (const ch of expr) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { parts.push(buf); buf = ''; } else buf += ch;
  }
  if (buf) parts.push(buf);
  const preds = parts.map((p): Pred => {
    if (p.startsWith('and(') && p.endsWith(')')) {
      const subs = p.slice(4, -1).split(',').map((s) => parseOr(s));
      return (r) => subs.every((s) => s(r));
    }
    const [col, op, ...rest] = p.split('.');
    const val = coerce(rest.join('.'));
    if (op === 'eq') return (r) => same(r[col], val);
    if (op === 'neq') return (r) => !same(r[col], val);
    if (op === 'is') return (r) => (r[col] ?? null) === val;
    return () => true;
  });
  return (r) => preds.some((p) => p(r));
}

class Query implements PromiseLike<{ data: unknown; error: unknown; count?: number }> {
  private filters: Pred[] = [];
  private orders: { col: string; asc: boolean }[] = [];
  private max: number | null = null;
  private mode: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: Row[] | Row | null = null;
  private returning = false;
  private one: 'single' | 'maybe' | null = null;

  constructor(private table: string) {
    if (!tables[table]) tables[table] = [];
  }

  select() { if (this.mode !== 'select') this.returning = true; return this; }
  insert(values: Row | Row[]) { this.mode = 'insert'; this.payload = values; return this; }
  upsert(values: Row | Row[]) { return this.insert(values); }
  update(values: Row) { this.mode = 'update'; this.payload = values; return this; }
  delete() { this.mode = 'delete'; return this; }

  private where(p: Pred) { this.filters.push(p); return this; }
  eq(col: string, v: unknown) {
    // Every row belongs to the sample user; ignore whoever the app thinks is signed in.
    if (col === 'user_id') return this;
    return this.where((r) => same(r[col], v));
  }
  neq(col: string, v: unknown) { return this.where((r) => !same(r[col], v)); }
  gt(col: string, v: number) { return this.where((r) => (r[col] as number) > v); }
  gte(col: string, v: number) { return this.where((r) => (r[col] as number) >= v); }
  lt(col: string, v: number) { return this.where((r) => (r[col] as number) < v); }
  lte(col: string, v: number) { return this.where((r) => (r[col] as number) <= v); }
  is(col: string, v: unknown) { return this.where((r) => (r[col] ?? null) === v); }
  in(col: string, vs: unknown[]) { return this.where((r) => vs.some((v) => same(r[col], v))); }
  not(col: string, op: string, v: unknown) {
    if (op === 'is') return this.where((r) => (r[col] ?? null) !== v);
    if (op === 'eq') return this.where((r) => !same(r[col], v));
    return this;
  }
  or(expr: string) { return this.where(parseOr(expr)); }
  order(col: string, opts?: { ascending?: boolean }) { this.orders.push({ col, asc: opts?.ascending !== false }); return this; }
  limit(n: number) { this.max = n; return this; }
  range(from: number, to: number) { this.max = to - from + 1; return this; }
  single() { this.one = 'single'; return this; }
  maybeSingle() { this.one = 'maybe'; return this; }

  private matching(): Row[] {
    return tables[this.table].filter((r) => this.filters.every((f) => f(r)));
  }

  private run(): { data: unknown; error: unknown } {
    let rows: Row[];
    const store = tables[this.table];
    if (this.mode === 'insert') {
      const list = Array.isArray(this.payload) ? this.payload : [this.payload as Row];
      rows = list.map((v) => ({ id: newId(), user_id: SAMPLE_USER.id, ...v }));
      store.push(...rows);
      if (!this.returning) return { data: null, error: null };
    } else if (this.mode === 'update') {
      rows = this.matching();
      rows.forEach((r) => Object.assign(r, this.payload));
      if (!this.returning) return { data: null, error: null };
    } else if (this.mode === 'delete') {
      const doomed = new Set(this.matching());
      tables[this.table] = store.filter((r) => !doomed.has(r));
      return { data: null, error: null };
    } else {
      rows = this.matching();
    }

    rows = rows.map((r) => ({ ...r }));
    for (const { col, asc } of [...this.orders].reverse()) {
      rows.sort((a, b) => {
        const x = a[col] as number | string, y = b[col] as number | string;
        if (x === y) return 0;
        if (x == null) return 1;
        if (y == null) return -1;
        return (x < y ? -1 : 1) * (asc ? 1 : -1);
      });
    }
    if (this.max !== null) rows = rows.slice(0, this.max);

    if (this.one) {
      if (rows.length === 0) {
        return this.one === 'maybe'
          ? { data: null, error: null }
          : { data: null, error: { code: 'PGRST116', message: 'No rows found' } };
      }
      return { data: rows[0], error: null };
    }
    return { data: rows, error: null };
  }

  then<A = { data: unknown; error: unknown }, B = never>(
    onfulfilled?: ((value: { data: unknown; error: unknown }) => A | PromiseLike<A>) | null,
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return Promise.resolve().then(() => this.run()).then(onfulfilled, onrejected);
  }
}

const session = { user: SAMPLE_USER, access_token: 'sample', refresh_token: 'sample' };

export function createFakeSupabase(): SupabaseClient {
  tables = buildSampleTables();
  const client = {
    from: (table: string) => new Query(table),
    rpc: async (fn: string, args: { items?: { id: string; order: number; section_id: string | null }[] }) => {
      if (fn === 'reorder_todos' && args.items) {
        for (const it of args.items) {
          const row = tables.todos.find((t) => t.id === it.id);
          if (row) Object.assign(row, { order: it.order, section_id: it.section_id });
        }
      }
      return { data: null, error: null };
    },
    auth: {
      getSession: async () => ({ data: { session }, error: null }),
      getUser: async () => ({ data: { user: SAMPLE_USER }, error: null }),
      onAuthStateChange: (cb: (event: string, s: typeof session) => void) => {
        setTimeout(() => cb('SIGNED_IN', session), 0);
        return { data: { subscription: { unsubscribe() {} } } };
      },
      signInWithOAuth: async () => ({ data: null, error: null }),
      signOut: async () => ({ error: null }),
    },
  };
  return client as unknown as SupabaseClient;
}
