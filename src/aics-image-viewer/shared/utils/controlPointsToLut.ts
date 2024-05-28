import { ControlPoint, Lut, Volume } from "@aics/volume-viewer";
import { findFirstChannelMatch, ViewerChannelSettings } from "./viewerChannelSettings";
import { LUT_MAX_PERCENTILE, LUT_MIN_PERCENTILE } from "../constants";
import { TFEDITOR_DEFAULT_COLOR } from "../../components/TfEditor";

// @param {Object[]} controlPoints - array of {x:number, opacity:number, color:string}
// @return {Uint8Array} array of length 256*4 representing the rgba values of the gradient
export function controlPointsToLut(controlPoints: ControlPoint[]): Lut {
  const lut = new Lut().createFromControlPoints(controlPoints);
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
