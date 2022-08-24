import React from "react";

export default class ErrorMessage extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="alert alert-danger" style={STYLES.wrapper}>
        <i className="material-icons" style={STYLES.warningIcon}>
          warning
        </i>
        <div style={STYLES.message}>{this.props.message}</div>
      </div>
    );
  }
}

const STYLES = {
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
