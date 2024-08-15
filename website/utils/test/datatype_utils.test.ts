import { describe, expect, it } from "@jest/globals";
import { isDeepEqual } from "../datatype_utils";
import { ControlPoint } from "@aics/volume-viewer";

describe("isDeepEqual", () => {
  it("handles primitive types", () => {
    expect(isDeepEqual(1, 1)).toBe(true);
    expect(isDeepEqual(1, 2)).toBe(false);

    expect(isDeepEqual("a", "a")).toBe(true);
    expect(isDeepEqual("a", "b")).toBe(false);

    expect(isDeepEqual(true, true)).toBe(true);
    expect(isDeepEqual(true, false)).toBe(false);
    expect(isDeepEqual(false, false)).toBe(true);
  });

  it("handles NaN", () => {
    expect(isDeepEqual(NaN, NaN)).toBe(true);
    expect(isDeepEqual(NaN, 1)).toBe(false);
  });

  it("handles undefined and null", () => {
    expect(isDeepEqual(undefined, undefined)).toBe(true);
    expect(isDeepEqual(null, null)).toBe(true);
  });

  it("handles empty object", () => {
    expect(isDeepEqual({}, {})).toBe(true);
  });

  it("handles 1D arrays", () => {
    expect(isDeepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(isDeepEqual([1, 2, 3], [4, 5, 6])).toBe(false);
  });

  it("handles null and undefined comparison with objects", () => {
    expect(isDeepEqual({}, null)).toBe(false);
    expect(isDeepEqual(null, {})).toBe(false);
    expect(isDeepEqual({}, undefined)).toBe(false);
    expect(isDeepEqual(undefined, {})).toBe(false);
  });

  it("handles null and undefined comparison with arrays", () => {
    expect(isDeepEqual([], null)).toBe(false);
    expect(isDeepEqual(null, [])).toBe(false);
    expect(isDeepEqual([], undefined)).toBe(false);
    expect(isDeepEqual(undefined, [])).toBe(false);
  });

  it("handles nested arrays", () => {
    const a = [1, [1, 2], [1, 2, [3]]];
    let b = [1, [1, 2], [1, 2, [3]]];
    expect(isDeepEqual(a, b)).toBe(true);

    b = [1, [1, 2], [1, 2, [4]]];
    expect(isDeepEqual(a, b)).toBe(false);
  });

  it("handles basic object comparison", () => {
    const getObject = (): Record<string, unknown> => ({ a: 1, b: true, c: undefined, d: null, e: NaN, f: "something" });
    const a = getObject();
    let b = getObject();
    expect(isDeepEqual(a, b)).toBe(true);

    b = { ...getObject(), a: 2 };
    expect(isDeepEqual(a, b)).toBe(false);
  });

  it("handles objects with array properties", () => {
    const getObject = (): { a: number; b: number; c: number[] } => ({ a: 1, b: 0.24, c: [1, 2, 3] });
    const a = getObject();
    let b = getObject();
    expect(isDeepEqual(a, b)).toBe(true);

    b = { ...getObject(), c: [1, 2, 4] };
    expect(isDeepEqual(a, b)).toBe(false);
  });

  it("handles arrays of objects", () => {
    const getObject = (): ControlPoint[] => {
      return [
        { x: 1, opacity: 1, color: [255, 255, 255] },
        { x: 2, opacity: 1, color: [128, 128, 255] },
        { x: 3, opacity: 0.5, color: [0, 255, 0] },
      ];
    };
    const a = getObject();
    let b = getObject();
    expect(isDeepEqual(a, b)).toBe(true);

    b = [
      { x: 1, opacity: 1, color: [255, 255, 255] },
      { x: 50, opacity: 4.7, color: [128, 128, 255] },
      { x: 128, opacity: 0.5, color: [0, 255, 1] },
    ];
    expect(isDeepEqual(a, b)).toBe(false);
  });
});
