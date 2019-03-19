import * as d3 from "d3";

const canv = document.createElement("canvas");
canv.width = 256;
canv.height = 1;
const ctx = canv.getContext("2d");

export function controlPointsToLut(controlPoints) {
  const x0c = 0;
  const x1c = 255;
  const grd = ctx.createLinearGradient(x0c, 0, x1c, 0);
  for (let i = 0; i < controlPoints.length; i++) {
      const d = controlPoints[i];
      //var d = this.get('controlPoints', i);
      const color = d3.color(d.color);
      color.opacity = d.opacity;
      //grd.addColorStop((d.x - x0) / Math.abs(x1 - x0), color.toString());
      grd.addColorStop(d.x / 255.0, color.toString());
  }
  ctx.fillStyle = grd;
  ctx.fillRect(x0c, 0, x1c - x0c + 1, 1);

  // extract one row
  const imagedata = ctx.getImageData(x0c, 0, x1c - x0c + 1, 1);
  let opacityGradient = new Uint8Array(256);
  for (let i = 0; i < 256; ++i) {
      // extract the alphas.
      opacityGradient[i] = imagedata.data[i * 4 + 3];
  }

  return opacityGradient;
};
