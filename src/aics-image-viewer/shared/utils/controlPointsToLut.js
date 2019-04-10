import * as d3 from "d3";

const canv = document.createElement("canvas");
canv.width = 256;
canv.height = 1;
const ctx = canv.getContext("2d");
const canvasScale = d3.scaleLinear();
const dataScale = d3.scaleLinear();

export function controlPointsToLut(controlPoints) {
  dataScale.domain([0, 255]).range([0, 255]);

  const extent = [controlPoints[0].x, controlPoints[controlPoints.length - 1].x];

  const x0 = dataScale(extent[0]),
      x1 = dataScale(extent[1]);

  let opacityGradient = new Uint8Array(256);

  // hack to handle degeneracy when not enough control points or control points too close together
  if (x1 === x0) {
    console.log("degenerate control point range");
    return opacityGradient;
  }
  canvasScale.domain([x0, x1]);
  canvasScale.range([0, 1]);

  // Clear previous result
  const width = ctx.canvas.clientWidth || 256;
  const height = ctx.canvas.clientHeight || 10;
  ctx.clearRect(0, 0, width, height);
  // Draw new result
  //scale to coordinates in case this canvas's width is not 256.
  const x0c = x0 * width / 256;
  const x1c = x1 * width / 256;
  const grd = ctx.createLinearGradient(x0c, 0, x1c, 0);
  for (let i = 0; i < controlPoints.length; i++) {
      const d = controlPoints[i];
      //var d = this.get('controlPoints', i);
      const color = d3.color(d.color);
      color.opacity = d.opacity;
      //grd.addColorStop((d.x - x0) / Math.abs(x1 - x0), color.toString());
      grd.addColorStop(canvasScale(dataScale(d.x)), color.toString());
  }
  ctx.fillStyle = grd;
  ctx.fillRect(x0c, 0, x1c - x0c + 1, height);

  // extract one row
  const imagedata = ctx.getImageData(x0c, 0, x1c - x0c + 1, 1);
  for (let i = 0; i < 256; ++i) {
      // extract the alphas.
      opacityGradient[i] = imagedata.data[i * 4 + 3];
  }

  return opacityGradient;
};
