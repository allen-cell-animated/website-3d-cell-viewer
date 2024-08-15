/**
 * Returns a (shallow) copy of an object with all properties that are
 * `undefined` removed.
 */
export function removeUndefinedProperties<T>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

function isArrayDeepEqual(a: unknown[], b: unknown[]): boolean {
  if (!Array.isArray(a) || !Array.isArray(b)) {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }

  return a.every((val, i) => {
    return isDeepEqual(val, b[i]);
  });
}

function isObjectDeepEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  if (Object.keys(a).length !== Object.keys(b).length) {
    return false;
  }
  for (const key in a) {
    if (!isDeepEqual(a[key], b[key])) {
      return false;
    }
  }
  return true;
}

/**
 * Recursively checks for deep equality between two elements, including objects or arrays.
 * @param a
 * @param b
 * @returns true if `a` and `b` are deeply equal, false otherwise. Handles NaN values
 * and nested arrays.
 */
export function isDeepEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (a === null || b === null) {
    return false;
  }
  if (Number.isNaN(a) && Number.isNaN(b)) {
    return true;
  }
  if (typeof a === "object" && typeof b === "object") {
    if (Array.isArray(a) && Array.isArray(b)) {
      return isArrayDeepEqual(a, b);
    } else {
      return isObjectDeepEqual(a as Record<string, unknown>, b as Record<string, unknown>);
    }
  }
  return false;
}

/**
 * Returns a copy of `obj` where all properties with values that match the properties of `match` are removed.
 * Matching is determined by deep equality (see `isDeepEqual()`).
 */
export function removeMatchingProperties<T extends Object>(obj: Partial<T>, match: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key in obj) {
    if (!isDeepEqual(obj[key], match[key])) {
      result[key] = obj[key];
    }
  }
  return result;
}
