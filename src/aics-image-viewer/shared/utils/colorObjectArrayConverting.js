export const rgbObjectToArray = (rgbObject) => ([rgbObject.r, rgbObject.g, rgbObject.b]);

export const colorArrayToFloatArray = (colorArray) => ([colorArray[0] / 255, colorArray[1] / 255, colorArray[2] / 255]);

export const colorArrayToRgbObject = (colorArray) => ({ r: colorArray[0], g: colorArray[1], b: colorArray[2]});
