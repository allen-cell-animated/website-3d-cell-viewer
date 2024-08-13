import FirebaseRequest, { DatasetMetaData } from "../../public/firebase";
import { CameraState, ControlPoint } from "@aics/volume-viewer";

import type {
  ChannelState,
  ViewerState,
  ViewerStateContextType,
} from "../../src/aics-image-viewer/components/ViewerStateProvider/types";
import type { AppProps } from "../../src/aics-image-viewer/components/App/types";
import { ImageType, RenderMode, ViewMode } from "../../src/aics-image-viewer/shared/enums";
import {
  ViewerChannelSetting,
  ViewerChannelSettings,
} from "../../src/aics-image-viewer/shared/utils/viewerChannelSettings";
import { ColorArray } from "../../src/aics-image-viewer/shared/utils/colorRepresentations";
import { PerAxis } from "../../src/aics-image-viewer/shared/types";
import { clamp } from "./math_utils";
import { DEFAULT_CHANNEL_STATE, DEFAULT_VIEWER_SETTINGS } from "../../src/aics-image-viewer/shared/constants";

const CHANNEL_STATE_KEY_REGEX = /^c[0-9]+$/;
/** Match colon-separated pairs of alphanumeric strings */
const LUT_REGEX = /^-?[a-z0-9.]*:[ ]*-?[a-z0-9.]*$/;
/** Match colon-separated pairs of numeric strings */
const RAMP_REGEX = /^-?[0-9.]*:-?[0-9.]*$/;
/**
 * Match comma-separated triplet of numeric strings.
 */
const SLICE_REGEX = /^[0-9.]*,[0-9.]*,[0-9.]*$/;
/**
 * Matches a sequence of three comma-separated min:max number pairs, representing
 * the x, y, and z axes.
 */
const REGION_REGEX = /^([0-9.]*:[0-9.]*)(,[0-9.]*:[0-9.]*){2}$/;
const HEX_COLOR_REGEX = /^[0-9a-fA-F]{6}$/;
/**
 * LEGACY: Matches a COMMA-separated list of control points, where each control point is represented
 * by a triplet of `{x}:{opacity}:{hex color}`.
 */
export const LEGACY_CONTROL_POINTS_REGEX = /^(-?[0-9.]*:[0-9.]*:[0-9a-fA-F]{6})(,-?[0-9.]*:[0-9.]*:[0-9a-fA-F]{6})*$/;
/**
 * Matches a COLON-separated list of control points, where each control point is represented
 * by a triplet of `{x}:{opacity}:{hex color}`.
 */
export const CONTROL_POINTS_REGEX = /^(-?[0-9.]*:[0-9.]*:[0-9a-fA-F]{6})(:-?[0-9.]*:[0-9.]*:[0-9a-fA-F]{6})*$/;

/**
 * Enum keys for URL parameters. These are stored as enums for better readability,
 * and are mapped to types in `ViewerStateParams`.
 */
export enum ViewerStateKeys {
  View = "view",
  Mode = "mode",
  Mask = "mask",
  Image = "image",
  Axes = "axes",
  BoundingBox = "bb",
  BoundingBoxColor = "bbcol",
  BackgroundColor = "bgcol",
  Autorotate = "rot",
  Brightness = "bright",
  Density = "dens",
  Levels = "lvl",
  Interpolation = "interp",
  Region = "reg",
  Slice = "slice",
  Time = "t",
  CameraState = "cam",
}

export enum CameraTransformKeys {
  /** Camera position in 3D coordinates. */
  Position = "pos",
  /** Target position of the trackball controls in 3D coordinates. */
  Target = "tar",
  /** The up vector of the camera. Will be normalized to magnitude of 1. */
  Up = "up",
  /** Scale factor for orthographic cameras. */
  OrthoScale = "ort",
  /** Vertical FOV of the camera view frustum, from top to bottom, in degrees. */
  Fov = "fov",
}

/**
 * Mapped to types in `ViewerChannelSettingParams`
 */
export enum ViewerChannelSettingKeys {
  Color = "col",
  Colorize = "clz",
  ColorizeAlpha = "cza",
  IsosurfaceAlpha = "isa",
  Lut = "lut",
  Ramp = "rmp",
  ControlPoints = "cps",
  ControlPointsEnabled = "cpe",
  VolumeEnabled = "ven",
  SurfaceEnabled = "sen",
  IsosurfaceValue = "isv",
}

/**
 * The serialized form of a ViewerChannelSetting, as a dictionary object.
 */
export class ViewerChannelSettingParams {
  /** Color, as a 6-digit hex color.  */
  [ViewerChannelSettingKeys.Color]?: string = undefined;
  /** Colorize. "1" is enabled. Disabled by default. */
  [ViewerChannelSettingKeys.Colorize]?: "1" | "0" = undefined;
  /** Colorize alpha, in the [0, 1] range. Set to `1.0` by default. */
  [ViewerChannelSettingKeys.ColorizeAlpha]?: string = undefined;
  /** Isosurface alpha, in the [0, 1 range]. Set to `1.0` by default.*/
  [ViewerChannelSettingKeys.IsosurfaceAlpha]?: string = undefined;
  /**
   * Lookup table (LUT) to map from volume intensity to opacity. Should be two alphanumeric values
   * separated by a colon, where the first value is the minimum and the second is the maximum.
   * Defaults to [0, 255].
   *
   * - Plain numbers are treated as direct intensity values.
   * - `p{n}` represents a percentile, where `n` is a percentile in the [0, 100] range.
   * - `m{n}` represents the median multiplied by `n / 100`.
   * - `autoij` in either the min or max fields will use the "auto" algorithm
   * from ImageJ to select the min and max.
   *
   * Values will be used to determine the initial control points and ramp if those
   * fields are not provided.
   *
   * @example
   * ```
   * "0:255"    // min: intensity 0, max: intensity 255.
   * "p50:p90"  // min: 50th percentile, max: 90th percentile.
   * "m1:p75"   // min: median, max: 75th percentile.
   * "autoij:0" // use Auto-IJ to calculate min and max.
   * ```
   */
  [ViewerChannelSettingKeys.Lut]?: string = undefined;
  /**
   * Control points for the transfer function. If provided, overrides the
   * `lut` field when calculating the control points. Should be a list
   * of `x:opacity:color` triplets, separated by comma.
   * - `x` is a numeric intensity value.
   * - `opacity` is a float in the [0, 1] range.
   * - `color` is a 6-digit hex color, e.g. `ff0000`.
   */
  [ViewerChannelSettingKeys.ControlPoints]?: string = undefined;
  /**
   * Whether to show advanced mode, which will show control points instead of
   * ramp values defined by the LUT. "1" is enabled, disabled by default.
   */
  [ViewerChannelSettingKeys.ControlPointsEnabled]?: "1" | "0" = undefined;
  /**
   * Raw ramp values, which should be two numeric values separated by a colon.
   * If provided, overrides the `lut` field when calculating the ramp values.
   */
  [ViewerChannelSettingKeys.Ramp]?: string = undefined;
  /** Volume enabled. "1" is enabled. Disabled by default. */
  [ViewerChannelSettingKeys.VolumeEnabled]?: "1" | "0" = undefined;
  /** Isosurface enabled. "1" is enabled. Disabled by default. */
  [ViewerChannelSettingKeys.SurfaceEnabled]?: "1" | "0" = undefined;
  /** Isosurface value, in the [0, 255] range. Set to `128` by default. */
  [ViewerChannelSettingKeys.IsosurfaceValue]?: string = undefined;
}
/**
 * Channels, matching the pattern `c0`, `c1`, etc. corresponding to the index of the channel being configured.
 * The channel parameter should have a value that is a comma-separated list of `key:value` pairs, with keys
 * defined in `ViewerChannelSettingJson`.
 */
type ChannelParams = { [_ in `c${number}`]?: string };

/** Serialized version of `ViewerState`. */
export class ViewerStateParams {
  /** Axis to view. Valid values are "3D", "X", "Y", and "Z". Defaults to "3D". */
  [ViewerStateKeys.View]?: string = undefined;
  /**
   * Render mode. Valid values are "volumetric", "maxproject", and "pathtrace".
   * Defaults to "volumetric".
   */
  [ViewerStateKeys.Mode]?: string = undefined;
  /** The opacity of the mask channel, an integer in the range [0, 100]. Defaults to 50. */
  [ViewerStateKeys.Mask]?: string = undefined;
  /** The type of image to display. Valid values are "cell" and "fov". Defaults to "cell". */
  [ViewerStateKeys.Image]?: string = undefined;
  /** Whether to show the axes helper. "1" is enabled. Disabled by default. */
  [ViewerStateKeys.Axes]?: string = undefined;
  /** Whether to show the bounding box. "1" is enabled. Disabled by default. */
  [ViewerStateKeys.BoundingBox]?: string = undefined;
  /** The color of the bounding box, as a 6-digit hex color. */
  [ViewerStateKeys.BoundingBoxColor]?: string = undefined;
  /** The background color, as a 6-digit hex color. */
  [ViewerStateKeys.BackgroundColor]?: string = undefined;
  /** Whether to autorotate the view. "1" is enabled. Disabled by default. */
  [ViewerStateKeys.Autorotate]?: string = undefined;
  /** The brightness of the image, an float in the range [0, 100]. Defaults to 70. */
  [ViewerStateKeys.Brightness]?: string = undefined;
  /** Density, a float in the range [0, 100]. Defaults to 50. */
  [ViewerStateKeys.Density]?: string = undefined;
  /**
   * Levels for image intensity adjustment. Should be three numeric values separated
   * by commas, representing the low, middle, and high values in a [0, 255] range.
   * Values will be sorted in ascending order; empty values will be parsed as 0.
   */
  [ViewerStateKeys.Levels]?: string = undefined;
  /** Whether to enable interpolation. "1" is enabled. Enabled by default. */
  [ViewerStateKeys.Interpolation]?: string = undefined;
  /** Subregions per axis, as min:max pairs separated by commas.
   * Defaults to full range (`0:1`) for each axis.
   */
  [ViewerStateKeys.Region]?: string = undefined;
  /** Slice position per X, Y, and Z axes, as a list of comma-separated floats.
   * 0.5 for all axes by default (e.g. `0.5,0.5,0.5`)
   */
  [ViewerStateKeys.Slice]?: string = undefined;
  /** Frame number, for time-series volumes. 0 by default. */
  [ViewerStateKeys.Time]?: string = undefined;
  /**
   * Camera transform settings, as a list of `key:value` pairs separated by commas.
   * Valid keys are defined in `CameraTransformKeys`:
   * - `pos`: position
   * - `tar`: target
   * - `up`: up
   * - `rot`: rotation
   * - `ort`: orthographic scales
   *
   * All values are an array of three floats, separated by commas and
   * encoded using `encodeURIComponent`.
   */
  [ViewerStateKeys.CameraState]?: string = undefined;
}

/** URL parameters that define data sources when loading volumes. */
class DataParams {
  /**
   * One or more volume URLs to load. If multiple URLs are provided, they should
   * be separated by commas.
   */
  url?: string = undefined;
  /**
   * The name of a dataset in the Cell Feature Explorer database. Used with `id`.
   */
  dataset?: string = undefined;
  /**
   * The ID of a cell within the loaded dataset. Used with `dataset`.
   */
  id?: string = undefined;
}

class DeprecatedParams {
  /** Deprecated query parameter for channel settings. */
  ch?: string = undefined;
  /** Deprecated query parameter for LUT settings. */
  luts?: string = undefined;
  /** Deprecated query parameter for channel colors. */
  colors?: string = undefined;
}

type AppParams = Partial<ViewerStateParams & DataParams & DeprecatedParams & ChannelParams>;

const allowedParamKeys: Array<keyof AppParams> = [
  ...Object.keys(new ViewerStateParams()),
  ...Object.keys(new DataParams()),
  ...Object.keys(new DeprecatedParams()),
] as Array<keyof AppParams>;
const isParamKey = (key: string): key is keyof AppParams => allowedParamKeys.indexOf(key as keyof AppParams) !== -1;
const isChannelKey = (key: string): key is keyof ChannelParams => CHANNEL_STATE_KEY_REGEX.test(key);

/**
 * Filters a set of URLSearchParams for only the keys that are valid parameters for the viewer.
 * Non-matching keys are discarded.
 * @param searchParams Input URL search parameters.
 * @returns a dictionary object matching the type of `Params`.
 */
export function getAllowedParams(searchParams: URLSearchParams): AppParams {
  const result: AppParams = {};
  for (const [key, value] of searchParams.entries()) {
    if (isParamKey(key) || isChannelKey(key)) {
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

//// DATA PARSING //////////////////////

/**
 * Parse a string list of comma-separated key:value pairs into
 * a key-value object.
 *
 * @param data The string to parse. Expected to be in the format
 * "key1:value1,key2:value2,...". Commas in keys or values
 * must be encoded using `encodeURIComponent`.
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

function decodeColons(str: string): string {
  return str.replace(/%3A/g, ":");
}

export function objectToKeyValueList(obj: Record<string, string | undefined>): string {
  const keyValuePairs: string[] = [];
  for (const key in obj) {
    const value = obj[key];
    if (value === undefined) {
      continue;
    }
    // Allow colon separators to remain unencoded to save URL character length.
    const escapedValue = decodeColons(encodeURIComponent(value.trim()));
    keyValuePairs.push(`${encodeURIComponent(key.trim())}:${escapedValue}`);
  }
  return keyValuePairs.join(",");
}

/**
 * Parses a string to a float and clamps the result to the [min, max] range.
 * Returns `undefined` if the string is undefined or NaN.
 * @param value String to parse as a float. Will be parsed with `Number.parseFloat`.
 * @param min Minimum value, inclusive.
 * @param max Maximum value, inclusive.
 * @returns
 * - The parsed number, clamped to the [min, max] range.
 * - `undefined` if the string is undefined or NaN.
 */
export function parseStringFloat(value: string | undefined, min: number, max: number): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const number = Number.parseFloat(value);
  return Number.isNaN(number) ? undefined : clamp(number, min, max);
}

/**
 * Parses a string to an integer and clamps the result to the [min, max] range.
 * @param value String to parse as a float. Assumes base 10, parses with `Number.parseInt(value, 10)`.
 * @param min Minimum value, inclusive.
 * @param max Maximum value, inclusive.
 * @returns
 * - The parsed number, clamped to the [min, max] range.
 * - `undefined` if the string is undefined or NaN.
 */
export function parseStringInt(value: string | undefined, min: number, max: number): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const number = Number.parseInt(value, 10);
  if (Number.isNaN(number)) {
    return undefined;
  }
  return clamp(number, min, max);
}

/**
 * Parses a string to an enum value; if the string is not in the enum, returns the default value.
 * @param value String to parse.
 * @param enumValues Enum. Cannot be a `const enum`, as these are removed at compile time.
 * @param defaultValue Default value to return if the string is not in the enum.
 * @returns A value from the enum or the default value. Note that the return type includes `undefined`
 * if the `defaultValue` is `undefined`.
 */
export function parseStringEnum<E extends string, T extends E | undefined>(
  value: string | undefined,
  enumValues: Record<string | number | symbol, E>,
  defaultValue: T = undefined as T
): T {
  if (value === undefined || !Object.values(enumValues).includes(value as E)) {
    return defaultValue;
  }
  return value as T;
}

/**
 * Parses a string boolean value ("1" as true, "0" as false), and returns `undefined` if the value is `undefined`.
 */
function parseStringBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value === "1";
}

export function parseHexColorAsColorArray(hexColor: string | undefined): ColorArray | undefined {
  if (!hexColor || !HEX_COLOR_REGEX.test(hexColor)) {
    return undefined;
  }
  const r = Number.parseInt(hexColor.slice(0, 2), 16);
  const g = Number.parseInt(hexColor.slice(2, 4), 16);
  const b = Number.parseInt(hexColor.slice(4, 6), 16);
  return [r, g, b];
}

function colorArrayToHex(color: ColorArray): string {
  return color
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")
    .toLowerCase();
}

function removeUndefinedProperties<T>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Returns a copy of `obj` where all properties with values that match the properties of `match` are removed.
 */
function removeMatchingProperties<T>(obj: Partial<T>, match: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key in obj) {
    if (obj[key] !== match[key]) {
      result[key] = obj[key];
    }
  }
  return result;
}

function parseStringSlice(region: string | undefined): PerAxis<number> | undefined {
  if (!region || !SLICE_REGEX.test(region)) {
    return undefined;
  }
  const [x, y, z] = region.split(",").map((val) => parseStringFloat(val, 0, 1));
  if (x === undefined || y === undefined || z === undefined) {
    return undefined;
  }
  return { x, y, z };
}

/**
 * Parses an array of three numbers from a string.
 */
function parseThreeNumberArray(
  levels: string | undefined,
  min: number = -Infinity,
  max: number = Infinity
): [number, number, number] | undefined {
  if (!levels) {
    return undefined;
  }
  const [low, middle, high] = levels.split(",").map((val) => parseStringFloat(val, min, max));
  if (low === undefined || middle === undefined || high === undefined) {
    return undefined;
  }
  return [low, middle, high];
}

function parseStringRegion(region: string | undefined): PerAxis<[number, number]> | undefined {
  if (!region || !REGION_REGEX.test(region)) {
    return undefined;
  }
  const [x, y, z] = region.split(",").map((axis): [number, number] | undefined => {
    // each is a min/max pair
    const [min, max] = axis.split(":").map((val) => parseStringFloat(val, 0, 1));
    if (min === undefined || max === undefined) {
      return undefined;
    }
    // Ensure sorted order
    return min < max ? [min, max] : [max, min];
  });
  // Check for undefined values
  if (x === undefined || y === undefined || z === undefined) {
    return undefined;
  }
  return { x, y, z };
}

function formatFloat(value: number, maxPrecision: number = 5): string {
  // TODO: Make this smarter for integers, precision, etc.
  // Ideally should have a fixed max precision
  if (Number.isInteger(value)) {
    return value.toString();
  }
  return Number(value.toPrecision(maxPrecision)).toString();
}

function serializeBoolean(value: boolean | undefined): "1" | "0" | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value ? "1" : "0";
}

function parseCameraState(cameraSettings: string | undefined): Partial<CameraState> | undefined {
  if (!cameraSettings) {
    return undefined;
  }
  const parsedCameraSettings = parseKeyValueList(cameraSettings);
  const result: Partial<CameraState> = {
    position: parseThreeNumberArray(parsedCameraSettings[CameraTransformKeys.Position]),
    target: parseThreeNumberArray(parsedCameraSettings[CameraTransformKeys.Target]),
    up: parseThreeNumberArray(parsedCameraSettings[CameraTransformKeys.Up]),
    // Orthographic scales cannot be negative
    orthoScale: parseStringFloat(parsedCameraSettings[CameraTransformKeys.OrthoScale], 0, Infinity),
    fov: parseStringFloat(parsedCameraSettings[CameraTransformKeys.Fov], 0, 180),
  };
  return removeUndefinedProperties(result);
}

function serializeCameraState(cameraState: CameraState): string {
  return objectToKeyValueList({
    [CameraTransformKeys.Position]: cameraState.position.map((value) => formatFloat(value)).join(","),
    [CameraTransformKeys.Target]: cameraState.target.map((value) => formatFloat(value)).join(","),
    [CameraTransformKeys.Up]: cameraState.up.map((value) => formatFloat(value)).join(","),
    [CameraTransformKeys.OrthoScale]:
      cameraState.orthoScale === undefined ? undefined : formatFloat(cameraState.orthoScale),
    [CameraTransformKeys.Fov]: cameraState.fov === undefined ? undefined : formatFloat(cameraState.fov),
  });
}

function serializeControlPoints(controlPoints: ControlPoint[]): string {
  return controlPoints
    .map((cp) => {
      const x = formatFloat(cp.x);
      const opacity = formatFloat(cp.opacity);
      const color = colorArrayToHex(cp.color);
      return `${x}:${opacity}:${color}`;
    })
    .join(":");
}

function parseControlPoints(controlPoints: string | undefined): ControlPoint[] | undefined {
  if (
    !(controlPoints && (CONTROL_POINTS_REGEX.test(controlPoints) || LEGACY_CONTROL_POINTS_REGEX.test(controlPoints)))
  ) {
    return undefined;
  }

  // Parse raw control point data from the string into an array of [x, opacity, color] triplets.
  let rawControlPointData: string[][];
  if (LEGACY_CONTROL_POINTS_REGEX.test(controlPoints)) {
    // Legacy format uses commas to separate control points.
    rawControlPointData = controlPoints.split(",").map((cp) => cp.split(":"));
  } else {
    // New format is all colon-separated, where every three elements represent a control point.
    rawControlPointData = controlPoints.split(":").reduce((acc, _val, i, array) => {
      if ((i + 1) % 3 === 0) {
        acc.push([array[i - 2], array[i - 1], array[i]]);
      }
      return acc;
    }, [] as string[][]);
  }

  const newControlPoints = rawControlPointData.map((cp) => {
    const [x, opacity, color] = cp;
    return {
      x: parseStringFloat(x, -Infinity, Infinity) ?? 0,
      opacity: parseStringFloat(opacity, 0, 1) ?? 1.0,
      color: parseHexColorAsColorArray(color) ?? [255, 255, 255],
    };
  });
  // Sort control points by x value
  return newControlPoints.sort((a, b) => a.x - b.x);
}

//// DATA SERIALIZATION //////////////////////

/**
 * Parses a ViewerChannelSetting from a JSON object.
 * @param channelIndex Index of the channel, to be turned into a `match` value.
 * @param jsonState The serialized ViewerChannelSetting to parse, as an object.
 * @returns A ViewerChannelSetting object.
 */
export function deserializeViewerChannelSetting(
  channelIndex: number,
  jsonState: ViewerChannelSettingParams
): ViewerChannelSetting {
  // Missing/undefined fields should be handled downstream.
  const result: ViewerChannelSetting = {
    match: channelIndex,
    enabled: parseStringBoolean(jsonState[ViewerChannelSettingKeys.VolumeEnabled]),
    surfaceEnabled: parseStringBoolean(jsonState[ViewerChannelSettingKeys.SurfaceEnabled]),
    isovalue: parseStringFloat(jsonState[ViewerChannelSettingKeys.IsosurfaceValue], 0, 255),
    surfaceOpacity: parseStringFloat(jsonState[ViewerChannelSettingKeys.IsosurfaceAlpha], 0, 1),
    colorizeEnabled: parseStringBoolean(jsonState[ViewerChannelSettingKeys.Colorize]),
    colorizeAlpha: parseStringFloat(jsonState[ViewerChannelSettingKeys.ColorizeAlpha], 0, 1),
    controlPointsEnabled: parseStringBoolean(jsonState[ViewerChannelSettingKeys.ControlPointsEnabled]),
  };
  if (jsonState[ViewerChannelSettingKeys.Color] && HEX_COLOR_REGEX.test(jsonState.col)) {
    result.color = jsonState[ViewerChannelSettingKeys.Color];
  }
  if (jsonState[ViewerChannelSettingKeys.Lut] && LUT_REGEX.test(jsonState.lut)) {
    const [min, max] = jsonState[ViewerChannelSettingKeys.Lut].split(":");
    result.lut = [min.trim(), max.trim()];
  }
  if (jsonState[ViewerChannelSettingKeys.Ramp] && RAMP_REGEX.test(jsonState.rmp)) {
    const [min, max] = jsonState[ViewerChannelSettingKeys.Ramp].split(":");
    result.ramp = [Number.parseFloat(min), Number.parseFloat(max)];
  }
  if (jsonState[ViewerChannelSettingKeys.ControlPoints] && CONTROL_POINTS_REGEX.test(jsonState.cps)) {
    result.controlPoints = parseControlPoints(jsonState[ViewerChannelSettingKeys.ControlPoints]);
  }
  return result;
}

/**
 * Serializes a single viewer channel setting into a dictionary of URL parameters
 * (`ViewerChannelSettingParams`).
 * @param channelSetting The channel state object to serialize.
 * @param removeDefaults Whether to remove properties that match the `DEFAULT_CHANNEL_STATE`.
 * @returns A `ViewerChannelSettingParams` object with the serialized parameters. Undefined values are removed.
 */
export function serializeViewerChannelSetting(
  channelSetting: Partial<ChannelState>,
  removeDefaults: boolean
): Partial<ViewerChannelSettingParams> {
  if (removeDefaults) {
    channelSetting = removeMatchingProperties(channelSetting, DEFAULT_CHANNEL_STATE);
  }
  return removeUndefinedProperties({
    [ViewerChannelSettingKeys.VolumeEnabled]: serializeBoolean(channelSetting.volumeEnabled),
    [ViewerChannelSettingKeys.SurfaceEnabled]: serializeBoolean(channelSetting.isosurfaceEnabled),
    [ViewerChannelSettingKeys.IsosurfaceValue]: channelSetting.isovalue?.toString(),
    [ViewerChannelSettingKeys.IsosurfaceAlpha]: channelSetting.opacity?.toString(),
    [ViewerChannelSettingKeys.Colorize]: serializeBoolean(channelSetting.colorizeEnabled),
    [ViewerChannelSettingKeys.ColorizeAlpha]: channelSetting.colorizeAlpha?.toString(),
    [ViewerChannelSettingKeys.Color]: channelSetting.color && colorArrayToHex(channelSetting.color),
    [ViewerChannelSettingKeys.ControlPoints]:
      channelSetting.controlPoints && serializeControlPoints(channelSetting.controlPoints),
    [ViewerChannelSettingKeys.ControlPointsEnabled]: serializeBoolean(channelSetting.useControlPoints),
    [ViewerChannelSettingKeys.Ramp]: channelSetting.ramp
      ?.map((value) => {
        return formatFloat(value);
      })
      .join(":"),
    // Note that Lut is not saved here, as it is expected as user input and is redundant with
    // the control points and ramp.
  });
}

export function deserializeViewerState(params: ViewerStateParams): Partial<ViewerState> {
  const result: Partial<ViewerState> = {
    maskAlpha: parseStringInt(params[ViewerStateKeys.Mask], 0, 100),
    imageType: parseStringEnum(params[ViewerStateKeys.Image], ImageType),
    showAxes: parseStringBoolean(params[ViewerStateKeys.Axes]),
    showBoundingBox: parseStringBoolean(params[ViewerStateKeys.BoundingBox]),
    boundingBoxColor: parseHexColorAsColorArray(params[ViewerStateKeys.BoundingBoxColor]),
    backgroundColor: parseHexColorAsColorArray(params[ViewerStateKeys.BackgroundColor]),
    autorotate: parseStringBoolean(params[ViewerStateKeys.Autorotate]),
    brightness: parseStringFloat(params[ViewerStateKeys.Brightness], 0, 100),
    density: parseStringFloat(params[ViewerStateKeys.Density], 0, 100),
    levels: parseThreeNumberArray(params[ViewerStateKeys.Levels], 0, 255),
    interpolationEnabled: parseStringBoolean(params[ViewerStateKeys.Interpolation]),
    region: parseStringRegion(params[ViewerStateKeys.Region]),
    slice: parseStringSlice(params[ViewerStateKeys.Slice]),
    time: parseStringInt(params[ViewerStateKeys.Time], 0, Number.POSITIVE_INFINITY),
    renderMode: parseStringEnum(params[ViewerStateKeys.Mode], RenderMode),
    cameraState: parseCameraState(params[ViewerStateKeys.CameraState]),
  };

  // Handle viewmode, since they use different mappings
  // TODO: Allow lowercase
  if (params.view) {
    const viewParamToViewMode = {
      "3D": ViewMode.threeD,
      Z: ViewMode.xy,
      Y: ViewMode.xz,
      X: ViewMode.yz,
    };
    const allowedViews = Object.keys(viewParamToViewMode);
    let view: "3D" | "X" | "Y" | "Z";
    if (allowedViews.includes(params.view.toUpperCase())) {
      view = params.view.toUpperCase() as "3D" | "X" | "Y" | "Z";
    } else {
      view = "3D";
    }
    result.viewMode = viewParamToViewMode[view];
  }

  return removeUndefinedProperties(result);
}

/**
 * Serializes a ViewerState object into a dictionary of URL parameters.
 * @param state The ViewerState to serialize.
 * @param removeDefaults If true, remove properties that match the `DEFAULT_VIEWER_SETTINGS` value.
 * @returns A `ViewerStateParams` object with the serialized parameters. Undefined values are removed.
 */
export function serializeViewerState(state: Partial<ViewerState>, removeDefaults: boolean): ViewerStateParams {
  // TODO: Enforce decimal places for floats/decimals?
  if (removeDefaults) {
    state = removeMatchingProperties(state, DEFAULT_VIEWER_SETTINGS);
  }
  const result: ViewerStateParams = {
    [ViewerStateKeys.Mode]: state.renderMode,
    [ViewerStateKeys.Mask]: state.maskAlpha?.toString(),
    [ViewerStateKeys.Image]: state.imageType,
    [ViewerStateKeys.Axes]: serializeBoolean(state.showAxes),
    [ViewerStateKeys.BoundingBox]: serializeBoolean(state.showBoundingBox),
    [ViewerStateKeys.BoundingBoxColor]: state.boundingBoxColor && colorArrayToHex(state.boundingBoxColor),
    [ViewerStateKeys.BackgroundColor]: state.backgroundColor && colorArrayToHex(state.backgroundColor),
    [ViewerStateKeys.Autorotate]: serializeBoolean(state.autorotate),
    [ViewerStateKeys.Brightness]: state.brightness?.toString(),
    [ViewerStateKeys.Density]: state.density?.toString(),
    [ViewerStateKeys.Interpolation]: serializeBoolean(state.interpolationEnabled),
    [ViewerStateKeys.Region]:
      state.region && `${state.region.x.join(":")},${state.region.y.join(":")},${state.region.z.join(":")}`,
    [ViewerStateKeys.Slice]: state.slice && `${state.slice.x},${state.slice.y},${state.slice.z}`,
    [ViewerStateKeys.Levels]: state.levels?.join(","),
    [ViewerStateKeys.Time]: state.time?.toString(),
    // All CameraTransform properties will be provided when serializing viewer state
    [ViewerStateKeys.CameraState]: state.cameraState && serializeCameraState(state.cameraState as CameraState),
  };

  const viewModeToViewParam = {
    [ViewMode.threeD]: "3D",
    [ViewMode.xy]: "Z",
    [ViewMode.xz]: "Y",
    [ViewMode.yz]: "X",
  };
  result[ViewerStateKeys.View] = state.viewMode && viewModeToViewParam[state.viewMode];
  return removeUndefinedProperties(result);
}

function parseDeprecatedChannelSettings(params: DeprecatedParams): ViewerChannelSettings | undefined {
  // old, deprecated channels model
  if (params.ch) {
    // ?ch=1,2
    // ?luts=0,255,0,255
    // ?colors=ff0000,00ff00
    const initialChannelSettings: ViewerChannelSettings = {
      groups: [{ name: "Channels", channels: [] }],
    };
    const ch = initialChannelSettings.groups[0].channels;

    const channelsOn = params.ch.split(",").map((numstr) => Number.parseInt(numstr, 10));
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
    return initialChannelSettings;
  }
  return undefined;
}

function parseChannelSettings(params: ChannelParams): ViewerChannelSettings | undefined {
  // Channels keys are formatted as `c0`, `c1`, etc., and the value is string containing
  // a comma-separated list of key-value pairs.
  const channelIndexToSettings: Map<number, ViewerChannelSetting> = new Map();
  Object.keys(params).forEach((key) => {
    if (isChannelKey(key)) {
      const channelIndex = Number.parseInt(key.slice(1), 10);
      try {
        const channelData = parseKeyValueList(params[key]!);
        const channelSetting = deserializeViewerChannelSetting(channelIndex, channelData as ViewerChannelSettingParams);
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
    return { groups };
  }

  return undefined;
}

//// FULL URL PARSING //////////////////////
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

/**
 * Parses a set of URL search parameters into a set of args/props for the viewer.
 * @param urlSearchParams
 */
export async function parseViewerUrlParams(urlSearchParams: URLSearchParams): Promise<{
  args: Partial<AppProps>;
  viewerSettings: Partial<ViewerState>;
}> {
  const params = getAllowedParams(urlSearchParams);
  let args: Partial<AppProps> = {};
  // Parse viewer state
  const viewerSettings: Partial<ViewerState> = deserializeViewerState(params);

  // Parse channel settings. If per-channel settings are provided, they will override
  // the old `ch` query parameter.
  const deprecatedChannelSettings = parseDeprecatedChannelSettings(params);
  const channelSettings = parseChannelSettings(params);
  args.viewerChannelSettings = channelSettings ?? deprecatedChannelSettings;

  // Parse data sources (URL or dataset/id pair)
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
    if (!firstUrl.endsWith("json") && !args.viewerChannelSettings) {
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

  return { args: removeUndefinedProperties(args), viewerSettings: removeUndefinedProperties(viewerSettings) };
}

/**
 * Serializes the ViewerState and ChannelState of a ViewerStateContext into a URLSearchParams object.
 * @param state ViewerStateContext to serialize.
 */
export function serializeViewerUrlParams(
  state: Partial<ViewerStateContextType>,
  removeDefaults: boolean = true
): AppParams {
  // TODO: Unit tests for this function
  const params = serializeViewerState(state, removeDefaults);

  const channelParams = state.channelSettings?.reduce<Record<string, string>>(
    (acc, channelSetting, index): Record<string, string> => {
      const key = `c${index}`;
      acc[key] = objectToKeyValueList(
        serializeViewerChannelSetting(channelSetting, removeDefaults) as Record<string, string>
      );
      return acc;
    },
    {} as Record<string, string>
  );

  return { ...params, ...channelParams };
}

export function isValidUrl(url: string): boolean {
  return url.startsWith("http");
}
