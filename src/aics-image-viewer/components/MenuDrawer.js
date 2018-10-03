import React from 'react';
import classNames from 'classnames';

class MenuDrawer extends React.Component {

  constructor(props) {
    super(props);
  }

  componentDidUpdate(prevProps) {
    if(prevProps.controlPanelOpen !== this.props.controlPanelOpen) {
      setTimeout(function () {
        window.dispatchEvent(new Event('resize'));
      }, 300);
    }
  }

  render() {
    var drawerClass = classNames( {
      'cell-viewer-wrapper': true,
      'drawer-open': this.props.controlPanelOpen,
      'drawer-closed': !this.props.controlPanelOpen
    });
    return (
        <div className={drawerClass}
          style={this.props.style}
        >
          {this.props.children}
      </div>
    );
  }
}

export default MenuDrawer;

