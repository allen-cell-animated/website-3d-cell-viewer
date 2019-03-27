// 3rd Party Imports
import { Layout } from "antd";
import React from 'react';
import { includes, isEqual, filter, find } from 'lodash';
import { 
  RENDERMODE_PATHTRACE,
  RENDERMODE_RAYMARCH,
  Volume, 
  VolumeLoader,
} from 'volume-viewer';

import { controlPointsToLut } from '../../shared/utils/controlPointsToLut';
import HttpClient from '../../shared/utils/httpClient';
import enums from '../../shared/enums';
import {
  CELL_SEGMENTATION_CHANNEL_NAME,
  OBSERVED_CHANNEL_KEY,
  SEGMENTATION_CHANNEL_KEY,
  CONTOUR_CHANNEL_KEY,
  OTHER_CHANNEL_KEY,
  PRESET_COLORS_0,
  ALPHA_MASK_SLIDER_3D_DEFAULT,
  ALPHA_MASK_SLIDER_2D_DEFAULT,
  SEGMENTED_CELL,
  VOLUME_ENABLED,
  LUT_CONTROL_POINTS,
  ISO_SURFACE_ENABLED,
  ALPHA_MASK_SLIDER_LEVEL,
  FULL_FIELD_IMAGE,
  BRIGHTNESS_SLIDER_LEVEL,
  DENSITY_SLIDER_LEVEL,
  LEVELS_SLIDER,
  BRIGHTNESS_SLIDER_LEVEL_DEFAULT,
  DENSITY_SLIDER_LEVEL_DEFAULT,
  LEVELS_SLIDER_DEFAULT,
  ISO_VALUE,
  OPACITY,
  COLOR,
  SAVE_ISO_SURFACE,
  MODE,
  AUTO_ROTATE,
  MAX_PROJECT,
  PATH_TRACE,
} from '../../shared/constants';

import ControlPanel from '../ControlPanel';
import ViewerWrapper from '../CellViewerCanvasWrapper';
import { TFEDITOR_DEFAULT_COLOR } from '../TfEditor';


import '../../assets/styles/globals.scss';
import '../../assets/styles/no-ui-slider.min.scss';
import { 
  gammaSliderToImageValues, 
  densitySliderToImageValue, 
  brightnessSliderToImageValue, 
  alphaSliderToImageValue,
} from "../../shared/utils/sliderValuesToImageValues";

import './styles.scss';

const ViewMode = enums.viewMode.mainMapping;
const channelGroupingMap = enums.channelGroups.channelGroupingMap;
const { Sider, Content } = Layout;

const OK_STATUS = 'OK';
const ERROR_STATUS = 'Error';
const INIT_COLORS = PRESET_COLORS_0;
const CHANNEL_SETTINGS = 'channelSettings';

export default class App extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      image: null,
      view3d: null,
      files: null,
      cellId: props.cellId,
      fovPath: props.fovPath,
      cellPath: props.cellPath,
      queryErrorMessage: null,
      sendingQueryRequest: false,
      openFilesOnly: false,
      channelDataReady: {},
      // channelGroupedByType is an object where channel indexes are grouped by type (observed, segmenations, and countours)
      // {observed: channelIndex[], segmenations: channelIndex[], contours: channelIndex[], other: channelIndex[] }
      channelGroupedByType: {},
      // did the requested image have a cell id (in queryInput)?
      hasCellId: !!props.cellId,
      // state set by the UI:
      userSelections: {
        imageType: SEGMENTED_CELL,
        controlPanelClosed: false,
        [MODE]: ViewMode.threeD,
        [AUTO_ROTATE]: false,
        [MAX_PROJECT]: false,
        [PATH_TRACE]: false,
        [ALPHA_MASK_SLIDER_LEVEL]: ALPHA_MASK_SLIDER_3D_DEFAULT,
        [BRIGHTNESS_SLIDER_LEVEL]: BRIGHTNESS_SLIDER_LEVEL_DEFAULT, 
        [DENSITY_SLIDER_LEVEL]: DENSITY_SLIDER_LEVEL_DEFAULT,
        [LEVELS_SLIDER]: LEVELS_SLIDER_DEFAULT,
        // channelSettings is a flat list of objects of this type:
        // { name, enabled, volumeEnabled, isosurfaceEnabled, isovalue, opacity, color, dataReady}
        [CHANNEL_SETTINGS]: [],
      }
    };

    this.openImage = this.openImage.bind(this);
    this.loadFromJson = this.loadFromJson.bind(this);
    this.onChannelDataLoaded = this.onChannelDataLoaded.bind(this);

    this.onViewModeChange = this.onViewModeChange.bind(this);
    this.updateChannelTransferFunction = this.updateChannelTransferFunction.bind(this);
    this.onAutorotateChange = this.onAutorotateChange.bind(this);
    this.onSwitchFovCell = this.onSwitchFovCell.bind(this);
    this.handleOpenImageResponse = this.handleOpenImageResponse.bind(this);
    this.handleOpenImageException = this.handleOpenImageException.bind(this);
    this.toggleControlPanel = this.toggleControlPanel.bind(this);
    this.onUpdateImageMaskAlpha = this.onUpdateImageMaskAlpha.bind(this);
    this.setImageAxisClip = this.setImageAxisClip.bind(this);
    this.onApplyColorPresets = this.onApplyColorPresets.bind(this);
    this.getNumberOfSlices = this.getNumberOfSlices.bind(this);
    this.makeUpdatePixelSizeFn = this.makeUpdatePixelSizeFn.bind(this);
    this.setUserSelectionsInState = this.setUserSelectionsInState.bind(this);
    this.changeChannelSettings = this.changeChannelSettings.bind(this);
    this.changeOneChannelSetting = this.changeOneChannelSetting.bind(this);
    this.handleChangeUserSelection = this.handleChangeUserSelection.bind(this);
    this.handleChangeToImage = this.handleChangeToImage.bind(this);
    this.updateStateOnLoadImage = this.updateStateOnLoadImage.bind(this);
    this.intializeNewImage = this.intializeNewImage.bind(this);
    this.onView3DCreated = this.onView3DCreated.bind(this);
    this.createChannelGrouping = this.createChannelGrouping.bind(this);
    this.beginRequestImage = this.beginRequestImage.bind(this);
    this.loadNextImage = this.loadNextImage.bind(this);
    this.loadPrevImage = this.loadPrevImage.bind(this);
    this.getOneChannelSetting = this.getOneChannelSetting.bind(this);
    this.setInitialChannelConfig = this.setInitialChannelConfig.bind(this);
    this.nameClean = this.nameClean.bind(this);
    document.addEventListener('keydown', this.handleKeydown, false);
  }


  componentDidMount() {
    const { cellId } = this.props;
    if (cellId) {
      this.beginRequestImage();
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const {
      cellId,
      cellPath,
    } = this.props;
    const { userSelections } = this.state;
    
    // delayed for the animation to finish
    if (prevState.userSelections.controlPanelClosed !== this.state.userSelections.controlPanelClosed) {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 200);
    }
    const newRequest = cellId !== prevProps.cellId;
    if (newRequest) {
      if (cellPath === prevProps.nextImgPath ) {
        this.loadNextImage();
      } else if (cellPath === prevProps.prevImgPath) {
        this.loadPrevImage();
      } else {
        this.beginRequestImage();
      }
    }
    const channelsChanged = !isEqual(userSelections[CHANNEL_SETTINGS], prevState.userSelections[CHANNEL_SETTINGS]);
    const newImage = this.state.image && !prevState.image;
    const imageChanged = this.state.image && prevState.image && this.state.image.name !== prevState.image.name;
    if (newImage || channelsChanged || imageChanged) {
      this.updateImageVolumeAndSurfacesEnabledFromAppState();
    }
  }

  onView3DCreated(view3d) {
    this.setState({ view3d });
  }

  setInitialChannelConfig(channelNames, channelColors) {
    const { defaultVolumesOn, defaultSurfacesOn } = this.props;
    return channelNames.map((channel, index) => {
      return {
        name: this.nameClean(channel) || "Channel " + index,
        [VOLUME_ENABLED]: includes(defaultVolumesOn, index),
        [ISO_SURFACE_ENABLED]: includes(defaultSurfacesOn, index),
        isovalue: 188,
        opacity: 1.0,
        color: channelColors[index] ? channelColors[index].slice() : [226, 205, 179], // guard for unexpectedly longer channel list
        dataReady: false,
      };
    });
  }

  // PROP for standardizing channel names. 
  //Ie if you want both segmenation and raw of the same protein to have the same UI settings.
  nameClean(channelName) {
    const {
      channelNameClean
    } = this.props;
    if (channelNameClean) {
      return channelNameClean(channelName);
    }
    return channelName;
  }

  createChannelGrouping(channels) {
    const {
      initialChannelAcc,
      groupToChannelNameMap,
      keyList,
    } = this.props;
    if (channels) {
      const grouping = channels.reduce((acc, channel, index) => {
        let other = true;
        keyList.forEach(key => {
          if (includes(groupToChannelNameMap[key], channel)) {
            if (!includes(acc[key], index)) {
              acc[key].push(index);
            }
            other = false;
          }
        });
        if (other) {
          if (!acc[OTHER_CHANNEL_KEY]) {
            acc[OTHER_CHANNEL_KEY] = [];
          }
          if (!includes(acc[OTHER_CHANNEL_KEY], index)) {
            acc[OTHER_CHANNEL_KEY].push(index);
          }
        }
        return acc;
      }, initialChannelAcc);

      return grouping;
    }
    return {};
  }

  stopPollingForImage() {
    if (this.openImageInterval) {
      clearInterval(this.openImageInterval);
      this.openImageInterval = null;
    }
  }

  checkDimensionsMatch(a, b) {
    return ((a.width === b.width) ||
      (a.height === b.height) ||
      (a.rows === b.rows) ||
      (a.cols === b.cols) ||
      (a.tiles === b.tiles) ||
      (a.tile_width === b.tile_width) ||
      (a.tile_height === b.tile_height) ||
      (a.atlas_width === b.atlas_width) ||
      (a.atlas_height === b.atlas_height));
  }

  handleOpenImageResponse(resp, queryType, imageDirectory, doResetViewMode, stateKey, resetLuts) {
    if (resp.data.status === OK_STATUS) {
      if (this.stateKey === 'image') {
        this.setState({
          currentlyLoadedImagePath: imageDirectory,
          channelDataReady: {},
          queryErrorMessage: null,
          cachingInProgress: false,
          mode: doResetViewMode ? ViewMode.threeD : this.state.userSelections.mode
        });  
      }
      this.loadFromJson(resp.data, resp.data.name, resp.locationHeader, stateKey, resetLuts);
      this.stopPollingForImage();
    } else if (resp.data.status === ERROR_STATUS) {
      this.stopPollingForImage();
    } else {
      this.setState({
        cachingInProgress: true
      });
    }
  }

  handleOpenImageException(resp) {
    let message = "Unknown Error";
    if (resp.data && resp.data.message) {
      message = resp.data.message;
    }
    else if (resp.stack) {
      message = resp.stack;
    }
    else if (resp.message) {
      message = resp.message;
    }
    else {
      message = JSON.stringify(resp);
    }
    // console.log(message);
    this.stopPollingForImage();
  }

  openImage(imageDirectory, doResetViewMode, stateKey, resetLuts) {
    if (imageDirectory === this.state.currentlyLoadedImagePath) {
      return;
    }
    const {
      baseUrl,
    } = this.props;

    const toLoad = baseUrl ? `${baseUrl}/${imageDirectory}_atlas.json` : `${imageDirectory}'_atlas.json`;
    //const toLoad = BASE_URL + 'AICS-10/AICS-10_5_5_atlas.json';
    // retrieve the json file directly from its url
    new HttpClient().getJSON(toLoad, {mode:'cors'})
      .then(resp => {
        // set up some stuff that the backend caching service was doing for us, to spoof the rest of the code
        resp.data.status = OK_STATUS;
        resp.locationHeader = toLoad.substring(0, toLoad.lastIndexOf('/') + 1);
        return this.handleOpenImageResponse(resp, 0, imageDirectory, doResetViewMode, stateKey, resetLuts);
      })
      .catch(resp => this.handleOpenImageException(resp));
  }

  intializeNewImage(aimg, newChannelSettings) {
    console.log('new image')
    const { userSelections, view3d } = this.state;
    const { filterFunc } = this.props;
    const channelSetting = newChannelSettings || userSelections[CHANNEL_SETTINGS];
    let alphaLevel = userSelections.imageType === SEGMENTED_CELL && userSelections.mode === ViewMode.threeD ? ALPHA_MASK_SLIDER_3D_DEFAULT : ALPHA_MASK_SLIDER_2D_DEFAULT;

    let imageMask = alphaSliderToImageValue(alphaLevel);
    let imageBrightness = brightnessSliderToImageValue(userSelections[BRIGHTNESS_SLIDER_LEVEL], userSelections[PATH_TRACE]);
    let imageDensity = densitySliderToImageValue(userSelections[DENSITY_SLIDER_LEVEL], userSelections[PATH_TRACE]);
    let imageValues = gammaSliderToImageValues(userSelections[LEVELS_SLIDER]);
    // set alpha slider first time image is loaded to something that makes sense
    this.setUserSelectionsInState({[ALPHA_MASK_SLIDER_LEVEL] : alphaLevel });
    
    // Here is where we officially hand the image to the volume-viewer
    
    view3d.removeAllVolumes();
    view3d.addVolume(aimg, {
      channels: aimg.channel_names.map((name) => {
        const ch = this.getOneChannelSetting(name, channelSetting);
        if (!ch) {
          return {};
        }
        if (filterFunc && !filterFunc(name)) {
          return {
            enabled: false,
            isosurfaceEnableed: false,
            isovalue: ch.isovalue,
            isosurfaceOpacity: ch.opacity,
            color: ch.color
          };
        } 
   
        return {
          enabled: ch[VOLUME_ENABLED],
          isosurfaceEnableed: ch[ISO_SURFACE_ENABLED],
          isovalue: ch.isovalue,
          isosurfaceOpacity: ch.opacity,
          color: ch.color
        };
      })
    });

    view3d.updateMaskAlpha(aimg, imageMask);
    view3d.setMaxProjectMode(aimg, userSelections[MAX_PROJECT]);
    view3d.updateExposure(imageBrightness);
    view3d.updateDensity(aimg, imageDensity);
    view3d.setGamma(aimg, imageValues.min, imageValues.scale, imageValues.max);
    // update current camera mode to make sure the image gets the update
    view3d.setCameraMode(enums.viewMode.VIEW_MODE_ENUM_TO_LABEL_MAP.get(userSelections.mode));
    // tell view that things have changed for this image
    view3d.updateActiveChannels(aimg);

  }

  updateStateOnLoadImage(channelNames) {
    const { userSelections } = this.state;
    const { filterFunc } = this.props;
    const filteredChannels = filterFunc ? filter(channelNames, filterFunc) : channelNames;

    let newChannelSettings = userSelections[CHANNEL_SETTINGS].length === filteredChannels.length ?
      userSelections[CHANNEL_SETTINGS] : this.setInitialChannelConfig(filteredChannels, INIT_COLORS, filterFunc);
    let channelGroupedByType = this.createChannelGrouping(channelNames);
    this.setUserSelectionsInState({
      [CHANNEL_SETTINGS]: newChannelSettings,
    });
    this.setState({
      channelGroupedByType,
      userSelections: {
        ...this.state.userSelections,
        [CHANNEL_SETTINGS]: newChannelSettings,
      }
    });
    return newChannelSettings;
  }

  onChannelDataLoaded(aimg, thisChannelsSettings, channelIndex, resetLuts) {
    const { image, view3d } = this.state;
    if (aimg !== image) {
      return;
    }
    const volenabled = thisChannelsSettings[VOLUME_ENABLED];
    const isoenabled = thisChannelsSettings[ISO_SURFACE_ENABLED];
    view3d.setVolumeChannelOptions(aimg, channelIndex, {
      enabled: volenabled,
      color: thisChannelsSettings.color,
      isosurfaceEnabled: isoenabled,
      isovalue: thisChannelsSettings.isovalue,
      isosurfaceOpacity: thisChannelsSettings.opacity
    });

    // first time: if userSelections control points don't exist yet for this channel, then do some init.
    // OR if we are switching between FOV or SEG
    if (!thisChannelsSettings[LUT_CONTROL_POINTS] || resetLuts) {
      const lutObject = aimg.getHistogram(channelIndex).lutGenerator_auto2();
      aimg.setLut(channelIndex, lutObject.lut);
      const newControlPoints = lutObject.controlPoints.map(controlPoint => ({ ...controlPoint, color: TFEDITOR_DEFAULT_COLOR }));
      this.changeOneChannelSetting(thisChannelsSettings.name, channelIndex, LUT_CONTROL_POINTS, newControlPoints);
    } else {
      const lut = controlPointsToLut(thisChannelsSettings[LUT_CONTROL_POINTS]);
      aimg.setLut(channelIndex, lut);
      view3d.updateLuts(aimg);
    }

    if (view3d) {
      if (aimg.channelNames()[channelIndex] === CELL_SEGMENTATION_CHANNEL_NAME) {
        view3d.setVolumeChannelAsMask(aimg, channelIndex);
      }
    }

    // when any channel data has arrived:
    if (this.state.sendingQueryRequest) {
      this.setState({ sendingQueryRequest: false });
    }
    if (aimg.loaded) {
      view3d.updateActiveChannels(aimg);
    }
  }

  loadPrevImage() {
    const { image, prevImg } = this.state;
    const { prevImgPath } = this.props;

    // assume prevImg is available to initialize
    this.intializeNewImage(prevImg);
    this.setState({
      image: prevImg,
      nextImg: image
    });
    // preload the new "prevImg"
    this.openImage(prevImgPath, true, 'prevImg');

  }

  loadNextImage() {
    const { image, nextImg } = this.state;
    const { nextImgPath } = this.props;

    // assume nextImg is available to initialize
    this.intializeNewImage(nextImg);
    this.setState({
      image: nextImg, 
      prevImg: image
    });
    // preload the new "nextImg"
    this.openImage(nextImgPath, true, 'nextImg');
  }

  loadFromJson(obj, title, locationHeader, stateKey, resetLuts) {
    const aimg = new Volume(obj);

    const  newChannelSettings = this.updateStateOnLoadImage(obj.channel_names);
    // if we have some url to prepend to the atlas file names, do it now.
    if (locationHeader) {
      obj.images = obj.images.map(img => ({ ...img, name: `${locationHeader}${img.name}` }));
    }
    // GO OUT AND GET THE VOLUME DATA.
    VolumeLoader.loadVolumeAtlasData(aimg, obj.images, (url, channelIndex) => {
      // const thisChannelSettings = this.getOneChannelSetting(channel.name, newChannelSettings, (channel) => channel.name === obj.channel_names[channelIndex].split('_')[0]);
      const thisChannelSettings = this.getOneChannelSetting(obj.channel_names[channelIndex], newChannelSettings);
      this.onChannelDataLoaded(aimg, thisChannelSettings, channelIndex, resetLuts);
    });
    if (stateKey === 'image') {
      this.intializeNewImage(aimg, newChannelSettings);
    }
    this.setState({ [stateKey]: aimg });
  }

  handleChangeUserSelection(key, newValue) {
    this.setUserSelectionsInState({ [key]: newValue });
    this.handleChangeToImage(key, newValue);
  }

  changeOneChannelSetting(channelName, channelIndex, keyToChange, newValue) {
    const { userSelections } = this.state;
    const newChannels = userSelections[CHANNEL_SETTINGS].map((channel, index) => {
      return channel.name === channelName ? { ...channel, [keyToChange]: newValue } : channel;
    });

    this.setUserSelectionsInState({ [CHANNEL_SETTINGS]: newChannels });
    this.handleChangeToImage(keyToChange, newValue, channelIndex);
  }

  changeChannelSettings(indices, keyToChange, newValue) {
    const { userSelections } = this.state;
    const newChannels = userSelections[CHANNEL_SETTINGS].map((channel, index) => {
      return { ...channel, [keyToChange]: includes(indices, index) ? newValue : channel[keyToChange] };
    });
    this.setUserSelectionsInState({ [CHANNEL_SETTINGS]: newChannels });
  }

  setUserSelectionsInState(newState) {
    this.setState({
      userSelections: {
        ...this.state.userSelections,
        ...newState,
      }
    });
  }

  handleChangeToImage(keyToChange, newValue, index) {
    const { image, userSelections, view3d } = this.state;
    if (!image || !view3d) {
      return;
    }
    switch (keyToChange) {
      case ISO_VALUE:
        view3d.setVolumeChannelOptions(image, index, {
          isovalue: newValue,
        });
        break;
      case OPACITY:
        view3d.setVolumeChannelOptions(image, index, {
          isosurfaceOpacity: newValue
        });  
        break;
      case COLOR:
        let newColor = newValue.r ? [newValue.r, newValue.g, newValue.b, newValue.a] : newValue;
        view3d.setVolumeChannelOptions(image, index, {
          color: newColor,
        });  
        view3d.updateMaterial(image);
        break;
      case MODE:
        view3d.setCameraMode(enums.viewMode.VIEW_MODE_ENUM_TO_LABEL_MAP.get(newValue));
        break;
      case SAVE_ISO_SURFACE:
        view3d.saveChannelIsosurface(image, index, newValue);
        break;
      case MAX_PROJECT:
        view3d.setMaxProjectMode(image, newValue ? true : false);
        view3d.updateActiveChannels(image);
        break;
      case PATH_TRACE:
        view3d.setVolumeRenderMode(newValue ? RENDERMODE_PATHTRACE : RENDERMODE_RAYMARCH);
        view3d.updateActiveChannels(image);
        break;
      case ALPHA_MASK_SLIDER_LEVEL:
        let imageMask = alphaSliderToImageValue(newValue);
        view3d.updateMaskAlpha(image, imageMask);
        view3d.updateActiveChannels(image);
        break;
      case BRIGHTNESS_SLIDER_LEVEL:
        let imageBrightness = brightnessSliderToImageValue(newValue, userSelections[PATH_TRACE]);
        view3d.updateExposure(imageBrightness);
        break;
      case DENSITY_SLIDER_LEVEL:
        let imageDensity = densitySliderToImageValue(newValue, userSelections[PATH_TRACE]);
        view3d.updateDensity(image, imageDensity);
        break;
      case LEVELS_SLIDER:
        let imageValues = gammaSliderToImageValues(newValue);
        view3d.setGamma(image, imageValues.min, imageValues.scale, imageValues.max);
        break;
    }
  }

  onViewModeChange(newMode) {
    const { userSelections } = this.state;
    let newSelectionState = {
      [MODE]: newMode,
    };
      // if switching between 2D and 3D reset alpha mask to default (off in in 2D, 50% in 3D)
      // if full field, dont mask
    if (userSelections.mode === ViewMode.threeD && newMode !== ViewMode.threeD) {
      // Switching to 2d 
      newSelectionState = {
        [MODE]: newMode,
        [ALPHA_MASK_SLIDER_LEVEL]: ALPHA_MASK_SLIDER_2D_DEFAULT,
      };
    } else if (
      userSelections.mode !== ViewMode.threeD && 
      newMode === ViewMode.threeD && 
      this.state.userSelections.imageType === SEGMENTED_CELL
    ) {
      // switching to 3d 
      newSelectionState = {
          [MODE]: newMode,
          [ALPHA_MASK_SLIDER_LEVEL]: ALPHA_MASK_SLIDER_3D_DEFAULT,
      };
    }
    this.handleChangeToImage(MODE, newMode);
    if (newSelectionState[ALPHA_MASK_SLIDER_LEVEL]) {
      this.handleChangeToImage(ALPHA_MASK_SLIDER_LEVEL, newSelectionState[ALPHA_MASK_SLIDER_LEVEL]);
    }
    this.setUserSelectionsInState(newSelectionState);
  }

  onUpdateImageMaskAlpha(sliderValue) {
    this.setUserSelectionsInState({ [ALPHA_MASK_SLIDER_LEVEL]: sliderValue });
  }

  onAutorotateChange() {
    this.setUserSelectionsInState({ [AUTO_ROTATE]: !this.state.userSelections[AUTO_ROTATE] });
  }

  setImageAxisClip(axis, minval, maxval, isOrthoAxis) {
    if (this.state.view3d && this.state.image) {
      this.state.view3d.setAxisClip(this.state.image, axis, minval, maxval, isOrthoAxis);
    }
  }

  makeUpdatePixelSizeFn(i) {
    const { pixelSize } = this.props;
    const imagePixelSize = pixelSize ? pixelSize.slice() : [1, 1, 1];
    return (value) => {
      const pixelSize = imagePixelSize.slice();
      pixelSize[i] = value;
      this.state.image.setVoxelSize(pixelSize);
    };
  }

  onSwitchFovCell(value) {
    const { cellPath, fovPath } = this.props;
    const path = value === FULL_FIELD_IMAGE ? fovPath : cellPath;
    this.openImage(path, false, 'image', true);
    this.setState({
        sendingQueryRequest: true,
        userSelections: {
            ...this.state.userSelections,
          imageType: value,
        }
    });
    
  }

  onApplyColorPresets(presets) {
    const { userSelections } = this.state;
    presets.forEach((color, index) => {
      this.handleChangeToImage(COLOR, color, index);
    });
    const newChannels = userSelections[CHANNEL_SETTINGS].map((channel, channelindex) => {
      return presets[channelindex] ? { ...channel, color: presets[channelindex] } : channel;
    });
    this.setUserSelectionsInState({ [CHANNEL_SETTINGS]: newChannels });
  }

  updateChannelTransferFunction(index, lut) {
    if (this.state.image) {
      this.state.image.setLut(index, lut);
      if (this.state.view3d) {
        this.state.view3d.updateLuts(this.state.image);
      }
    }
  }

  beginRequestImage(type) {
    const {
      fovPath, 
      cellPath,
      cellId,
      prevImgPath, 
      nextImgPath,
      preLoad,
    } = this.props;
    let imageType = type || this.state.userSelections.imageType;
    let path;
    if (imageType === FULL_FIELD_IMAGE ) {
      path = fovPath;
    }
    else if (imageType === SEGMENTED_CELL) {
      path = cellPath;
    }
    this.setState({
      cellId,
      path,
      hasCellId: !!cellId,
      sendingQueryRequest: true,
      userSelections: {
        ...this.state.userSelections,
        imageType,
      }
    });
    if (preLoad) {
      this.openImage(nextImgPath, true, 'nextImg');
      this.openImage(prevImgPath, true, 'prevImg');
    }
    this.openImage(path, true, 'image');
  }

  getOneChannelSetting(channelName, newSettings) {
    const { userSelections } = this.state;
    const channelSettings = newSettings || userSelections[CHANNEL_SETTINGS];
    return find(channelSettings, (channel) => {
      return channel.name === this.nameClean(channelName);
    });
  }

  updateImageVolumeAndSurfacesEnabledFromAppState() {
    const { image, view3d } = this.state;
    // apply channel settings
    // image.channel_names
    if (!image) {
      return; 
    }
    image.channel_names.forEach((channelName, imageIndex) => {
      if (image.getChannel(imageIndex).loaded) {
        const channelSetting = this.getOneChannelSetting(channelName);
        const volenabled = channelSetting[VOLUME_ENABLED];
        const isoenabled = channelSetting[ISO_SURFACE_ENABLED];

        view3d.setVolumeChannelOptions(image, imageIndex, {
          enabled: volenabled,
          color: channelSetting.color,
          isosurfaceEnabled: isoenabled,
          isovalue: channelSetting.isovalue,
          isosurfaceOpacity: channelSetting.opacity
        });

      };
    });

    view3d.updateActiveChannels(image);
  
  }

  toggleControlPanel(value) {
    this.setState({ 
      userSelections: {
        ...this.state.userSelections,
      controlPanelClosed: value
    }});
  }

  getNumberOfSlices() {
    if (this.state.image) {
      return { x: this.state.image.x, y: this.state.image.y, z: this.state.image.z };
    }
    return {};
  }

  render() {
    const { userSelections } = this.state;
    const { renderConfig } = this.props;
    return (
      <Layout 
        className="cell-viewer-app"
        style={{height: this.props.appHeight}}
      >
            <Sider
              className="control-pannel-holder"
              collapsible={true}
              defaultCollapsed={false}
              collapsedWidth={0}
              collapsed={this.state.userSelections.controlPanelClosed}
              onCollapse={this.toggleControlPanel}
              width={450}
            >
              <ControlPanel
                renderConfig={renderConfig}
                // viewer capabilities
                canPathTrace={this.state.view3d ? this.state.view3d.canvas3d.hasWebGL2 : false}
                // image state
                imageName={this.state.image ? this.state.image.name : false}
                hasImage={!!this.state.image}
                pixelSize={this.state.image ? this.state.image.pixel_size : [1,1,1]}
                channelDataChannels={this.state.image ? this.state.image.channels : null}
                channelGroupedByType={this.state.channelGroupedByType}
                hasCellId={this.state.hasCellId}
                channelDataReady={this.state.channelDataReady}
                // user selections
                maxProjectOn={userSelections[MAX_PROJECT]}
                pathTraceOn={userSelections[PATH_TRACE]}
                channelSettings={userSelections[CHANNEL_SETTINGS]}
                mode={userSelections[MODE]}
                imageType={userSelections.imageType}
                autorotate={userSelections[AUTO_ROTATE]}
                alphaMaskSliderLevel={userSelections[ALPHA_MASK_SLIDER_LEVEL]}
                brightnessSliderLevel={userSelections[BRIGHTNESS_SLIDER_LEVEL]}
                densitySliderLevel={userSelections[DENSITY_SLIDER_LEVEL]}
                gammaSliderLevel={userSelections[LEVELS_SLIDER]}
                // functions
                handleChangeUserSelection={this.handleChangeUserSelection}
                handleChangeToImage={this.handleChangeToImage}
                updateChannelTransferFunction={this.updateChannelTransferFunction}
                onViewModeChange={this.onViewModeChange}
                onColorChangeComplete={this.onColorChangeComplete}
                onAutorotateChange={this.onAutorotateChange}
                onSwitchFovCell={this.onSwitchFovCell}
                setImageAxisClip={this.setImageAxisClip}
                onApplyColorPresets={this.onApplyColorPresets}
                makeUpdatePixelSizeFn={this.makeUpdatePixelSizeFn}
                changeChannelSettings={this.changeChannelSettings}
                changeOneChannelSetting={this.changeOneChannelSetting}
                filterFunc={this.props.filterFunc}
                nameClean={this.nameClean}
              />
              </Sider>
              <Layout className="cell-viewer-wrapper">
                <Content>
                  <ViewerWrapper
                    image={this.state.image}
                    onAutorotateChange={this.onAutorotateChange}
                    setAxisClip={this.setImageAxisClip}
                    mode={userSelections.mode}
                    autorotate={userSelections[AUTO_ROTATE]}
                    loadingImage={this.state.sendingQueryRequest}
                    numSlices={this.getNumberOfSlices()}
                    onView3DCreated={this.onView3DCreated}
                    appHeight={this.props.appHeight}
                    renderConfig={renderConfig}
                  />
                </Content>
              </Layout>
        </Layout>
    );
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeydown, false);
  }
}

App.defaultProps = {
  initialChannelAcc: {
    [OBSERVED_CHANNEL_KEY]: [],
    [SEGMENTATION_CHANNEL_KEY]: [],
    [CONTOUR_CHANNEL_KEY]: [],
  },
  defaultSurfacesOn: [1],
  defaultVolumesOn: [],
  groupToChannelNameMap: channelGroupingMap,
  IMAGE_VIEWER_SERVICE_URL: '//allen/aics/animated-cell/Allen-Cell-Explorer/Allen-Cell-Explorer_1.3.0',
  DOWNLOAD_SERVER: 'http://dev-aics-dtp-001/cellviewer-1-3-0/Cell-Viewer_Data/',
  IMAGE_SERVER: 'https://s3-us-west-2.amazonaws.com/bisque.allencell.org/v1.3.0/Cell-Viewer_Thumbnails/',
  appHeight: '100vh',
  cellPath: '',
  fovPath: '',
  keyList: [OBSERVED_CHANNEL_KEY, SEGMENTATION_CHANNEL_KEY, CONTOUR_CHANNEL_KEY],
  renderConfig: {
    AlphaMask: true,
    AutoRotateButton: true,
    AxisClipSliders: true, 
    BrightnessSlider: true,
    ColorPicker: true, 
    ColorPresetsDropdown: true,
    DensitySlider: true,
    LevelsSliders: true,
    SaveSurfaceButtons: true,
    FovCellSwitchControls: true,
    ViewModeRadioButtons: true,
  }
};

