import React from "react";
import { Menu, Dropdown, Button, MenuProps } from "antd";
import ViewerIcon from "../shared/ViewerIcon";

interface DownloadButtonProps {
  cellDownloadHref: string;
  fovDownloadHref: string;
  hasFov: boolean;
}

const DownloadButton: React.FC<DownloadButtonProps> = ({ fovDownloadHref, cellDownloadHref, hasFov }) => {
  if (hasFov) {
    const menu: MenuProps = {
      className: "download-dropdown",
      items: [
        {
          key: "1",
          label: (
            <a href={cellDownloadHref}>
              <ViewerIcon type="download" /> Segmented cell
            </a>
          ),
        },
        {
          key: "2",
          label: (
            <a href={fovDownloadHref}>
              <ViewerIcon type="download" /> Full field image
            </a>
          ),
        },
      ],
    };
    return (
      <Dropdown menu={menu} placement="bottomRight" trigger={["click"]}>
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
