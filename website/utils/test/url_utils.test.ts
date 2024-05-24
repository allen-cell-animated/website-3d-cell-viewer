import { describe, expect, it } from "@jest/globals";
import { parseKeyValueList } from "../url_utils";

describe("parseKeyValueList", () => {
  it("returns expected key value pairs", () => {
    const data = "key1:value1,key2:value2";
    const result = parseKeyValueList(data);
    expect(result).toEqual({ key1: "value1", key2: "value2" });
  });

  it("decodes encoded key and value string names", () => {
    const data = "ampersand%26:ampersand%26,comma%2C:comma%2C,colon%3A:colon%3A";
    const result = parseKeyValueList(data);
    expect(result).toEqual({ "ampersand&": "ampersand&", "comma,": "comma,", "colon:": "colon:" });
  });

  it("handles encoded comma strings", () => {
    // throw new Error("Test not implemented");
  });

  it("returns empty object for empty string", () => {
    const data = "";
    const result = parseKeyValueList(data);
    expect(result).toEqual({});
  });
});

describe("deserializeViewerChannelSetting", () => {
  it("handles empty objects", () => {
    throw new Error("Test not implemented");
  });

  it("ignores unexpected keys", () => {
    throw new Error("Test not implemented");
  });

  it("handles expected lut formatting", () => {
    throw new Error("Test not implemented");
  });

  it("ignores unexpected lut formats", () => {
    throw new Error("Test not implemented");
  });

  it("ignores bad color formats", () => {
    throw new Error("Test not implemented");
  });

  it("loads settings correctly", () => {
    throw new Error("Test not implemented");
  });

  it("ignores bad float data", () => {
    throw new Error("Test not implemented");
  });
});

describe("getArgsFromParams", () => {
  it("overrides ch settings when per-channel settings are included", () => {
    throw new Error("Test not implemented");
  });

  it("parses per-channel setting", () => {
    throw new Error("Test not implemented");
  });

  it("parses multiple per-channel settings", () => {
    throw new Error("Test not implemented");
  });

  it("ignores bad per-channel setting formats", () => {
    throw new Error("Test not implemented");
  });
});
