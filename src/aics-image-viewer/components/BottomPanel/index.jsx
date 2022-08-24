import React, { useState } from "react";
import { Drawer, Button, Icon } from "antd";

import "./styles.css";

export function BottomPanel(props) {
  const [isVisible, setIsVisible] = useState(false);
  const toggleDrawer = () => {
    setIsVisible(!isVisible);
  };

  const optionsButton = (
    <Button className="options-button" size="small" onClick={toggleDrawer}>
      Options
      <Icon type="double-right" className="button-arrow" />
    </Button>
  );

  return (
    <div className="bottom-panel">
      <Drawer
        className="drawer"
        placement="bottom"
        closable={false}
        getContainer={false}
        visible={isVisible}
        mask={false}
        title={optionsButton}
      >
        <div className="drawer-body-wrapper">{props.children}</div>
      </Drawer>
    </div>
  );
}
