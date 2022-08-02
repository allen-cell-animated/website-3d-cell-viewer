export const rgbObjectToArray = (rgbObject) => ([rgbObject.r, rgbObject.g, rgbObject.b]);

export const rgbObjectToFloatArray = (rgbObject) => ([rgbObject.r / 255, rgbObject.g / 255, rgbObject.b / 255]);

export const colorArrayToRgbObject = (colorArray) => ({ r: colorArray[0], g: colorArray[1], b: colorArray[2]});
