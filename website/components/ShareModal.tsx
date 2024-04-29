import { Button, Checkbox, Input, Modal, notification } from "antd";
import React, { ReactElement, useState, useRef } from "react";
import styled from "styled-components";

import { FlexColumn, FlexRow } from "./LandingPage/utils";
import { AppDataProps } from "../types";
import { ShareAltOutlined } from "@ant-design/icons";

type LoadModalProps = {
  appProps: AppDataProps;
};

const ModalContainer = styled.div``;

export default function LoadModal(props: LoadModalProps): ReactElement {
  const [showModal, setShowModal] = useState(false);

  const [notificationApi, notificationContextHolder] = notification.useNotification();

  const modalContainerRef = useRef<HTMLDivElement>(null);

  // location.pathname will include up to `.../viewer`
  const baseUrl = location.protocol + "//" + location.host + location.pathname;
  const params: string[] = [];

  if (props.appProps.imageUrl) {
    if (props.appProps.imageUrl instanceof Array) {
      params.push(`url=${props.appProps.imageUrl.map((url) => encodeURIComponent(url)).join(",")}`);
    } else {
      params.push(`url=${encodeURIComponent(props.appProps.imageUrl)}`);
    }
  }

  const shareUrl = params.length > 0 ? `${baseUrl}?${params.join("&")}` : baseUrl;

  const copyUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    notificationApi.success({
      message: "URL copied",
      placement: "bottomLeft",
      duration: 2,
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
        okButtonProps={{}}
        footer={
          <Button type="default" onClick={() => setShowModal(false)}>
            Close
          </Button>
        }
        destroyOnClose={true}
      >
        <FlexRow $gap={8} style={{ marginTop: "12px" }}>
          <Input value={shareUrl} readOnly={true}></Input>
          <Button type="primary" onClick={copyUrl}>
            Copy URL
          </Button>
        </FlexRow>
      </Modal>
    </ModalContainer>
  );
}
