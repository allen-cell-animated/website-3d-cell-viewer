import { Button, Checkbox, Input, Modal } from "antd";
import React, { ReactElement, useState, useRef, useMemo } from "react";
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
  const [includeTimeStamp, setIncludeTimeStamp] = useState(false);
  const [timeStamp, setTimeStamp] = useState(0);

  const modalContainerRef = useRef<HTMLDivElement>(null);

  // TODO add basename
  const baseUrl = location.protocol + "//" + location.host + "/viewer";
  const params: string[] = [];

  if (props.appProps.imageUrl) {
    if (props.appProps.imageUrl instanceof Array) {
      params.push(`url=${props.appProps.imageUrl.map((url) => encodeURIComponent(url)).join(",")}`);
    } else {
      params.push(`url=${encodeURIComponent(props.appProps.imageUrl)}`);
    }
  }

  const shareUrl = params.length > 0 ? `${baseUrl}?${params.join("&")}` : baseUrl;

  return (
    <ModalContainer ref={modalContainerRef}>
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
        <FlexColumn $gap={12}>
          <Checkbox>Start at 0/570ms</Checkbox>
          <FlexRow $gap={8}>
            <Input value={shareUrl} readOnly={true}></Input>
            <Button type="primary">Copy URL</Button>
          </FlexRow>
        </FlexColumn>
      </Modal>
    </ModalContainer>
  );
}
