import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LRUCache } from "./cache";

describe("LRUCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores and retrieves values", () => {
    const cache = new LRUCache<string>();
    cache.set("key1", "value1");
    expect(cache.get("key1")).toBe("value1");
  });

  it("returns null for missing keys", () => {
    const cache = new LRUCache<string>();
    expect(cache.get("missing")).toBeNull();
  });

  it("evicts oldest entry when full", () => {
    const cache = new LRUCache<string>(3);
    cache.set("a", "1");
    cache.set("b", "2");
    cache.set("c", "3");
    cache.set("d", "4"); // should evict "a"

    expect(cache.get("a")).toBeNull();
    expect(cache.get("b")).toBe("2");
    expect(cache.get("d")).toBe("4");
  });

  it("promotes accessed items (LRU behavior)", () => {
    const cache = new LRUCache<string>(3);
    cache.set("a", "1");
    cache.set("b", "2");
    cache.set("c", "3");

    // Access "a" to promote it
    cache.get("a");

    // Adding "d" should evict "b" (oldest non-accessed)
    cache.set("d", "4");
    expect(cache.get("a")).toBe("1");
    expect(cache.get("b")).toBeNull();
  });

  it("expires entries after maxAge", () => {
    const cache = new LRUCache<string>(100, 1000); // 1 second TTL
    cache.set("key", "value");
    expect(cache.get("key")).toBe("value");

    vi.advanceTimersByTime(1001);
    expect(cache.get("key")).toBeNull();
  });

  it("does not expire entries before maxAge", () => {
    const cache = new LRUCache<string>(100, 5000);
    cache.set("key", "value");

    vi.advanceTimersByTime(4999);
    expect(cache.get("key")).toBe("value");
  });

  it("clears all entries", () => {
    const cache = new LRUCache<string>();
    cache.set("a", "1");
    cache.set("b", "2");
    cache.clear();

    expect(cache.get("a")).toBeNull();
    expect(cache.get("b")).toBeNull();
    expect(cache.size).toBe(0);
  });

  it("tracks size correctly", () => {
    const cache = new LRUCache<string>();
    expect(cache.size).toBe(0);

    cache.set("a", "1");
    expect(cache.size).toBe(1);

    cache.set("b", "2");
    expect(cache.size).toBe(2);

    cache.clear();
    expect(cache.size).toBe(0);
  });

  it("overwrites existing keys", () => {
    const cache = new LRUCache<string>();
    cache.set("key", "old");
    cache.set("key", "new");
    expect(cache.get("key")).toBe("new");
  });
});
