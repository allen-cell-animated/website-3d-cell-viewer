import FirebaseRequest, { DatasetMetaData } from "../../public/firebase";

import { AppProps, GlobalViewerSettings } from "../../src/aics-image-viewer/components/App/types";
import { ViewMode } from "../../src/aics-image-viewer/shared/enums";
import {
  ViewerChannelSetting,
  ViewerChannelSettings,
} from "../../src/aics-image-viewer/shared/utils/viewerChannelSettings";

const CHANNEL_STATE_KEY_REGEX = /^c[0-9]+$/;
// Match colon-separated pairs of alphanumeric strings
const LUT_REGEX = /^[a-z0-9.]*:[ ]*[a-z0-9.]*$/;
const HEX_COLOR_REGEX = /^[0-9a-fA-F]{6}$/;

export type ViewerChannelSettingJson = {
  /** Color, as a 6-digit hex color */
  col?: string;
  /** Colorize. "1" is enabled. */
  clz?: "1" | "0";
  /** Colorize alpha, in the [0, 1] range. */
  cza?: string;
  /** Opacity, in the [0, 1 range] */
  isa?: string;
  /** LUT to map from intensity to opacity. Should be two alphanumeric values separated
   * by a colon, e.g. "0:255", "p50:p90", or "autoij:0".
   */
  lut?: string;
  /** Volume enabled. "1" is enabled. */
  ven?: "1" | "0";
  /** Isosurface enabled. "1" is enabled. */
  sen?: "1" | "0";
  /** Isosurface value, in the [0, 255] range. */
  isv?: string;
};

const baseParamKeys = ["mask", "url", "file", "dataset", "id", "view"] as const;
const deprecatedParamKeys = ["ch", "luts", "colors"] as const;

type BaseParamKeys = (typeof baseParamKeys)[number];
type ChannelKey = `c${number}`;
type DeprecatedParamKeys = (typeof deprecatedParamKeys)[number];
type AllParamKeys = BaseParamKeys | DeprecatedParamKeys | ChannelKey;

type Params = { [_ in AllParamKeys]?: string };

const isParamKey = (key: string): key is BaseParamKeys => baseParamKeys.includes(key as BaseParamKeys);
const isDeprecatedParamKey = (key: string): key is DeprecatedParamKeys =>
  deprecatedParamKeys.includes(key as DeprecatedParamKeys);
const isChannelKey = (key: string): key is ChannelKey => CHANNEL_STATE_KEY_REGEX.test(key);

export function urlSearchParamsToParams(searchParams: URLSearchParams): Params {
  const result: Params = {};
  for (const [key, value] of searchParams.entries()) {
    if (isParamKey(key) || isChannelKey(key) || isDeprecatedParamKey(key)) {
      result[key] = value;
    }
  }
  return result;
}

const decodeURL = (url: string): string => {
  const decodedUrl = decodeURIComponent(url);
  return decodedUrl.endsWith("/") ? decodedUrl.slice(0, -1) : decodedUrl;
};

/** Try to parse a `string` as a list of 2 or more URLs. Returns `undefined` if the string is not a valid URL list. */
const tryDecodeURLList = (url: string, delim = ","): string[] | undefined => {
  if (!url.includes(delim)) {
    return undefined;
  }

  const urls = url.split(delim).map((u) => decodeURL(u));

  // Verify that all urls are valid
  for (const u of urls) {
    try {
      new URL(u);
    } catch (_e) {
      return undefined;
    }
  }

  return urls;
};

/**
 * Parse a string list of comma-separated key:value pairs into
 * a key-value object.
 *
 * @param data The string to parse. Expected to be in the format
 * "key1:value1,key2:value2,...". Colons and commas in keys or values
 * should be encoded using `encodeURIComponent`.
 * @returns An object with the parsed key-value pairs. Key and value strings
 *  will be decoded using `decodeURIComponent`.
 */
export function parseKeyValueList(data: string): Record<string, string> {
  if (data === "") {
    return {};
  }
  const result: Record<string, string> = {};
  const keyValuePairs = data.split(",");
  for (const pair of keyValuePairs) {
    const splitIndex = pair.indexOf(":");
    const key = pair.slice(0, splitIndex);
    const value = pair.slice(splitIndex + 1);
    result[decodeURIComponent(key).trim()] = decodeURIComponent(value).trim();
  }
  return result;
}

function parseFloat(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const number = Number.parseFloat(value);
  return Number.isNaN(number) ? undefined : number;
}

export function deserializeViewerChannelSetting(
  channelIndex: number,
  jsonState: ViewerChannelSettingJson
): ViewerChannelSetting {
  // Missing/undefined fields should be handled downstream.
  const result: ViewerChannelSetting = {
    match: channelIndex,
    enabled: jsonState.ven === "1",
    surfaceEnabled: jsonState.sen === "1",
    isovalue: parseFloat(jsonState.isv),
    surfaceOpacity: parseFloat(jsonState.isa),
    colorizeEnabled: jsonState.clz === "1",
    colorizeAlpha: parseFloat(jsonState.cza),
  };
  if (jsonState.col && HEX_COLOR_REGEX.test(jsonState.col)) {
    result.color = jsonState.col;
  }
  if (jsonState.lut && LUT_REGEX.test(jsonState.lut)) {
    const [min, max] = jsonState.lut.split(":");
    result.lut = [min.trim(), max.trim()];
  }
  return result;
}

async function loadDataset(dataset: string, id: string): Promise<Partial<AppProps>> {
  const db = new FirebaseRequest();
  const args: Partial<AppProps> = {};

  const datasets = await db.getAvailableDatasets();

  let datasetMeta: DatasetMetaData | undefined = undefined;
  for (const d of datasets) {
    const innerDatasets = d.datasets!;
    const names = Object.keys(innerDatasets);
    const matchingName = names.find((name) => name === dataset);
    if (matchingName) {
      datasetMeta = innerDatasets[matchingName];
      break;
    }
  }
  if (datasetMeta === undefined) {
    console.error(`No matching dataset: ${dataset}`);
    return {};
  }

  const datasetData = await db.selectDataset(datasetMeta.manifest!);
  const baseUrl = datasetData.volumeViewerDataRoot + "/";
  args.imageDownloadHref = datasetData.downloadRoot + "/" + id;
  // args.fovDownloadHref = datasetData.downloadRoot + "/" + id;

  const fileInfo = await db.getFileInfoByCellId(id);
  args.imageUrl = baseUrl + fileInfo!.volumeviewerPath;
  args.parentImageUrl = baseUrl + fileInfo!.fovVolumeviewerPath;

  return args;
}

export async function getArgsFromParams(urlSearchParams: URLSearchParams): Promise<{
  args: Partial<AppProps>;
  viewerSettings: Partial<GlobalViewerSettings>;
}> {
  const params = urlSearchParamsToParams(urlSearchParams);
  let args: Partial<AppProps> = {};
  const viewerSettings: Partial<GlobalViewerSettings> = {};

  if (params.mask) {
    viewerSettings.maskAlpha = parseInt(params.mask, 10);
  }
  if (params.view) {
    const mapping = {
      "3D": ViewMode.threeD,
      Z: ViewMode.xy,
      Y: ViewMode.xz,
      X: ViewMode.yz,
    };
    const allowedViews = Object.keys(mapping);
    let view: "3D" | "X" | "Y" | "Z";
    if (allowedViews.includes(params.view)) {
      view = params.view as "3D" | "X" | "Y" | "Z";
    } else {
      view = "3D";
    }
    viewerSettings.viewMode = mapping[view];
  }
  // old, deprecated channels model
  if (params.ch) {
    // ?ch=1,2
    // ?luts=0,255,0,255
    // ?colors=ff0000,00ff00
    const initialChannelSettings: ViewerChannelSettings = {
      groups: [{ name: "Channels", channels: [] }],
    };
    const ch = initialChannelSettings.groups[0].channels;

    const channelsOn = params.ch.split(",").map((numstr) => parseInt(numstr, 10));
    for (let i = 0; i < channelsOn.length; ++i) {
      ch.push({ match: channelsOn[i], enabled: true });
    }
    // look for luts or color
    if (params.luts) {
      const luts = params.luts.split(",");
      if (luts.length !== ch.length * 2) {
        console.warn("ILL-FORMED QUERYSTRING: luts must have a min/max for each ch");
      } else {
        for (let i = 0; i < ch.length; ++i) {
          ch[i]["lut"] = [luts[i * 2], luts[i * 2 + 1]];
        }
      }
    }
    if (params.colors) {
      const colors = params.colors.split(",");
      if (colors.length !== ch.length) {
        console.warn("ILL-FORMED QUERYSTRING: if colors specified, must have a color for each ch");
      } else {
        for (let i = 0; i < ch.length; ++i) {
          ch[i]["color"] = colors[i];
        }
      }
    }
    args.viewerChannelSettings = initialChannelSettings;
  }
  // Check for per-channel settings; this will override the old channel settings (`ch`)
  // if present.
  // Channels keys are formatted as `c0`, `c1`, etc., and the value is string containing
  // a comma-separated list of key-value pairs.
  const channelIndexToSettings: Map<number, ViewerChannelSetting> = new Map();
  Object.keys(params).forEach((key) => {
    if (isChannelKey(key)) {
      const channelIndex = parseInt(key.slice(1), 10);
      try {
        const channelData = parseKeyValueList(params[key]!);
        const channelSetting = deserializeViewerChannelSetting(channelIndex, channelData as ViewerChannelSettingJson);
        channelIndexToSettings.set(channelIndex, channelSetting);
      } catch (e) {
        console.warn(
          `url_utils.getArgsFromParams: Failed to parse channel settings for channel ${channelIndex} from URL parameters.`,
          e
        );
      }
    }
  });
  if (channelIndexToSettings.size > 0) {
    const groups: ViewerChannelSettings["groups"] = [
      {
        name: "Channels",
        channels: Array.from(channelIndexToSettings.values()),
      },
    ];
    args.viewerChannelSettings = { groups };
  }

  if (params.url) {
    const imageUrls = tryDecodeURLList(params.url) ?? decodeURL(params.url);
    const firstUrl = Array.isArray(imageUrls) ? imageUrls[0] : imageUrls;

    args.cellId = "1";
    args.imageUrl = imageUrls;
    // this is invalid for zarr?
    args.imageDownloadHref = firstUrl;
    args.parentImageUrl = "";
    args.parentImageDownloadHref = "";
    // Check if channel settings are already provided (through per-channel settings or
    // old `ch` query param, or included in JSON files). If not, make first three
    // channels visible by default.
    if (!firstUrl.endsWith("json") && !params.ch && channelIndexToSettings.size === 0) {
      args.viewerChannelSettings = {
        groups: [
          // first 3 channels on by default!
          {
            name: "Channels",
            channels: [
              { match: [0, 1, 2], enabled: true },
              { match: "(.+)", enabled: false },
            ],
          },
        ],
      };
    }
  } else if (params.file) {
    // quick way to load a atlas.json from a special directory.
    //
    // ?file=relative-path-to-atlas-on-isilon
    args.cellId = "1";
    const baseUrl = "http://dev-aics-dtp-001.corp.alleninstitute.org/dan-data/";
    args.imageUrl = baseUrl + params.file;
    args.parentImageUrl = baseUrl + params.file;
    args.parentImageDownloadHref = "";
    args.imageDownloadHref = "";
  } else if (params.dataset && params.id) {
    // ?dataset=aics_hipsc_v2020.1&id=232265
    const datasetArgs = await loadDataset(params.dataset, params.id);
    args = { ...args, ...datasetArgs };
  }

  return { args, viewerSettings };
}

export function isValidUrl(url: string): boolean {
  return url.startsWith("http");
}
