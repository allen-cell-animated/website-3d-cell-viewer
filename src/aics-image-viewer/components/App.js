// 3rd Party Imports
import { Layout } from "antd";
import React from 'react';
import { includes, isEqual, difference } from 'lodash';
import { 
  AICSvolumeDrawable, 
  AICSvolumeLoader 
} from 'volume-viewer';

import HttpClient from '../shared/utils/httpClient';
import UtilsService from '../shared/utils/utilsService';
import enums from '../shared/enums';
import {
  CELL_ID_QUERY,
  CELL_LINE_QUERY,
  CELL_SEGMENTATION_CHANNEL_NAME,
  FOV_ID_QUERY,
  IMAGE_NAME_QUERY,
  LEGACY_IMAGE_ID_QUERY,
  LEGACY_IMAGE_SERVER,
  IMAGE_SERVER,
  OBSERVED_CHANNEL_KEY,
  SEGMENTATION_CHANNEL_KEY,
  CONTOUR_CHANNEL_KEY,
  OTHER_CHANNEL_KEY,
  PRESET_COLORS_0,
  ALPHA_MASK_SLIDER_3D_DEFAULT,
  ALPHA_MASK_SLIDER_2D_DEFAULT,
  SEGMENTED_CELL,
  VOLUME_ENABLED,
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
} from '../shared/constants';

import ControlPanel from './ControlPanel';
import ViewerWrapper from './CellViewerCanvasWrapper';

import '../assets/styles/globals.scss';
import '../assets/styles/no-ui-slider.min.scss';
import { 
  gammaSliderToImageValues, 
  densitySliderToImageValue, 
  brightnessSliderToImageValue, 
  alphaSliderToImageValue,
} from "../shared/utils/sliderValuesToImageValues";

const ViewMode = enums.viewMode.mainMapping;
const channelGroupingMap = enums.channelGroups.channelGroupingMap;
const { Sider, Content } = Layout;

const OK_STATUS = 'OK';
const ERROR_STATUS = 'Error';
const INIT_COLORS = PRESET_COLORS_0;
const CHANNEL_SETTINGS = 'channelSettings';

export default class App extends React.Component {
  static buildName(cellLine, fovId, cellId) {
    cellId = cellId ? ('_' + cellId) : "";
    return `${cellLine}/${cellLine}_${fovId}${cellId}`;
  }

  static setInitialChannelConfig(channelNames, channelColors) {
    return channelNames.map((channel, index) => {
      return {
        name: channel || "Channel " + index,
        channelEnabled: true,
        [VOLUME_ENABLED]: index < 3,
        [ISO_SURFACE_ENABLED]: false,
        isovalue: 100,
        opacity: 1.0,
        color: channelColors[index] ? channelColors[index].slice() : [226, 205, 179], // guard for unexpectedly longer channel list
        dataReady: false
      };
    });
  }

  static createChannelGrouping(channels) {
    if (channels) {
      const grouping = channels.reduce((acc, channel, index) => {
        if (includes(channelGroupingMap[OBSERVED_CHANNEL_KEY], channel)) {
          acc[OBSERVED_CHANNEL_KEY].push(index);
        } else if (includes(channelGroupingMap[SEGMENTATION_CHANNEL_KEY], channel)) {
          acc[SEGMENTATION_CHANNEL_KEY].push(index);
        } else if (includes(channelGroupingMap[CONTOUR_CHANNEL_KEY], channel)) {
          acc[CONTOUR_CHANNEL_KEY].push(index);
        } else {
          if (!acc[OTHER_CHANNEL_KEY]) {
            acc[OTHER_CHANNEL_KEY] = [];
          }
          acc[OTHER_CHANNEL_KEY].push(index);
        }
        return acc;
      }, {
        [OBSERVED_CHANNEL_KEY]: [],
        [SEGMENTATION_CHANNEL_KEY]: [],
        [CONTOUR_CHANNEL_KEY]: [],
      });
      return grouping;
    }
    return {};
  }

  constructor(props) {
    super(props);

    this.state = {
      image: null,
      files: null,
      mode: ViewMode.threeD,
      queryInput: null,
      queryInputType: null,
      queryErrorMessage: null,
      sendingQueryRequest: false,
      openFilesOnly: false,
      // channelGroupedByType is an object where channel indexes are grouped by type (observed, segmenations, and countours)
      // {observed: channelIndex[], segmenations: channelIndex[], contours: channelIndex[], other: channelIndex[] }
      channelGroupedByType: {},
      // did the requested image have a cell id (in queryInput)?
      hasCellId: false,
      // state set by the UI:
      userSelections: {
        mode: ViewMode.threeD,
        controlPanelClosed: false,
        autorotate: false,
        maxProject: false,
      // is there currently a single cell showing, or a full field?
        imageType: SEGMENTED_CELL,
        // fieldFieldOrSegmented
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
    this.onViewModeChange = this.onViewModeChange.bind(this);
    this.updateChannelTransferFunction = this.updateChannelTransferFunction.bind(this);
    this.onAutorotateChange = this.onAutorotateChange.bind(this);
    this.onSwitchFovCell = this.onSwitchFovCell.bind(this);
    this.setQueryInput = this.setQueryInput.bind(this);
    this.handleOpenImageResponse = this.handleOpenImageResponse.bind(this);
    this.handleOpenImageException = this.handleOpenImageException.bind(this);
    this.updateURLSearchParams = this.updateURLSearchParams.bind(this);
    this.toggleControlPanel = this.toggleControlPanel.bind(this);
    this.onUpdateImageMaskAlpha = this.onUpdateImageMaskAlpha.bind(this);
    this.onUpdateImageMaxProjectionMode = this.onUpdateImageMaxProjectionMode.bind(this);
    this.setImageAxisClip = this.setImageAxisClip.bind(this);
    this.onApplyColorPresets = this.onApplyColorPresets.bind(this);
    this.getNumberOfSlices = this.getNumberOfSlices.bind(this);
    this.makeUpdatePixelSizeFn = this.makeUpdatePixelSizeFn.bind(this);
    this.setUserSelectionsInState = this.setUserSelectionsInState.bind(this);
    this.changeChannelSettings = this.changeChannelSettings.bind(this);
    this.changeOneChannelSetting = this.changeOneChannelSetting.bind(this);
    this.handleChangeUserSelection = this.handleChangeUserSelection.bind(this);
    this.handleChangeToImage = this.handleChangeToImage.bind(this);
    document.addEventListener('keydown', this.handleKeydown, false);
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

  handleOpenImageResponse(resp, queryType, imageDirectory, doResetViewMode) {
    if (resp.data.status === OK_STATUS) {

      this.setState({
        currentlyLoadedImagePath: imageDirectory,
        queryErrorMessage: null,
        cachingInProgress: false,
        mode: doResetViewMode ? ViewMode.threeD : this.state.userSelections.mode
      });
      this.loadFromJson(resp.data, resp.data.name, resp.locationHeader);
      this.stopPollingForImage();
    } else if (resp.data.status === ERROR_STATUS) {
      console.log(ERROR_STATUS);
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
    // this.setState({
    //   queryErrorMessage: message,
    //   sendingQueryRequest: false,
    //   cachingInProgress: false
    // });
    console.log(message);
    this.stopPollingForImage();
  }

  openImage(imageDirectory, queryType, doResetViewMode) {
    if (imageDirectory === this.state.currentlyLoadedImagePath) {
      return;
    }

    const BASE_URL = queryType === LEGACY_IMAGE_ID_QUERY ? LEGACY_IMAGE_SERVER : IMAGE_SERVER;
    const toLoad = BASE_URL + imageDirectory + '_atlas.json';
    //const toLoad = BASE_URL + 'AICS-10/AICS-10_5_5_atlas.json';
    // retrieve the json file directly from its url
    HttpClient.getJSON(toLoad, {absolute:true, mode:'cors'})
      .then(resp => {
        // set up some stuff that the backend caching service was doing for us, to spoof the rest of the code
        resp.data.status = OK_STATUS;
        resp.locationHeader = toLoad.substring(0, toLoad.lastIndexOf('/') + 1);
        return this.handleOpenImageResponse(resp, 0, imageDirectory, doResetViewMode);
      })
      .catch(resp => this.handleOpenImageException(resp));
  }

  loadFromJson(obj, title, locationHeader) {
    const { userSelections } = this.state;
    const aimg = new AICSvolumeDrawable(obj);
    // if same number of channels, leave the app state alone.
    let newChannelSettings = userSelections[CHANNEL_SETTINGS].length === obj.channel_names.length ? 
      userSelections[CHANNEL_SETTINGS] : App.setInitialChannelConfig(obj.channel_names, INIT_COLORS);
    let channelGroupedByType = App.createChannelGrouping(obj.channel_names);
    // set image colors
    // NOTE: seems like there should be a better way to set these initial colors. 
    for (let i = 0; i < obj.channel_names.length; ++i) {
      aimg.updateChannelColor(i, newChannelSettings[i].color);
    }
    // set alpha slider first time image is loaded to something that makes sense
    this.handleChangeUserSelection(ALPHA_MASK_SLIDER_LEVEL, 
      userSelections.imageType === SEGMENTED_CELL ? ALPHA_MASK_SLIDER_3D_DEFAULT : ALPHA_MASK_SLIDER_2D_DEFAULT);

    // if we have some url to prepend to the atlas file names, do it now.
    if (locationHeader) {
      obj.images = obj.images.map(img => ({ ...img, name: `${locationHeader}${img.name}` }));      
    }
    // GO OUT AND GET THE VOLUME DATA.
    AICSvolumeLoader.loadVolumeAtlasData(obj.images, (url, channelIndex, atlasdata, atlaswidth, atlasheight) => {
      aimg.setChannelDataFromAtlas(channelIndex, atlasdata, atlaswidth, atlasheight);
      newChannelSettings[channelIndex].dataReady = true;
      if (aimg.channelNames()[channelIndex] === CELL_SEGMENTATION_CHANNEL_NAME) {
        aimg.setChannelAsMask(channelIndex);
      }
      if (channelIndex === 0) {
        this.setState({ sendingQueryRequest: false });
      }
    });

    let nextState = {
      image: aimg,
      channelGroupedByType,
      userSelections : {
        ...this.state.userSelections,
        [CHANNEL_SETTINGS]: newChannelSettings,
      }
    };
    this.setState(nextState);
  }

  handleChangeUserSelection(key, newValue) {
    this.setUserSelectionsInState({ [key]: newValue });
    this.handleChangeToImage(key, newValue);
  }

  changeOneChannelSetting(channelIndex, keyToChange, newValue) {
    const { userSelections } = this.state;
    const newChannels = userSelections[CHANNEL_SETTINGS].map((channel, index) => {
      return index === channelIndex ? { ...channel, [keyToChange]: newValue } : channel;
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
    const { image } = this.state;
    if (!image) {
      return;
    }
    switch (keyToChange) {
      case ISO_VALUE:
        image.updateIsovalue(index, newValue);
        break;
      case OPACITY:
        image.updateOpacity(index, newValue);
        break;
      case COLOR:
        let newColor = newValue.r ? [newValue.r, newValue.g, newValue.b, newValue.a] : newValue;
        image.updateChannelColor(index, newColor);
        image.fuse();
        break;
      case SAVE_ISO_SURFACE:
        image.saveChannelIsosurface(index, newValue);
        break;
      case ALPHA_MASK_SLIDER_LEVEL:
        let imageMask = alphaSliderToImageValue(newValue);
        image.setUniform('maskAlpha', imageMask, true, true);
        image.fuse();
        break;
      case BRIGHTNESS_SLIDER_LEVEL:
        let imageBrightness = brightnessSliderToImageValue(newValue);
        image.setUniform('BRIGHTNESS', imageBrightness, true, true);
        break;
      case DENSITY_SLIDER_LEVEL:
        let imageDensity = densitySliderToImageValue(newValue);
        image.setUniform("DENSITY", imageDensity, true, true);
        break;
      case LEVELS_SLIDER:
        let imageValues = gammaSliderToImageValues(newValue);
        image.setUniformNoRerender('GAMMA_MIN', imageValues.min, true, true);
        image.setUniformNoRerender('GAMMA_MAX', imageValues.max, true, true);
        image.setUniform('GAMMA_SCALE', imageValues.scale, true, true);
        break;
    }
  }

  onViewModeChange(newMode) {
    const { userSelections } = this.state;
    let newSelectionState = {
      mode: newMode,
    };
      // if switching between 2D and 3D reset alpha mask to default (off in in 2D, 50% in 3D)
      // if full field, dont mask
    if (userSelections.mode === ViewMode.threeD && newMode !== ViewMode.threeD) {
      // Switching to 2d 
      newSelectionState = {
        mode: newMode,
        [ALPHA_MASK_SLIDER_LEVEL]: ALPHA_MASK_SLIDER_2D_DEFAULT,
      };
    } else if (
      userSelections.mode !== ViewMode.threeD && 
      newMode === ViewMode.threeD && 
      this.state.userSelections.imageType === SEGMENTED_CELL
    ) {
      // switching to 3d 
      newSelectionState = {
          mode: newMode,
          [ALPHA_MASK_SLIDER_LEVEL]: ALPHA_MASK_SLIDER_3D_DEFAULT,
      };
    }
    this.setUserSelectionsInState(newSelectionState);
  }

  onUpdateImageMaskAlpha(sliderValue) {
    this.setUserSelectionsInState({ [ALPHA_MASK_SLIDER_LEVEL]: sliderValue });
  }

  onUpdateImageMaxProjectionMode(checked) {
    this.setUserSelectionsInState({ maxProject: checked });
  }

  onAutorotateChange() {
    this.setUserSelectionsInState({ autorotate: !this.state.userSelections.autorotate });
  }

  setImageAxisClip(axis, minval, maxval, isOrthoAxis) {
    if (this.state.image) {
      this.state.image.setAxisClip(axis, minval, maxval, isOrthoAxis);
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
    if (this.state.hasCellId) {
      const name = App.buildName(
        this.state.queryInput.cellLine, 
        this.state.queryInput.fovId, 
        value === FULL_FIELD_IMAGE ? null : this.state.queryInput.cellId
      );
      const type = value === FULL_FIELD_IMAGE ? FOV_ID_QUERY : CELL_ID_QUERY;
      this.openImage(name, type, false);
      this.setState((prevState) => {
        return {
          sendingQueryRequest: true,
          userSelections: {
              ...this.state.userSelections,
            imageType: value,
          }
        };
      });
    }
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

  updateChannelTransferFunction(index, lut, controlPoints) {
    if (this.state.image) {
      this.state.image.getChannel(index).setLut(lut, controlPoints);
      this.state.image.fuse();
    }
  }

  updateURLSearchParams(input, type) {
    if (input && type) {
      const params = new URLSearchParams();
      params.set(type, input);
      window.history.pushState({}, '', `${location.pathname}?${params}`);
      this.setState({[type]: input});
    }
  }

  setQueryInput(input, type) {
    let name = input;
    if (type === FOV_ID_QUERY) {
      name = App.buildName(input.cellLine, input.fovId);
    }
    else if (type === CELL_ID_QUERY) {
      name = App.buildName(input.cellLine, input.fovId, input.cellId);
    }
    else if (type === IMAGE_NAME_QUERY) {
      // decompose the name into cellLine, fovId, and cellId ?
      const components = input.split("_");
      let cellLine = "";
      let fovId = "";
      let cellId = "";
      if (components.length >= 2) {
        cellLine = components[0];
        fovId = components[1];
        type = FOV_ID_QUERY;
        if (components.length > 2) {
          cellId = components[2];
          type = CELL_ID_QUERY;
        }
        name = App.buildName(cellLine, fovId, cellId);
      }
      input = {
        cellLine,
        fovId,
        cellId
      };
    }
    // LEGACY_IMAGE_ID_QUERY is a passthrough

    this.setState({
      queryInput: input,
      queryInputType: type,
      hasCellId: !!input.cellId,
      sendingQueryRequest: true
    });
    this.openImage(name, type, true);
  }

  updateImageVolumeAndSurfacesEnabledFromAppState() {
    const { userSelections, image } = this.state;
    if (image) {
      // apply channel settings
      userSelections[CHANNEL_SETTINGS].forEach((channel, index) => {
        const volenabled = channel[VOLUME_ENABLED];
        const isoenabled = channel[ISO_SURFACE_ENABLED];
        this.state.image.setVolumeChannelEnabled(index, volenabled);
        if (image.hasIsosurface(index)) {
          if (!isoenabled) {
            image.destroyIsosurface(index);
          } 
        } else {
          if (isoenabled) {
            image.createIsosurface(index, channel.isovalue, channel.opacity);
          }
        }
      });
    }
  }

  // TODO : For use as a true react component, maybe we could pass the image id and query type as PROPS!!!!!!!!!!
  // and the getParameterByName could be done in the index.html or index.js.
  componentWillMount() {
    const legacyImageIdToShow = UtilsService.getParameterByName(LEGACY_IMAGE_ID_QUERY);
    if (legacyImageIdToShow) {
      this.setQueryInput(legacyImageIdToShow, LEGACY_IMAGE_ID_QUERY);
    }
    else {
      const imageIdToShow = UtilsService.getParameterByName(IMAGE_NAME_QUERY);
      if (imageIdToShow) {
        this.setQueryInput(imageIdToShow, IMAGE_NAME_QUERY);
      }
      else {
        // cellid and cellline and fovid
        const cellId = UtilsService.getParameterByName(CELL_ID_QUERY);
        const fovId = UtilsService.getParameterByName(FOV_ID_QUERY);
        const cellLine = UtilsService.getParameterByName(CELL_LINE_QUERY);
        if (cellId && fovId && cellLine) {
          this.setQueryInput({cellId, fovId, cellLine}, CELL_ID_QUERY);
        }
        else if (fovId && cellLine) {
          this.setQueryInput({fovId, cellLine}, FOV_ID_QUERY);
        }
      }
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const { userSelections } = this.state;

    const channelsChanged = !isEqual(this.state.userSelections[CHANNEL_SETTINGS], prevState.userSelections[CHANNEL_SETTINGS]);
    const newImage = this.state.image && !prevProps.image;
    const imageChanged = this.state.image && prevProps.image ? this.state.image.imageName !== prevState.image.imageName : false;
    if (channelsChanged || imageChanged || newImage) {
      // Need to update after image loaded
      this.state.image.setUniform('isOrtho', userSelections.mode === ViewMode.threeD ? 0.0 : 1.0);
      this.state.image.setUniform('maxProject', userSelections.maxProject ? 1 : 0, true, true);
      this.updateImageVolumeAndSurfacesEnabledFromAppState();
      this.state.image.fuse();
    }
    // delayed for the animation to finish
    if (prevState.userSelections.controlPanelClosed !== this.state.userSelections.controlPanelClosed) {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 200);
    }
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
    return (
      <Layout className="cell-viewer-app">
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
                // image state
                imageName={this.state.image ? this.state.image.name : false}
                hasImage={!!this.state.image}
                pixelSize={this.state.image ? this.state.image.name : false}
                channelDataChannels={this.state.image ? this.state.image.channelData.channels : null}
                channelGroupedByType={this.state.channelGroupedByType}
                hasCellId={this.state.hasCellId}
                // user selections
                maxProjectOn={userSelections.maxProject}
                channels={userSelections.channelSettings}
                mode={userSelections.mode}
                imageType={userSelections.imageType}
                autorotate={userSelections.autorotate}
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
                onUpdateImageMaxProjectionMode={this.onUpdateImageMaxProjectionMode}
                setImageAxisClip={this.setImageAxisClip}
                onApplyColorPresets={this.onApplyColorPresets}
                makeUpdatePixelSizeFn={this.makeUpdatePixelSizeFn}
                changeChannelSettings={this.changeChannelSettings}
                changeOneChannelSetting={this.changeOneChannelSetting}
              />
              </Sider>
              <Layout className="cell-viewer-wrapper">
                <Content>
                  <ViewerWrapper
                    image={this.state.image}
                    onAutorotateChange={this.onAutorotateChange}
                    setAxisClip={this.setImageAxisClip}
                    mode={userSelections.mode}
                    autorotate={userSelections.autorotate}
                    loadingImage={this.state.sendingQueryRequest}
                    numSlices={this.getNumberOfSlices()}
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

