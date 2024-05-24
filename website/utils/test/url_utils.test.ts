import { describe, expect, it } from "@jest/globals";
import { ViewerChannelSettingJson, deserializeViewerChannelSetting, parseKeyValueList } from "../url_utils";
import { ViewerChannelSetting } from "../../../src";

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

  it("returns empty object for empty string", () => {
    const data = "";
    const result = parseKeyValueList(data);
    expect(result).toEqual({});
  });

  it("parses example viewer channel settings", () => {
    const data = "c:FF0000,cz:1,cza:0.5,op:0.75,v:1,i:1,iv:128,lut:%5Bautoij%2C%5D";
    const result = parseKeyValueList(data);
    expect(result).toEqual({
      c: "FF0000",
      cz: "1",
      cza: "0.5",
      op: "0.75",
      v: "1",
      i: "1",
      iv: "128",
      lut: "[autoij,]",
    });
  });

  it("removes whitespace", () => {
    const data = " key1 : value1 , key2 : value2 ";
    const result = parseKeyValueList(data);
    expect(result).toEqual({ key1: "value1", key2: "value2" });
  });
});

describe("deserializeViewerChannelSetting", () => {
  const defaultSettings: ViewerChannelSetting = {
    match: 0,
    color: undefined,
    enabled: false,
    surfaceEnabled: false,
    isovalue: undefined,
    surfaceOpacity: undefined,
    colorizeEnabled: false,
    colorizeAlpha: undefined,
  };

  it("handles empty objects", () => {
    const data = {};
    const result = deserializeViewerChannelSetting(0, data);
    expect(result).toEqual(defaultSettings);
  });

  it("ignores unexpected keys", () => {
    const data = { badKey: "badValue" } as ViewerChannelSettingJson;
    const result = deserializeViewerChannelSetting(0, data);
    expect(result).toEqual(defaultSettings);
  });

  it("loads settings correctly", () => {
    const data = {
      c: "FF0000",
      cz: "1",
      cza: "0.5",
      op: "0.75",
      v: "1",
      i: "1",
      iv: "128",
      lut: "[0,255]",
    } as ViewerChannelSettingJson;
    expect(deserializeViewerChannelSetting(0, data)).toEqual({
      match: 0,
      color: "FF0000",
      enabled: true,
      surfaceEnabled: true,
      isovalue: 128,
      surfaceOpacity: 0.75,
      colorizeEnabled: true,
      colorizeAlpha: 0.5,
      lut: ["0", "255"],
    });
  });

  it("handles expected lut formatting", () => {
    const luts = [
      ["[autoij,0]", ["autoij", "0"]],
      ["[0,autoij]", ["0", "autoij"]],
      ["[0,255]", ["0", "255"]],
      ["[0.5,1.0]", ["0.5", "1.0"]],
      ["[0.50,1.00]", ["0.50", "1.00"]],
      ["[m99,m100]", ["m99", "m100"]],
      ["[p10,p90]", ["p10", "p90"]],
      ["[p10, p90]", ["p10", "p90"]], // handle spaces
    ];
    for (const [encodedLut, decodedLut] of luts) {
      const data = { lut: encodedLut } as ViewerChannelSettingJson;
      const result = deserializeViewerChannelSetting(0, data);
      expect(result.lut).toEqual(decodedLut);
    }
  });

  it("ignores unexpected lut formats", () => {
    const luts = ["[!,0]", "[0,9,93]", "[255]", "[]"];
    for (const lut of luts) {
      const data = { lut } as ViewerChannelSettingJson;
      const result = deserializeViewerChannelSetting(0, data);
      expect(result.lut).toBeUndefined();
    }
  });

  it("handles hex color formats", () => {
    const colors = ["000000", "FFFFFF", "ffffff", "012345", "6789AB", "CDEF01", "abcdef"];
    for (const color of colors) {
      const data = { c: color } as ViewerChannelSettingJson;
      const result = deserializeViewerChannelSetting(0, data);
      expect(result.color).toEqual(color);
    }
  });

  it("ignores bad color formats", () => {
    const badColors = ["f", "ff00", "red", "rgb(255,0,0)"];
    for (const color of badColors) {
      const data = { c: color } as ViewerChannelSettingJson;
      const result = deserializeViewerChannelSetting(0, data);
      expect(result.color).toBeUndefined();
    }
  });

  it("ignores bad float data", () => {
    const data = { cza: "NaN", op: "bad", iv: "f8" } as ViewerChannelSettingJson;
    const result = deserializeViewerChannelSetting(0, data);
    expect(result.colorizeAlpha).toBeUndefined();
    expect(result.surfaceOpacity).toBeUndefined();
    expect(result.isovalue).toBeUndefined();
  });
});

describe("getArgsFromParams", () => {
  // it("overrides ch settings when per-channel settings are included", () => {
  //   throw new Error("Test not implemented");
  // });
  // it("parses per-channel setting", () => {
  //   throw new Error("Test not implemented");
  // });
  // it("parses multiple per-channel settings", () => {
  //   throw new Error("Test not implemented");
  // });
  // it("ignores bad per-channel setting formats", () => {
  //   throw new Error("Test not implemented");
  // });
});
