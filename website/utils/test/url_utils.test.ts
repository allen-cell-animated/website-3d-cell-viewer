import { describe, expect, it } from "@jest/globals";
import {
  ViewerChannelSettingJson,
  deserializeViewerChannelSetting,
  getArgsFromParams,
  parseKeyValueList,
  urlSearchParamsToParams,
} from "../url_utils";
import { ViewerChannelSetting } from "../../../src";

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

  it("ignores repeat colons in value string", () => {
    const data = "key1:value1:extra:extra,key2:value2";
    const result = parseKeyValueList(data);
    expect(result).toEqual({ key1: "value1:extra:extra", key2: "value2" });
  });

  it("returns empty object for empty string", () => {
    const data = "";
    const result = parseKeyValueList(data);
    expect(result).toEqual({});
  });

  it("parses example viewer channel settings", () => {
    const data = "c:FF0000,cz:1,cza:0.5,op:0.75,v:1,i:1,iv:128,lut:autoij:";
    const result = parseKeyValueList(data);
    expect(result).toEqual({
      c: "FF0000",
      cz: "1",
      cza: "0.5",
      op: "0.75",
      v: "1",
      i: "1",
      iv: "128",
      lut: "autoij:",
    });
  });

  it("removes whitespace", () => {
    const data = " key1 : value1 , key2 : value2 ";
    const result = parseKeyValueList(data);
    expect(result).toEqual({ key1: "value1", key2: "value2" });
  });
});

describe("deserializeViewerChannelSetting", () => {
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
      lut: "0:255",
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
      ["autoij:0", ["autoij", "0"]],
      ["0:autoij", ["0", "autoij"]],
      ["0:255", ["0", "255"]],
      ["0.5:1.0", ["0.5", "1.0"]],
      ["0.50:1.00", ["0.50", "1.00"]],
      ["m99:m100", ["m99", "m100"]],
      ["p10:p90", ["p10", "p90"]],
      ["p10: p90", ["p10", "p90"]], // handle spaces
    ];
    for (const [encodedLut, decodedLut] of luts) {
      const data = { lut: encodedLut } as ViewerChannelSettingJson;
      const result = deserializeViewerChannelSetting(0, data);
      expect(result.lut).toEqual(decodedLut);
    }
  });

  it("ignores unexpected lut formats", () => {
    const luts = ["!:0", "0:9:93", "255", ""];
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
  // Note that all of these are NOT encoded.
  // Tests will try parsing both unencoded and encoded.
  const channelParamToSetting: [string, string, ViewerChannelSetting][] = [
    [
      "c3=v:1,c:ff00ff,cz:0,cza:0.9,op:0.4,lut:p50:p99,i:1,iv:129",
      "c3=v%3A1%2Cc%3Aff00ff%2Ccz%3A0%2Ccza%3A0.9%2Cop%3A0.4%2Clut%3Ap50%3Ap99%2Ci%3A1%2Civ%3A129",
      {
        color: "ff00ff",
        name: undefined,
        match: 3,
        enabled: true,
        surfaceEnabled: true,
        surfaceOpacity: 0.4,
        colorizeEnabled: false,
        colorizeAlpha: 0.9,
        isovalue: 129,
        lut: ["p50", "p99"],
      },
    ],
    [
      "c1=v:0,c:ff0000,cz:1,cza:0.5,op:0.75,lut:0:255,i:0,iv:0",
      "c1=v%3A0%2Cc%3Aff0000%2Ccz%3A1%2Ccza%3A0.5%2Cop%3A0.75%2Clut%3A0%3A255%2Ci%3A0%2Civ%3A0",
      {
        color: "ff0000",
        name: undefined,
        match: 1,
        colorizeEnabled: true,
        colorizeAlpha: 0.5,
        surfaceOpacity: 0.75,
        surfaceEnabled: false,
        enabled: false,
        isovalue: 0,
        lut: ["0", "255"],
      },
    ],
    [
      "c5=v:0,c:00ff00,cz:0,cza:0,op:1,lut:autoij:,i:1,iv:100",
      "c5=v%3A0%2Cc%3A00ff00%2Ccz%3A0%2Ccza%3A0%2Cop%3A1%2Clut%3Aautoij%3A%2Ci%3A1%2Civ%3A100",
      {
        color: "00ff00",
        name: undefined,
        match: 5,
        colorizeEnabled: false,
        colorizeAlpha: 0,
        surfaceOpacity: 1,
        surfaceEnabled: true,
        enabled: false,
        isovalue: 100,
        lut: ["autoij", ""],
      },
    ],
  ];

  it("parses unencoded per-channel setting", async () => {
    for (const [queryString, _, expected] of channelParamToSetting) {
      const params = new URLSearchParams(queryString);
      const { args } = await getArgsFromParams(params);
      const channelSetting = args.viewerChannelSettings?.groups[0].channels[0]!;
      expect(channelSetting).toEqual(expected);
    }
  });

  it("parses encoded per-channel settings", async () => {
    for (const [_, queryString, expected] of channelParamToSetting) {
      const params = new URLSearchParams(queryString);
      const { args } = await getArgsFromParams(params);
      const channelSetting = args.viewerChannelSettings?.groups[0].channels[0]!;
      expect(channelSetting).toEqual(expected);
    }
  });

  it("parses multiple per-channel settings", async () => {
    // Test unencoded (i=0) and encoded (i=1)
    for (let i = 0; i < 2; i++) {
      const queryString =
        channelParamToSetting[0][i] + "&" + channelParamToSetting[1][i] + "&" + channelParamToSetting[2][i];
      const params = new URLSearchParams(queryString);
      const { args } = await getArgsFromParams(params);
      const channelSettings = args.viewerChannelSettings?.groups[0].channels!;

      // Order is not guaranteed, so check if any of the expected settings are present
      expect(channelSettings).toContainEqual(channelParamToSetting[0][2]);
      expect(channelSettings).toContainEqual(channelParamToSetting[1][2]);
      expect(channelSettings).toContainEqual(channelParamToSetting[2][2]);
    }
  });

  it("overrides ch settings when per-channel settings are included", async () => {
    const queryString = "?ch=0&lut=1,2&c1=v:1,lut:4:5";
    const params = new URLSearchParams(queryString);
    const { args } = await getArgsFromParams(params);

    const channelSetting = args.viewerChannelSettings?.groups[0].channels[0]!;

    expect(channelSetting.match).toEqual(1);
    expect(channelSetting.enabled).toEqual(true);
    expect(channelSetting.lut).toEqual(["4", "5"]);
  });

  it("creates empty default data for bad per-channel setting formats", async () => {
    const queryString = "c1=bad&c0=ultrabad:bad&c2=,,,,,,";
    const params = new URLSearchParams(queryString);
    const { args } = await getArgsFromParams(params);
    const channelSettings = args.viewerChannelSettings?.groups[0].channels!;
    expect(channelSettings).toHaveLength(3);
    for (let i = 0; i < channelSettings.length; i++) {
      const channelSetting = channelSettings[i];
      // Match with default on everything except match number
      expect(channelSetting).toEqual({ ...defaultSettings, match: channelSetting.match });
    }
  });
});
