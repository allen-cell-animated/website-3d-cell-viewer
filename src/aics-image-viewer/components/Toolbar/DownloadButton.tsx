import React from "react";
import { Menu, Dropdown, Button } from "antd";
import ViewerIcon from "../shared/ViewerIcon";

interface DownloadButtonProps {
  cellDownloadHref: string;
  fovDownloadHref: string;
  hasFov: boolean;
}

const DownloadButton: React.FC<DownloadButtonProps> = ({ fovDownloadHref, cellDownloadHref, hasFov }) => {
  if (hasFov) {
    const menu = (
      <Menu className="download-dropdown">
        <Menu.Item key="1">
          <a href={cellDownloadHref}>
            <ViewerIcon type="download" /> Segmented cell
          </a>
        </Menu.Item>
        <Menu.Item key="2">
          <a href={fovDownloadHref}>
            <ViewerIcon type="download" /> Full field image
          </a>
        </Menu.Item>
      </Menu>
    );
    return (
      <Dropdown overlay={menu} placement="bottomRight" trigger={["click"]}>
        <Button className="ant-btn-icon-only btn-borderless">
          <ViewerIcon type="download" />
        </Button>
      </Dropdown>
    );
  } else if (cellDownloadHref) {
    return (
      <Button className="ant-btn-icon-only btn-borderless" href={cellDownloadHref}>
        <ViewerIcon type="download" />
      </Button>
    );
  } else {
    return null;
  }
};

export default DownloadButton;
