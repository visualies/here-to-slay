/**
 * Read-only wrapper for Yjs documents
 * Prevents client-side mutations by blocking all write operations
 */

import * as Y from 'yjs';

const MUTATION_ERROR = 'Client-side mutations are disabled. Use API endpoints instead.';

class ReadOnlyYMap<T> {
  private map: Y.Map<T>;

  constructor(map: Y.Map<T>) {
    this.map = map;
  }

  // Allow read operations
  get(key: string): T | undefined {
    return this.map.get(key);
  }

  has(key: string): boolean {
    return this.map.has(key);
  }

  keys(): IterableIterator<string> {
    return this.map.keys();
  }

  values(): IterableIterator<T> {
    return this.map.values();
  }

  entries(): IterableIterator<[string, T]> {
    return this.map.entries();
  }

  forEach(callback: (value: T, key: string) => void): void {
    this.map.forEach(callback);
  }

  get size(): number {
    return this.map.size;
  }

  // Allow observations
  observe(callback: (event: Y.YMapEvent<T>, transaction: Y.Transaction) => void): void {
    this.map.observe(callback);
  }

  unobserve(callback: (event: Y.YMapEvent<T>, transaction: Y.Transaction) => void): void {
    this.map.unobserve(callback);
  }

  // Block write operations
  set(key: string, value: T): T {
    console.error(MUTATION_ERROR, { operation: 'set', key, value });
    console.trace('Stack trace for blocked mutation:');

    // In development, show a more helpful error
    if (process.env.NODE_ENV === 'development') {
      alert(`❌ Client-side mutation blocked!\n\nOperation: set("${key}")\nUse API endpoints instead.`);
    }

    throw new Error(MUTATION_ERROR);
  }

  delete(key: string): boolean {
    console.error(MUTATION_ERROR, { operation: 'delete', key });
    throw new Error(MUTATION_ERROR);
  }

  clear(): void {
    console.error(MUTATION_ERROR, { operation: 'clear' });
    throw new Error(MUTATION_ERROR);
  }
}

class ReadOnlyYArray<T> {
  private array: Y.Array<T>;

  constructor(array: Y.Array<T>) {
    this.array = array;
  }

  // Allow read operations
  get(index: number): T {
    return this.array.get(index);
  }

  toArray(): T[] {
    return this.array.toArray();
  }

  get length(): number {
    return this.array.length;
  }

  slice(start?: number, end?: number): T[] {
    return this.array.slice(start, end);
  }

  // Allow observations
  observe(callback: (event: Y.YArrayEvent<T>, transaction: Y.Transaction) => void): void {
    this.array.observe(callback);
  }

  unobserve(callback: (event: Y.YArrayEvent<T>, transaction: Y.Transaction) => void): void {
    this.array.unobserve(callback);
  }

  // Block write operations
  push(items: T[]): number {
    console.error(MUTATION_ERROR, { operation: 'push', items });
    throw new Error(MUTATION_ERROR);
  }

  insert(index: number, content: T[]): void {
    console.error(MUTATION_ERROR, { operation: 'insert', index, content });
    throw new Error(MUTATION_ERROR);
  }

  delete(index: number, length?: number): void {
    console.error(MUTATION_ERROR, { operation: 'delete', index, length });
    throw new Error(MUTATION_ERROR);
  }
}

export class ReadOnlyYDoc {
  private doc: Y.Doc;
  private mapCache = new Map<string, ReadOnlyYMap<unknown>>();
  private arrayCache = new Map<string, ReadOnlyYArray<unknown>>();

  constructor(doc: Y.Doc) {
    this.doc = doc;
  }

  getMap<T>(name: string): ReadOnlyYMap<T> {
    if (!this.mapCache.has(name)) {
      const map = this.doc.getMap<T>(name);
      const readOnlyMap = new ReadOnlyYMap(map);
      this.mapCache.set(name, readOnlyMap as ReadOnlyYMap<unknown>);
    }
    return this.mapCache.get(name)! as ReadOnlyYMap<T>;
  }

  getArray<T>(name: string): ReadOnlyYArray<T> {
    if (!this.arrayCache.has(name)) {
      const array = this.doc.getArray<T>(name);
      const readOnlyArray = new ReadOnlyYArray(array);
      this.arrayCache.set(name, readOnlyArray as ReadOnlyYArray<unknown>);
    }
    return this.arrayCache.get(name)! as ReadOnlyYArray<T>;
  }

  // Allow observations on the document
  on(eventName: 'destroy' | 'load' | 'sync' | 'update' | 'updateV2' | 'beforeAllTransactions' | 'beforeTransaction' | 'beforeObserverCalls' | 'afterTransaction' | 'afterTransactionCleanup' | 'afterAllTransactions' | 'subdocs', callback: (...args: unknown[]) => void): void {
    this.doc.on(eventName, callback);
  }

  off(eventName: 'destroy' | 'load' | 'sync' | 'update' | 'updateV2' | 'beforeAllTransactions' | 'beforeTransaction' | 'beforeObserverCalls' | 'afterTransaction' | 'afterTransactionCleanup' | 'afterAllTransactions' | 'subdocs', callback: (...args: unknown[]) => void): void {
    this.doc.off(eventName, callback);
  }

  // Block document-level mutations
  transact(): void {
    console.error(MUTATION_ERROR, { operation: 'transact' });
    throw new Error(MUTATION_ERROR);
  }

  destroy(): void {
    console.error(MUTATION_ERROR, { operation: 'destroy' });
    throw new Error(MUTATION_ERROR);
  }
}

/**
 * Create a read-only wrapper around a Yjs document
 */
export function createReadOnlyDoc(doc: Y.Doc): ReadOnlyYDoc {
  return new ReadOnlyYDoc(doc);
}

/**
 * Always wrap document with read-only protection
 * Server is now the authoritative source for all mutations
 */
export function wrapDocument(doc: Y.Doc): ReadOnlyYDoc {
  return createReadOnlyDoc(doc);
}