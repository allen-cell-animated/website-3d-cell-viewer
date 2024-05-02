import { Button, Dropdown, MenuProps, Modal } from "antd";
import React, { ReactElement, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { FlexColumnAlignCenter, FlexRowAlignCenter } from "./LandingPage/utils";
import { SecondaryButton } from "./Buttons";
import { DropdownSVG } from "../assets/icons";

declare const WEBSITE3DCELLVIEWER_VERSION: string;
declare const VOLUMEVIEWER_VERSION: string;

export default function HelpDropdown(): ReactElement {
  const [container, setContainer] = useState<HTMLDivElement | null>();
  const containerRef = React.useRef<HTMLDivElement>(null);

  const [showVersionModal, setShowVersionModal] = useState(false);

  const items: MenuProps["items"] = [
    {
      key: "github",
      label: (
        <Link
          to="https://github.com/allen-cell-animated/website-3d-cell-viewer"
          target="_blank"
          rel="noreferrer noopener"
        >
          Visit GitHub repository
        </Link>
      ),
    },
    {
      key: "github-issue",
      label: (
        <Link
          to="https://github.com/allen-cell-animated/website-3d-cell-viewer/issues/new/choose"
          target="_blank"
          rel="noreferrer noopener"
        >
          Report issue via GitHub
        </Link>
      ),
    },
    {
      key: "forum",
      label: (
        <Link to="https://forum.allencell.org/c/software-code/11" target="_blank" rel="noreferrer noopener">
          Allen Cell Discussion Forum
        </Link>
      ),
    },
    {
      key: "version",
      label: "Version info",
      onClick: () => {
        setShowVersionModal(true);
      },
    },
  ];

  const getContainer = container !== null ? () => container! : undefined;

  useEffect(() => {
    setContainer(containerRef.current);
  }, [containerRef.current]);

  return (
    <div ref={containerRef}>
      <Dropdown menu={{ items: items }} getPopupContainer={getContainer} trigger={["click"]}>
        <SecondaryButton>
          <FlexRowAlignCenter $gap={6}>
            Help <DropdownSVG />
          </FlexRowAlignCenter>
        </SecondaryButton>
      </Dropdown>
      <Modal
        open={showVersionModal}
        title="Version info"
        getContainer={getContainer}
        onCancel={() => {
          setShowVersionModal(false);
        }}
        footer={() => {
          return (
            <Button
              onClick={() => {
                setShowVersionModal(false);
              }}
            >
              Close
            </Button>
          );
        }}
      >
        <FlexColumnAlignCenter $gap={0}>
          <p style={{ margin: 0 }}>Website v{WEBSITE3DCELLVIEWER_VERSION}</p>
          <p style={{ margin: 0 }}>Volume viewer plugin v{VOLUMEVIEWER_VERSION}</p>
        </FlexColumnAlignCenter>
      </Modal>
    </div>
  );
}
