import React from "react";

import ColorPicker from "./ColorPicker";
import { ColorArray, colorArrayToObject, colorObjectToArray } from "../shared/utils/colorRepresentations";
import { Styles } from "../shared/types";
import { ViewerSettingUpdater } from "./App/types";

const ColorPickerRow: React.FC<{ color: ColorArray; onColorChange: (color: ColorArray) => void }> = ({
  color,
  onColorChange,
  children,
}) => (
  <div style={STYLES.colorPickerRow}>
    <span style={STYLES.colorPicker}>
      <ColorPicker
        color={colorArrayToObject(color)}
        onColorChange={(color) => onColorChange(colorObjectToArray(color))}
        width={18}
        disableAlpha={true}
      />
    </span>
    <span>{children}</span>
  </div>
);

export interface CustomizeWidgetProps {
  showBoundingBox: boolean;
  backgroundColor: ColorArray;
  boundingBoxColor: ColorArray;

  changeViewerSetting: ViewerSettingUpdater;

  showControls: {
    backgroundColorPicker: boolean;
    boundingBoxColorPicker: boolean;
  };
}

const CustomizeWidget: React.FC<CustomizeWidgetProps> = (props) => (
  <>
    {props.showControls.backgroundColorPicker && (
      <ColorPickerRow
        color={props.backgroundColor}
        onColorChange={(color) => props.changeViewerSetting("backgroundColor", color)}
      >
        Background color
      </ColorPickerRow>
    )}
    {props.showControls.boundingBoxColorPicker && (
      <ColorPickerRow
        color={props.boundingBoxColor}
        onColorChange={(color) => props.changeViewerSetting("boundingBoxColor", color)}
      >
        Bounding box color
        {!props.showBoundingBox && <i> - bounding box turned off</i>}
      </ColorPickerRow>
    )}
  </>
);

const STYLES: Styles = {
  colorPickerRow: {
    padding: "14px 0",
    display: "flex",
    borderBottom: "1px solid #6e6e6e",
  },
  colorPicker: {
    marginRight: "16px",
  },
};

export default CustomizeWidget;
