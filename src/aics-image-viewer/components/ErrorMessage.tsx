import React from "react";

const ErrorMessage: React.FC = ({ children }) => (
  <div className="alert alert-danger" style={STYLES.wrapper}>
    <i className="material-icons" style={STYLES.warningIcon}>
      warning
    </i>
    <div style={STYLES.message}>{children}</div>
  </div>
);

export default ErrorMessage;

const STYLES: { [key: string]: React.CSSProperties } = {
  wrapper: {
    display: "flex",
  },
  warningIcon: {
    flexBasis: "1em",
    verticalAlign: "middle",
    paddingRight: "0.5em",
  },
  message: {
    overflowWrap: "break-word",
    minWidth: 100,
    fontSize: 16,
  },
};
