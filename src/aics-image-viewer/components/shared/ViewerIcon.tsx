import React from "react";
import { Icon } from "antd";

import ICONS from "../../assets/icons";

const STYLE = { fontSize: "19px" };

/** Wrapper component for easy inclusion of our own custom icons. */
const ViewerIcon: React.FC<{ type: keyof typeof ICONS }> = ({ type }) => <Icon component={ICONS[type]} style={STYLE} />;

export default ViewerIcon;
