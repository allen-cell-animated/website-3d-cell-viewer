import React from 'react';
import { AICSview3d } from 'volume-viewer';
import { CircularProgress, FlatButton, FontIcon } from 'material-ui';

import viewMode from '../../shared/enums/viewMode';

import AxisClipSliders from '../AxisClipSliders.js';

import './styles.scss';

const ViewMode = viewMode.mainMapping;
const VIEW_3D_VIEWER = 'view3dviewer';

export default class ViewerWrapper extends React.Component {
 constructor(props) {
   super(props);
   this.getActiveAxis = this.getActiveAxis.bind(this);
   this.setAxisClip = this.setAxisClip.bind(this);
   this.renderOverlay = this.renderOverlay.bind(this);
   this.renderClipSliders = this.renderClipSliders.bind(this);
 }

 componentDidMount() {
   if (!this.view3D) {
     let el = document.getElementById(VIEW_3D_VIEWER);
     this.view3D = new AICSview3d(el);
   }
 }

 componentWillReceiveProps(newProps) {
   if (this.view3D && this.props.mode && this.props.mode !== newProps.mode) {
     this.view3D.setCameraMode(viewMode.VIEW_MODE_ENUM_TO_LABEL_MAP.get(newProps.mode));
   }
   if (this.view3D && this.props.autorotate !== newProps.autorotate) {
     this.view3D.setAutoRotate(newProps.autorotate);
   }

   this.needToSetImage = false;
   if (this.props.image && newProps.image) {
     this.needToSetImage = this.props.image.name !== newProps.image.name;
   } else if (!this.props.image && newProps.image) {
     this.needToSetImage = true;
     this.view3D.resize();
   }

   // need view3D.resize?
 }

  componentDidUpdate() {
    if (this.props.image && this.view3D && this.needToSetImage) {
      this.view3D.setImage(this.props.image);
    }
 }

  getActiveAxis() {
    const { mode } = this.props;
    switch (mode) {
      case ViewMode.yz:
        return 'x';
      case ViewMode.xz:
        return 'y';
      case ViewMode.xy:
        return 'z';
      default:
        return null;
    }
  }

  setAxisClip(axis, minval, maxval, isOrthoAxis) {
      this.props.setAxisClip(axis, minval, maxval, isOrthoAxis);
  }

  renderOverlay() {
    const spinner = this.props.loadingImage ?
      <div style={STYLES.noImage}>
        <CircularProgress size={60}
          thickness={7}
          color="#ffffff"
          style={{ zIndex: 1000 }} />
      </div> : null;

    const noImageText = !this.props.loadingImage && !this.props.image ?
      <div style={STYLES.noImage}>No image selected</div> : null;
    if (!!noImageText && this.view3D) {
      this.view3D.destroyImage();
    }
    return noImageText || spinner;
  }

  renderClipSliders() {
    if (!this.props.image) {
      return null;
    }
    const { numSlices } = this.props;
    return (<AxisClipSliders
      mode={this.props.mode}
      activeAxis={this.getActiveAxis()}
      setAxisClip={this.setAxisClip}
      numSlices={numSlices}
    />);
  }

 render() {
   const arrow = this.props.controlPanelOpen ? 'arrow_back_ios' : 'arrow_forward_ios';

   return (
     <div className='cell-canvas' style={STYLES.viewer}>
        <FlatButton
          style={STYLES.button}
          icon={<FontIcon style={STYLES.icon} className="material-icons">{arrow}</FontIcon>}
          onClick={this.props.handleChannelToggle}
        />
        <div id={VIEW_3D_VIEWER} style={STYLES.view3d}></div>
        {this.renderClipSliders()}
        {this.renderOverlay()}
     </div>
   );
 }
}

const STYLES = {
  viewer: {
    display: 'flex',
    position: 'relative'
  },
  view3d: {
    width: '100%',
    display: 'flex'
  },
  button: {
    position: 'absolute',
    left: 0,
    top: 14,
    minWidth: 'none',
    zIndex: 1000,
    backgroundColor: '#dddddd4f'
  },
  icon: {
    fontSize: 33,
    color: 'white',
    paddingLeft: 10
  },
  noImage: {
    position: 'absolute',
    zIndex: 999,
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eeeee',
    color: '#9b9b9b',
    fontSize: '2em',
    opacity: 0.75
  }
};
