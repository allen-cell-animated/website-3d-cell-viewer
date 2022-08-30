import React, { useState } from "react";
import { Drawer, Button, Icon } from "antd";

import "./styles.css";

export function BottomPanel({ title, children }: React.PropsWithChildren<{ title?: string }>) {
  const [isVisible, setIsVisible] = useState(false);
  const toggleDrawer = () => setIsVisible(!isVisible);

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
}
