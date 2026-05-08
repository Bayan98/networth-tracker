export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function assertEquals<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(message ?? `Expected ${String(expected)}, got ${String(actual)}`);
  }
}

export function assertDeepEquals(actual: unknown, expected: unknown, message?: string) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(message ?? `Expected ${expectedJson}, got ${actualJson}`);
  }
}

export function assertCanonicalDeepEquals(actual: unknown, expected: unknown, message?: string) {
  const actualJson = JSON.stringify(canonical(actual));
  const expectedJson = JSON.stringify(canonical(expected));
  if (actualJson !== expectedJson) {
    throw new Error(message ?? `Expected ${expectedJson}, got ${actualJson}`);
  }
}

export function assertInRange(value: number, min: number, max: number, message: string) {
  if (value < min || value > max) {
    throw new Error(`${message}: expected ${value} to be between ${min} and ${max}`);
  }
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => [key, canonical(child)]),
  );
}
