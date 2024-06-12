import FirebaseRequest, { DatasetMetaData } from "../../public/firebase";
import { clamp } from "lodash";

import type { ViewerState, ViewerStateKey } from "../../src/aics-image-viewer/components/ViewerStateProvider/types";
import type { AppProps } from "../../src/aics-image-viewer/components/App/types";
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
  /** Color, as a 6-digit hex color.  */
  col?: string;
  /** Colorize. "1" is enabled. Disabled by default. */
  clz?: "1" | "0";
  /** Colorize alpha, in the [0, 1] range. Set to `1.0` by default. */
  cza?: string;
  /** Isosurface alpha, in the [0, 1 range]. Set to `1.0` by default.*/
  isa?: string;
  /** LUT to map from intensity to opacity. Should be two alphanumeric values separated
   * by a colon. The first value is the minimum and the second is the maximum.
   * Defaults to [0, 255].
   *
   * - Plain numbers are treated as direct intensity values.
   * - `p{n}` represents a percentile, where `n` is a percentile in the [0, 100] range.
   * - `m{n}` represents the median multiplied by `n / 100`.
   * - `autoij` in either the min or max fields will use the "auto" algorithm
   * from ImageJ to select the min and max.
   *
   * @example
   * ```
   * "0:255"    // min: intensity 0, max: intensity 255.
   * "p50:p90"  // min: 50th percentile, max: 90th percentile.
   * "m1:p75"   // min: median, max: 75th percentile.
   * "autoij:0" // use Auto-IJ to calculate min and max.
   * ```
   */
  lut?: string;
  /** Volume enabled. "1" is enabled. Disabled by default. */
  ven?: "1" | "0";
  /** Isosurface enabled. "1" is enabled. Disabled by default. */
  sen?: "1" | "0";
  /** Isosurface value, in the [0, 255] range. Set to `128` by default. */
  isv?: string;
};

type ViewerStateParams = {
  /** Axis to view. Valid values are "3D", "X", "Y", and "Z". Defaults to "3D". */
  view?: string;
  /**
   * Render mode. Valid values are "volumetric", "maxproject", and "pathtrace".
   * Defaults to "volumetric".
   */
  mode?: string;
  /** The opacity of the mask channel, an integer in the range [0, 100]. Defaults to 50. */
  mask?: string;
  /** The type of image to display. Valid values are "cell" and "fov". Defaults to "cell". */
  image?: string;
  /** Whether to show the axes helper. "1" is enabled. Disabled by default. */
  axes?: string;
  /** Whether to show the bounding box. "1" is enabled. Disabled by default. */
  bb?: string;
  /** The color of the bounding box, as a 6-digit hex color. */
  bbcol?: string;
  /** The background color, as a 6-digit hex color. */
  bgcol?: string;
  /** Whether to autorotate the view. "1" is enabled. Disabled by default. */
  rot?: string;
  /** The brightness of the image, an float in the range [0, 100]. Defaults to 70. */
  bright?: string;
  /** Density, a float in the range [0, 100]. Defaults to 50. */
  dens?: string;
  /**
   * Levels for image intensity adjustment. Should be three numeric values separated
   * by commas, representing the low, middle, and high values in a [0, 255] range.
   * Values will be sorted in ascending order; empty values will be parsed as 0.
   */
  lvl?: string;
  /** Whether to enable interpolation. "1" is enabled. Disabled by default. */
  interp?: string;
  /** Subregions per axis.
   * Defaults to full range (`0:1`) for each axis.
   */
  reg?: string;
  slice?: string;
  t?: string;
};

/**
 * Maps from ViewerState to URL query parameter keys. This allows for data mapping, but also
 * ensures that the URL query parameter keys are consistent with the ViewerState keys.
 */
const ViewerStateToParamKey: Record<ViewerStateKey, keyof ViewerStateParams> = {
  viewMode: "view",
  renderMode: "mode",
  imageType: "image",
  showAxes: "axes",
  showBoundingBox: "bb",
  boundingBoxColor: "bbcol",
  backgroundColor: "bgcol",
  autorotate: "rot",
  maskAlpha: "mask",
  brightness: "bright",
  density: "dens",
  levels: "lvl",
  interpolationEnabled: "interp",
  region: "reg",
  slice: "slice",
  time: "t",
};

/** Parameters that define loaded datasets. */
type DataParams = {
  /**
   * One or more volume URLs to load. If multiple URLs are provided, they should
   * be separated by commas.
   */
  url?: string;
  /**
   * The name of a dataset in the Cell Feature Explorer database. Used with `id`.
   */
  dataset?: string;
  /**
   * The ID of a cell within the loaded dataset. Used with `dataset`.
   */
  id?: string;
};

// Copy of keys for above params. Both types are defined so that spec comments can be provided.
// TODO: Remove redundant `baseParamKeys` type.
const baseParamKeys = ["mask", "view"] as const;
const dataParamKeys = ["url", "dataset", "id"] as const;
const deprecatedParamKeys = ["ch", "luts", "colors"] as const;

type BaseParamKeys = (typeof baseParamKeys)[number];
type DataParamKeys = (typeof dataParamKeys)[number];
type ChannelKey = `c${number}`;
type DeprecatedParamKeys = (typeof deprecatedParamKeys)[number];
type AllParamKeys = DataParamKeys | BaseParamKeys | DeprecatedParamKeys | ChannelKey;

type Params = ViewerStateParams & DataParams & { [_ in AllParamKeys]?: string };

const isParamKey = (key: string): key is BaseParamKeys =>
  baseParamKeys.includes(key as BaseParamKeys) || dataParamKeys.includes(key as DataParamKeys);
const isDeprecatedParamKey = (key: string): key is DeprecatedParamKeys =>
  deprecatedParamKeys.includes(key as DeprecatedParamKeys);
const isChannelKey = (key: string): key is ChannelKey => CHANNEL_STATE_KEY_REGEX.test(key);

/**
 * Filters a set of URLSearchParams for only the keys that are valid parameters for the viewer.
 * Non-matching keys are discarded.
 * @param searchParams Input URL search parameters.
 * @returns a dictionary object matching the type of `Params`.
 */
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

function parseFloat(value: string | undefined, min: number, max: number): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const number = Number.parseFloat(value);
  return Number.isNaN(number) ? undefined : clamp(number, min, max);
}

// type StringEnum<T> = {
//   [id: string]: T | string;
// };

// function parseStringEnum<T extends StringEnum<string>>(
//   value: string | undefined,
//   enumValues: [keyof T][],
//   defaultValue: T[string] | undefined = undefined
// ): T[string] | undefined {
//   if (value === undefined || enumValues.indexOf(value) !== -1) {
//     return defaultValue;
//   }
//   return value as T[string];
// }

// const mode = parseStringEnum<ViewMode>("3D", ["3D", "X", "Y", "Z"]);

export function deserializeViewerChannelSetting(
  channelIndex: number,
  jsonState: ViewerChannelSettingJson
): ViewerChannelSetting {
  // Missing/undefined fields should be handled downstream.
  const result: ViewerChannelSetting = {
    match: channelIndex,
    enabled: jsonState.ven === "1",
    surfaceEnabled: jsonState.sen === "1",
    isovalue: parseFloat(jsonState.isv, 0, 255),
    surfaceOpacity: parseFloat(jsonState.isa, 0, 1),
    colorizeEnabled: jsonState.clz === "1",
    colorizeAlpha: parseFloat(jsonState.cza, 0, 1),
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
  viewerSettings: Partial<ViewerState>;
}> {
  const params = urlSearchParamsToParams(urlSearchParams);
  let args: Partial<AppProps> = {};
  const viewerSettings: Partial<ViewerState> = {};

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
