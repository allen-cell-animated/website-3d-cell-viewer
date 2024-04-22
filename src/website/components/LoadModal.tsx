import { AutoComplete, Button, Input, Modal } from "antd";
import React, { ReactElement, useRef, useState } from "react";
import { FlexRow } from "./LandingPage/utils";
import { AppDataProps } from "../types";
import { UploadOutlined } from "@ant-design/icons";

type LoadModalProps = {
  onLoad: (appProps: AppDataProps) => void;
};

export default function LoadModal(props: LoadModalProps): ReactElement {
  const [showModal, setShowModal] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const modalContainerRef = useRef<HTMLDivElement>(null);

  const onClickLoad = () => {
    // TODO: Add checks for input validity
    // TODO: Handle multiple URLs?
    const appProps: AppDataProps = {
      imageUrl: urlInput,
      imageDownloadHref: urlInput,
      cellId: "",
      parentImageDownloadHref: "",
    };
    props.onLoad(appProps);

    // do the fancy thing of only enabling first three channels for JSON?
  };

  const onClickCopy = () => {};

  const fakeOptions = [
    "https://cows.org",
    "http://example.com/cool-zarr.zarr",
    "https://shrimp-is-bugs.com/ome-tiff.ome.tiff",
    "test",
    "test",
    "test",
    "test",
  ];

  const autoCompleteOptions: { label: string; value: string }[] = fakeOptions.map((option) => {
    return {
      label: option,
      value: option,
    };
  });

  const getAutoCompletePopupContainer = modalContainerRef.current ? () => modalContainerRef.current! : undefined;

  return (
    <div ref={modalContainerRef}>
      <Button type="link" onClick={() => setShowModal(!showModal)}>
        <UploadOutlined />
        Load
      </Button>
      <Modal
        open={showModal}
        title={"Load image data"}
        onCancel={() => {
          setShowModal(false);
        }}
        getContainer={modalContainerRef.current || undefined}
        okButtonProps={{}}
        footer={
          <Button type="primary" onClick={onClickLoad}>
            Load
          </Button>
        }
      >
        <p style={{ fontSize: "16px" }}>Provide the URL to load your OME-Zarr or OME-TIFF* data.</p>
        <p style={{ fontSize: "12px" }}>
          <i>
            *Note: this tool is intended for OME-Zarr use and performance of large OME-TIFF files may not be optimal.
          </i>
        </p>
        <FlexRow $gap={6}>
          <AutoComplete
            value={urlInput}
            onChange={(value) => setUrlInput(value)}
            style={{ width: "100%" }}
            allowClear={true}
            options={autoCompleteOptions}
            getPopupContainer={getAutoCompletePopupContainer}
            placeholder="Enter a URL..."
          ></AutoComplete>
          <Button type="primary">Copy URL</Button>
        </FlexRow>
      </Modal>
    </div>
  );
}
