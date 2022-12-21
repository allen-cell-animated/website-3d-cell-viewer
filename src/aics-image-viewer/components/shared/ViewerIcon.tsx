import React, { CSSProperties } from "react";
import { Icon } from "antd";

import ICONS from "../../assets/icons";

const STYLE = { fontSize: "19px" };

/** Wrapper component for easy inclusion of our own custom icons. */
const ViewerIcon: React.FC<{ type: keyof typeof ICONS; style?: Partial<CSSProperties> }> = ({ type, style }) => (
  <Icon component={ICONS[type]} style={{ ...STYLE, ...style }} />
);

export default ViewerIcon;
