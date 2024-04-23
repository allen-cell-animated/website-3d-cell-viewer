import { UploadOutlined } from "@ant-design/icons";
import { AutoComplete, Button, Modal } from "antd";
import Fuse from "fuse.js";
import React, { ReactElement, useMemo, useRef, useState } from "react";

import { FlexRow } from "./LandingPage/utils";
import { AppDataProps } from "../types";
import { RecentDataUrl, useRecentDataUrls } from "../utils/react_utils";

const MAX_RECENT_DISPLAY_URLS = 20;

type LoadModalProps = {
  onLoad: (appProps: AppDataProps) => void;
};

export default function LoadModal(props: LoadModalProps): ReactElement {
  const [showModal, setShowModal] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  const [recentDataUrls, addRecentDataUrl] = useRecentDataUrls();

  const modalContainerRef = useRef<HTMLDivElement>(null);

  const onClickLoad = (): void => {
    // TODO: Add checks for input validity
    // TODO: Handle multiple URLs?
    // TODO: Do any transformation of URLs here? Currently just using the labels directly.
    const appProps: AppDataProps = {
      imageUrl: urlInput,
      imageDownloadHref: urlInput,
      cellId: "",
      parentImageDownloadHref: "",
    };
    props.onLoad(appProps);
    addRecentDataUrl({ url: urlInput, label: urlInput });

    // do the fancy thing of only enabling first three channels for JSON?
  };

  const onClickCopy = (): void => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(urlInput);
      // TODO: Add more user feedback here. (Button should say `Copied!` or some popup should appear.)
    }
  };

  // Set up fuse for fuzzy searching
  const fuse = useMemo(() => {
    return new Fuse(recentDataUrls, {
      keys: ["label"],
      isCaseSensitive: false,
      shouldSort: true, // sorts by match score
    });
  }, [recentDataUrls]);

  // TODO: This search could be done using a transition if needed, but since there is a max of 100 urls,
  // performance hits should be minimal.
  const autoCompleteOptions: { label: string; value: string }[] = useMemo(() => {
    let filteredItems: RecentDataUrl[] = [];
    if (urlInput === "") {
      // Show first 20 recent data urls
      filteredItems = recentDataUrls.slice(0, MAX_RECENT_DISPLAY_URLS);
    } else {
      // Show first 20 search results
      filteredItems = fuse
        .search(urlInput)
        .slice(0, MAX_RECENT_DISPLAY_URLS)
        .map((option) => option.item);
    }
    return filteredItems.map((item) => {
      return {
        label: item.label,
        value: item.url,
      };
    });
  }, [urlInput, fuse]);

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
        destroyOnClose={true}
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
            onSelect={(_value, { label }) => setUrlInput(label)}
            style={{ width: "100%" }}
            allowClear={true}
            options={autoCompleteOptions}
            getPopupContainer={getAutoCompletePopupContainer}
            placeholder="Enter a URL..."
            autoFocus={true}
          ></AutoComplete>
          <Button type="primary" onClick={onClickCopy}>
            Copy URL
          </Button>
        </FlexRow>
      </Modal>
    </div>
  );
}
