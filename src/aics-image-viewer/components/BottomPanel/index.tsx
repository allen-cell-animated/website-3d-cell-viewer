import React, { useState } from "react";
import { Drawer, Button } from "antd";

import ViewerIcon from "../shared/ViewerIcon";
import "./styles.css";

type BottomPanelProps = {
  title?: string;
  onVisibleChange?: (visible: boolean) => void;
  onVisibleChangeEnd?: (visible: boolean) => void;
};

const BottomPanel: React.FC<BottomPanelProps> = ({ children, title, onVisibleChange, onVisibleChangeEnd }) => {
  const [isVisible, setIsVisible] = useState(false);
  const toggleDrawer = (): void => {
    setIsVisible(!isVisible);
    if (onVisibleChange) {
      onVisibleChange(!isVisible);
    }
  };

  const optionsButton = (
    <Button className="options-button" size="small" onClick={toggleDrawer}>
      {title || "Options"}
      <ViewerIcon type="closePanel" className="button-arrow" style={{ fontSize: "15px" }} />
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
        afterVisibleChange={onVisibleChangeEnd}
      >
        <div className="drawer-body-wrapper">{children}</div>
      </Drawer>
    </div>
  );
};

export default BottomPanel;
