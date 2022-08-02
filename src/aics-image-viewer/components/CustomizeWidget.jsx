import React from 'react';
import { Card, Collapse } from 'antd';

import ColorPicker from './ColorPicker';
import { colorArrayToRgbObject } from '../shared/utils/colorObjectArrayConverting';

function ColorPickerRow({name, color, onColorChange}) {
  return (
    <div style={STYLES.colorPickerRow}>
      <span style={STYLES.colorPicker}>
        <ColorPicker
          color={color}
          onColorChange={onColorChange}
          width={18}
          disableAlpha={true}
          above={true}
        />
      </span>
      <span>{name}</span>
    </div>
  );
}

export default class CustomizeWidget extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
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
              name={"Background Color"}
            />
            <ColorPickerRow
              name={"Bounding Box Color"}
            />
          </Collapse.Panel>
        </Collapse>
      </Card>
    );
  }
}

const STYLES = {
  colorPickerRow: {
    paddingBottom: '16px',
    display: 'flex',
  },
  colorPicker: {
    marginRight: '32px',
  },
};
