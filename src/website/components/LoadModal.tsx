import { Button, Input, Modal } from "antd";
import React, { ReactElement, useRef, useState } from "react";
import { FlexRow } from "./LandingPage/utils";

type LoadModalProps = {
  loadUrl: (url: string) => void;
};
const defaultProps: Partial<LoadModalProps> = {};

export default function LoadModal(inputProps: LoadModalProps): ReactElement {
  const props = { ...defaultProps, ...inputProps } as Required<LoadModalProps>;

  const [showModal, setShowModal] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef}>
      <Button type="link" onClick={() => setShowModal(!showModal)}>
        Load
      </Button>
      <Modal
        open={showModal}
        title={"Load image data"}
        onCancel={() => {
          setShowModal(false);
        }}
        getContainer={containerRef.current || undefined}
        okButtonProps={{}}
      >
        <p style={{ fontSize: "16px" }}>Provide the URL to load your OME-Zarr or OME-TIFF* data.</p>
        <p style={{ fontSize: "12px" }}>
          <i>
            *Note: this tool is intended for OME-Zarr use and performance of large OME-TIFF files may not be optimal.
          </i>
        </p>
        <FlexRow>
          <Input value={urlInput} onChange={(e) => setUrlInput(e.target.value)}></Input>
        </FlexRow>
      </Modal>
    </div>
  );
}
