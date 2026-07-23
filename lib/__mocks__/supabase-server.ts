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
};

export type Call = {
  kind: "rls" | "admin";
  table: string;
  op: "select" | "insert" | "update" | "delete";
  payload?: any;
  cols?: string;
};

export const calls: Call[] = [];
let scenario: Scenario = {};

/** Reset recorded calls and install the scenario for the next invocation. */
export function __reset(s: Scenario = {}): void {
  calls.length = 0;
  scenario = s;
}

/** Recorded writes/reads, filtered. */
export function callsFor(table: string, op?: Call["op"]): Call[] {
  return calls.filter((c) => c.table === table && (op ? c.op === op : true));
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
    insert(payload: any) {
      rec.op = "insert";
      rec.payload = payload;
      record();
      return Promise.resolve(resp(table, "insert"));
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
    then(res: (v: Resp) => any, rej: (e: any) => any) {
      record();
      const key = rec.op === "update" ? "update" : "select";
      return Promise.resolve(resp(table, key)).then(res, rej);
    },
  };
  return b;
}

function makeClient(kind: "rls" | "admin") {
  return {
    from(table: string) {
      return makeBuilder(kind, table);
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
