import { isEqual } from "lodash";

/** `true` if `p` is not an array that contains another array */
export const notDoublyNested = <T>(p: T | (T | T[])[]): p is T | T[] => !Array.isArray(p) || !p.some(Array.isArray);

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
 * Returns a copy of `obj` where all properties with values that match the properties of `match`
 * are removed. Matching is determined by deep equality (see `isDeepEqual()`).
 */
export function removeMatchingProperties<T extends Object>(obj: Partial<T>, match: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key in obj) {
    if (!isEqual(obj[key], match[key])) {
      result[key] = obj[key];
    }
  }
  return result;
}
