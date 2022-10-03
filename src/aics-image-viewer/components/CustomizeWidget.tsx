import React from "react";
import { Card, Collapse } from "antd";

import ColorPicker from "./ColorPicker";
import { ColorArray, ColorObject, colorArrayToObject } from "../shared/utils/colorRepresentations";

type ColorChangeHandler = (color: ColorObject) => void;

const ColorPickerRow: React.FC<{ color: ColorArray; onColorChange: ColorChangeHandler }> = ({
  color,
  onColorChange,
  children,
}) => (
  <div style={STYLES.colorPickerRow}>
    <span style={STYLES.colorPicker}>
      <ColorPicker color={colorArrayToObject(color)} onColorChange={onColorChange} width={18} disableAlpha={true} />
    </span>
    <span>{children}</span>
  </div>
);

export interface CustomizeWidgetProps {
  showBoundingBox: boolean;
  backgroundColor: ColorArray;
  boundingBoxColor: ColorArray;

  changeBackgroundColor: ColorChangeHandler;
  changeBoundingBoxColor: ColorChangeHandler;
}

const CustomizeWidget: React.FC<CustomizeWidgetProps> = (props) => (
  <Card bordered={false} title="Customize" type="inner" className="color-customizer">
    <Collapse bordered={false} defaultActiveKey="color-customization">
      <Collapse.Panel key="color-customization" header={null}>
        <ColorPickerRow color={props.backgroundColor} onColorChange={props.changeBackgroundColor}>
          Background color
        </ColorPickerRow>
        <ColorPickerRow color={props.boundingBoxColor} onColorChange={props.changeBoundingBoxColor}>
          Bounding box color
          {!props.showBoundingBox && <i> - bounding box turned off</i>}
        </ColorPickerRow>
      </Collapse.Panel>
    </Collapse>
  </Card>
);

const STYLES = {
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
