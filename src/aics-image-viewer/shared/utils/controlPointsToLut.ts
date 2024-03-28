import colorString from "color-string";
import { ControlPoint, Lut, Volume } from "@aics/volume-viewer";
import { ColorArray } from "./colorRepresentations";
import { findFirstChannelMatch, ViewerChannelSettings } from "./viewerChannelSettings";
import { LUT_MAX_PERCENTILE, LUT_MIN_PERCENTILE } from "../constants";
import { TFEDITOR_DEFAULT_COLOR } from "../../components/TfEditor";

const canv = document.createElement("canvas");
canv.width = 256;
canv.height = 1;
canv.style.width = "256px";
canv.style.height = "1px";
const ctx = canv.getContext("2d")!;

// @param {string} css_str - string representing a color that is css canvas context2d compatible
// @param {number} opacity_override - number representing an opacity value from 0 to 1
// @return {string} the new rgba color with the opacity applied to its alpha value as a css color string
function cssColorWithOpacity(css_str: ColorArray | string, opacity_override: number): string {
  if (Array.isArray(css_str)) {
    return colorString.to.rgb([css_str[0], css_str[1], css_str[2], opacity_override]);
  }
  const arr = colorString.get(css_str)!.value;
  arr[3] = opacity_override;
  return colorString.to.rgb(arr);
}

// clamp x to the range [0,1]
function clamp(x: number): number {
  return Math.min(1.0, Math.max(0.0, x));
}

// @param {Object[]} controlPoints - array of {x:number, opacity:number, color:string}
// @return {Uint8Array} array of length 256*4 representing the rgba values of the gradient
export function controlPointsToLut(controlPoints: ControlPoint[]): Lut {
  const grd = ctx.createLinearGradient(0, 0, 255, 0);
  if (!controlPoints.length || controlPoints.length < 1) {
    console.log("warning: bad control points submitted to makeColorGradient; reverting to linear greyscale gradient");
    grd.addColorStop(0, "black");
    grd.addColorStop(1, "white");
  } else {
    // TODO: what if none at 0 and none at 1?
    for (let i = 0; i < controlPoints.length; ++i) {
      // multiply in controlPoints[i].opacity somehow at this time?
      const colorStop = cssColorWithOpacity(controlPoints[i].color, controlPoints[i].opacity);
      //console.log(controlPoints[i].x / 255.0, colorStop);
      grd.addColorStop(clamp((controlPoints[i].x + 0.5) / 255.0), colorStop);
    }
  }

  ctx.clearRect(0, 0, 256, 1);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 256, 1);
  const imgData = ctx.getImageData(0, 0, 256, 1);

  const lut = new Lut();
  lut.lut = new Uint8Array(imgData.data.buffer);
  lut.controlPoints = controlPoints;

  // TODO Replace this whole function with new Lut().createFromControlPoints(controlPoints) ?

  return lut;
}

export function initializeLut(
  aimg: Volume,
  channelIndex: number,
  channelSettings?: ViewerChannelSettings
): ControlPoint[] {
  const histogram = aimg.getHistogram(channelIndex);

  // find channelIndex among viewerChannelSettings.
  const name = aimg.channelNames[channelIndex];
  // default to percentiles
  const hmin = histogram.findBinOfPercentile(LUT_MIN_PERCENTILE);
  const hmax = histogram.findBinOfPercentile(LUT_MAX_PERCENTILE);
  let lutObject = new Lut().createFromMinMax(hmin, hmax);
  // and if init settings dictate, recompute it:
  if (channelSettings) {
    const initSettings = findFirstChannelMatch(name, channelIndex, channelSettings);
    if (initSettings) {
      if (initSettings.lut !== undefined && initSettings.lut.length === 2) {
        let lutmod = "";
        let lvalue = 0;
        let lutvalues = [0, 0];
        for (let i = 0; i < 2; ++i) {
          const lstr = initSettings.lut[i];
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
        }

        lutObject = new Lut().createFromMinMax(
          Math.min(lutvalues[0], lutvalues[1]),
          Math.max(lutvalues[0], lutvalues[1])
        );
      }
    }
  }

  const newControlPoints = lutObject.controlPoints.map((controlPoint) => ({
    ...controlPoint,
    color: TFEDITOR_DEFAULT_COLOR,
  }));
  aimg.setLut(channelIndex, lutObject);
  return newControlPoints;
}
