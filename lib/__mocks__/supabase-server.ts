// Test double for @/lib/supabase/server.
//
// A small, faithful stand-in for the postgrest query builder: the chain
// (from/select/insert/update/eq/in/order/limit/maybeSingle) is recorded and
// resolved from a per-test scenario keyed by `${table}:${op}`. Enough to let a
// route or server action run end to end without a database, and to assert
// exactly which reads and writes it performed.

/* eslint-disable @typescript-eslint/no-explicit-any */

type Resp = { data?: any; error?: any; count?: number };

export type Scenario = {
  responses?: Record<string, Resp>;
  getUserById?: (id: string) => { data: { user: { email?: string } | null } };
  /** Responses for `sb.rpc(name, args)`, keyed by function name. */
  rpc?: Record<string, Resp>;
};

export type Call = {
  kind: "rls" | "admin";
  table: string;
  op: "select" | "insert" | "update" | "delete" | "upsert";
  payload?: any;
  cols?: string;
};

export type RpcCall = { fn: string; args?: any };

export const calls: Call[] = [];
export const rpcCalls: RpcCall[] = [];
let scenario: Scenario = {};

/** Reset recorded calls and install the scenario for the next invocation. */
export function __reset(s: Scenario = {}): void {
  calls.length = 0;
  rpcCalls.length = 0;
  scenario = s;
}

/** Recorded writes/reads, filtered. */
export function callsFor(table: string, op?: Call["op"]): Call[] {
  return calls.filter((c) => c.table === table && (op ? c.op === op : true));
}

/** Recorded stored-procedure calls, filtered by name. */
export function rpcCallsFor(fn: string): RpcCall[] {
  return rpcCalls.filter((c) => c.fn === fn);
}

function resp(table: string, op: string): Resp {
  return scenario.responses?.[`${table}:${op}`] ?? { data: null, error: null };
}

function makeBuilder(kind: "rls" | "admin", table: string) {
  const rec: Call = { kind, table, op: "select" };
  let recorded = false;
  const record = () => {
    if (!recorded) {
      calls.push({ ...rec });
      recorded = true;
    }
  };

  const b: any = {
    select(cols: string) {
      rec.cols = cols;
      return b;
    },
    // Returns the builder rather than a promise so that the postgrest shape
    // `.insert(row).select("id").single()` works. The builder is thenable, so
    // a bare `await sb.from(t).insert(row)` still resolves the `${t}:insert`
    // response exactly as before.
    insert(payload: any) {
      rec.op = "insert";
      rec.payload = payload;
      record();
      return b;
    },
    upsert(payload: any) {
      rec.op = "upsert";
      rec.payload = payload;
      record();
      return b;
    },
    update(payload: any) {
      rec.op = "update";
      rec.payload = payload;
      record();
      return b;
    },
    delete() {
      rec.op = "delete";
      record();
      return b;
    },
    eq() {
      return b;
    },
    is() {
      return b;
    },
    in() {
      return b;
    },
    order() {
      return b;
    },
    limit() {
      return b;
    },
    maybeSingle() {
      record();
      return Promise.resolve(resp(table, "maybeSingle"));
    },
    single() {
      record();
      // After an insert or upsert the row comes back from that write, so the
      // scenario key is the write, not a separate read.
      return Promise.resolve(resp(table, rec.op === "select" ? "single" : rec.op));
    },
    then(res: (v: Resp) => any, rej: (e: any) => any) {
      record();
      return Promise.resolve(resp(table, rec.op)).then(res, rej);
    },
  };
  return b;
}

function makeClient(kind: "rls" | "admin") {
  return {
    from(table: string) {
      return makeBuilder(kind, table);
    },
    async rpc(fn: string, args?: any) {
      rpcCalls.push({ fn, args });
      return scenario.rpc?.[fn] ?? { data: [], error: null };
    },
    auth: {
      admin: {
        async getUserById(id: string) {
          return scenario.getUserById
            ? scenario.getUserById(id)
            : { data: { user: null } };
        },
      },
    },
  };
}

export function createClient() {
  return makeClient("rls");
}

export function createAdminClient() {
  return makeClient("admin");
}
