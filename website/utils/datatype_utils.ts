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

/**
 * Returns whether two (1-dimensional) arrays have values that are
 * strictly equal. Note that this does not handle nested arrays.
 */
export function isArrayEqual(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((val, i) => val === b[i]);
}

/**
 * Returns a copy of `obj` where all properties with values that match the properties of `match` are removed.
 * Equality checks arrays with `isArrayEqual` and values with strict equality. Note that this
 * equality check will fail for objects.
 */
export function removeMatchingProperties<T extends Object>(obj: Partial<T>, match: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key in obj) {
    const valueMatches = obj[key] === match[key];
    const arrayMatches =
      Array.isArray(obj[key]) &&
      Array.isArray(match[key]) &&
      isArrayEqual(obj[key] as unknown[], match[key] as unknown[]);
    if (!valueMatches && !arrayMatches) {
      result[key] = obj[key];
    }
  }
  return result;
}
