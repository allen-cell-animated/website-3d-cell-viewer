type ColorObject = { r: number; g: number; b: number };
type ColorArray = [number, number, number];

export const rgbObjectToColorArray = (rgbObject: ColorObject): ColorArray => [rgbObject.r, rgbObject.g, rgbObject.b];

export const colorArrayToRgbObject = (colorArray: ColorArray): ColorObject => ({
  r: colorArray[0],
  g: colorArray[1],
  b: colorArray[2],
});

export const colorArrayToFloatArray = (colorArray: ColorArray): ColorArray => [
  colorArray[0] / 255,
  colorArray[1] / 255,
  colorArray[2] / 255,
];
