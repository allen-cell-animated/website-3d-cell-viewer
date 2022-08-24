import colorString from "color-string";

const canv = document.createElement("canvas");
canv.width = 256;
canv.height = 1;
canv.style.width = 256;
canv.style.height = 1;
const ctx = canv.getContext("2d");

// @param {string} css_str - string representing a color that is css canvas context2d compatible
// @param {number} opacity_override - number representing an opacity value from 0 to 1
// @return {string} the new rgba color with the opacity applied to its alpha value as a css color string
function cssColorWithOpacity(css_str, opacity_override) {
  if (Array.isArray(css_str)) {
    return colorString.to.rgb([css_str[0], css_str[1], css_str[2], opacity_override]);
  }
  const arr = colorString.get(css_str).value;
  arr[3] = opacity_override;
  return colorString.to.rgb(arr);
}

// clamp x to the range [0,1]
function clamp(x) {
  return Math.min(1.0, Math.max(0.0, x));
}

// @param {Object[]} controlPoints - array of {x:number, opacity:number, color:string}
// @return {Uint8Array} array of length 256*4 representing the rgba values of the gradient
export function controlPointsToLut(controlPoints) {
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
  return imgData.data;
}
