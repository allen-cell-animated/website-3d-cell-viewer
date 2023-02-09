import React from "react";
import { Icon } from "antd";
import { IconProps } from "antd/lib/icon";

import ICONS from "../../assets/icons";

const STYLE = { fontSize: "19px" };

/** Wrapper component for easy inclusion of our own custom icons. */
const ViewerIcon: React.FC<{ type: keyof typeof ICONS } & Omit<IconProps, "type" | "component">> = (props) => (
  <Icon component={ICONS[props.type]} {...{ ...props, style: { ...STYLE, ...props.style } }} />
);

export default ViewerIcon;
