import React from "react";
import { Menu, Icon, Dropdown, Button } from "antd";

interface DownloadButtonProps {
  cellDownloadHref: string;
  fovDownloadHref: string;
  hasFov: boolean;
}

export default function DownloadButton({ fovDownloadHref, cellDownloadHref, hasFov }: DownloadButtonProps) {
  if (hasFov) {
    const menu = (
      <Menu className="download-dropdown">
        <Menu.Item key="1">
          <a href={cellDownloadHref}>
            <Icon type="download" /> Segmented cell
          </a>
        </Menu.Item>
        <Menu.Item key="2">
          <a href={fovDownloadHref}>
            <Icon type="download" /> Full field image
          </a>
        </Menu.Item>
      </Menu>
    );
    return (
      <Dropdown overlay={menu} placement="bottomRight" trigger={["click"]}>
        <Button className="btn-borderless" icon="download" />
      </Dropdown>
    );
  } else if (cellDownloadHref) {
    return <Button className="btn-borderless" icon="download" href={cellDownloadHref} />;
  } else {
    return null;
  }
}
