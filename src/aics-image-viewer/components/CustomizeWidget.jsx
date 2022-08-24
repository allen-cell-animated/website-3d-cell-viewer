import React from 'react';
import { Card, Collapse } from 'antd';

import ColorPicker from './ColorPicker';
import { colorArrayToRgbObject } from '../shared/utils/colorObjectArrayConverting';

function ColorPickerRow({ color, onColorChange, children }) {
  return (
    <div style={STYLES.colorPickerRow}>
      <span style={STYLES.colorPicker}>
        <ColorPicker
          color={colorArrayToRgbObject(color)}
          onColorChange={onColorChange}
          width={18}
          disableAlpha={true}
        />
      </span>
      <span>{children}</span>
    </div>
  );
}

export default function CustomizeWidget(props) {
  return (
    <Card
      bordered={false}
      title="Customize"
      type="inner"
      className="color-customizer"
    >
      <Collapse bordered={false}>
        <Collapse.Panel key={"color-customization"}>
          <ColorPickerRow
            color={props.backgroundColor}
            onColorChange={props.changeBackgroundColor}
          >
            Background color
          </ColorPickerRow>
          <ColorPickerRow
            color={props.boundingBoxColor}
            onColorChange={props.changeBoundingBoxColor}
          >
            Bounding box color
            {!props.showBoundingBox && <i> - bounding box turned off</i>}
          </ColorPickerRow>
        </Collapse.Panel>
      </Collapse>
    </Card>
  );
}


const STYLES = {
  colorPickerRow: {
    padding: '14px 0',
    display: 'flex',
    alignItems: 'flex-start',
    borderBottom: '1px solid #6e6e6e',
  },
  colorPicker: {
    marginRight: '16px',
  },
};
