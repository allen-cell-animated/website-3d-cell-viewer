// 3rd Party Imports
import { Layout } from "antd";
import React from "react";
import { includes, isEqual, find, map, debounce } from "lodash";
import { RENDERMODE_PATHTRACE, RENDERMODE_RAYMARCH, View3d, Volume, VolumeLoader } from "@aics/volume-viewer";

import { AppProps, AppState, UserSelectionKey, UserSelectionState } from "./types";
import { controlPointsToLut } from "../../shared/utils/controlPointsToLut";
import {
  ChannelState,
  findFirstChannelMatch,
  makeChannelIndexGrouping,
  ChannelStateKey,
} from "../../shared/utils/viewerChannelSettings";
import enums from "../../shared/enums";
import {
  CELL_SEGMENTATION_CHANNEL_NAME,
  PRESET_COLORS_0,
  ALPHA_MASK_SLIDER_3D_DEFAULT,
  ALPHA_MASK_SLIDER_2D_DEFAULT,
  FULL_FIELD_IMAGE,
  SEGMENTED_CELL,
  COLORIZE_ALPHA,
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
import {
  ColorArray,
  colorArrayToFloats,
  ColorObject,
  colorObjectToArray,
} from "../../shared/utils/colorRepresentations";

import "./styles.css";

const ViewMode = enums.viewMode.mainMapping;
const { Sider, Content } = Layout;

const INIT_COLORS = PRESET_COLORS_0;

function colorHexToArray(hex: string): ColorArray | null {
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
  rawDims: undefined,

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
  constructor(props: AppProps) {
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
        mode: viewmode,
        autorotate: props.viewerConfig.autorotate,
        showAxes: props.viewerConfig.showAxes,
        showBoundingBox: props.viewerConfig.showBoundingBox,
        boundingBoxColor: props.viewerConfig.boundingBoxColor || BOUNDING_BOX_COLOR,
        backgroundColor: props.viewerConfig.backgroundColor || BACKGROUND_COLOR,
        maxProject: maxproject,
        pathTrace: pathtrace,
        alphaMaskSliderLevel: [props.viewerConfig.maskAlpha] || ALPHA_MASK_SLIDER_3D_DEFAULT,
        brightnessSliderLevel: [props.viewerConfig.brightness] || BRIGHTNESS_SLIDER_LEVEL_DEFAULT,
        densitySliderLevel: [props.viewerConfig.density] || DENSITY_SLIDER_LEVEL_DEFAULT,
        levelsSlider: props.viewerConfig.levels || LEVELS_SLIDER_DEFAULT,
        // channelSettings is a flat list of objects of this type:
        // { name, enabled, volumeEnabled, isosurfaceEnabled, isovalue, opacity, color, dataReady}
        channelSettings: [],
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
    this.initializeNewImage = this.initializeNewImage.bind(this);
    this.onView3DCreated = this.onView3DCreated.bind(this);
    this.createChannelGrouping = this.createChannelGrouping.bind(this);
    this.beginRequestImage = this.beginRequestImage.bind(this);
    this.loadNextImage = this.loadNextImage.bind(this);
    this.loadPrevImage = this.loadPrevImage.bind(this);
    this.getOneChannelSetting = this.getOneChannelSetting.bind(this);
    this.onChangeRenderingAlgorithm = this.onChangeRenderingAlgorithm.bind(this);
    this.changeAxisShowing = this.changeAxisShowing.bind(this);
    this.changeBoundingBoxShowing = this.changeBoundingBoxShowing.bind(this);
    this.onResetCamera = this.onResetCamera.bind(this);
    this.changeBackgroundColor = this.changeBackgroundColor.bind(this);
    this.changeBoundingBoxColor = this.changeBoundingBoxColor.bind(this);
    this.downloadScreenshot = this.downloadScreenshot.bind(this);
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

  componentDidUpdate(prevProps: AppProps, prevState: AppState) {
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
    const channelsChanged = !isEqual(userSelections.channelSettings, prevState.userSelections.channelSettings);
    const newImage = this.state.image && !prevState.image;
    const imageChanged = this.state.image && prevState.image && this.state.image.name !== prevState.image.name;
    if (newImage || channelsChanged || imageChanged) {
      this.updateImageVolumeAndSurfacesEnabledFromAppState();
    }
  }

  onView3DCreated(view3d: View3d) {
    const { userSelections } = this.state;
    view3d.setBackgroundColor(colorArrayToFloats(userSelections.backgroundColor));
    view3d.setShowAxis(userSelections[SHOW_AXES]);

    this.setState({ view3d });
  }

  setInitialChannelConfig(channelNames: string[], channelColors: ColorArray[]): ChannelState[] {
    return channelNames.map((channel, index) => {
      let color = (channelColors[index] ? channelColors[index].slice() : [226, 205, 179]) as ColorArray; // guard for unexpectedly longer channel list

      return this.initializeOneChannelSetting(null, channel, index, color);
    });
  }

  createChannelGrouping(channels: string[]): { [key: string]: number[] } {
    if (!channels) {
      return {};
    }
    const { viewerChannelSettings } = this.props;
    if (!viewerChannelSettings) {
      // return all channels
      return {
        [SINGLE_GROUP_CHANNEL_KEY]: channels.map((_val, index) => index),
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

  onNewVolumeCreated(
    aimg: Volume,
    stateKey: "image" | "prevImg" | "nextImg",
    imageDirectory: string,
    doResetViewMode: boolean
  ) {
    // FIXME this calls setState followed almost immediately by another setState... :-(
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
      this.initializeNewImage(aimg, newChannelSettings);
    } else if (stateKey === "prevImg") {
      this.setState({ prevImg: aimg });
    } else if (stateKey === "nextImg") {
      this.setState({ nextImg: aimg });
    } else {
      console.error("ERROR invalid or unexpected stateKey");
    }
  }

  onNewChannelData(_url: string, v: Volume, channelIndex: number, keepLuts: boolean | undefined) {
    // const thisChannelSettings = this.getOneChannelSetting(channel.name, newChannelSettings, (channel) => channel.name === obj.channel_names[channelIndex].split('_')[0]);
    const thisChannelSettings = this.getOneChannelSetting(
      v.imageInfo.channel_names[channelIndex],
      // race condition with updateStateOnLoadImage below?
      this.state.userSelections.channelSettings
    );
    this.onChannelDataLoaded(v, thisChannelSettings!, channelIndex, keepLuts);
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

  openImage(
    imageDirectory: string,
    doResetViewMode: boolean,
    stateKey: "image" | "nextImg" | "prevImg",
    keepLuts?: boolean
  ) {
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

  initializeNewImage(aimg: Volume, newChannelSettings?: ChannelState[]) {
    // set alpha slider first time image is loaded to something that makes sense
    let alphaLevel = this.getInitialAlphaLevel();
    this.setUserSelectionsInState({ alphaMaskSliderLevel: alphaLevel });

    // Here is where we officially hand the image to the volume-viewer
    this.placeImageInViewer(aimg, newChannelSettings);
  }

  private getInitialAlphaLevel(): number[] {
    const { userSelections } = this.state;
    const { viewerConfig } = this.props;
    let alphaLevel =
      userSelections.imageType === SEGMENTED_CELL && userSelections.mode === ViewMode.threeD
        ? ALPHA_MASK_SLIDER_3D_DEFAULT
        : ALPHA_MASK_SLIDER_2D_DEFAULT;
    // if maskAlpha is defined in viewerConfig then it will override the above
    if (viewerConfig.maskAlpha !== undefined) {
      alphaLevel = [viewerConfig.maskAlpha];
    }
    return alphaLevel;
  }

  // set up the Volume into the Viewer using the current initial settings
  private placeImageInViewer(aimg: Volume, newChannelSettings?: ChannelState[]): void {
    const { userSelections, view3d } = this.state;
    if (!view3d) {
      return;
    }
    const channelSetting = newChannelSettings || userSelections.channelSettings;
    view3d.removeAllVolumes();
    view3d.addVolume(aimg, {
      channels: aimg.channel_names.map((name) => {
        const ch = this.getOneChannelSetting(name, channelSetting);
        if (!ch) {
          return {};
        }
        return {
          enabled: ch.volumeEnabled,
          isosurfaceEnabled: ch.isosurfaceEnabled,
          isovalue: ch.isovalue,
          isosurfaceOpacity: ch.opacity,
          color: ch.color,
        };
      }),
    });

    const alphaLevel = this.getInitialAlphaLevel();
    const imageMask = alphaSliderToImageValue(alphaLevel);
    view3d.updateMaskAlpha(aimg, imageMask);

    view3d.setMaxProjectMode(aimg, userSelections[MAX_PROJECT]);

    const imageBrightness = brightnessSliderToImageValue(
      userSelections.brightnessSliderLevel,
      userSelections.pathTrace
    );
    view3d.updateExposure(imageBrightness);

    const imageDensity = densitySliderToImageValue(userSelections.densitySliderLevel, userSelections.pathTrace);
    view3d.updateDensity(aimg, imageDensity);

    const imageValues = gammaSliderToImageValues(userSelections.levelsSlider);
    view3d.setGamma(aimg, imageValues.min, imageValues.scale, imageValues.max);

    // update current camera mode to make sure the image gets the update
    view3d.setCameraMode(enums.viewMode.VIEW_MODE_ENUM_TO_LABEL_MAP.get(userSelections.mode));
    view3d.setShowBoundingBox(aimg, userSelections.showBoundingBox);
    view3d.setBoundingBoxColor(aimg, colorArrayToFloats(userSelections.boundingBoxColor));
    // tell view that things have changed for this image
    view3d.updateActiveChannels(aimg);
  }

  updateStateOnLoadImage(channelNames: string[]) {
    const { userSelections } = this.state;

    const prevChannelNames = map(userSelections.channelSettings, (ele) => ele.name);
    let newChannelSettings = isEqual(prevChannelNames, channelNames)
      ? userSelections.channelSettings
      : this.setInitialChannelConfig(channelNames, INIT_COLORS);

    let channelGroupedByType = this.createChannelGrouping(channelNames);
    this.setUserSelectionsInState({
      channelSettings: newChannelSettings,
    });
    this.setState({
      channelGroupedByType,
    });
    return newChannelSettings;
  }

  initializeLut(aimg: Volume, channelIndex: number) {
    const histogram = aimg.getHistogram(channelIndex);

    const initViewerSettings = this.props.viewerChannelSettings;
    // find channelIndex among viewerChannelSettings.
    const name = aimg.channel_names[channelIndex];
    // default to percentiles
    let lutObject = histogram.lutGenerator_percentiles(LUT_MIN_PERCENTILE, LUT_MAX_PERCENTILE);
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

  onChannelDataLoaded(
    aimg: Volume,
    thisChannelsSettings: ChannelState,
    channelIndex: number,
    keepLuts: boolean | undefined
  ) {
    const { image, view3d } = this.state;
    if (!view3d || aimg !== image) {
      return;
    }
    const volenabled = thisChannelsSettings.volumeEnabled;
    const isoenabled = thisChannelsSettings.isosurfaceEnabled;
    view3d.setVolumeChannelOptions(aimg, channelIndex, {
      enabled: volenabled,
      color: thisChannelsSettings.color,
      isosurfaceEnabled: isoenabled,
      isovalue: thisChannelsSettings.isovalue,
      isosurfaceOpacity: thisChannelsSettings.opacity,
    });

    // if we want to keep the current control points
    if (thisChannelsSettings.controlPoints && keepLuts) {
      const lut = controlPointsToLut(thisChannelsSettings.controlPoints);
      aimg.setLut(channelIndex, new Uint8Array(lut.buffer));
      view3d.updateLuts(aimg);
    } else {
      // need to choose initial LUT
      const newControlPoints = this.initializeLut(aimg, channelIndex);
      this.changeOneChannelSetting(thisChannelsSettings.name, channelIndex, "controlPoints", newControlPoints);
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
    if (aimg.isLoaded()) {
      view3d.updateActiveChannels(aimg);
    }
  }

  loadPrevImage() {
    const { image, prevImg } = this.state;
    const { prevImgPath } = this.props;

    if (!prevImg) {
      return;
    }

    // assume prevImg is available to initialize
    this.initializeNewImage(prevImg);
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

    if (!nextImg) {
      return;
    }

    // assume nextImg is available to initialize
    this.initializeNewImage(nextImg);
    this.setState({
      image: nextImg,
      prevImg: image,
    });
    // preload the new "nextImg"
    this.openImage(nextImgPath, true, "nextImg");
  }

  initializeOneChannelSetting(
    aimg: Volume | null,
    channel: string,
    index: number,
    defaultColor: ColorArray
  ): ChannelState {
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
      volumeEnabled: volumeEnabled,
      isosurfaceEnabled: surfaceEnabled,
      colorizeEnabled: false,
      colorizeAlpha: 1.0,
      isovalue: 188,
      opacity: 1.0,
      color: color,
      dataReady: false,
      controlPoints: newControlPoints || [],
    };
  }

  loadFromRaw() {
    const { rawDims, rawData } = this.props;
    if (!rawData || !rawDims) {
      console.error("ERROR loadFromRaw called without rawData or rawDims being set");
      return;
    }

    const aimg = new Volume(rawDims);
    const volsize = rawData.shape[1] * rawData.shape[2] * rawData.shape[3];
    for (var i = 0; i < rawDims.channels; ++i) {
      aimg.setChannelDataFromVolume(i, new Uint8Array(rawData.buffer.buffer, i * volsize, volsize));
    }

    let newChannelSettings = rawDims.channel_names.map((channel, index) => {
      let color = (INIT_COLORS[index] ? INIT_COLORS[index].slice() : [226, 205, 179]) as ColorArray; // guard for unexpectedly longer channel list
      return this.initializeOneChannelSetting(aimg, channel, index, color);
    });

    let channelGroupedByType = this.createChannelGrouping(rawDims.channel_names);

    const channelSetting = newChannelSettings;

    let alphaLevel = this.getInitialAlphaLevel();

    // Here is where we officially hand the image to the volume-viewer
    this.placeImageInViewer(aimg, newChannelSettings);

    this.setState({
      channelGroupedByType,
      image: aimg,
      userSelections: {
        ...this.state.userSelections,
        alphaMaskSliderLevel: alphaLevel,
        channelSettings: channelSetting,
      },
    });
  }

  handleChangeUserSelection<K extends UserSelectionKey>(key: K, newValue: UserSelectionState[K]) {
    this.setUserSelectionsInState({ [key]: newValue });
    this.handleChangeToImage(key, newValue);
  }

  changeOneChannelSetting<K extends ChannelStateKey>(
    channelName: string,
    channelIndex: number,
    keyToChange: K,
    newValue: ChannelState[K]
  ) {
    const { userSelections } = this.state;
    const newChannels = userSelections.channelSettings.map((channel) => {
      return channel.name === channelName ? { ...channel, [keyToChange]: newValue } : channel;
    });

    this.setUserSelectionsInState({ channelSettings: newChannels });
    this.handleChangeToImage(keyToChange, newValue, channelIndex);
  }

  changeChannelSettings<K extends ChannelStateKey>(indices: number[], keyToChange: K, newValue: ChannelState[K]) {
    const { userSelections } = this.state;
    const newChannels = userSelections.channelSettings.map((channel, index) => {
      return {
        ...channel,
        [keyToChange]: includes(indices, index) ? newValue : channel[keyToChange],
      };
    });
    this.setUserSelectionsInState({ channelSettings: newChannels });
  }

  setUserSelectionsInState(newState: Partial<UserSelectionState>) {
    this.setState({
      userSelections: {
        ...this.state.userSelections,
        ...newState,
      },
    });
  }

  // TODO make nicer and more strictly type-able
  handleChangeToImage(keyToChange: string, newValue: any, index?: number) {
    const { image, userSelections, view3d } = this.state;
    if (!image || !view3d) {
      return;
    }
    switch (keyToChange) {
      case ISO_VALUE:
        view3d.setVolumeChannelOptions(image, index!, {
          isovalue: newValue,
        });
        break;
      case OPACITY:
        view3d.setVolumeChannelOptions(image, index!, {
          isosurfaceOpacity: newValue,
        });
        break;
      case COLOR:
        {
          let newColor: ColorArray = newValue.r ? colorObjectToArray(newValue) : newValue;
          view3d.setVolumeChannelOptions(image, index!, {
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
        view3d.saveChannelIsosurface(image, index!, newValue);
        break;
      case COLORIZE_ENABLED:
        if (newValue) {
          // TODO get the labelColors from the tf editor component
          const lut = image.getHistogram(index!).lutGenerator_labelColors();
          image.setColorPalette(index!, lut.lut);
          image.setColorPaletteAlpha(index!, userSelections.channelSettings[index!][COLORIZE_ALPHA]);
        } else {
          image.setColorPaletteAlpha(index!, 0);
        }
        view3d.updateLuts(image);
        break;
      case COLORIZE_ALPHA:
        if (userSelections.channelSettings[index!].colorizeEnabled) {
          image.setColorPaletteAlpha(index!, newValue);
        } else {
          image.setColorPaletteAlpha(index!, 0);
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
          let imageBrightness = brightnessSliderToImageValue(newValue, userSelections.pathTrace);
          view3d.updateExposure(imageBrightness);
        }
        break;
      case DENSITY_SLIDER_LEVEL:
        {
          let imageDensity = densitySliderToImageValue(newValue, userSelections.pathTrace);
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

  downloadScreenshot() {
    if (!this.state.view3d) {
      return;
    }
    this.state.view3d.capture((dataUrl: string) => {
      const anchor = document.createElement("a");
      anchor.href = dataUrl;
      anchor.download = "screenshot.png";
      anchor.click();
    });
  }

  onWindowResize() {
    if (window.innerWidth < CONTROL_PANEL_CLOSE_WIDTH) {
      this.toggleControlPanel(true);
    }
  }

  onViewModeChange(newMode: symbol) {
    const { userSelections } = this.state;
    let newSelectionState: Partial<UserSelectionState> = {
      mode: newMode,
    };

    // TODO the following behavior/logic is very specific to a particular application's needs
    // and is not necessarily appropriate for a general viewer.
    // Why should the alpha setting matter whether we are viewing the primary image
    // or its parent?

    // If switching between 2D and 3D reset alpha mask to default (off in in 2D, 50% in 3D)
    // If full field, dont mask

    if (userSelections.mode === ViewMode.threeD && newMode !== ViewMode.threeD) {
      // Switching from 3D to 2D
      newSelectionState = {
        mode: newMode,
        pathTrace: false,
        alphaMaskSliderLevel: ALPHA_MASK_SLIDER_2D_DEFAULT,
      };
      // if path trace was enabled in 3D turn it off when switching to 2D.
      if (userSelections.pathTrace) {
        this.onChangeRenderingAlgorithm(VOLUMETRIC_RENDER);
      }
    } else if (
      userSelections.mode !== ViewMode.threeD &&
      newMode === ViewMode.threeD &&
      this.state.userSelections.imageType === SEGMENTED_CELL
    ) {
      // switching from 2D to 3D
      newSelectionState = {
        mode: newMode,
        alphaMaskSliderLevel: ALPHA_MASK_SLIDER_3D_DEFAULT,
      };
    }

    this.handleChangeToImage(MODE, newMode);
    if (newSelectionState.alphaMaskSliderLevel !== undefined) {
      this.handleChangeToImage(ALPHA_MASK_SLIDER_LEVEL, newSelectionState.alphaMaskSliderLevel);
    }
    this.setUserSelectionsInState(newSelectionState);
  }

  onUpdateImageMaskAlpha(sliderValue: number[]) {
    this.setUserSelectionsInState({ alphaMaskSliderLevel: sliderValue });
  }

  onAutorotateChange() {
    this.setUserSelectionsInState({
      autorotate: !this.state.userSelections.autorotate,
    });
  }

  setImageAxisClip(axis: "x" | "y" | "z", minval: number, maxval: number, isOrthoAxis: boolean) {
    if (this.state.view3d && this.state.image) {
      this.state.view3d.setAxisClip(this.state.image, axis, minval, maxval, isOrthoAxis);
    }
  }

  makeUpdatePixelSizeFn(i: number) {
    const { pixelSize } = this.props;
    const imagePixelSize = pixelSize ? pixelSize.slice() : [1, 1, 1];
    return (value: number) => {
      const pixelSize = imagePixelSize.slice();
      pixelSize[i] = value;
      this.state.image?.setVoxelSize(pixelSize);
    };
  }

  // TODO rendering algorithm should become an enum
  onChangeRenderingAlgorithm(newAlgorithm: string) {
    const { userSelections } = this.state;
    // already set
    if (userSelections[newAlgorithm]) {
      return;
    }
    this.setUserSelectionsInState({
      pathTrace: newAlgorithm === PATH_TRACE,
      maxProject: newAlgorithm === MAX_PROJECT,
      autorotate: newAlgorithm === PATH_TRACE ? false : userSelections.autorotate,
    });
    this.handleChangeToImage(PATH_TRACE, newAlgorithm === PATH_TRACE);
    this.handleChangeToImage(MAX_PROJECT, newAlgorithm === MAX_PROJECT);
  }

  // TODO FOV should become an enum too
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

  onApplyColorPresets(presets: ColorArray[]) {
    const { userSelections } = this.state;
    presets.forEach((color, index) => {
      if (index < userSelections.channelSettings.length) {
        this.handleChangeToImage(COLOR, color, index);
      }
    });
    const newChannels = userSelections.channelSettings.map((channel, channelindex) => {
      return presets[channelindex] ? { ...channel, color: presets[channelindex] } : channel;
    });
    this.setUserSelectionsInState({ channelSettings: newChannels });
  }

  changeAxisShowing(showAxes: boolean) {
    this.setUserSelectionsInState({ showAxes });
    this.handleChangeToImage(SHOW_AXES, showAxes);
  }

  changeBoundingBoxShowing(showBoundingBox: boolean) {
    this.setUserSelectionsInState({ showBoundingBox });
    this.handleChangeToImage("showBoundingBox", showBoundingBox);
  }

  changeBoundingBoxColor(color: ColorObject) {
    const boundingBoxColor = colorObjectToArray(color);
    this.setUserSelectionsInState({ boundingBoxColor });
    if (this.state.view3d && this.state.image) {
      const floatColor = colorArrayToFloats(boundingBoxColor);
      this.state.view3d.setBoundingBoxColor(this.state.image, floatColor);
    }
  }

  changeBackgroundColor(color: ColorObject) {
    const backgroundColor = colorObjectToArray(color);
    this.setUserSelectionsInState({ backgroundColor });
    if (this.state.view3d) {
      const floatColor = colorArrayToFloats(backgroundColor);
      this.state.view3d.setBackgroundColor(floatColor);
    }
  }

  onResetCamera() {
    if (this.state.view3d) {
      this.state.view3d.resetCamera();
    }
  }

  updateChannelTransferFunction(index: number, lut: Uint8Array) {
    if (this.state.image) {
      this.state.image.setLut(index, lut);
      if (this.state.view3d) {
        this.state.view3d.updateLuts(this.state.image);
      }
    }
  }

  // TODO use FOV enum?
  beginRequestImage(type?: string) {
    const { fovPath, cellPath, cellId, prevImgPath, nextImgPath, preLoad } = this.props;
    let imageType = type || this.state.userSelections.imageType;
    let path = imageType === FULL_FIELD_IMAGE ? fovPath : cellPath;
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

  getOneChannelSetting(channelName: string, newSettings?: ChannelState[]): ChannelState | undefined {
    const { userSelections } = this.state;
    const channelSettings = newSettings || userSelections.channelSettings;
    return find(channelSettings, (channel) => {
      return channel.name === channelName;
    });
  }

  updateImageVolumeAndSurfacesEnabledFromAppState() {
    const { image, view3d } = this.state;
    // apply channel settings
    // image.channel_names
    if (!image || !view3d) {
      return;
    }
    image.channel_names.forEach((channelName, imageIndex) => {
      if (image.getChannel(imageIndex).loaded) {
        const channelSetting = this.getOneChannelSetting(channelName);
        if (!channelSetting) {
          return;
        }
        const volenabled = channelSetting.volumeEnabled;
        const isoenabled = channelSetting.isosurfaceEnabled;

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

  toggleControlPanel(value: boolean) {
    if (this.props.onControlPanelToggle) {
      this.props.onControlPanelToggle(value);
    }

    this.setUserSelectionsInState({ controlPanelClosed: value });
  }

  getNumberOfSlices(): { x: number; y: number; z: number } {
    if (this.state.image) {
      const { x, y, z } = this.state.image;
      return { x, y, z };
    }
    return { x: 0, y: 0, z: 0 };
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
          collapsedWidth={50}
          trigger={null}
          collapsed={this.state.userSelections.controlPanelClosed}
          width={500}
        >
          <ControlPanel
            renderConfig={renderConfig}
            // image state
            imageName={this.state.image?.name}
            hasImage={!!this.state.image}
            pixelSize={this.state.image ? this.state.image.pixel_size : [1, 1, 1]}
            channelDataChannels={this.state.image?.channels}
            channelGroupedByType={this.state.channelGroupedByType}
            channelDataReady={this.state.channelDataReady}
            // user selections
            maxProjectOn={userSelections.maxProject}
            pathTraceOn={userSelections.pathTrace}
            channelSettings={userSelections.channelSettings}
            mode={userSelections.mode}
            showBoundingBox={userSelections.showBoundingBox}
            backgroundColor={userSelections.backgroundColor}
            boundingBoxColor={userSelections.boundingBoxColor}
            alphaMaskSliderLevel={userSelections.alphaMaskSliderLevel}
            brightnessSliderLevel={userSelections.brightnessSliderLevel}
            densitySliderLevel={userSelections.densitySliderLevel}
            gammaSliderLevel={userSelections.levelsSlider}
            collapsed={this.state.userSelections.controlPanelClosed}
            // functions
            setCollapsed={this.toggleControlPanel}
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
              pathTraceOn={userSelections.pathTrace}
              imageType={userSelections.imageType}
              hasParentImage={!!this.state.fovPath}
              hasCellId={this.state.hasCellId}
              canPathTrace={this.state.view3d ? this.state.view3d.hasWebGL2() : false}
              showAxes={userSelections[SHOW_AXES]}
              showBoundingBox={userSelections.showBoundingBox}
              renderSetting={userSelections.maxProject ? MAX_PROJECT : userSelections.pathTrace ? PATH_TRACE : "volume"}
              onViewModeChange={this.onViewModeChange}
              onResetCamera={this.onResetCamera}
              onAutorotateChange={this.onAutorotateChange}
              onSwitchFovCell={this.onSwitchFovCell}
              onChangeRenderingAlgorithm={this.onChangeRenderingAlgorithm}
              changeAxisShowing={this.changeAxisShowing}
              changeBoundingBoxShowing={this.changeBoundingBoxShowing}
              downloadScreenshot={this.downloadScreenshot}
              renderConfig={renderConfig}
            />
            <CellViewerCanvasWrapper
              image={this.state.image}
              setAxisClip={this.setImageAxisClip}
              mode={userSelections.mode}
              autorotate={userSelections.autorotate}
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
