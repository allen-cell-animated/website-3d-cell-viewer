import React, { PropsWithChildren, ReactElement } from "react";
import "./styles.css";

/**
 * Provides CSS variables and global styling for the image viewer.
 */
export default function StyleProvider(props: PropsWithChildren<{}>): ReactElement {
  return <div className="aics-image-viewer-style-provider">{props.children}</div>;
}
