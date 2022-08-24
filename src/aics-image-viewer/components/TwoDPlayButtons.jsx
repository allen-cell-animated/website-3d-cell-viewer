import React from "react";
import { Button, Col, Row } from "antd";

export default function TwoDPlayButtons(props) {
  const onClick = props.showPlay ? props.play : props.pause;
  const icon = props.showPlay ? "caret-right" : "pause";

  return (
    <div style={STYLES.wrapper}>
      <Row type="flex" justify="space-around" align="bottom">
        <Col style={STYLES.rangeContainer}>
          {props.min}, {props.max}
        </Col>
        <Col>
          <Button.Group style={STYLES.playButtons}>
            <Button type="primary" shape="circle" icon="step-backward" onClick={props.goBack} />
            <Button type="primary" onClick={onClick} icon={icon} />
            <Button type="primary" shape="circle" icon="step-forward" onClick={props.goForward} />
          </Button.Group>
        </Col>
      </Row>
      <Row type="flex" justify="end"></Row>
    </div>
  );
}

const STYLES = {
  wrapper: {
    marginBottom: 8,
  },
  playButtons: {
    flex: "1 0 150px",
  },
  rangeContainer: {
    display: "flex",
    justifyContent: "flex-end",
    flexBasis: 80,
  },
};
