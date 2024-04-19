import React from "react";
import Icon from "@ant-design/icons";
import { IconComponentProps } from "@ant-design/icons/lib/components/Icon";

import ICONS from "../../assets/icons";

const STYLE = { fontSize: "19px" };

/** Wrapper component for easy inclusion of our own custom icons. */
const ViewerIcon: React.FC<{ type: keyof typeof ICONS } & Omit<IconComponentProps, "type" | "component" | "ref">> = (
  props
) => <Icon component={ICONS[props.type]} {...{ ...props, style: { ...STYLE, ...props.style } }} />;

export default ViewerIcon;
