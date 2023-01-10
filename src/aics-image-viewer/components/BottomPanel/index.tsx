import React, { useState } from "react";
import { Drawer, Button, Icon } from "antd";

import "./styles.css";

type BottomPanelProps = {
  title?: string;
  onVisibilityChange?: (visible: boolean) => void;
};

const BottomPanel: React.FC<BottomPanelProps> = ({ children, title, onVisibilityChange }) => {
  const [isVisible, setIsVisible] = useState(false);
  const toggleDrawer = (): void => {
    setIsVisible(!isVisible);
    if (onVisibilityChange) {
      onVisibilityChange(!isVisible);
    }
  };

  const optionsButton = (
    <Button className="options-button" size="small" onClick={toggleDrawer}>
      {title || "Options"}
      <Icon type="double-left" className="button-arrow" />
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
        <div className="drawer-body-wrapper">{children}</div>
      </Drawer>
    </div>
  );
};

export default BottomPanel;
