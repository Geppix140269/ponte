// A minimal renderer for client components, with no browser and no extra
// dependency.
//
// The landing page is a function of props and hook state that returns React
// elements. This calls the component with a hand-written hook dispatcher, keeps
// its state between renders, and re-renders when a setter fires. That is enough
// to press a real control and observe what the component did: React elements
// are plain objects, so a handler found in the tree is the same function the
// browser would call.
//
// It deliberately does not render children: only the component under test is
// invoked, and nested components appear in the tree as elements whose props can
// be read and called.

import React from "react";

interface Dispatcher {
  useState<S>(initial: S | (() => S)): [S, (next: S | ((prev: S) => S)) => void];
  useRef<T>(initial: T): { current: T };
  useMemo<T>(factory: () => T): T;
  useCallback<T>(fn: T): T;
  useEffect(): void;
  useLayoutEffect(): void;
  useDebugValue(): void;
  useId(): string;
  useContext<T>(context: { _currentValue: T }): T;
  useTransition(): [boolean, (fn: () => void) => void];
  useSyncExternalStore<T>(subscribe: unknown, getSnapshot: () => T, getServer?: () => T): T;
}

const internals = (
  React as unknown as {
    __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: {
      ReactCurrentDispatcher: { current: unknown };
    };
  }
).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;

/** A rendered React element, as a plain object the test can read. */
export interface TestElement {
  type: unknown;
  props: Record<string, unknown> & { children?: unknown };
  ref?: { current: unknown } | null;
}

export interface Mounted {
  /** The current tree, re-read after every state change. */
  readonly tree: unknown;
  /** Every element in the current tree, depth first. */
  all(): TestElement[];
  /** The single element matching `match`, or a thrown error. */
  find(match: (el: TestElement) => boolean, what: string): TestElement;
}

export function mount<P>(Component: (props: P) => unknown, props: P): Mounted {
  const cells: unknown[] = [];
  let cursor = 0;
  let tree: unknown = null;

  const cell = <T,>(initial: () => T): number => {
    const index = cursor++;
    if (!(index in cells)) cells[index] = initial();
    return index;
  };

  const dispatcher: Dispatcher = {
    useState<S>(initial: S | (() => S)) {
      const index = cell(() =>
        typeof initial === "function" ? (initial as () => S)() : initial,
      );
      const set = (next: S | ((prev: S) => S)) => {
        const previous = cells[index] as S;
        const value = typeof next === "function" ? (next as (p: S) => S)(previous) : next;
        if (Object.is(value, previous)) return;
        cells[index] = value;
        render();
      };
      return [cells[index] as S, set];
    },
    useRef<T>(initial: T) {
      const index = cell(() => ({ current: initial }));
      return cells[index] as { current: T };
    },
    useMemo<T>(factory: () => T) {
      return factory();
    },
    useCallback<T>(fn: T) {
      return fn;
    },
    // Effects belong to a real commit; a test drives the component directly.
    useEffect() {},
    useLayoutEffect() {},
    useDebugValue() {},
    useId() {
      return "test-id";
    },
    useContext<T>(context: { _currentValue: T }) {
      return context._currentValue;
    },
    useTransition() {
      return [false, (fn: () => void) => fn()];
    },
    useSyncExternalStore<T>(_subscribe: unknown, getSnapshot: () => T) {
      return getSnapshot();
    },
  };

  function render(): void {
    const previous = internals.ReactCurrentDispatcher.current;
    internals.ReactCurrentDispatcher.current = dispatcher;
    cursor = 0;
    try {
      tree = Component(props);
    } finally {
      internals.ReactCurrentDispatcher.current = previous;
    }
  }

  render();

  const collect = (node: unknown, out: TestElement[]): TestElement[] => {
    if (Array.isArray(node)) {
      for (const child of node) collect(child, out);
      return out;
    }
    if (!node || typeof node !== "object") return out;
    const el = node as TestElement;
    if (!("type" in el) || !el.props) return out;
    out.push(el);
    collect(el.props.children, out);
    return out;
  };

  return {
    get tree() {
      return tree;
    },
    all() {
      return collect(tree, []);
    },
    find(match, what) {
      const hits = this.all().filter(match);
      if (hits.length !== 1) {
        throw new Error(`expected exactly one ${what}, found ${hits.length}`);
      }
      return hits[0];
    },
  };
}

/** Read a string prop (className, type, ...) without casting at every call. */
export function prop(el: TestElement, name: string): unknown {
  return el.props[name];
}

/** Fire an element's handler, exactly as the browser would. */
export function fire(el: TestElement, handler: string, ...args: unknown[]): unknown {
  const fn = el.props[handler];
  if (typeof fn !== "function") throw new Error(`no ${handler} on this element`);
  return (fn as (...a: unknown[]) => unknown)(...args);
}
