import { Button, Input, Modal, notification } from "antd";
import React, { useState, useRef } from "react";
import styled from "styled-components";

import { FlexRow } from "../LandingPage/utils";
import { AppDataProps } from "../../types";
import { ShareAltOutlined } from "@ant-design/icons";
import {
  ALL_VIEWER_STATE_KEYS,
  connectToViewerState,
} from "../../../src/aics-image-viewer/components/ViewerStateProvider";
import { ViewerStateContextType } from "../../../src/aics-image-viewer/components/ViewerStateProvider/types";
import { serializeViewerUrlParams } from "../../utils/url_utils";
import { View3d } from "@aics/volume-viewer";

type ShareModalProps = {
  appProps: AppDataProps;
  // Used to retrieve the current camera position information
  view3dRef?: React.RefObject<View3d | null>;
} & ViewerStateContextType;

const ModalContainer = styled.div``;

const ShareModal: React.FC<ShareModalProps> = (props: ShareModalProps) => {
  const [showModal, setShowModal] = useState(false);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  const [notificationApi, notificationContextHolder] = notification.useNotification({
    getContainer: modalContainerRef.current ? () => modalContainerRef.current! : undefined,
    placement: "bottomLeft",
    duration: 2,
  });

  // location.pathname (under browser routing) will include up to `.../viewer`
  // /viewer/ is missing with hash routing.
  const baseUrl = location.protocol + "//" + location.host + location.pathname + "#/viewer/";
  const paramProps = {
    ...props,
    cameraTransform: props.view3dRef?.current?.getCameraTransform(),
  };
  let serializedViewerParams = serializeViewerUrlParams(paramProps) as Record<string, string>;

  if (props.appProps.imageUrl) {
    let serializedUrl;
    if (props.appProps.imageUrl instanceof Array) {
      serializedUrl = props.appProps.imageUrl.map((url) => encodeURIComponent(url)).join(",");
    } else {
      serializedUrl = encodeURIComponent(props.appProps.imageUrl);
    }
    // Place URL at front of serialized params
    serializedViewerParams = { url: serializedUrl, ...serializedViewerParams };
  }

  const params: URLSearchParams = new URLSearchParams(serializedViewerParams);
  const shareUrl = params.size > 0 ? `${baseUrl}?${params.toString()}` : baseUrl;

  const onClickCopy = (): void => {
    navigator.clipboard.writeText(shareUrl);
    notificationApi.success({
      message: "URL copied",
    });
  };

  return (
    <ModalContainer ref={modalContainerRef}>
      {notificationContextHolder}

      <Button type="link" onClick={() => setShowModal(!showModal)}>
        <ShareAltOutlined />
        Share
      </Button>
      <Modal
        open={showModal}
        title={"Share URL"}
        onCancel={() => {
          setShowModal(false);
        }}
        getContainer={modalContainerRef.current || undefined}
        footer={
          <Button type="default" onClick={() => setShowModal(false)}>
            Close
          </Button>
        }
        destroyOnClose={true}
      >
        <FlexRow $gap={8} style={{ marginTop: "12px" }}>
          <Input value={shareUrl} readOnly={true}></Input>
          <Button type="primary" onClick={onClickCopy}>
            Copy URL
          </Button>
        </FlexRow>
      </Modal>
    </ModalContainer>
  );
};

export default connectToViewerState(ShareModal, ALL_VIEWER_STATE_KEYS);
