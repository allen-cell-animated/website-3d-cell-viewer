import React from "react";
import { Icon } from "antd";

import ICONS from "../../assets/icons";

// antd icons have a habit of appearing off center
// TODO: come back and verify if this is still an issue after antd upgrade.
const transform = "translateY(-2px) translateX(0.5px)";

/** Wrapper component for easy inclusion of our own custom icons. */
const ViewerIcon: React.FC<{ type: keyof typeof ICONS }> = ({ type }) => (
  <Icon component={() => <img src={ICONS[type]} />} style={{ transform }} />
);

export default ViewerIcon;
