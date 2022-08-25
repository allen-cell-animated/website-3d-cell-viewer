// 3rd Party Imports
import { Layout } from "antd";
import React from "react";
import { includes, isEqual, find, map, debounce } from "lodash";
import { RENDERMODE_PATHTRACE, RENDERMODE_RAYMARCH, Volume, VolumeLoader, Lut } from "@aics/volume-viewer";

import { AppProps, AppState, UserSelectionState } from "./types";
import { controlPointsToLut } from "../../shared/utils/controlPointsToLut";
import { findFirstChannelMatch, makeChannelIndexGrouping } from "../../shared/utils/viewerChannelSettings";
import enums from "../../shared/enums";
import {
  CELL_SEGMENTATION_CHANNEL_NAME,
  CHANNEL_SETTINGS,
  PRESET_COLORS_0,
  ALPHA_MASK_SLIDER_3D_DEFAULT,
  ALPHA_MASK_SLIDER_2D_DEFAULT,
  FULL_FIELD_IMAGE,
  SEGMENTED_CELL,
  VOLUME_ENABLED,
  LUT_CONTROL_POINTS,
  COLORIZE_ALPHA,
  ISO_SURFACE_ENABLED,
  ALPHA_MASK_SLIDER_LEVEL,
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
  SHOW_AXES,
  MAX_PROJECT,
  PATH_TRACE,
  BACKGROUND_COLOR,
  BOUNDING_BOX_COLOR,
  LUT_MIN_PERCENTILE,
  LUT_MAX_PERCENTILE,
  COLORIZE_ENABLED,
  SINGLE_GROUP_CHANNEL_KEY,
  CONTROL_PANEL_CLOSE_WIDTH,
  VOLUMETRIC_RENDER,
} from "../../shared/constants";

import ControlPanel from "../ControlPanel";
import Toolbar from "../Toolbar";
import CellViewerCanvasWrapper from "../CellViewerCanvasWrapper";
import { TFEDITOR_DEFAULT_COLOR } from "../TfEditor";

import "../../assets/styles/globals.css";
import {
  gammaSliderToImageValues,
  densitySliderToImageValue,
  brightnessSliderToImageValue,
  alphaSliderToImageValue,
} from "../../shared/utils/sliderValuesToImageValues";
import { colorArrayToFloatArray, rgbObjectToArray } from "../../shared/utils/colorObjectArrayConverting";

import "./styles.css";

const ViewMode = enums.viewMode.mainMapping;
const { Sider, Content } = Layout;

const INIT_COLORS = PRESET_COLORS_0;

function colorHexToArray(hex) {
  // hex is a xxxxxx string. split it into array of rgb ints
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
  } else {
    return null;
  }
}

const defaultProps: AppProps = {
  // rawData has a "dtype" which is expected to be "uint8", a "shape":[c,z,y,x] and a "buffer" which is a DataView
  rawData: undefined,
  // rawDims is the volume dims that normally come from a json file
  rawDims: null,

  maskChannelName: "",

  appHeight: "100vh",
  cellPath: "",
  fovPath: "",
  renderConfig: {
    alphaMask: true,
    autoRotateButton: true,
    axisClipSliders: true,
    brightnessSlider: true,
    colorPicker: true,
    colorPresetsDropdown: true,
    densitySlider: true,
    levelsSliders: true,
    saveSurfaceButtons: true,
    fovCellSwitchControls: true,
    viewModeRadioButtons: true,
    resetCameraButton: true,
    showAxesButton: true,
    showBoundingBoxButton: true,
  },
  viewerConfig: {
    showAxes: false,
    showBoundingBox: false,
    autorotate: false,
    view: "3D", // "XY", "XZ", "YZ"
    mode: "default", // "pathtrace", "maxprojection"
    backgroundColor: BACKGROUND_COLOR,
    boundingBoxColor: BOUNDING_BOX_COLOR,
    maskAlpha: ALPHA_MASK_SLIDER_3D_DEFAULT[0],
    brightness: BRIGHTNESS_SLIDER_LEVEL_DEFAULT[0],
    density: DENSITY_SLIDER_LEVEL_DEFAULT[0],
    levels: LEVELS_SLIDER_DEFAULT,
    region: [0, 1, 0, 1, 0, 1], // or ignored if slice is specified with a non-3D mode
    slice: undefined, // or integer slice to show in view mode XY, YZ, or XZ.  mut. ex with region
  },
  baseUrl: "",
  nextImgPath: "",
  prevImgPath: "",
  cellId: "",
  cellDownloadHref: "",
  fovDownloadHref: "",
  preLoad: false,
  pixelSize: undefined,
  canvasMargin: "0 0 0 0",
};

export default class App extends React.Component<AppProps, AppState> {
  private openImageInterval: number | null;
  private stateKey: "image" | "prevImg" | "nextImg";

  static defaultProps = defaultProps;
  constructor(props) {
    super(props);

    let viewmode = ViewMode.threeD;
    let pathtrace = false;
    let maxproject = false;
    if (props.viewerConfig) {
      if (props.viewerConfig.mode === "pathtrace") {
        pathtrace = true;
        maxproject = false;
      } else if (props.viewerConfig.mode === "maxprojection") {
        pathtrace = true;
        maxproject = false;
      } else {
        pathtrace = false;
        maxproject = false;
      }
      if (props.viewerConfig.view === "XY") {
        viewmode = ViewMode.xy;
      } else if (props.viewerConfig.view === "YZ") {
        viewmode = ViewMode.yz;
      } else if (props.viewerConfig.view === "XZ") {
        viewmode = ViewMode.xz;
      }
    }

    this.state = {
      image: null,
      nextImg: null,
      prevImg: null,
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
      // {observed: channelIndex[], segmentations: channelIndex[], contours: channelIndex[], other: channelIndex[] }
      channelGroupedByType: {},
      // did the requested image have a cell id (in queryInput)?
      hasCellId: !!props.cellId,
      // state set by the UI:
      userSelections: {
        imageType: SEGMENTED_CELL,
        controlPanelClosed: window.innerWidth < CONTROL_PANEL_CLOSE_WIDTH,
        [MODE]: viewmode,
        [AUTO_ROTATE]: props.viewerConfig.autorotate,
        [SHOW_AXES]: props.viewerConfig.showAxes,
        showBoundingBox: props.viewerConfig.showBoundingBox,
        boundingBoxColor: props.viewerConfig.boundingBoxColor || BOUNDING_BOX_COLOR,
        backgroundColor: props.viewerConfig.backgroundColor || BACKGROUND_COLOR,
        [MAX_PROJECT]: maxproject,
        [PATH_TRACE]: pathtrace,
        [ALPHA_MASK_SLIDER_LEVEL]: [props.viewerConfig.maskAlpha] || ALPHA_MASK_SLIDER_3D_DEFAULT,
        [BRIGHTNESS_SLIDER_LEVEL]: [props.viewerConfig.brightness] || BRIGHTNESS_SLIDER_LEVEL_DEFAULT,
        [DENSITY_SLIDER_LEVEL]: [props.viewerConfig.density] || DENSITY_SLIDER_LEVEL_DEFAULT,
        [LEVELS_SLIDER]: props.viewerConfig.levels || LEVELS_SLIDER_DEFAULT,
        // channelSettings is a flat list of objects of this type:
        // { name, enabled, volumeEnabled, isosurfaceEnabled, isovalue, opacity, color, dataReady}
        [CHANNEL_SETTINGS]: [],
      },
      currentlyLoadedImagePath: "",
      cachingInProgress: false,
      path: "",
    };

    this.openImageInterval = null;
    this.stateKey = "image";

    this.openImage = this.openImage.bind(this);
    this.loadFromRaw = this.loadFromRaw.bind(this);
    this.onChannelDataLoaded = this.onChannelDataLoaded.bind(this);

    this.onViewModeChange = this.onViewModeChange.bind(this);
    this.updateChannelTransferFunction = this.updateChannelTransferFunction.bind(this);
    this.onAutorotateChange = this.onAutorotateChange.bind(this);
    this.onSwitchFovCell = this.onSwitchFovCell.bind(this);
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
    this.onChangeRenderingAlgorithm = this.onChangeRenderingAlgorithm.bind(this);
    this.changeAxisShowing = this.changeAxisShowing.bind(this);
    this.changeBoundingBoxShowing = this.changeBoundingBoxShowing.bind(this);
    this.onResetCamera = this.onResetCamera.bind(this);
    this.changeBackgroundColor = this.changeBackgroundColor.bind(this);
    this.changeBoundingBoxColor = this.changeBoundingBoxColor.bind(this);
  }

  componentDidMount() {
    if (this.state.userSelections.controlPanelClosed && this.props.onControlPanelToggle) {
      this.props.onControlPanelToggle(true);
    }

    const debouncedResizeHandler = debounce(() => this.onWindowResize(), 500);
    window.addEventListener("resize", debouncedResizeHandler);

    const { cellId } = this.props;
    if (cellId) {
      this.beginRequestImage();
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const { cellId, cellPath, rawDims, rawData } = this.props;
    const { userSelections, view3d, image } = this.state;

    if (rawDims && rawData && view3d && !prevState.view3d && !image) {
      this.loadFromRaw();
    }

    // delayed for the animation to finish
    if (prevState.userSelections.controlPanelClosed !== this.state.userSelections.controlPanelClosed) {
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 200);
    }
    const newRequest = cellId !== prevProps.cellId;
    if (newRequest) {
      if (cellPath === prevProps.nextImgPath) {
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
    const { userSelections } = this.state;
    view3d.setBackgroundColor(colorArrayToFloatArray(userSelections.backgroundColor));
    view3d.setShowAxis(userSelections[SHOW_AXES]);

    this.setState({ view3d });
  }

  setInitialChannelConfig(channelNames, channelColors) {
    return channelNames.map((channel, index) => {
      let color = channelColors[index] ? channelColors[index].slice() : [226, 205, 179]; // guard for unexpectedly longer channel list

      return this.initializeOneChannelSetting(null, channel, index, color);
    });
  }

  createChannelGrouping(channels): { [key: string]: number[] } {
    if (!channels) {
      return {};
    }
    const { viewerChannelSettings } = this.props;
    if (!viewerChannelSettings) {
      // return all channels
      return {
        [SINGLE_GROUP_CHANNEL_KEY]: channels.map(function (val, index) {
          return index;
        }),
      };
    }

    return makeChannelIndexGrouping(channels, viewerChannelSettings);
  }

  stopPollingForImage() {
    if (this.openImageInterval) {
      clearInterval(this.openImageInterval);
      this.openImageInterval = null;
    }
  }

  checkDimensionsMatch(a, b) {
    return (
      a.width === b.width ||
      a.height === b.height ||
      a.rows === b.rows ||
      a.cols === b.cols ||
      a.tiles === b.tiles ||
      a.tile_width === b.tile_width ||
      a.tile_height === b.tile_height ||
      a.atlas_width === b.atlas_width ||
      a.atlas_height === b.atlas_height
    );
  }

  onNewVolumeCreated(
    aimg: Volume,
    stateKey: "image" | "prevImg" | "nextImg",
    imageDirectory: string,
    doResetViewMode: boolean
  ) {
    const newChannelSettings = this.updateStateOnLoadImage(aimg.imageInfo.channel_names);

    if (stateKey === "image") {
      this.setState({
        image: aimg,
        currentlyLoadedImagePath: imageDirectory,
        channelDataReady: {},
        queryErrorMessage: null,
        cachingInProgress: false,
        userSelections: {
          ...this.state.userSelections,
          [MODE]: doResetViewMode ? ViewMode.threeD : this.state.userSelections.mode,
        },
      });
      this.intializeNewImage(aimg, newChannelSettings);
    } else if (stateKey === "prevImg") {
      this.setState({ prevImg: aimg });
    } else if (stateKey === "nextImg") {
      this.setState({ nextImg: aimg });
    } else {
      console.error("ERROR invalid or unexpected stateKey");
    }
  }
  onNewChannelData(url: string, v: Volume, channelIndex: number, keepLuts: boolean) {
    // const thisChannelSettings = this.getOneChannelSetting(channel.name, newChannelSettings, (channel) => channel.name === obj.channel_names[channelIndex].split('_')[0]);
    const thisChannelSettings = this.getOneChannelSetting(
      v.imageInfo.channel_names[channelIndex],
      // race condition with updateStateOnLoadImage below?
      this.state.userSelections[CHANNEL_SETTINGS]
    );
    this.onChannelDataLoaded(v, thisChannelSettings, channelIndex, keepLuts);
  }

  handleOpenImageException(resp) {
    /** can uncomment when we are actually using this message var
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
    **/
    // console.log(message);
    this.stopPollingForImage();
  }

  openImage(imageDirectory, doResetViewMode, stateKey, keepLuts?) {
    if (imageDirectory === this.state.currentlyLoadedImagePath) {
      return;
    }
    const { baseUrl } = this.props;

    // if baseUrl ends with zarr then we have zarr.
    // otherwise we can combine the baseUrl and imageDirectory to get the url to load.
    if (baseUrl.endsWith(".zarr")) {
      const timeIndex = 0;
      VolumeLoader.loadZarr(baseUrl, imageDirectory, timeIndex, (url, v, channelIndex) => {
        this.onNewChannelData(url, v, channelIndex, keepLuts);
      })
        .then((aimg) => {
          this.onNewVolumeCreated(aimg, stateKey, imageDirectory, doResetViewMode);
          this.stopPollingForImage();
        })
        .catch((resp) => this.handleOpenImageException(resp));
    } else {
      const fullUrl = `${baseUrl}${imageDirectory}`;

      if (fullUrl.endsWith(".json")) {
        const urlPrefix = fullUrl.substring(0, fullUrl.lastIndexOf("/") + 1);
        VolumeLoader.loadJson(fullUrl, urlPrefix, (url, v, channelIndex) => {
          this.onNewChannelData(url, v, channelIndex, keepLuts);
        })
          .then((aimg) => {
            this.onNewVolumeCreated(aimg, stateKey, imageDirectory, doResetViewMode);
            this.stopPollingForImage();
          })
          .catch((resp) => this.handleOpenImageException(resp));
      } else if (fullUrl.endsWith(".tif") || fullUrl.endsWith(".tiff")) {
        VolumeLoader.loadTiff(fullUrl, (url, v, channelIndex) => {
          this.onNewChannelData(url, v, channelIndex, keepLuts);
        })
          .then((aimg) => {
            this.onNewVolumeCreated(aimg, stateKey, imageDirectory, doResetViewMode);
            this.stopPollingForImage();
          })
          .catch((resp) => this.handleOpenImageException(resp));
      }
    }
  }

  intializeNewImage(aimg, newChannelSettings?) {
    const { userSelections, view3d } = this.state;
    const { viewerConfig } = this.props;
    const channelSetting = newChannelSettings || userSelections[CHANNEL_SETTINGS];
    let alphaLevel =
      userSelections.imageType === SEGMENTED_CELL && userSelections.mode === ViewMode.threeD
        ? ALPHA_MASK_SLIDER_3D_DEFAULT
        : ALPHA_MASK_SLIDER_2D_DEFAULT;
    // if maskAlpha is defined in viewerConfig then it will override the above
    if (viewerConfig.maskAlpha !== undefined) {
      alphaLevel = [viewerConfig.maskAlpha];
    }

    let imageMask = alphaSliderToImageValue(alphaLevel);
    let imageBrightness = brightnessSliderToImageValue(
      userSelections[BRIGHTNESS_SLIDER_LEVEL],
      userSelections[PATH_TRACE]
    );
    let imageDensity = densitySliderToImageValue(userSelections[DENSITY_SLIDER_LEVEL], userSelections[PATH_TRACE]);
    let imageValues = gammaSliderToImageValues(userSelections[LEVELS_SLIDER]);
    // set alpha slider first time image is loaded to something that makes sense
    this.setUserSelectionsInState({ [ALPHA_MASK_SLIDER_LEVEL]: alphaLevel });

    // Here is where we officially hand the image to the volume-viewer

    view3d.removeAllVolumes();
    view3d.addVolume(aimg, {
      channels: aimg.channel_names.map((name) => {
        const ch = this.getOneChannelSetting(name, channelSetting);
        if (!ch) {
          return {};
        }
        return {
          enabled: ch[VOLUME_ENABLED],
          isosurfaceEnabled: ch[ISO_SURFACE_ENABLED],
          isovalue: ch.isovalue,
          isosurfaceOpacity: ch.opacity,
          color: ch.color,
        };
      }),
    });

    view3d.updateMaskAlpha(aimg, imageMask);
    view3d.setMaxProjectMode(aimg, userSelections[MAX_PROJECT]);
    view3d.updateExposure(imageBrightness);
    view3d.updateDensity(aimg, imageDensity);
    view3d.setGamma(aimg, imageValues.min, imageValues.scale, imageValues.max);
    // update current camera mode to make sure the image gets the update
    view3d.setCameraMode(enums.viewMode.VIEW_MODE_ENUM_TO_LABEL_MAP.get(userSelections.mode));
    view3d.setShowBoundingBox(aimg, userSelections.showBoundingBox);
    view3d.setBoundingBoxColor(aimg, colorArrayToFloatArray(userSelections.boundingBoxColor));
    // tell view that things have changed for this image
    view3d.updateActiveChannels(aimg);
  }

  updateStateOnLoadImage(channelNames) {
    const { userSelections } = this.state;

    const prevChannelNames = map(userSelections[CHANNEL_SETTINGS], (ele) => ele.name);
    let newChannelSettings = isEqual(prevChannelNames, channelNames)
      ? userSelections[CHANNEL_SETTINGS]
      : this.setInitialChannelConfig(channelNames, INIT_COLORS);

    let channelGroupedByType = this.createChannelGrouping(channelNames);
    this.setUserSelectionsInState({
      [CHANNEL_SETTINGS]: newChannelSettings,
    });
    this.setState({
      channelGroupedByType,
    });
    return newChannelSettings;
  }

  initializeLut(aimg, channelIndex) {
    const histogram = aimg.getHistogram(channelIndex);

    const initViewerSettings = this.props.viewerChannelSettings;
    // find channelIndex among viewerChannelSettings.
    const name = aimg.channel_names[channelIndex];
    let lutObject: Lut = {};
    // default to percentiles
    lutObject = histogram.lutGenerator_percentiles(LUT_MIN_PERCENTILE, LUT_MAX_PERCENTILE);
    // and if init settings dictate, recompute it:
    if (initViewerSettings) {
      const initSettings = findFirstChannelMatch(name, channelIndex, initViewerSettings);
      if (initSettings) {
        if (initSettings.lut !== undefined && initSettings.lut.length === 2) {
          let lutmod = "";
          let lvalue = 0;
          let lutvalues = [0, 0];
          for (let i = 0; i < 2; ++i) {
            const lstr = initSettings.lut[i];
            // look at first char of string.
            let firstchar = lstr.charAt(0);
            if (firstchar === "m" || firstchar === "p") {
              lutmod = firstchar;
              lvalue = parseFloat(lstr.substring(1)) / 100.0;
            } else {
              lutmod = "";
              lvalue = parseFloat(lstr);
            }
            if (lutmod === "m") {
              lutvalues[i] = histogram.maxBin * lvalue;
            } else if (lutmod === "p") {
              lutvalues[i] = histogram.findBinOfPercentile(lvalue);
            }
          }

          lutObject = histogram.lutGenerator_minMax(
            Math.min(lutvalues[0], lutvalues[1]),
            Math.max(lutvalues[0], lutvalues[1])
          );
        }
      }
    }

    const newControlPoints = lutObject.controlPoints.map((controlPoint) => ({
      ...controlPoint,
      color: TFEDITOR_DEFAULT_COLOR,
    }));
    aimg.setLut(channelIndex, lutObject.lut);
    return newControlPoints;
  }

  onChannelDataLoaded(aimg, thisChannelsSettings, channelIndex, keepLuts) {
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
      isosurfaceOpacity: thisChannelsSettings.opacity,
    });

    // if we want to keep the current control points
    if (thisChannelsSettings[LUT_CONTROL_POINTS] && keepLuts) {
      const lut = controlPointsToLut(thisChannelsSettings[LUT_CONTROL_POINTS]);
      aimg.setLut(channelIndex, lut);
      view3d.updateLuts(aimg);
    } else {
      // need to choose initial LUT
      const newControlPoints = this.initializeLut(aimg, channelIndex);
      this.changeOneChannelSetting(thisChannelsSettings.name, channelIndex, LUT_CONTROL_POINTS, newControlPoints);
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
      nextImg: image,
    });
    // preload the new "prevImg"
    this.openImage(prevImgPath, true, "prevImg");
  }

  loadNextImage() {
    const { image, nextImg } = this.state;
    const { nextImgPath } = this.props;

    // assume nextImg is available to initialize
    this.intializeNewImage(nextImg);
    this.setState({
      image: nextImg,
      prevImg: image,
    });
    // preload the new "nextImg"
    this.openImage(nextImgPath, true, "nextImg");
  }

  initializeOneChannelSetting(aimg, channel, index, defaultColor) {
    const { viewerChannelSettings } = this.props;
    let color = defaultColor;
    let volumeEnabled = false;
    let surfaceEnabled = false;

    // note that this modifies aimg also
    const newControlPoints = aimg ? this.initializeLut(aimg, index) : undefined;

    if (viewerChannelSettings) {
      // search for channel in settings using groups, names and match values
      const initSettings = findFirstChannelMatch(channel, index, viewerChannelSettings);
      if (initSettings) {
        if (initSettings.color !== undefined) {
          const initColor = colorHexToArray(initSettings.color);
          if (initColor) {
            color = initColor;
          }
        }
        if (initSettings.enabled !== undefined) {
          volumeEnabled = initSettings.enabled;
        }
        if (initSettings.surfaceEnabled !== undefined) {
          surfaceEnabled = initSettings.surfaceEnabled;
        }
      }
    }

    return {
      name: channel || "Channel " + index,
      [VOLUME_ENABLED]: volumeEnabled,
      [ISO_SURFACE_ENABLED]: surfaceEnabled,
      [COLORIZE_ENABLED]: false,
      [COLORIZE_ALPHA]: 1.0,
      isovalue: 188,
      opacity: 1.0,
      color: color,
      dataReady: false,
      [LUT_CONTROL_POINTS]: newControlPoints,
    };
  }

  loadFromRaw() {
    const { rawDims, rawData } = this.props;
    if (!rawData) {
      console.error("ERROR loadFromRaw called without rawData being set");
      return;
    }

    const aimg = new Volume(rawDims);
    const volsize = rawData.shape[1] * rawData.shape[2] * rawData.shape[3];
    for (var i = 0; i < rawDims.channels; ++i) {
      aimg.setChannelDataFromVolume(i, new Uint8Array(rawData.buffer.buffer, i * volsize, volsize));
    }

    let newChannelSettings = rawDims.channel_names.map((channel, index) => {
      let color = INIT_COLORS[index] ? INIT_COLORS[index].slice() : [226, 205, 179]; // guard for unexpectedly longer channel list
      return this.initializeOneChannelSetting(aimg, channel, index, color);
    });

    let channelGroupedByType = this.createChannelGrouping(rawDims.channel_names);

    const { userSelections, view3d } = this.state;
    const channelSetting = newChannelSettings;
    let alphaLevel =
      userSelections.imageType === SEGMENTED_CELL && userSelections.mode === ViewMode.threeD
        ? ALPHA_MASK_SLIDER_3D_DEFAULT
        : ALPHA_MASK_SLIDER_2D_DEFAULT;

    let imageMask = alphaSliderToImageValue(alphaLevel);
    let imageBrightness = brightnessSliderToImageValue(
      userSelections[BRIGHTNESS_SLIDER_LEVEL],
      userSelections[PATH_TRACE]
    );
    let imageDensity = densitySliderToImageValue(userSelections[DENSITY_SLIDER_LEVEL], userSelections[PATH_TRACE]);
    let imageValues = gammaSliderToImageValues(userSelections[LEVELS_SLIDER]);

    // Here is where we officially hand the image to the volume-viewer

    view3d.removeAllVolumes();
    view3d.addVolume(aimg, {
      channels: aimg.channel_names.map((name) => {
        const ch = find(channelSetting, (channel) => {
          return channel.name === name;
        });

        if (!ch) {
          return {};
        }
        return {
          enabled: ch[VOLUME_ENABLED],
          isosurfaceEnabled: ch[ISO_SURFACE_ENABLED],
          isovalue: ch.isovalue,
          isosurfaceOpacity: ch.opacity,
          color: ch.color,
        };
      }),
    });

    view3d.updateMaskAlpha(aimg, imageMask);
    view3d.setMaxProjectMode(aimg, userSelections[MAX_PROJECT]);
    view3d.updateExposure(imageBrightness);
    view3d.updateDensity(aimg, imageDensity);
    view3d.setGamma(aimg, imageValues.min, imageValues.scale, imageValues.max);
    // update current camera mode to make sure the image gets the update
    view3d.setCameraMode(enums.viewMode.VIEW_MODE_ENUM_TO_LABEL_MAP.get(userSelections.mode));
    view3d.setShowBoundingBox(aimg, userSelections.showBoundingBox);
    view3d.setBoundingBoxColor(aimg, colorArrayToFloatArray(userSelections.boundingBoxColor));
    // tell view that things have changed for this image
    view3d.updateActiveChannels(aimg);

    this.setState({
      channelGroupedByType,
      image: aimg,
      userSelections: {
        ...this.state.userSelections,
        [ALPHA_MASK_SLIDER_LEVEL]: alphaLevel,
        [CHANNEL_SETTINGS]: channelSetting,
      },
    });
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
      return {
        ...channel,
        [keyToChange]: includes(indices, index) ? newValue : channel[keyToChange],
      };
    });
    this.setUserSelectionsInState({ [CHANNEL_SETTINGS]: newChannels });
  }

  setUserSelectionsInState(newState) {
    this.setState({
      userSelections: {
        ...this.state.userSelections,
        ...newState,
      },
    });
  }

  handleChangeToImage(keyToChange, newValue, index?) {
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
          isosurfaceOpacity: newValue,
        });
        break;
      case COLOR:
        {
          let newColor = newValue.r ? [newValue.r, newValue.g, newValue.b, newValue.a] : newValue;
          view3d.setVolumeChannelOptions(image, index, {
            color: newColor,
          });
          view3d.updateMaterial(image);
        }
        break;
      case MODE:
        view3d.setCameraMode(enums.viewMode.VIEW_MODE_ENUM_TO_LABEL_MAP.get(newValue));
        break;
      case SHOW_AXES:
        view3d.setShowAxis(newValue);
        break;
      case "showBoundingBox":
        view3d.setShowBoundingBox(image, newValue);
        break;
      case SAVE_ISO_SURFACE:
        view3d.saveChannelIsosurface(image, index, newValue);
        break;
      case COLORIZE_ENABLED:
        if (newValue) {
          // TODO get the labelColors from the tf editor component
          const lut = image.getHistogram(index).lutGenerator_labelColors();
          image.setColorPalette(index, lut.lut);
          image.setColorPaletteAlpha(index, userSelections[CHANNEL_SETTINGS][index][COLORIZE_ALPHA]);
        } else {
          image.setColorPaletteAlpha(index, 0);
        }
        view3d.updateLuts(image);
        break;
      case COLORIZE_ALPHA:
        if (userSelections[CHANNEL_SETTINGS][index][COLORIZE_ENABLED]) {
          image.setColorPaletteAlpha(index, newValue);
        } else {
          image.setColorPaletteAlpha(index, 0);
        }
        view3d.updateLuts(image);
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
        {
          let imageMask = alphaSliderToImageValue(newValue);
          view3d.updateMaskAlpha(image, imageMask);
          view3d.updateActiveChannels(image);
        }
        break;
      case BRIGHTNESS_SLIDER_LEVEL:
        {
          let imageBrightness = brightnessSliderToImageValue(newValue, userSelections[PATH_TRACE]);
          view3d.updateExposure(imageBrightness);
        }
        break;
      case DENSITY_SLIDER_LEVEL:
        {
          let imageDensity = densitySliderToImageValue(newValue, userSelections[PATH_TRACE]);
          view3d.updateDensity(image, imageDensity);
        }
        break;
      case LEVELS_SLIDER:
        {
          let imageValues = gammaSliderToImageValues(newValue);
          view3d.setGamma(image, imageValues.min, imageValues.scale, imageValues.max);
        }
        break;
    }
  }

  onWindowResize() {
    if (window.innerWidth < CONTROL_PANEL_CLOSE_WIDTH) {
      this.toggleControlPanel(true);
    }
  }

  onViewModeChange(newMode) {
    const { userSelections } = this.state;
    let newSelectionState: Partial<UserSelectionState> = {
      [MODE]: newMode,
    };
    // if switching between 2D and 3D reset alpha mask to default (off in in 2D, 50% in 3D)
    // if full field, dont mask
    if (userSelections.mode === ViewMode.threeD && newMode !== ViewMode.threeD) {
      // Switching to 2d
      newSelectionState = {
        [MODE]: newMode,
        [PATH_TRACE]: false,
        [ALPHA_MASK_SLIDER_LEVEL]: ALPHA_MASK_SLIDER_2D_DEFAULT,
      };
      // if path trace was enabled in 3D turn it off when switching to 2D.
      if (userSelections[PATH_TRACE]) {
        this.onChangeRenderingAlgorithm(VOLUMETRIC_RENDER);
      }
      // switching from 2D to 3D
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
    this.setUserSelectionsInState({
      [AUTO_ROTATE]: !this.state.userSelections[AUTO_ROTATE],
    });
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

  onChangeRenderingAlgorithm(newAlgorithm) {
    const { userSelections } = this.state;
    // already set
    if (userSelections[newAlgorithm]) {
      return;
    }
    this.setUserSelectionsInState({
      [PATH_TRACE]: newAlgorithm === PATH_TRACE,
      [MAX_PROJECT]: newAlgorithm === MAX_PROJECT,
      autorotate: newAlgorithm === PATH_TRACE ? false : userSelections.autorotate,
    });
    this.handleChangeToImage(PATH_TRACE, newAlgorithm === PATH_TRACE);
    this.handleChangeToImage(MAX_PROJECT, newAlgorithm === MAX_PROJECT);
  }

  onSwitchFovCell(value: string) {
    const { cellPath, fovPath } = this.props;
    const path = value === FULL_FIELD_IMAGE ? fovPath : cellPath;
    this.openImage(path, false, "image", false);
    this.setState({
      sendingQueryRequest: true,
      userSelections: {
        ...this.state.userSelections,
        imageType: value,
      },
    });
  }

  onApplyColorPresets(presets) {
    const { userSelections } = this.state;
    presets.forEach((color, index) => {
      if (index < userSelections[CHANNEL_SETTINGS].length) {
        this.handleChangeToImage(COLOR, color, index);
      }
    });
    const newChannels = userSelections[CHANNEL_SETTINGS].map((channel, channelindex) => {
      return presets[channelindex] ? { ...channel, color: presets[channelindex] } : channel;
    });
    this.setUserSelectionsInState({ [CHANNEL_SETTINGS]: newChannels });
  }

  changeAxisShowing(showAxes) {
    this.setUserSelectionsInState({ showAxes });
    this.handleChangeToImage(SHOW_AXES, showAxes);
  }

  changeBoundingBoxShowing(showBoundingBox) {
    this.setUserSelectionsInState({ showBoundingBox });
    this.handleChangeToImage("showBoundingBox", showBoundingBox);
  }

  changeBoundingBoxColor(color) {
    const boundingBoxColor = rgbObjectToArray(color);
    this.setUserSelectionsInState({ boundingBoxColor });
    if (this.state.view3d && this.state.image) {
      const floatColor = colorArrayToFloatArray(boundingBoxColor);
      this.state.view3d.setBoundingBoxColor(this.state.image, floatColor);
    }
  }

  changeBackgroundColor(color) {
    const backgroundColor = rgbObjectToArray(color);
    this.setUserSelectionsInState({ backgroundColor });
    if (this.state.view3d) {
      const floatColor = colorArrayToFloatArray(backgroundColor);
      this.state.view3d.setBackgroundColor(floatColor);
    }
  }

  onResetCamera() {
    if (this.state.view3d) {
      this.state.view3d.resetCamera();
    }
  }

  updateChannelTransferFunction(index, lut) {
    if (this.state.image) {
      this.state.image.setLut(index, lut);
      if (this.state.view3d) {
        this.state.view3d.updateLuts(this.state.image);
      }
    }
  }

  beginRequestImage(type?) {
    const { fovPath, cellPath, cellId, prevImgPath, nextImgPath, preLoad } = this.props;
    let imageType = type || this.state.userSelections.imageType;
    let path;
    if (imageType === FULL_FIELD_IMAGE) {
      path = fovPath;
    } else if (imageType === SEGMENTED_CELL) {
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
      },
    });
    if (preLoad) {
      this.openImage(nextImgPath, true, "nextImg", true);
      this.openImage(prevImgPath, true, "prevImg", true);
    }
    this.openImage(path, true, "image");
  }

  getOneChannelSetting(channelName, newSettings?) {
    const { userSelections } = this.state;
    const channelSettings = newSettings || userSelections[CHANNEL_SETTINGS];
    return find(channelSettings, (channel) => {
      return channel.name === channelName;
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
        if (!channelSetting) {
          return;
        }
        const volenabled = channelSetting[VOLUME_ENABLED];
        const isoenabled = channelSetting[ISO_SURFACE_ENABLED];

        view3d.setVolumeChannelOptions(image, imageIndex, {
          enabled: volenabled,
          color: channelSetting.color,
          isosurfaceEnabled: isoenabled,
          isovalue: channelSetting.isovalue,
          isosurfaceOpacity: channelSetting.opacity,
        });
      }
    });

    view3d.updateActiveChannels(image);
  }

  toggleControlPanel(value) {
    if (this.props.onControlPanelToggle) {
      this.props.onControlPanelToggle(value);
    }

    this.setUserSelectionsInState({ controlPanelClosed: value });
  }

  getNumberOfSlices() {
    if (this.state.image) {
      return {
        x: this.state.image.x,
        y: this.state.image.y,
        z: this.state.image.z,
      };
    }
    return {};
  }

  render() {
    const { userSelections } = this.state;
    const { renderConfig, cellDownloadHref, fovDownloadHref, viewerChannelSettings } = this.props;
    return (
      <Layout className="cell-viewer-app" style={{ height: this.props.appHeight }}>
        <Sider
          className="control-panel-holder"
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
            pixelSize={this.state.image ? this.state.image.pixel_size : [1, 1, 1]}
            channelDataChannels={this.state.image ? this.state.image.channels : null}
            channelGroupedByType={this.state.channelGroupedByType}
            channelDataReady={this.state.channelDataReady}
            // user selections
            maxProjectOn={userSelections[MAX_PROJECT]}
            pathTraceOn={userSelections[PATH_TRACE]}
            channelSettings={userSelections[CHANNEL_SETTINGS]}
            mode={userSelections[MODE]}
            showBoundingBox={userSelections.showBoundingBox}
            backgroundColor={userSelections.backgroundColor}
            boundingBoxColor={userSelections.boundingBoxColor}
            alphaMaskSliderLevel={userSelections[ALPHA_MASK_SLIDER_LEVEL]}
            brightnessSliderLevel={userSelections[BRIGHTNESS_SLIDER_LEVEL]}
            densitySliderLevel={userSelections[DENSITY_SLIDER_LEVEL]}
            gammaSliderLevel={userSelections[LEVELS_SLIDER]}
            // functions
            handleChangeUserSelection={this.handleChangeUserSelection}
            handleChangeToImage={this.handleChangeToImage}
            updateChannelTransferFunction={this.updateChannelTransferFunction}
            setImageAxisClip={this.setImageAxisClip}
            onApplyColorPresets={this.onApplyColorPresets}
            makeUpdatePixelSizeFn={this.makeUpdatePixelSizeFn}
            changeChannelSettings={this.changeChannelSettings}
            changeOneChannelSetting={this.changeOneChannelSetting}
            changeBackgroundColor={this.changeBackgroundColor}
            changeBoundingBoxColor={this.changeBoundingBoxColor}
            viewerChannelSettings={viewerChannelSettings}
          />
        </Sider>
        <Layout className="cell-viewer-wrapper" style={{ margin: this.props.canvasMargin }}>
          <Content>
            <Toolbar
              mode={userSelections.mode}
              fovDownloadHref={fovDownloadHref}
              cellDownloadHref={cellDownloadHref}
              autorotate={userSelections.autorotate}
              pathTraceOn={userSelections[PATH_TRACE]}
              imageType={userSelections.imageType}
              hasParentImage={!!this.state.fovPath}
              hasCellId={this.state.hasCellId}
              canPathTrace={this.state.view3d ? this.state.view3d.canvas3d.hasWebGL2 : false}
              showAxes={userSelections[SHOW_AXES]}
              showBoundingBox={userSelections.showBoundingBox}
              renderSetting={
                userSelections[MAX_PROJECT] ? MAX_PROJECT : userSelections[PATH_TRACE] ? PATH_TRACE : "volume"
              }
              onViewModeChange={this.onViewModeChange}
              onResetCamera={this.onResetCamera}
              onAutorotateChange={this.onAutorotateChange}
              onSwitchFovCell={this.onSwitchFovCell}
              onChangeRenderingAlgorithm={this.onChangeRenderingAlgorithm}
              changeAxisShowing={this.changeAxisShowing}
              changeBoundingBoxShowing={this.changeBoundingBoxShowing}
              renderConfig={renderConfig}
            />
            <CellViewerCanvasWrapper
              image={this.state.image}
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

  componentWillUnmount() {}
}
