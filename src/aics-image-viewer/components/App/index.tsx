// 3rd Party Imports
import { Layout } from "antd";
import React from "react";
import { includes, isEqual, find, map, debounce } from "lodash";
import {
  ControlPoint,
  IVolumeLoader,
  JsonImageInfoLoader,
  LoadSpec,
  OMEZarrLoader,
  RENDERMODE_PATHTRACE,
  RENDERMODE_RAYMARCH,
  TiffLoader,
  View3d,
  Volume,
} from "@aics/volume-viewer";

import { AppProps, AppState, UserSelectionChangeHandlers, UserSelectionKey, UserSelectionState } from "./types";
import { controlPointsToLut } from "../../shared/utils/controlPointsToLut";
import {
  ChannelState,
  findFirstChannelMatch,
  makeChannelIndexGrouping,
  ChannelStateKey,
  ChannelStateChangeHandlers,
  ChannelGrouping,
} from "../../shared/utils/viewerChannelSettings";
import { AxisName, IsosurfaceFormat } from "../../shared/types";
import { ImageType, RenderMode, ViewMode } from "../../shared/enums";
import {
  PRESET_COLORS_0,
  ALPHA_MASK_SLIDER_3D_DEFAULT,
  ALPHA_MASK_SLIDER_2D_DEFAULT,
  BRIGHTNESS_SLIDER_LEVEL_DEFAULT,
  DENSITY_SLIDER_LEVEL_DEFAULT,
  LEVELS_SLIDER_DEFAULT,
  BACKGROUND_COLOR_DEFAULT,
  BOUNDING_BOX_COLOR_DEFAULT,
  LUT_MIN_PERCENTILE,
  LUT_MAX_PERCENTILE,
  SINGLE_GROUP_CHANNEL_KEY,
  CONTROL_PANEL_CLOSE_WIDTH,
  INTERPOLATION_ENABLED_DEFAULT,
  AXIS_MARGIN_DEFAULT,
  SCALE_BAR_MARGIN_DEFAULT,
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
    interpolationControl: true,
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
    backgroundColor: BACKGROUND_COLOR_DEFAULT,
    boundingBoxColor: BOUNDING_BOX_COLOR_DEFAULT,
    maskAlpha: ALPHA_MASK_SLIDER_3D_DEFAULT[0],
    brightness: BRIGHTNESS_SLIDER_LEVEL_DEFAULT[0],
    density: DENSITY_SLIDER_LEVEL_DEFAULT[0],
    levels: LEVELS_SLIDER_DEFAULT,
    region: [0, 1, 0, 1, 0, 1], // or ignored if slice is specified with a non-3D mode
    slice: undefined, // or integer slice to show in view mode XY, YZ, or XZ.  mut. ex with region
  },
  baseUrl: "",
  cellId: "",
  cellDownloadHref: "",
  fovDownloadHref: "",
  pixelSize: undefined,
  canvasMargin: "0 0 0 0",
};

export default class App extends React.Component<AppProps, AppState> {
  static defaultProps = defaultProps;
  constructor(props: AppProps) {
    super(props);

    const { viewerConfig } = props;

    let viewmode = ViewMode.threeD;
    let pathtrace = false;
    let maxproject = false;
    if (viewerConfig) {
      if (viewerConfig.mode === "pathtrace") {
        pathtrace = true;
        maxproject = false;
      } else if (viewerConfig.mode === "maxprojection") {
        pathtrace = false;
        maxproject = true;
      } else {
        pathtrace = false;
        maxproject = false;
      }
      if (viewerConfig.view === "XY") {
        viewmode = ViewMode.xy;
      } else if (viewerConfig.view === "YZ") {
        viewmode = ViewMode.yz;
      } else if (viewerConfig.view === "XZ") {
        viewmode = ViewMode.xz;
      }
    }

    this.state = {
      image: null,
      view3d: null,
      sendingQueryRequest: false,
      // channelGroupedByType is an object where channel indexes are grouped by type (observed, segmenations, and countours)
      // {observed: channelIndex[], segmentations: channelIndex[], contours: channelIndex[], other: channelIndex[] }
      channelGroupedByType: {},
      // state set by the UI:
      userSelections: {
        imageType: ImageType.segmentedCell,
        controlPanelClosed: window.innerWidth < CONTROL_PANEL_CLOSE_WIDTH,
        mode: viewmode,
        autorotate: viewerConfig.autorotate,
        showAxes: viewerConfig.showAxes,
        showBoundingBox: viewerConfig.showBoundingBox,
        boundingBoxColor: viewerConfig.boundingBoxColor || BOUNDING_BOX_COLOR_DEFAULT,
        backgroundColor: viewerConfig.backgroundColor || BACKGROUND_COLOR_DEFAULT,
        maxProject: maxproject,
        pathTrace: pathtrace,
        alphaMaskSliderLevel: [viewerConfig.maskAlpha] || ALPHA_MASK_SLIDER_3D_DEFAULT,
        brightnessSliderLevel: [viewerConfig.brightness] || BRIGHTNESS_SLIDER_LEVEL_DEFAULT,
        densitySliderLevel: [viewerConfig.density] || DENSITY_SLIDER_LEVEL_DEFAULT,
        levelsSlider: viewerConfig.levels || LEVELS_SLIDER_DEFAULT,
        interpolationEnabled:
          viewerConfig.interpolationEnabled === undefined
            ? INTERPOLATION_ENABLED_DEFAULT
            : viewerConfig.interpolationEnabled,
        // channelSettings is a flat list of objects of this type:
        // { name, enabled, volumeEnabled, isosurfaceEnabled, isovalue, opacity, color, dataReady}
        channelSettings: [],
      },
      currentlyLoadedImagePath: undefined,
      cachingInProgress: false,
    };

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
    this.changeUserSelection = this.changeUserSelection.bind(this);
    this.updateStateOnLoadImage = this.updateStateOnLoadImage.bind(this);
    this.initializeNewImage = this.initializeNewImage.bind(this);
    this.onView3DCreated = this.onView3DCreated.bind(this);
    this.onClippingPanelVisibleChange = this.onClippingPanelVisibleChange.bind(this);
    this.onClippingPanelVisibleChangeEnd = this.onClippingPanelVisibleChangeEnd.bind(this);
    this.createChannelGrouping = this.createChannelGrouping.bind(this);
    this.beginRequestImage = this.beginRequestImage.bind(this);
    this.getOneChannelSetting = this.getOneChannelSetting.bind(this);
    this.onChangeRenderingAlgorithm = this.onChangeRenderingAlgorithm.bind(this);
    this.onResetCamera = this.onResetCamera.bind(this);
    this.changeBackgroundColor = this.changeBackgroundColor.bind(this);
    this.changeBoundingBoxColor = this.changeBoundingBoxColor.bind(this);
    this.saveScreenshot = this.saveScreenshot.bind(this);
    this.saveIsosurface = this.saveIsosurface.bind(this);
  }

  componentDidMount(): void {
    if (this.state.userSelections.controlPanelClosed && this.props.onControlPanelToggle) {
      this.props.onControlPanelToggle(true);
    }

    const debouncedResizeHandler = debounce(() => this.onWindowResize(), 500);
    window.addEventListener("resize", debouncedResizeHandler);

    if (this.props.cellId) {
      this.beginRequestImage();
    }
  }

  componentDidUpdate(prevProps: AppProps, prevState: AppState): void {
    const { cellId, rawDims, rawData } = this.props;
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
      this.beginRequestImage();
    }

    if (!isEqual(prevProps.transform, this.props.transform)) {
      const { view3d, image } = this.state;
      if (view3d && image) {
        view3d.setVolumeTranslation(image, this.props.transform?.translation || [0, 0, 0]);
        view3d.setVolumeRotation(image, this.props.transform?.rotation || [0, 0, 0]);
      }
    }

    const channelsChanged = !isEqual(userSelections.channelSettings, prevState.userSelections.channelSettings);
    const newImage = this.state.image && !prevState.image;
    const imageChanged = this.state.image && prevState.image && this.state.image.name !== prevState.image.name;
    if (newImage || channelsChanged || imageChanged) {
      this.updateImageVolumeAndSurfacesEnabledFromAppState();
    }
  }

  onView3DCreated(view3d: View3d): void {
    const { userSelections } = this.state;
    view3d.setBackgroundColor(colorArrayToFloats(userSelections.backgroundColor));
    view3d.setShowAxis(userSelections.showAxes);
    view3d.setAxisPosition(...AXIS_MARGIN_DEFAULT);
    view3d.setScaleBarPosition(...SCALE_BAR_MARGIN_DEFAULT);

    this.setState({ view3d });
  }

  setInitialChannelConfig(channelNames: string[], channelColors: ColorArray[]): ChannelState[] {
    return channelNames.map((channel, index) => {
      let color = (channelColors[index] ? channelColors[index].slice() : [226, 205, 179]) as ColorArray; // guard for unexpectedly longer channel list

      return this.initializeOneChannelSetting(null, channel, index, color);
    });
  }

  createChannelGrouping(channels: string[]): ChannelGrouping {
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

  onNewVolumeCreated(aimg: Volume, imageDirectory: string, doResetViewMode: boolean): void {
    // FIXME this calls setState followed almost immediately by another setState... :-(
    const newChannelSettings = this.updateStateOnLoadImage(aimg.imageInfo.channel_names);

    this.setState({
      image: aimg,
      currentlyLoadedImagePath: imageDirectory,
      cachingInProgress: false,
      userSelections: {
        ...this.state.userSelections,
        mode: doResetViewMode ? ViewMode.threeD : this.state.userSelections.mode,
      },
    });
    this.initializeNewImage(aimg, newChannelSettings);
  }

  onNewChannelData(_url: string, v: Volume, channelIndex: number, keepLuts: boolean | undefined): void {
    // const thisChannelSettings = this.getOneChannelSetting(channel.name, newChannelSettings, (channel) => channel.name === obj.channel_names[channelIndex].split('_')[0]);
    const thisChannelSettings = this.getOneChannelSetting(
      v.imageInfo.channel_names[channelIndex],
      // race condition with updateStateOnLoadImage below?
      this.state.userSelections.channelSettings
    );
    this.onChannelDataLoaded(v, thisChannelSettings!, channelIndex, keepLuts);
  }

  handleOpenImageException(_resp: any): void {
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
  }

  openImage(imageDirectory: string, doResetViewMode: boolean, keepLuts?: boolean): void {
    if (imageDirectory === this.state.currentlyLoadedImagePath) {
      return;
    }
    const { baseUrl } = this.props;

    const fullUrl = `${baseUrl}${imageDirectory}`;

    const loadSpec = new LoadSpec();
    loadSpec.url = fullUrl;
    loadSpec.subpath = imageDirectory;

    let loader: IVolumeLoader;
    // if this does NOT end with tif or json,
    // then we assume it's zarr.
    if (fullUrl.endsWith(".json")) {
      loader = new JsonImageInfoLoader();
    } else if (fullUrl.endsWith(".tif") || fullUrl.endsWith(".tiff")) {
      loader = new TiffLoader();
    } else {
      loader = new OMEZarrLoader();
    }

    loader
      .createVolume(loadSpec, (url, v, channelIndex) => {
        this.onNewChannelData(url, v, channelIndex, keepLuts);
      })
      .then((aimg) => {
        this.onNewVolumeCreated(aimg, imageDirectory, doResetViewMode);
      })
      .catch((resp) => this.handleOpenImageException(resp));
  }

  initializeNewImage(aimg: Volume, newChannelSettings?: ChannelState[]): void {
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
      userSelections.imageType === ImageType.segmentedCell && userSelections.mode === ViewMode.threeD
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

    view3d.setMaxProjectMode(aimg, userSelections.maxProject);

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
    view3d.setCameraMode(userSelections.mode);
    view3d.setShowBoundingBox(aimg, userSelections.showBoundingBox);
    view3d.setBoundingBoxColor(aimg, colorArrayToFloats(userSelections.boundingBoxColor));
    // interpolation defaults to enabled in volume-viewer
    if (!userSelections.interpolationEnabled) {
      view3d.setInterpolationEnabled(aimg, false);
    }

    view3d.setVolumeTranslation(aimg, this.props.transform?.translation || [0, 0, 0]);
    view3d.setVolumeRotation(aimg, this.props.transform?.rotation || [0, 0, 0]);
    // tell view that things have changed for this image
    view3d.updateActiveChannels(aimg);
  }

  updateStateOnLoadImage(channelNames: string[]): ChannelState[] {
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

  initializeLut(aimg: Volume, channelIndex: number): ControlPoint[] {
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
  ): void {
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
      aimg.setLut(channelIndex, lut);
      view3d.updateLuts(aimg);
    } else {
      // need to choose initial LUT
      const newControlPoints = this.initializeLut(aimg, channelIndex);
      this.changeOneChannelSetting(thisChannelsSettings.name, channelIndex, "controlPoints", newControlPoints);
    }

    if (view3d) {
      if (aimg.channelNames()[channelIndex] === this.props.viewerChannelSettings?.maskChannelName) {
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

  loadFromRaw(): void {
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

  private channelStateChangeHandlers: ChannelStateChangeHandlers = {
    isovalue: (isovalue, index, view3d, image) => view3d.setVolumeChannelOptions(image, index, { isovalue }),
    colorizeEnabled: (enabled, index, view3d, image) => {
      if (enabled) {
        // TODO get the labelColors from the tf editor component
        const lut = image.getHistogram(index).lutGenerator_labelColors();
        image.setColorPalette(index, lut.lut);
        image.setColorPaletteAlpha(index, this.state.userSelections.channelSettings[index].colorizeAlpha);
      } else {
        image.setColorPaletteAlpha(index, 0);
      }
      view3d.updateLuts(image);
    },
    colorizeAlpha: (alpha, index, view3d, image) => {
      const { colorizeEnabled } = this.state.userSelections.channelSettings[index];
      image.setColorPaletteAlpha(index, colorizeEnabled ? alpha : 0);
      view3d.updateLuts(image);
    },
    opacity: (isosurfaceOpacity, index, view3d, image) =>
      view3d.setVolumeChannelOptions(image, index, { isosurfaceOpacity }),
    color: (color, index, view3d, image) => view3d.setVolumeChannelOptions(image, index, { color }),
  };

  private handleChangeChannelSetting<K extends ChannelStateKey>(
    key: K,
    newValue: ChannelState[K],
    index: number
  ): void {
    const { view3d, image } = this.state;
    if (!view3d || !image) {
      return;
    }
    const handler = this.channelStateChangeHandlers[key];
    if (handler) {
      handler(newValue, index, view3d, image);
    }
  }

  changeOneChannelSetting<K extends ChannelStateKey>(
    channelName: string,
    channelIndex: number,
    keyToChange: K,
    newValue: ChannelState[K]
  ): void {
    const { userSelections } = this.state;
    const newChannels = userSelections.channelSettings.map((channel) => {
      return channel.name === channelName ? { ...channel, [keyToChange]: newValue } : channel;
    });

    this.setUserSelectionsInState({ channelSettings: newChannels });
    this.handleChangeChannelSetting(keyToChange, newValue, channelIndex);
  }

  changeChannelSettings<K extends ChannelStateKey>(indices: number[], keyToChange: K, newValue: ChannelState[K]): void {
    const { userSelections } = this.state;
    const newChannels = userSelections.channelSettings.map((channel, index) => {
      return {
        ...channel,
        [keyToChange]: includes(indices, index) ? newValue : channel[keyToChange],
      };
    });
    this.setUserSelectionsInState({ channelSettings: newChannels });
  }

  setUserSelectionsInState(newState: Partial<UserSelectionState>): void {
    this.setState({
      userSelections: {
        ...this.state.userSelections,
        ...newState,
      },
    });
  }

  private userSelectionChangeHandlers: UserSelectionChangeHandlers = {
    mode: (mode, view3d, _image) => view3d.setCameraMode(mode),
    maxProject: (value, view3d, image) => {
      view3d.setMaxProjectMode(image, value);
      view3d.updateActiveChannels(image);
    },
    pathTrace: (enabled, view3d, image) => {
      view3d.setVolumeRenderMode(enabled ? RENDERMODE_PATHTRACE : RENDERMODE_RAYMARCH);
      view3d.updateActiveChannels(image);
    },

    showAxes: (showing, view3d, _image) => view3d.setShowAxis(showing),
    showBoundingBox: (showing, view3d, image) => view3d.setShowBoundingBox(image, showing),
    boundingBoxColor: (color, view3d, image) => view3d.setBoundingBoxColor(image, colorArrayToFloats(color)),
    backgroundColor: (color, view3d, _image) => view3d.setBackgroundColor(colorArrayToFloats(color)),

    alphaMaskSliderLevel: (value, view3d, image) => {
      view3d.updateMaskAlpha(image, alphaSliderToImageValue(value));
      view3d.updateActiveChannels(image);
    },
    brightnessSliderLevel: (value, view3d, _image) => {
      const brightness = brightnessSliderToImageValue(value, this.state.userSelections.pathTrace);
      view3d.updateExposure(brightness);
    },
    densitySliderLevel: (value, view3d, image) => {
      const density = densitySliderToImageValue(value, this.state.userSelections.pathTrace);
      view3d.updateDensity(image, density);
    },
    levelsSlider: (value, view3d, image) => {
      const imageValues = gammaSliderToImageValues(value);
      view3d.setGamma(image, imageValues.min, imageValues.scale, imageValues.max);
    },
    interpolationEnabled: (enabled, view3d, image) => view3d.setInterpolationEnabled(image, enabled),
  };

  /**
   * Should only be called by internal methods that need to change multiple properties at once
   * without calling multiple `setState`s. Prefer `changeUserSelection` whenever possible.
   */
  private handleChangeUserSelection<K extends UserSelectionKey>(key: K, newValue: UserSelectionState[K]): void {
    const { view3d, image } = this.state;
    if (!view3d || !image) {
      return;
    }
    const handler = this.userSelectionChangeHandlers[key];
    if (handler) {
      handler(newValue, view3d, image);
    }
  }

  changeUserSelection<K extends UserSelectionKey>(key: K, newValue: UserSelectionState[K]): void {
    this.setUserSelectionsInState({ [key]: newValue });
    this.handleChangeUserSelection(key, newValue);
  }

  saveIsosurface(channelIndex: number, type: IsosurfaceFormat): void {
    const { view3d, image } = this.state;
    if (!view3d || !image) {
      return;
    }
    view3d.saveChannelIsosurface(image, channelIndex, type);
  }

  saveScreenshot(): void {
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

  onWindowResize(): void {
    if (window.innerWidth < CONTROL_PANEL_CLOSE_WIDTH) {
      this.toggleControlPanel(true);
    }
  }

  onViewModeChange(newMode: ViewMode): void {
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
        this.onChangeRenderingAlgorithm(RenderMode.volumetric);
      }
    } else if (
      userSelections.mode !== ViewMode.threeD &&
      newMode === ViewMode.threeD &&
      this.state.userSelections.imageType === ImageType.segmentedCell
    ) {
      // switching from 2D to 3D
      newSelectionState = {
        mode: newMode,
        alphaMaskSliderLevel: ALPHA_MASK_SLIDER_3D_DEFAULT,
      };
    }

    this.handleChangeUserSelection("mode", newMode);
    if (newSelectionState.alphaMaskSliderLevel !== undefined) {
      this.handleChangeUserSelection("alphaMaskSliderLevel", newSelectionState.alphaMaskSliderLevel);
    }
    this.setUserSelectionsInState(newSelectionState);
  }

  onUpdateImageMaskAlpha(sliderValue: number[]): void {
    this.setUserSelectionsInState({ alphaMaskSliderLevel: sliderValue });
  }

  onAutorotateChange(): void {
    this.setUserSelectionsInState({
      autorotate: !this.state.userSelections.autorotate,
    });
  }

  setImageAxisClip(axis: AxisName, minval: number, maxval: number, isOrthoAxis: boolean): void {
    if (this.state.view3d && this.state.image) {
      this.state.view3d.setAxisClip(this.state.image, axis, minval, maxval, isOrthoAxis);
    }
  }

  makeUpdatePixelSizeFn(i: number): (value: number) => void {
    const { pixelSize } = this.props;
    const imagePixelSize = pixelSize ? pixelSize.slice() : [1, 1, 1];
    return (value: number) => {
      const pixelSize = imagePixelSize.slice();
      pixelSize[i] = value;
      this.state.image?.setVoxelSize(pixelSize);
    };
  }

  onChangeRenderingAlgorithm(newAlgorithm: RenderMode): void {
    const { userSelections } = this.state;
    // already set
    if (newAlgorithm === RenderMode.volumetric) {
      if (!userSelections.pathTrace && !userSelections.maxProject) {
        return;
      }
    } else if (userSelections[newAlgorithm]) {
      return;
    }
    this.setUserSelectionsInState({
      pathTrace: newAlgorithm === RenderMode.pathTrace,
      maxProject: newAlgorithm === RenderMode.maxProject,
      autorotate: newAlgorithm === RenderMode.pathTrace ? false : userSelections.autorotate,
    });
    this.handleChangeUserSelection("pathTrace", newAlgorithm === RenderMode.pathTrace);
    this.handleChangeUserSelection("maxProject", newAlgorithm === RenderMode.maxProject);
  }

  onSwitchFovCell(value: ImageType): void {
    const { cellPath, fovPath } = this.props;
    const path = value === ImageType.fullField ? fovPath : cellPath;
    this.openImage(path, false, false);
    this.setState({
      sendingQueryRequest: true,
      userSelections: {
        ...this.state.userSelections,
        imageType: value,
      },
    });
  }

  onApplyColorPresets(presets: ColorArray[]): void {
    const { userSelections } = this.state;
    presets.forEach((color, index) => {
      if (index < userSelections.channelSettings.length) {
        this.handleChangeChannelSetting("color", color, index);
      }
    });
    const newChannels = userSelections.channelSettings.map((channel, channelindex) => {
      return presets[channelindex] ? { ...channel, color: presets[channelindex] } : channel;
    });
    this.setUserSelectionsInState({ channelSettings: newChannels });
  }

  changeBoundingBoxColor = (color: ColorObject): void =>
    this.changeUserSelection("boundingBoxColor", colorObjectToArray(color));

  changeBackgroundColor = (color: ColorObject): void =>
    this.changeUserSelection("backgroundColor", colorObjectToArray(color));

  changeAxisShowing = (showing: boolean): void => this.changeUserSelection("showAxes", showing);
  changeBoundingBoxShowing = (showing: boolean): void => this.changeUserSelection("showBoundingBox", showing);

  onResetCamera(): void {
    this.state.view3d?.resetCamera();
  }

  onClippingPanelVisibleChange(open: boolean): void {
    const CLIPPING_PANEL_HEIGHT = 130;

    const { view3d, userSelections } = this.state;
    if (view3d) {
      let axisY = AXIS_MARGIN_DEFAULT[1];
      let scaleBarY = SCALE_BAR_MARGIN_DEFAULT[1];
      if (open) {
        axisY += CLIPPING_PANEL_HEIGHT;
        scaleBarY += CLIPPING_PANEL_HEIGHT;
      }
      view3d.setAxisPosition(AXIS_MARGIN_DEFAULT[0], axisY);
      view3d.setScaleBarPosition(SCALE_BAR_MARGIN_DEFAULT[0], scaleBarY);

      // Hide indicators while clipping panel is in motion - otherwise they pop to the right place prematurely
      view3d.setShowScaleBar(false);
      if (userSelections.showAxes) {
        view3d.setShowAxis(false);
      }
    }
  }

  onClippingPanelVisibleChangeEnd(_open: boolean): void {
    const { view3d, userSelections } = this.state;
    if (view3d) {
      view3d.setShowScaleBar(true);
      if (userSelections.showAxes) {
        view3d.setShowAxis(true);
      }
    }
  }

  updateChannelTransferFunction(index: number, lut: Uint8Array): void {
    if (this.state.image) {
      this.state.image.setLut(index, lut);
      if (this.state.view3d) {
        this.state.view3d.updateLuts(this.state.image);
      }
    }
  }

  beginRequestImage(type?: ImageType): void {
    const { fovPath, cellPath } = this.props;
    let imageType = type || this.state.userSelections.imageType;
    let path = imageType === ImageType.fullField ? fovPath : cellPath;
    this.setState({
      sendingQueryRequest: true,
      userSelections: {
        ...this.state.userSelections,
        imageType,
      },
    });
    this.openImage(path, true);
  }

  getOneChannelSetting(channelName: string, newSettings?: ChannelState[]): ChannelState | undefined {
    const { userSelections } = this.state;
    const channelSettings = newSettings || userSelections.channelSettings;
    return find(channelSettings, (channel) => {
      return channel.name === channelName;
    });
  }

  updateImageVolumeAndSurfacesEnabledFromAppState(): void {
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

  toggleControlPanel(value: boolean): void {
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

  render(): React.ReactNode {
    const { renderConfig, cellDownloadHref, fovDownloadHref, viewerChannelSettings } = this.props;
    const { userSelections } = this.state;
    const { maxProject, pathTrace } = userSelections;
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
            // user selections
            maxProjectOn={userSelections.maxProject}
            pathTraceOn={userSelections.pathTrace}
            channelSettings={userSelections.channelSettings}
            showBoundingBox={userSelections.showBoundingBox}
            backgroundColor={userSelections.backgroundColor}
            boundingBoxColor={userSelections.boundingBoxColor}
            alphaMaskSliderLevel={userSelections.alphaMaskSliderLevel}
            brightnessSliderLevel={userSelections.brightnessSliderLevel}
            densitySliderLevel={userSelections.densitySliderLevel}
            gammaSliderLevel={userSelections.levelsSlider}
            interpolationEnabled={userSelections.interpolationEnabled}
            collapsed={userSelections.controlPanelClosed}
            // functions
            setCollapsed={this.toggleControlPanel}
            saveIsosurface={this.saveIsosurface}
            changeUserSelection={this.changeUserSelection}
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
              hasParentImage={!!this.props.fovPath}
              hasCellId={!!this.props.cellId}
              canPathTrace={this.state.view3d ? this.state.view3d.hasWebGL2() : false}
              showAxes={userSelections.showAxes}
              showBoundingBox={userSelections.showBoundingBox}
              renderSetting={
                maxProject ? RenderMode.maxProject : pathTrace ? RenderMode.pathTrace : RenderMode.volumetric
              }
              onViewModeChange={this.onViewModeChange}
              onResetCamera={this.onResetCamera}
              onAutorotateChange={this.onAutorotateChange}
              onSwitchFovCell={this.onSwitchFovCell}
              onChangeRenderingAlgorithm={this.onChangeRenderingAlgorithm}
              changeAxisShowing={this.changeAxisShowing}
              changeBoundingBoxShowing={this.changeBoundingBoxShowing}
              downloadScreenshot={this.saveScreenshot}
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
              onClippingPanelVisibleChange={this.onClippingPanelVisibleChange}
              onClippingPanelVisibleChangeEnd={this.onClippingPanelVisibleChangeEnd}
            />
          </Content>
        </Layout>
      </Layout>
    );
  }
}
