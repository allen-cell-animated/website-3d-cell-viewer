import { Button } from "antd";
import React from "react";
import styled from "styled-components";

// Enforce the primary type for behavior on hover.
const PrimaryButton = React.forwardRef<HTMLButtonElement>((props, ref) => (
  <Button {...props} ref={ref} type="primary">
    {props.children}
  </Button>
));

export const SecondaryButton = styled(PrimaryButton)`
  &&& {
    background-color: var(--color-button-secondary-bg);
    border: 1px solid var(--color-button-secondary-outline);
    color: var(--color-button-secondary-text);
  }
` as typeof Button;
