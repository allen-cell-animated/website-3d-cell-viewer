import React from "react";
import { Card, Collapse } from "antd";

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
  <Card bordered={false} title="Customize" type="inner" className="color-customizer">
    <Collapse bordered={false} defaultActiveKey="color-customization">
      <Collapse.Panel key="color-customization" header={null}>
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
      </Collapse.Panel>
    </Collapse>
  </Card>
);

const STYLES: Styles = {
  colorPickerRow: {
    padding: "14px 0",
    display: "flex",
    alignItems: "flex-start",
    borderBottom: "1px solid #6e6e6e",
  },
  colorPicker: {
    marginRight: "16px",
  },
};

export default CustomizeWidget;
