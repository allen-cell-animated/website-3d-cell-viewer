// 3rd Party Imports
import React from 'react';
import { includes } from 'lodash';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import colorPalette from './shared/colorPalette';
import { 
  AICSvolumeDrawable, 
  AICSvolumeLoader 
} from 'volume-viewer';
import 'bootstrap/dist/css/bootstrap.css';

import HttpClient from '../shared/utils/httpClient';
import UtilsService from '../shared/utils/utilsService';
import { ViewMode } from '../shared/enums/viewModeEnum';
import { channelGroupingMap } from '../shared/enums/channelGroups';
import {
  CELL_ID_QUERY,
  CELL_LINE_QUERY,
  FOV_ID_QUERY,
  IMAGE_NAME_QUERY,
  LEGACY_IMAGE_ID_QUERY,
  LEGACY_IMAGE_SERVER,
  IMAGE_SERVER,
  OBSERVED_CHANNEL_KEY,
  SEGMENATION_CHANNEL_KEY,
  CONTOUR_CHANNEL_KEY
} from '../shared/constants';

import ControlPanel from './ControlPanel';
import MenuDrawer from './MenuDrawer';
import ViewerWrapper from './CellViewerCanvasWrapper';

import '../assets/styles/globals.scss';
import '../assets/styles/no-ui-slider.min.scss';

const muiTheme = getMuiTheme({
  fontFamily: 'Overpass, sans-serif',
  palette: colorPalette
});
const OK_STATUS = 'OK';
const ERROR_STATUS = 'Error';

export default class ImageViewerApp extends React.Component {

  static setInitialChannelState(channelNames, channelColors) {
    return channelNames.map((channel, index) => {
      return {
        name: channel || "Channel " + index,
        channelEnabled: index === 0,
        volumeEnabled: true,
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
          if (!acc[OBSERVED_CHANNEL_KEY]) {
            acc[OBSERVED_CHANNEL_KEY] = [];
          }
          acc[OBSERVED_CHANNEL_KEY].push(index);

        } else if (includes(channelGroupingMap[SEGMENATION_CHANNEL_KEY], channel)) {
          if (!acc[SEGMENATION_CHANNEL_KEY]) {
            acc[SEGMENATION_CHANNEL_KEY] = [];
          }
          acc[SEGMENATION_CHANNEL_KEY].push(index);
        } else if (includes(channelGroupingMap[CONTOUR_CHANNEL_KEY], channel)) {
          if (!acc[CONTOUR_CHANNEL_KEY]) {
            acc[CONTOUR_CHANNEL_KEY] = [];
          }
          acc[CONTOUR_CHANNEL_KEY].push(index);
        }
        return acc;
      }, {});
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
      controlPanelOpen: true,

      // channels is a flat list of objects of this type:
      // { name, enabled, volumeEnabled, isosurfaceEnabled, isovalue, opacity, color, dataReady}
      channels: [],
      // channelGroupedByType is an object where channel indexes are grouped by type (observed, segmenations, and countours)
      channelGroupedByType: {}
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
    this.showChannels = this.showChannels.bind(this);
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

  handleOpenImageResponse(resp, queryType, imageDirectory) {
    if (resp.data.status === OK_STATUS) {

      this.setState({
        currentlyLoadedImagePath: imageDirectory,
        queryErrorMessage: null,
        sendingQueryRequest: false,
        cachingInProgress: false
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

  openImage(imageDirectory, queryType) {
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
        return this.handleOpenImageResponse(resp, 0, imageDirectory);
      })
      .catch(resp => this.handleOpenImageException(resp));
  }

  loadFromJson(obj, title, locationHeader) {
    const aimg = new AICSvolumeDrawable(obj);

    let channels = ImageViewerApp.setInitialChannelState(obj.channel_names, aimg.channel_colors);
    let channelGroupedByType = ImageViewerApp.createChannelGrouping(obj.channel_names);

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
      this.onChannelDataReady(channelIndex);
    });

    let nextState = {
      image: aimg,
      channels,
      channelGroupedByType,
      mode: ViewMode.threeD
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

  onChannelDataReady(index) {
    this.setState((prevState) => {
      return {
        channels: prevState.channels.map((channel, channelindex) => { 
          return index === channelindex ? {...channel, dataReady:true} : channel;
        })
      };
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
   * @param names string array of channel names
   * @param onOrOff boolean - when true all channels that have a name inside of names array
   * will be turned off and the rest will be turned off. When false, vice versa.
   */
  showChannels(names, onOrOff) {

    // // collect up some bools 
    // this.state.channels.map((channel, index) => {
    //   return (names.indexOf(channel.name) > -1) ? onOrOff : !onOrOff;
    // });

    // TODO: update this.state.image with these settings
    this.setState((prevState) => {

      if (prevState.image) {
        prevState.channels.forEach((channel, index) => {
          const enabled = ((names.indexOf(channel.name) > -1) ? onOrOff : !onOrOff);
          const volenabled = enabled && channel.volumeEnabled;
          const isoenabled = enabled && channel.isosurfaceEnabled;
          prevState.image.setVolumeChannelEnabled(index, volenabled);
          if (prevState.image.hasIsosurface(index)) {
            if (!isoenabled) {
              prevState.image.destroyIsosurface(index);
            }
          }
          else {
            if (isoenabled) {
              prevState.image.createIsosurface(index, channel.isovalue, channel.opacity);
            }
          }
        });
        prevState.image.fuse();
      }

      return {
        channels: prevState.channels.map((channel, index) => {
          return {...channel, channelEnabled: ((names.indexOf(channel.name) > -1) ? onOrOff : !onOrOff) };
        })
      };
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
      prevState.image.setVolumeChannelEnabled(index, enabled && prevState.channels[index].channelEnabled);
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
      name = input.cellLine + '/' + input.cellLine + '_' + input.fovId;
    }
    else if (type === CELL_ID_QUERY) {
      name = input.cellLine + '/' + input.cellLine + '_' + input.fovId + '_' + input.cellId;
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
        name = cellLine + '/' + cellLine + '_' + fovId;
        type = FOV_ID_QUERY;
        if (components.length > 2) {
          cellId = components[2];
          name = cellLine + '/' + cellLine + '_' + fovId + '_' + cellId;
          type = CELL_ID_QUERY;
        }
      }
      input = {
        cellLine,
        fovId,
        cellId
      };
    }
    this.setState({
      queryInput: input,
      queryInputType: type
    });
    this.openImage(name, type);
  }

  toggleVolumeEnabledAndFuse(index, enabledOrNot) {
    const { image } = this.state;
    image.setVolumeChannelEnabled(index, enabledOrNot);
    image.fuse();
  }

  updateImageChannelsFromAppState() {
    const { channels, image } = this.state;
    if (image) {
      channels.forEach((channel, index) => {
        const volenabled = channel.channelEnabled && channel.volumeEnabled;
        const isoenabled = channel.channelEnabled && channel.isosurfaceEnabled;
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

  componentDidUpdate() {
    this.updateImageChannelsFromAppState();
  }

  toggleControlPanel() {
    this.setState({ controlPanelOpen: !this.state.controlPanelOpen});
  }

  getNumberOfSlices() {
    if (this.state.image) {
      return { x: this.state.image.x, y: this.state.image.y, z: this.state.image.z };
    }
    return {};
  }

  render() {
    return (
      <MuiThemeProvider muiTheme={muiTheme}>
        <div className="cell-viewer-app">
          <MenuDrawer 
              controlPanelOpen={this.state.controlPanelOpen}>
              <ViewerWrapper 
                    image={this.state.image}
                    currentMethod={this.state.method}
                    handleChannelToggle={this.toggleControlPanel}
                    setAxisClip={this.setAxisClip}
                    controlPanelOpen={this.state.controlPanelOpen}
                    mode={this.state.mode}
                    autorotate={this.state.autorotate}
                    loadingImage={this.state.sendingQueryRequest}
                    numSlices={this.getNumberOfSlices()}
              />
              <ControlPanel 
                    image={this.state.image}
                    channels={this.state.channels}
                    method={this.state.method}
                    mode={this.state.mode}
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
                    onUpdateImageDensity={this.onUpdateImageDensity}
                    onUpdateImageBrightness={this.onUpdateImageBrightness}
                    onUpdateImageMaskAlpha={this.onUpdateImageMaskAlpha}
                    onUpdateImageGammaLevels={this.onUpdateImageGammaLevels}
                    onUpdateImageMaxProjectionMode={this.onUpdateImageMaxProjectionMode}
                    setImageAxisClip={this.setImageAxisClip}
                    onApplyColorPresets={this.onApplyColorPresets}
                    showChannels={this.showChannels}
              />
            </MenuDrawer>
        </div>
      </MuiThemeProvider>
    );
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeydown, false);
  }
}

