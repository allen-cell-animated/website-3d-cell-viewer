import colorString from "color-string";

const canv = document.createElement("canvas");
canv.width = 256;
canv.height = 1;
canv.style.width = 256;
canv.style.height = 1;
const ctx = canv.getContext("2d");

function cssColorWithOpacity(css_str, opacity_override) {
  const arr = colorString.get(css_str).value;
  arr[3] = opacity_override;
  return colorString.to.rgb(arr);
}

// in : x, opacity, color
// out: 
export function controlPointsToLut(controlPoints) {
  const grd = ctx.createLinearGradient(0, 0, 255, 0);
  if (!controlPoints.length || controlPoints.length < 1) {
      console.log("warning: bad control points submitted to makeColorGradient; reverting to linear greyscale gradient");
      grd.addColorStop(0, "black");
      grd.addColorStop(1, "white");
  }
  else {
      // TODO: what if none at 0 and none at 1?
      for (let i = 0; i < controlPoints.length; ++i) {
        // multiply in controlPoints[i].opacity somehow at this time?
        const colorStop = cssColorWithOpacity(controlPoints[i].color, controlPoints[i].opacity);
        //console.log(controlPoints[i].x / 255.0, colorStop);
        grd.addColorStop(controlPoints[i].x / 255.0, colorStop);
      }
  }

  ctx.clearRect(0, 0, 256, 1);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 256, 1);
  const imgData = ctx.getImageData(0, 0, 256, 1);
  // console.log(imgData.data);
  return imgData.data;
};
