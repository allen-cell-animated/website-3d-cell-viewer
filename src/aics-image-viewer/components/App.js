// 3rd Party Imports
import { Layout } from "antd";
import React from 'react';
import { includes } from 'lodash';
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
  OTHER_CHANNEL_KEY
} from '../shared/constants';

import ControlPanel from './ControlPanel';
import ViewerWrapper from './CellViewerCanvasWrapper';

import '../assets/styles/globals.scss';
import '../assets/styles/no-ui-slider.min.scss';

const ViewMode = enums.viewMode.mainMapping;
const channelGroupingMap = enums.channelGroups.channelGroupingMap;
const { Sider, Content } = Layout;

const OK_STATUS = 'OK';
const ERROR_STATUS = 'Error';

export default class App extends React.Component {

  static setInitialChannelConfig(channelNames, channelColors) {
    return channelNames.map((channel, index) => {
      return {
        name: channel || "Channel " + index,
        channelEnabled: true,
        volumeEnabled: index < 3,
        isosurfaceEnabled: false,
        isovalue: 0.5,
        opacity: 1.0,
        color: channelColors[index].slice(),
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
      autorotate: false,
      queryInput: null,
      queryInputType: null,
      queryErrorMessage: null,
      sendingQueryRequest: false,
      openFilesOnly: false,
      controlPanelClosed: false,

      // channels is a flat list of objects of this type:
      // { name, enabled, volumeEnabled, isosurfaceEnabled, isovalue, opacity, color, dataReady}
      channels: [],
      // channelGroupedByType is an object where channel indexes are grouped by type (observed, segmenations, and countours)
      // {observed: channelIndex[], segmenations: channelIndex[], contours: channelIndex[], other: channelIndex[] }
      channelGroupedByType: {},

      // did the requested image have a cell id (in queryInput)?
      hasCellId: false,
      // is there currently a single cell showing, or a full field?
      isShowingSegmentedCell: false
    };

    this.openImage = this.openImage.bind(this);
    this.loadFromJson = this.loadFromJson.bind(this);
    this.onViewModeChange = this.onViewModeChange.bind(this);
    this.setChannelEnabled = this.setChannelEnabled.bind(this);
    this.setVolumeEnabled = this.setVolumeEnabled.bind(this);
    this.setIsosurfaceEnabled = this.setIsosurfaceEnabled.bind(this);
    this.updateChannelTransferFunction = this.updateChannelTransferFunction.bind(this);
    this.updateIsovalue = this.updateIsovalue.bind(this);
    this.updateIsosurfaceOpacity = this.updateIsosurfaceOpacity.bind(this);
    this.onColorChange = this.onColorChange.bind(this);
    this.onColorChangeComplete = this.onColorChangeComplete.bind(this);
    this.onAutorotateChange = this.onAutorotateChange.bind(this);
    this.onSwitchFovCell = this.onSwitchFovCell.bind(this);
    this.setQueryInput = this.setQueryInput.bind(this);
    this.handleOpenImageResponse = this.handleOpenImageResponse.bind(this);
    this.handleOpenImageException = this.handleOpenImageException.bind(this);
    this.onChannelDataReady = this.onChannelDataReady.bind(this);
    this.updateURLSearchParams = this.updateURLSearchParams.bind(this);
    this.toggleControlPanel = this.toggleControlPanel.bind(this);
    this.onUpdateImageMaskAlpha = this.onUpdateImageMaskAlpha.bind(this);
    this.onUpdateImageBrightness = this.onUpdateImageBrightness.bind(this);
    this.onUpdateImageDensity = this.onUpdateImageDensity.bind(this);
    this.onUpdateImageGammaLevels = this.onUpdateImageGammaLevels.bind(this);
    this.onUpdateImageMaxProjectionMode = this.onUpdateImageMaxProjectionMode.bind(this);
    this.setImageAxisClip = this.setImageAxisClip.bind(this);
    this.onApplyColorPresets = this.onApplyColorPresets.bind(this);
    this.toggleVolumes = this.toggleVolumes.bind(this);
    this.toggleSurfaces = this.toggleSurfaces.bind(this);
    this.setAxisClip = this.setAxisClip.bind(this);
    this.getNumberOfSlices = this.getNumberOfSlices.bind(this);

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
        mode: doResetViewMode ? ViewMode.threeD : this.state.mode
      });
      this.loadFromJson(resp.data, resp.data.name, resp.locationHeader);
      this.stopPollingForImage();
    } else if (resp.data.status === ERROR_STATUS) {
      // this.setState({
      //   queryErrorMessage: resp.data.errorMessage,
      //   sendingQueryRequest: false,
      //   cachingInProgress: false
      // });
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
    const aimg = new AICSvolumeDrawable(obj);

    let channels = App.setInitialChannelConfig(obj.channel_names, aimg.channel_colors);
    let channelGroupedByType = App.createChannelGrouping(obj.channel_names);

    for (let i = 0; i < obj.channel_names.length; ++i) {
      aimg.fusion[i].rgbColor = i === 0 ? aimg.channel_colors[i] : 0;
    }
    // if we have some url to prepend to the atlas file names, do it now.
    if (locationHeader) {
      obj.images = obj.images.map(img => ({ ...img, name: `${locationHeader}${img.name}` }));      
    }
    // GO OUT AND GET THE VOLUME DATA.
    AICSvolumeLoader.loadVolumeAtlasData(obj.images, (url, channelIndex, atlasdata, atlaswidth, atlasheight) => {
      aimg.setChannelDataFromAtlas(channelIndex, atlasdata, atlaswidth, atlasheight);
      if (aimg.channelNames()[channelIndex] === CELL_SEGMENTATION_CHANNEL_NAME) {
        aimg.setChannelAsMask(channelIndex);
      }
      this.onChannelDataReady(channelIndex);
    });

    let nextState = {
      image: aimg,
      channels,
      channelGroupedByType
    };
    this.setState(nextState);
  }

  onViewModeChange(mode) {
    this.setState({mode});
    if (this.state.image) {
      this.state.image.setUniform('isOrtho', mode === ViewMode.threeD ? 0.0 : 1.0);
    }
  }

  onUpdateImageMaskAlpha(val) {
    this.state.image.setUniform('maskAlpha', val, true, true);
  }

  onUpdateImageBrightness(val) {
    this.state.image.setUniform('BRIGHTNESS', val, true, true);
  }

  onUpdateImageDensity(val) {
    this.state.image.setUniform("DENSITY", val, true, true);
  }

  onUpdateImageGammaLevels(gmin, gmax, gscale) {
    this.state.image.setUniformNoRerender('GAMMA_MIN', gmin, true, true);
    this.state.image.setUniformNoRerender('GAMMA_MAX', gmax, true, true);
    this.state.image.setUniform('GAMMA_SCALE', gscale, true, true);
  }

  onUpdateImageMaxProjectionMode(checked) {
    this.state.image.setUniform('maxProject', checked?1:0, true, true);
  }

  setImageAxisClip(axis, minval, maxval, isOrthoAxis) {
    if (this.state.image) {
      this.state.image.setAxisClip(axis, minval, maxval, isOrthoAxis);
    }
  }

  onAutorotateChange() {
    this.setState((prevState) => {
      return {autorotate: !prevState.autorotate};
    });
  }

  buildName(cellLine, fovId, cellId) {
    cellId = cellId ? ('_' + cellId) : "";
    return `${cellLine}/${cellLine}_${fovId}${cellId}`;
  }

  onSwitchFovCell() {
    if (this.state.hasCellId) {
      const name = this.buildName(
        this.state.queryInput.cellLine, 
        this.state.queryInput.fovId, 
        this.state.isShowingSegmentedCell ? null : this.state.queryInput.cellId
      );
      const type = this.state.isShowingSegmentedCell ? FOV_ID_QUERY : CELL_ID_QUERY;
      this.openImage(name, type, true);

      this.setState((prevState) => {
        return {
          sendingQueryRequest: true,
          isShowingSegmentedCell: !prevState.isShowingSegmentedCell
        };
      });
    }
  }

  onChannelDataReady(index) {
    this.setState((prevState) => {
      const newChannels = prevState.channels.map((channel, channelindex) => { 
        return index === channelindex ? {...channel, dataReady:true} : channel;
      });
      if (index === 0) {
        return {
          sendingQueryRequest: false,
          channels: newChannels
        };
      }
      else {
        return {
          channels: newChannels
        };
      } 
    });
  }

  onColorChangeComplete(newrgba, oldrgba, indx) {
  }

  onColorChange(newrgba, oldrgba, indx) {
    // TODO if perf problems with this, then try calling only updateChannelColor onColorChange,
    // and the full setState onColorChangeComplete.
    this.setState((prevState) => {
      let col = [newrgba.r, newrgba.g, newrgba.b, newrgba.a];
      if (prevState.image) {
        prevState.image.updateChannelColor(indx, col);
      }

      return {
        channels: prevState.channels.map((channel, channelindex) => { 
          return indx === channelindex ? {...channel, color:col} : channel;
        })
      };
    });
  }

  onApplyColorPresets(presets) {
    this.setState((prevState) => {
      presets.forEach((color, index) => {
        prevState.image.updateChannelColor(index, color);
      });
  
      return {
        channels: prevState.channels.map((channel, channelindex) => { 
          return presets[channelindex] ? {...channel, color:presets[channelindex]} : channel;
        })
      };
    });
  }

  setAxisClip(axis, minval, maxval, isOrthoAxis) {
    this.state.image.setAxisClip(axis, minval, maxval, isOrthoAxis);
  }

  setChannelEnabled(index, enabled) {
    this.setState((prevState) => {
      if (prevState.image) {
        const volenabled = enabled && prevState.channels[index].volumeEnabled;
        const isoenabled = enabled && prevState.channels[index].isosurfaceEnabled;
        prevState.image.setVolumeChannelEnabled(index, volenabled);
        prevState.image.fuse();
        if (prevState.image) {
          if (prevState.image.hasIsosurface(index)) {
            if (!isoenabled) {
              prevState.image.destroyIsosurface(index);
            }
          }
          else {
            if (isoenabled) {
              prevState.image.createIsosurface(index, prevState.channels[index].isovalue, prevState.channels[index].opacity);
            }
          }
        }
      }
  
      return {
        channels: prevState.channels.map((channel, channelindex) => { 
          return index === channelindex ? {...channel, channelEnabled:enabled} : channel;
        })
      };
    });
  }

  /**
   * Toggles checkboxes and channels in 3d view
   * @param indexes string array of channel indexes to toggle
   * @param turnOn boolean - determines if channels in array should get turned on or off
   */
  toggleVolumes(indexes, turnOn) {
    const { channels } = this.state;
    this.setState({
      channels: channels.map((channel, index) => {
        return { ...channel, volumeEnabled: includes(indexes, index) ? turnOn : channel.volumeEnabled };
      })
    });
  }

  toggleSurfaces(indexes, turnOn) {
    const { channels } = this.state;
    this.setState({
      channels: channels.map((channel, index) => {
          return { ...channel, isosurfaceEnabled: includes(indexes, index) ? turnOn : channel.isosurfaceEnabled };
        })
    });
  }

  updateIsovalue(index, isovalue) {
    this.setState((prevState) => {
      if (prevState.image) {
        prevState.image.updateIsovalue(index, isovalue);
      }
      return {
        channels: prevState.channels.map((channel, channelindex) => { 
          return index === channelindex ? {...channel, isovalue:isovalue} : channel;
        })
      };
    });
  }

  updateIsosurfaceOpacity(index, newValue) {
    this.setState((prevState) => {
      if (prevState.image) {
        prevState.image.updateOpacity(index, newValue);
      }
      return {
        channels: prevState.channels.map((channel, channelindex) => { 
          return index === channelindex ? {...channel, opacity:newValue} : channel;
        })
      };
    });
  }

  setVolumeEnabled(index, enabled) {
    this.setState((prevState) => {
      prevState.image.setVolumeChannelEnabled(index, enabled);
      prevState.image.fuse();

      return {
        channels: prevState.channels.map((channel, channelindex) => { 
          return index === channelindex ? {...channel, volumeEnabled:enabled} : channel;
        })
      };
    });
  }

  setIsosurfaceEnabled(index, enabled) {
    this.setState((prevState) => {
      if (prevState.image) {
        if (prevState.image.hasIsosurface(index)) {
          if (!enabled) {
            prevState.image.destroyIsosurface(index);
          }
        }
        else {
          if (enabled) {
            prevState.image.createIsosurface(index, prevState.channels[index].isovalue, prevState.channels[index].opacity);
          }
        }
      }
  
      return {
        channels: prevState.channels.map((channel, channelindex) => { 
          return index === channelindex ? {...channel, isosurfaceEnabled:enabled} : channel;
        })
      };
    });
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
      name = this.buildName(input.cellLine, input.fovId);
    }
    else if (type === CELL_ID_QUERY) {
      name = this.buildName(input.cellLine, input.fovId, input.cellId);
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
        name = this.buildName(cellLine, fovId, cellId);
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
      isShowingSegmentedCell: !!input.cellId,
      sendingQueryRequest: true
    });
    this.openImage(name, type, true);
  }

  toggleVolumeEnabledAndFuse(index, enable) {
    const { image } = this.state;
    image.setVolumeChannelEnabled(index, enable);
    image.fuse();
  }

  updateImageChannelsFromAppState() {
    const { channels, image } = this.state;
    if (image) {
      channels.forEach((channel, index) => {
        const volenabled = channel.volumeEnabled;
        const isoenabled = channel.isosurfaceEnabled;
        this.toggleVolumeEnabledAndFuse(index, volenabled);
        if (image.hasIsosurface(index)) {
          if (!isoenabled) {
            image.destroyIsosurface(index);
          }
        }
        else {
          if (isoenabled) {
            image.createIsosurface(index, channel.isovalue, channel.opacity);
          }
        }
      });
    }
  }

  componentWillUpdate(nextProps, nextState) {
    const channelsChanged = this.state.channels !== nextState.channels;
    const imageChanged = this.state.image !== nextState.image;
    if (imageChanged && nextState.image) {
      nextState.image.fuse();
    }
    // update mesh colors only if it's the right kind of change
    if (channelsChanged && nextState.channels) {
      nextState.image.updateMeshColors();
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
    this.updateImageChannelsFromAppState();
    // delayed for the animation to finish
    if (prevState.controlPanelClosed !== this.state.controlPanelClosed) {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 200);
    }
  }

  toggleControlPanel(value) {
    this.setState({ controlPanelClosed: value});
  }

  getNumberOfSlices() {
    if (this.state.image) {
      return { x: this.state.image.x, y: this.state.image.y, z: this.state.image.z };
    }
    return {};
  }

  render() {
    return (
      <Layout className="cell-viewer-app">
            <Sider
              className="control-pannel-holder"
              collapsible={true}
              defaultCollapsed={false}
              collapsedWidth={0}
              collapsed={this.state.controlPanelClosed}
              onCollapse={this.toggleControlPanel}
              width={450}
            >
              <ControlPanel 
                    image={this.state.image}
                    channels={this.state.channels}
                    method={this.state.method}
                    mode={this.state.mode}
                    autorotate={this.state.autorotate}
                    channelGroupedByType={this.state.channelGroupedByType}
                    controlPanelOpen={this.state.controlPanelOpen}
                    setChannelEnabled={this.setChannelEnabled}
                    setVolumeEnabled={this.setVolumeEnabled}
                    setIsosurfaceEnabled={this.setIsosurfaceEnabled}
                    updateChannelTransferFunction={this.updateChannelTransferFunction}
                    updateIsovalue={this.updateIsovalue}
                    updateIsosurfaceOpacity={this.updateIsosurfaceOpacity}
                    onViewModeChange={this.onViewModeChange}
                    onColorChange={this.onColorChange}
                    onColorChangeComplete={this.onColorChangeComplete}
                    onAutorotateChange={this.onAutorotateChange}
                    isShowingSegmentedCell={this.state.isShowingSegmentedCell}
                    hasCellId={this.state.hasCellId}
                    onSwitchFovCell={this.onSwitchFovCell}
                    onUpdateImageDensity={this.onUpdateImageDensity}
                    onUpdateImageBrightness={this.onUpdateImageBrightness}
                    onUpdateImageMaskAlpha={this.onUpdateImageMaskAlpha}
                    onUpdateImageGammaLevels={this.onUpdateImageGammaLevels}
                    onUpdateImageMaxProjectionMode={this.onUpdateImageMaxProjectionMode}
                    setImageAxisClip={this.setImageAxisClip}
                    onApplyColorPresets={this.onApplyColorPresets}
                    showVolumes={this.toggleVolumes}
                    showSurfaces={this.toggleSurfaces}
              />
              </Sider>
              <Layout className="cell-viewer-wrapper">
                <Content>
                  <ViewerWrapper
                    image={this.state.image}
                    currentMethod={this.state.method}
                    handleChannelToggle={this.toggleControlPanel}
                    onAutorotateChange={this.onAutorotateChange}
                    setAxisClip={this.setAxisClip}
                    controlPanelOpen={this.state.controlPanelOpen}
                    mode={this.state.mode}
                    autorotate={this.state.autorotate}
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

