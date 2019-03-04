import React from 'react';
import { View3d } from 'volume-viewer';

import { Icon } from 'antd';

import viewMode from '../../shared/enums/viewMode';

import AxisClipSliders from '../AxisClipSliders.js';
import AutoRotateButton from '../AutoRotateButton';
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
     this.view3D = new View3d(el);
     this.props.onView3DCreated(this.view3D);
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
   }

   this.view3D.resize();
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
      <div style={STYLES.noImage} >
        <Icon
          type="loading"
          theme="outlined"

          style={{ fontSize: 60, zIndex: 1000 }} />
      </div> : null;

    const noImageText = !this.props.loadingImage && !this.props.image ?
      <div style={STYLES.noImage}>No image selected</div> : null;
    if (!!noImageText && this.view3D) {
      this.view3D.removeAllVolumes();
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
      mode={this.props.mode}
      autorotate={this.props.autorotate}
      onAutorotateChange={this.props.onAutorotateChange}
    />);
  }

 render() {
   return (
     <div className='cell-canvas' style={STYLES.viewer}>
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
    position: 'relative',
    height: '100vh',
    width: '100%',
  },
  view3d: {
    width: '100%',
    display: 'flex'
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
