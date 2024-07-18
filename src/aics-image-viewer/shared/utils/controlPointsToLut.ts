import { Channel, ControlPoint, Histogram, Lut, Volume } from "@aics/volume-viewer";
import { findFirstChannelMatch, ViewerChannelSetting, ViewerChannelSettings } from "./viewerChannelSettings";
import { LUT_MAX_PERCENTILE, LUT_MIN_PERCENTILE } from "../constants";
import { TFEDITOR_DEFAULT_COLOR, TFEDITOR_MAX_BIN } from "../../components/TfEditor";

// @param {Object[]} controlPoints - array of {x:number, opacity:number, color:string}
// @return {Uint8Array} array of length 256*4 representing the rgba values of the gradient
export function controlPointsToLut(controlPoints: ControlPoint[]): Lut {
  const lut = new Lut().createFromControlPoints(controlPoints);
  return lut;
}

/** Returns a default lookup table based on a min/max percentile of the current volume's data. */
function getDefaultLut(histogram: Histogram): Lut {
  const hmin = histogram.findBinOfPercentile(LUT_MIN_PERCENTILE);
  const hmax = histogram.findBinOfPercentile(LUT_MAX_PERCENTILE);
  return new Lut().createFromMinMax(hmin, hmax);
}
/**
 * Parses a lookup table (LUT) from a `ViewerChannelSetting` object, where the `lut` field is an
 * array of two alphanumeric strings.
 *
 * @returns a Lut object if the `lut` field is valid; otherwise, undefined.
 *
 * Min and max values are determined as following:
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
export function parseLutFromSettings(histogram: Histogram, initSettings: ViewerChannelSetting): Lut | undefined {
  if (initSettings.lut === undefined || initSettings.lut.length !== 2) {
    return undefined;
  }

  let lutmod = "";
  let lvalue = 0;
  let lutvalues = [0, 0];
  for (let i = 0; i < 2; ++i) {
    const lstr = initSettings.lut[i];
    if (lstr === "autoij") {
      lutvalues = histogram.findAutoIJBins();
      break;
    }

    // look at first char of string.
    let firstchar = lstr.charAt(0);
    if (firstchar === "m" || firstchar === "p") {
      lutmod = firstchar;
      lvalue = parseFloat(lstr.substring(1)) / 100.0;
    } else {
      lutmod = "";
      lvalue = parseFloat(lstr);
    }
    if (lutmod === "m") {
      lutvalues[i] = histogram.maxBin * lvalue;
    } else if (lutmod === "p") {
      lutvalues[i] = histogram.findBinOfPercentile(lvalue);
    } else {
      lutvalues[i] = lvalue;
    }
  } // end for

  return new Lut().createFromMinMax(Math.min(lutvalues[0], lutvalues[1]), Math.max(lutvalues[0], lutvalues[1]));
}

/**
 * Initializes the lookup table (lut) that maps from volume intensity values to color + opacity and applies the lut to the volume.
 *
 * @param aimg The loaded volume data.
 * @param channelIndex The index of the channel to initialize the LUT for.
 * @param channelSettings The ViewerChannelSettings object that may contain settings for this channel. If relevant
 * settings are not found, a default LUT will be used.
 * @returns an object containing the retrieved lut control points for the ramp and control points.
 *
 * Lut values will be determined using the following rules:
 * - If no `lut` is provided in the `channelSettings`, a default LUT is calculated using min/max percentiles of the data.
 * - Otherwise, `lut` will be parsed as described in `ViewerChannelSettingParams.lut`.
 * - The `controlPoints` and `ramp` fields in the `channelSettings` will be used to override the returned control points and ramp,
 * respectively.
 *
 * If `controlPointsEnabled` is set to true in the `channelSettings`, the control points will be applied to the volume;
 * otherwise, the ramp will be applied.
 */
export function initializeLut(
  aimg: Volume,
  channelIndex: number,
  channelSettings?: ViewerChannelSettings
): { ramp: ControlPoint[]; controlPoints: ControlPoint[] } {
  const histogram = aimg.getHistogram(channelIndex);
  const defaultLut = getDefaultLut(histogram);

  let ramp: ControlPoint[] = [];
  let controlPoints: ControlPoint[] = [];
  let lut = defaultLut;

  const name = aimg.channelNames[channelIndex];
  const initSettings = channelSettings && findFirstChannelMatch(name, channelIndex, channelSettings);

  if (initSettings && initSettings.lut) {
    lut = parseLutFromSettings(histogram, initSettings) ?? defaultLut;
  }
  // Override the lut's control points with the provided control points and/or ramp
  controlPoints = initSettings?.controlPoints ? initSettings.controlPoints : [...lut.controlPoints];
  ramp = initSettings?.ramp ? rampToControlPoints(initSettings.ramp) : [...lut.controlPoints];

  // Apply whatever lut is currently visible
  let visibleLut: Lut;
  if (initSettings?.controlPointsEnabled) {
    visibleLut = new Lut().createFromControlPoints(controlPoints);
  } else {
    visibleLut = new Lut().createFromControlPoints(ramp);
  }

  aimg.setLut(channelIndex, visibleLut);
  return { ramp, controlPoints };
}

export function controlPointsToRamp(controlPoints: ControlPoint[]): [number, number] {
  if (controlPoints.length < 3) {
    return [0, TFEDITOR_MAX_BIN];
  }
  return [controlPoints[1].x, controlPoints[2].x];
}

export function rampToControlPoints([min, max]: [number, number]): ControlPoint[] {
  return [
    { x: Math.min(min, 0), opacity: 0, color: TFEDITOR_DEFAULT_COLOR },
    { x: min, opacity: 0, color: TFEDITOR_DEFAULT_COLOR },
    { x: max, opacity: 1, color: TFEDITOR_DEFAULT_COLOR },
    { x: Math.max(max, TFEDITOR_MAX_BIN), opacity: 1, color: TFEDITOR_DEFAULT_COLOR },
  ];
}

/** Remaps an array of control points from an old range (as a 2-tuple) to a new one (extracted from a `Channel`) */
export function remapControlPointsForChannel(
  controlPoints: ControlPoint[],
  oldRange: [number, number] | undefined,
  { rawMin, rawMax }: Channel
): ControlPoint[] {
  if (oldRange === undefined) {
    return controlPoints;
  }

  // TODO: this creates a redundant Uint8Array and algorithmically fills it twice. Can we avoid this?
  const remapLut = new Lut().createFromControlPoints(controlPoints);
  remapLut.remapDomains(oldRange[0], oldRange[1], rawMin, rawMax);
  return remapLut.controlPoints;
}
