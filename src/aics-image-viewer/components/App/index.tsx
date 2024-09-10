// 3rd Party Imports
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Layout } from "antd";
import { Box3, Vector3 } from "three";
import { debounce } from "lodash";
import {
  CreateLoaderOptions,
  LoadSpec,
  VolumeLoaderContext,
  RENDERMODE_PATHTRACE,
  RENDERMODE_RAYMARCH,
  View3d,
  Volume,
  IVolumeLoader,
  PrefetchDirection,
  VolumeFileFormat,
  ControlPoint,
} from "@aics/volume-viewer";

import type { AppProps, ControlVisibilityFlags, UseImageEffectType } from "./types";
import type { ChannelState } from "../ViewerStateProvider/types";

import { useStateWithGetter, useConstructor } from "../../shared/utils/hooks";
import {
  controlPointsToRamp,
  getDefaultLut,
  initializeLut,
  rampToControlPoints,
  remapControlPointsForChannel,
} from "../../shared/utils/controlPointsToLut";
import {
  findFirstChannelMatch,
  makeChannelIndexGrouping,
  ChannelGrouping,
  ViewerChannelSettings,
  ViewerChannelSetting,
} from "../../shared/utils/viewerChannelSettings";
import { activeAxisMap, AxisName, IsosurfaceFormat, MetadataRecord, PerAxis } from "../../shared/types";
import { ImageType, RenderMode, ViewMode } from "../../shared/enums";
import {
  PRESET_COLORS_0,
  CONTROL_PANEL_CLOSE_WIDTH,
  AXIS_MARGIN_DEFAULT,
  SCALE_BAR_MARGIN_DEFAULT,
  CACHE_MAX_SIZE,
  QUEUE_MAX_SIZE,
  QUEUE_MAX_LOW_PRIORITY_SIZE,
  getDefaultChannelState,
  getDefaultViewerState,
} from "../../shared/constants";
import PlayControls from "../../shared/utils/playControls";

import { ViewerStateContext } from "../ViewerStateProvider";
import ChannelUpdater from "./ChannelUpdater";
import ControlPanel from "../ControlPanel";
import Toolbar from "../Toolbar";
import CellViewerCanvasWrapper from "../CellViewerCanvasWrapper";
import StyleProvider from "../StyleProvider";
import { useErrorAlert } from "../ErrorAlert";

import "../../assets/styles/globals.css";
import { ColorArray, colorArrayToFloats } from "../../shared/utils/colorRepresentations";
import {
  gammaSliderToImageValues,
  densitySliderToImageValue,
  brightnessSliderToImageValue,
  alphaSliderToImageValue,
} from "../../shared/utils/sliderValuesToImageValues";
import { matchesSavedSubregion } from "../../shared/utils/viewerState";

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

const defaultVisibleControls: ControlVisibilityFlags = {
  alphaMaskSlider: true,
  autoRotateButton: true,
  axisClipSliders: true,
  brightnessSlider: true,
  backgroundColorPicker: true,
  boundingBoxColorPicker: true,
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
  metadataViewer: true,
};

const defaultProps: AppProps = {
  // rawData has a "dtype" which is expected to be "uint8", a "shape":[c,z,y,x] and a "buffer" which is a DataView
  rawData: undefined,
  // rawDims is the volume dims that normally come from a json file
  rawDims: undefined,

  imageUrl: "",
  parentImageUrl: "",

  appHeight: "100vh",
  visibleControls: defaultVisibleControls,
  viewerSettings: getDefaultViewerState(),
  cellId: "",
  imageDownloadHref: "",
  parentImageDownloadHref: "",
  pixelSize: undefined,
  canvasMargin: "0 0 0 0",
  view3dRef: undefined,
};

const axisToLoaderPriority: Record<AxisName | "t", PrefetchDirection> = {
  t: PrefetchDirection.T_PLUS,
  z: PrefetchDirection.Z_PLUS,
  y: PrefetchDirection.Y_PLUS,
  x: PrefetchDirection.X_PLUS,
};

const initializeOneChannelSetting = (
  channel: string,
  index: number,
  defaultColor: ColorArray,
  viewerChannelSettings?: ViewerChannelSettings,
  defaultChannelState = getDefaultChannelState()
): ChannelState => {
  let initSettings = {} as Partial<ViewerChannelSetting>;
  if (viewerChannelSettings) {
    // search for channel in settings using groups, names and match values
    initSettings = findFirstChannelMatch(channel, index, viewerChannelSettings) ?? {};
  }

  return {
    name: initSettings.name ?? channel ?? "Channel " + index,
    volumeEnabled: initSettings.enabled ?? defaultChannelState.volumeEnabled,
    isosurfaceEnabled: initSettings.surfaceEnabled ?? defaultChannelState.isosurfaceEnabled,
    colorizeEnabled: initSettings.colorizeEnabled ?? defaultChannelState.colorizeEnabled,
    colorizeAlpha: initSettings.colorizeAlpha ?? defaultChannelState.colorizeAlpha,
    isovalue: initSettings.isovalue ?? defaultChannelState.isovalue,
    opacity: initSettings.surfaceOpacity ?? defaultChannelState.opacity,
    color: colorHexToArray(initSettings.color ?? "") ?? defaultColor,
    useControlPoints: initSettings.controlPointsEnabled ?? defaultChannelState.useControlPoints,
    controlPoints: initSettings.controlPoints ?? defaultChannelState.controlPoints,
    ramp: initSettings.ramp ?? defaultChannelState.ramp,
    needsDefaultLut: !initSettings.controlPoints && !initSettings.ramp && !initSettings.lut,
  };
};

const setIndicatorPositions = (view3d: View3d, panelOpen: boolean, hasTime: boolean): void => {
  const CLIPPING_PANEL_HEIGHT = 150;
  // Move scale bars this far to the left when showing time series, to make room for timestep indicator
  const SCALE_BAR_TIME_SERIES_OFFSET = 120;

  let axisY = AXIS_MARGIN_DEFAULT[1];
  let [scaleBarX, scaleBarY] = SCALE_BAR_MARGIN_DEFAULT;
  if (panelOpen) {
    // Move indicators up out of the way of the clipping panel
    axisY += CLIPPING_PANEL_HEIGHT;
    scaleBarY += CLIPPING_PANEL_HEIGHT;
  }
  if (hasTime) {
    // Move scale bar left out of the way of timestep indicator
    scaleBarX += SCALE_BAR_TIME_SERIES_OFFSET;
    // Make sure the timestep indicator is showing
    view3d.setShowTimestepIndicator(true);
  }

  view3d.setAxisPosition(AXIS_MARGIN_DEFAULT[0], axisY);
  view3d.setTimestepIndicatorPosition(SCALE_BAR_MARGIN_DEFAULT[0], scaleBarY);
  view3d.setScaleBarPosition(scaleBarX, scaleBarY);
};

const App: React.FC<AppProps> = (props) => {
  props = { ...defaultProps, ...props };

  // State management /////////////////////////////////////////////////////////

  const viewerState = useContext(ViewerStateContext).ref;
  const {
    channelSettings,
    setChannelSettings,
    changeViewerSetting,
    changeChannelSetting,
    applyColorPresets,
    setSavedChannelState,
    getSavedChannelState,
    onChannelLoaded,
    getSavedSubregionSize,
    setSavedSubregionSize,
  } = viewerState.current;

  const view3d = useConstructor(() => new View3d());
  if (props.view3dRef !== undefined) {
    props.view3dRef.current = view3d;
  }
  const loadContext = useConstructor(
    () => new VolumeLoaderContext(CACHE_MAX_SIZE, QUEUE_MAX_SIZE, QUEUE_MAX_LOW_PRIORITY_SIZE)
  );
  const loader = useRef<IVolumeLoader>();
  const [image, setImage] = useState<Volume | null>(null);
  const imageUrlRef = useRef<string | string[]>("");

  const [errorAlert, _showError] = useErrorAlert();
  const showError = (error: unknown): void => {
    _showError(error);
    setSendingQueryRequest(false);
  };

  useEffect(() => {
    // Get notifications of loading errors which occur after the initial load, e.g. on time change or new channel load
    view3d.setLoadErrorHandler((_vol, e) => showError(e));
    return () => view3d.setLoadErrorHandler(undefined);
  }, [view3d]);

  const numSlices: PerAxis<number> = image?.imageInfo.volumeSize ?? { x: 0, y: 0, z: 0 };
  const numSlicesLoaded: PerAxis<number> = image?.imageInfo.subregionSize ?? { x: 0, y: 0, z: 0 };
  const numTimesteps = image?.imageInfo.times ?? 1;

  // State for image loading/reloading

  // `true` when this is the initial load of an image
  const initialLoadRef = useRef(true);
  // `true` when image data has been requested, but no data has been received yet
  const [sendingQueryRequest, setSendingQueryRequest] = useState(false);
  // `true` when all channels of the current image are loaded
  const [imageLoaded, setImageLoaded] = useState(false);
  // tracks which channels have been loaded
  const [channelVersions, setChannelVersions, getChannelVersions] = useStateWithGetter<number[]>([]);
  // we need to keep track of channel ranges for remapping
  const channelRangesRef = useRef<([number, number] | undefined)[]>([]);

  const [channelGroupedByType, setChannelGroupedByType] = useState<ChannelGrouping>({});
  const [controlPanelClosed, setControlPanelClosed] = useState(() => window.innerWidth < CONTROL_PANEL_CLOSE_WIDTH);
  // Only allow auto-close once while the screen is too narrow.
  const [hasAutoClosedControlPanel, setHasAutoClosedControlPanel] = useState(false);

  // Clipping panel state doesn't need to trigger renders on change, so it can go in a ref
  const clippingPanelOpenRef = useRef(true);

  // `PlayControls` manages playing through time and spatial axes, which isn't practical with "pure" React
  // Playback state goes here, but the play/pause buttons that mainly control this class are down in `AxisClipSliders`
  const playControls = useConstructor(() => new PlayControls());
  const [playingAxis, setPlayingAxis] = useState<AxisName | "t" | null>(null);
  playControls.onPlayingAxisChanged = (axis) => {
    loader.current?.setPrefetchPriority(axis ? [axisToLoaderPriority[axis]] : []);
    loader.current?.syncMultichannelLoading(axis ? true : false);
    if (image) {
      if (axis === null) {
        // Playback has stopped - reset scale level bias
        view3d.setScaleLevelBias(image, 0);
      } else {
        // Playback has started - unless entire axis is in memory (typical in X and Y), downlevel to speed things up
        const shouldDownlevel = axis === "t" || numSlices[axis] !== numSlicesLoaded[axis];
        view3d.setScaleLevelBias(image, shouldDownlevel ? 1 : 0);
      }
    }
    setPlayingAxis(axis);
  };

  // These last state functions are only ever used within this component - no need for a `useCallback`

  const getOneChannelSetting = (channelName: string, settings?: ChannelState[]): ChannelState | undefined => {
    return (settings || viewerState.current.channelSettings).find((channel) => channel.name === channelName);
  };

  const setAllChannelsUnloaded = (numberOfChannels: number): void => {
    setChannelVersions(new Array(numberOfChannels).fill(0));
  };

  const setOneChannelLoaded = (index: number): void => {
    const newVersions = getChannelVersions().slice();
    newVersions[index]++;
    setChannelVersions(newVersions);
  };

  // Image loading/initialization functions ///////////////////////////////////

  const onChannelDataLoaded = (aimg: Volume, thisChannelsSettings: ChannelState, channelIndex: number): void => {
    const thisChannel = aimg.getChannel(channelIndex);

    let currentControlPoints: ControlPoint[] = [];

    if (thisChannelsSettings.needsDefaultLut) {
      const lut = getDefaultLut(aimg.getHistogram(channelIndex));
      currentControlPoints = lut.controlPoints;
      changeChannelSetting(channelIndex, "controlPoints", currentControlPoints);
      changeChannelSetting(channelIndex, "ramp", controlPointsToRamp(currentControlPoints));
      changeChannelSetting(channelIndex, "needsDefaultLut", false);
    } else if (initialLoadRef.current || !thisChannelsSettings.controlPoints || !thisChannelsSettings.ramp) {
      // If this is the first load of this image, auto-generate initial LUTs
      const { ramp, controlPoints } = initializeLut(aimg, channelIndex, props.viewerChannelSettings);
      currentControlPoints = controlPoints;
      changeChannelSetting(channelIndex, "controlPoints", controlPoints);
      changeChannelSetting(channelIndex, "ramp", controlPointsToRamp(ramp));
    } else {
      // try not to update lut from here if we are in play mode
      // if (playingAxis !== null) {
      // do nothing here?
      // tell gui that we have updated control pts?
      //changeChannelSetting(channelIndex, "controlPoints", aimg.getChannel(channelIndex).lut.controlPoints);
      // }
      const oldRange = channelRangesRef.current[channelIndex];
      if (thisChannelsSettings.useControlPoints) {
        // control points were just automatically remapped - update in state
        changeChannelSetting(channelIndex, "controlPoints", thisChannel.lut.controlPoints);
        // now manually remap ramp using the channel's old range
        const controlPoints = rampToControlPoints(thisChannelsSettings.ramp);
        const newControlPoints = remapControlPointsForChannel(controlPoints, oldRange, thisChannel);
        currentControlPoints = newControlPoints;
        changeChannelSetting(channelIndex, "ramp", controlPointsToRamp(newControlPoints));
      } else {
        // ramp was just automatically remapped - update in state
        const ramp = controlPointsToRamp(thisChannel.lut.controlPoints);
        changeChannelSetting(channelIndex, "ramp", ramp);
        // now manually remap control points using the channel's old range
        const { controlPoints } = thisChannelsSettings;
        const newControlPoints = remapControlPointsForChannel(controlPoints, oldRange, thisChannel);
        currentControlPoints = newControlPoints;
        changeChannelSetting(channelIndex, "controlPoints", newControlPoints);
      }
    }

    // Save the first loaded channel's volume subregion as our reference for resetting channel states.
    if (!getSavedSubregionSize()) {
      setSavedSubregionSize(aimg.imageInfo.subregionSize.clone());
    }
    // If we haven't saved the initial state for this channel yet and this is the same
    // time and initial subregion, add the control points and ramp to the saved channel state.
    const savedChannelState = getSavedChannelState(channelIndex);
    if (
      !savedChannelState &&
      viewerSettings.time === aimg.loadSpec.time &&
      matchesSavedSubregion(getSavedSubregionSize(), aimg.imageInfo.subregionSize)
    ) {
      const newState = {
        ...thisChannelsSettings,
        ramp: controlPointsToRamp(currentControlPoints),
        controlPoints: currentControlPoints,
        needsDefaultLut: false,
      };
      setSavedChannelState(channelIndex, newState);
    }
    // Callback to notify the viewer state that a channel has loaded.
    onChannelLoaded(aimg, channelIndex);

    // save the channel's new range for remapping next time
    channelRangesRef.current[channelIndex] = [thisChannel.rawMin, thisChannel.rawMax];

    view3d.updateLuts(aimg);
    view3d.onVolumeData(aimg, [channelIndex]);

    view3d.setVolumeChannelEnabled(aimg, channelIndex, thisChannelsSettings.volumeEnabled);
    if (aimg.channelNames[channelIndex] === props.viewerChannelSettings?.maskChannelName) {
      view3d.setVolumeChannelAsMask(aimg, channelIndex);
    }

    // when any channel data has arrived:
    setSendingQueryRequest(false);
    setOneChannelLoaded(channelIndex);
    if (aimg.isLoaded()) {
      view3d.updateActiveChannels(aimg);
      setImageLoaded(true);
      initialLoadRef.current = false;
      playControls.onImageLoaded();
    }
  };

  const setChannelStateForNewImage = (channelNames: string[]): ChannelState[] | undefined => {
    const grouping = makeChannelIndexGrouping(channelNames, props.viewerChannelSettings);
    setChannelGroupedByType(grouping);

    const settingsAreEqual = channelNames.every((name, idx) => name === channelSettings[idx]?.name);
    if (settingsAreEqual) {
      return channelSettings;
    }

    const newChannelSettings = channelNames.map((channel, index) => {
      const color = (INIT_COLORS[index] ? INIT_COLORS[index].slice() : [226, 205, 179]) as ColorArray;
      const channelState = initializeOneChannelSetting(channel, index, color, props.viewerChannelSettings);
      // Save settings for channels that are disabled by default; enabled channels
      // will be loaded at startup and channel settings will be saved then.
      if (!channelState.volumeEnabled && !channelState.isosurfaceEnabled) {
        // TODO: This gives unexpected control points after a reset if a channel has `lut`
        // set in the URL but is disabled at startup.
        setSavedChannelState(index, { ...channelState });
      }
      return channelState;
    });
    setChannelSettings(newChannelSettings);
    return newChannelSettings;
  };

  const placeImageInViewer = (aimg: Volume, newChannelSettings?: ChannelState[]): void => {
    setImage(aimg);

    const channelSetting = newChannelSettings || channelSettings;
    view3d.removeAllVolumes();
    view3d.addVolume(aimg, {
      // Immediately passing down channel parameters isn't strictly necessary, but keeps things looking saner on load
      channels: aimg.channelNames.map((name) => {
        const ch = getOneChannelSetting(name, channelSetting);
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

    setIndicatorPositions(view3d, clippingPanelOpenRef.current, aimg.imageInfo.times > 1);
    imageLoadHandlers.current.forEach((effect) => effect(aimg));

    playControls.stepAxis = (axis: AxisName | "t") => {
      if (axis === "t") {
        changeViewerSetting("time", (viewerState.current.time + 1) % aimg.imageInfo.times);
      } else {
        const max = aimg.imageInfo.volumeSize[axis];
        const current = viewerState.current.slice[axis] * max;
        changeViewerSetting("slice", { ...viewerState.current.slice, [axis]: ((current + 1) % max) / max });
      }
    };
    playControls.getVolumeIsLoaded = () => aimg.isLoaded();

    view3d.updateActiveChannels(aimg);
  };

  const openImage = async (): Promise<void> => {
    const { imageUrl, parentImageUrl, rawData, rawDims } = props;
    const showParentImage = viewerState.current.imageType === ImageType.fullField && parentImageUrl !== undefined;
    const path = showParentImage ? parentImageUrl : imageUrl;
    // Don't reload if we're already looking at this image
    if (path === imageUrlRef.current && !rawData && !rawDims) {
      return;
    }

    setSendingQueryRequest(true);
    setImageLoaded(false);
    initialLoadRef.current = true;

    const loadSpec = new LoadSpec();
    loadSpec.time = viewerState.current.time;

    // if this does NOT end with tif or json,
    // then we assume it's zarr.
    await loadContext.onOpen();

    const options: Partial<CreateLoaderOptions> = {};
    if (rawData && rawDims) {
      options.fileType = VolumeFileFormat.DATA;
      options.rawArrayOptions = { data: rawData, metadata: rawDims };
    }

    let aimg: Volume;
    try {
      loader.current = await loadContext.createLoader(path, { ...options });

      aimg = await loader.current.createVolume(loadSpec, (v, channelIndex) => {
        // NOTE: this callback runs *after* `onNewVolumeCreated` below, for every loaded channel
        // TODO is this search by name necessary or will the `channelIndex` passed to the callback always match state?
        const thisChannelSettings = getOneChannelSetting(v.imageInfo.channelNames[channelIndex]);
        onChannelDataLoaded(v, thisChannelSettings!, channelIndex);
      });
    } catch (e) {
      showError(e);
      throw e;
    }

    const channelNames = aimg.imageInfo.channelNames;
    const newChannelSettings = setChannelStateForNewImage(channelNames);
    setAllChannelsUnloaded(channelNames.length);
    channelRangesRef.current = new Array(channelNames.length).fill(undefined);

    const requiredLoadspec = new LoadSpec();
    requiredLoadspec.time = viewerState.current.time;

    if (viewerSettings.viewMode === ViewMode.xy) {
      const slice = viewerSettings.slice;
      requiredLoadspec.subregion = new Box3(new Vector3(0, 0, slice.z), new Vector3(1, 1, slice.z));
    }

    // initiate loading only after setting up new channel settings,
    // in case the loader callback fires before the state is set
    loader.current.loadVolumeData(aimg, requiredLoadspec).catch((e) => {
      showError(e);
      throw e;
    });

    imageUrlRef.current = path;
    placeImageInViewer(aimg, newChannelSettings);
  };

  // Imperative callbacks /////////////////////////////////////////////////////

  const viewerSettings = viewerState.current;

  const saveIsosurface = useCallback(
    (channelIndex: number, type: IsosurfaceFormat): void => {
      if (image) view3d.saveChannelIsosurface(image, channelIndex, type);
    },
    [image]
  );

  const saveScreenshot = useCallback((): void => {
    view3d.capture((dataUrl: string) => {
      const anchor = document.createElement("a");
      anchor.href = dataUrl;
      anchor.download = "screenshot.png";
      anchor.click();
    });
  }, []);

  const resetCamera = useCallback((): void => view3d.resetCamera(), []);

  const onClippingPanelVisibleChange = useCallback(
    (panelOpen: boolean, hasTime: boolean): void => {
      clippingPanelOpenRef.current = panelOpen;
      setIndicatorPositions(view3d, panelOpen, hasTime);

      // Hide indicators while clipping panel is in motion - otherwise they pop to the right place prematurely
      view3d.setShowScaleBar(false);
      view3d.setShowTimestepIndicator(false);
      view3d.setShowAxis(false);
    },
    [viewerSettings.showAxes]
  );

  const onClippingPanelVisibleChangeEnd = useCallback((): void => {
    view3d.setShowScaleBar(true);
    view3d.setShowTimestepIndicator(true);
    if (viewerSettings.showAxes) {
      view3d.setShowAxis(true);
    }
  }, [viewerSettings.showAxes]);

  const getMetadata = useCallback((): MetadataRecord => {
    const { metadata, metadataFormatter } = props;

    let imageMetadata = image?.imageMetadata as MetadataRecord;
    if (imageMetadata && metadataFormatter) {
      imageMetadata = metadataFormatter(imageMetadata);
    }

    if (imageMetadata && Object.keys(imageMetadata).length > 0) {
      return { Image: imageMetadata, ...metadata };
    } else {
      return metadata || {};
    }
  }, [props.metadata, props.metadataFormatter, image]);

  // Effects //////////////////////////////////////////////////////////////////

  // On mount
  useEffect(() => {
    const onResize = (): void => {
      if (window.innerWidth < CONTROL_PANEL_CLOSE_WIDTH) {
        if (!hasAutoClosedControlPanel) {
          setControlPanelClosed(true);
          setHasAutoClosedControlPanel(true);
        }
      } else {
        setHasAutoClosedControlPanel(false);
      }
    };
    const onResizeDebounced = debounce(onResize, 500);

    window.addEventListener("resize", onResizeDebounced);
    return () => window.removeEventListener("resize", onResizeDebounced);
  }, [hasAutoClosedControlPanel]);

  // one-time init after view3d exists and before we start loading images
  useEffect(() => {
    view3d.setCameraMode(viewerSettings.viewMode);
  }, []);

  // Hook to trigger image load: on mount, when image source props/state change (`cellId`, `imageType`, `rawData`, etc)
  useEffect(() => {
    openImage();
  }, [props.imageUrl, props.cellId, viewerSettings.imageType, props.rawDims, props.rawData]);

  useEffect(
    () => props.onControlPanelToggle && props.onControlPanelToggle(controlPanelClosed),
    [controlPanelClosed, props.onControlPanelToggle]
  );

  useEffect(() => {
    // delayed for the animation to finish
    window.setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 200);
  }, [controlPanelClosed]);

  /** Custom effect hook for viewer updates that depend on `image`, so we don't have to repeatedly null-check it */
  const useImageEffect: UseImageEffectType = (effect, deps) => {
    useEffect(() => {
      if (image && imageLoaded) {
        return effect(image);
      }
    }, [...deps, image, imageLoaded]);
  };

  const imageLoadHandlers = useRef<((image: Volume) => void)[]>([]);
  imageLoadHandlers.current = [];
  /** `ImageEffect`s that also run right on image creation, so the image doesn't first render with default settings */
  const useImageLoadEffect: UseImageEffectType = (effect, deps) => {
    useImageEffect(effect, deps);
    imageLoadHandlers.current.push(effect);
  };

  // Effects to imperatively sync `viewerSettings` to `view3d`
  useImageEffect(
    (_currentImage) => {
      view3d.setCameraMode(viewerSettings.viewMode);
      view3d.resize(null);
    },
    [viewerSettings.viewMode]
  );

  useImageEffect(
    (_currentImage) => {
      if (viewerSettings.cameraState) {
        view3d.setCameraState(viewerSettings.cameraState);
      }
    },
    [viewerSettings.cameraState]
  );

  useImageEffect((_currentImage) => view3d.setAutoRotate(viewerSettings.autorotate), [viewerSettings.autorotate]);

  useImageEffect((_currentImage) => view3d.setShowAxis(viewerSettings.showAxes), [viewerSettings.showAxes]);

  useImageEffect(
    (_currentImage) => view3d.setBackgroundColor(colorArrayToFloats(viewerSettings.backgroundColor)),
    [viewerSettings.backgroundColor]
  );

  useImageEffect(
    (currentImage) => view3d.setBoundingBoxColor(currentImage, colorArrayToFloats(viewerSettings.boundingBoxColor)),
    [viewerSettings.boundingBoxColor]
  );

  useImageEffect(
    (currentImage) => view3d.setShowBoundingBox(currentImage, viewerSettings.showBoundingBox),
    [viewerSettings.showBoundingBox]
  );

  useImageEffect(
    (image) => {
      // Check whether any channels are marked to be reset to the default LUT.
      for (let i = 0; i < channelSettings.length; i++) {
        const channel = channelSettings[i];
        if (channel.needsDefaultLut && image.isLoaded()) {
          const lut = getDefaultLut(image.getHistogram(i));
          changeChannelSetting(i, "controlPoints", lut.controlPoints);
          changeChannelSetting(i, "ramp", controlPointsToRamp(lut.controlPoints));
          changeChannelSetting(i, "needsDefaultLut", false);
        }
      }
    },
    [channelSettings]
  );

  useImageLoadEffect(
    (currentImage) => {
      const { renderMode } = viewerSettings;
      view3d.setMaxProjectMode(currentImage, renderMode === RenderMode.maxProject);
      view3d.setVolumeRenderMode(renderMode === RenderMode.pathTrace ? RENDERMODE_PATHTRACE : RENDERMODE_RAYMARCH);
      view3d.updateActiveChannels(currentImage);
    },
    [viewerSettings.renderMode]
  );

  useImageEffect(
    (currentImage) => {
      view3d.updateMaskAlpha(currentImage, alphaSliderToImageValue(viewerSettings.maskAlpha));
      view3d.updateActiveChannels(currentImage);
    },
    [viewerSettings.maskAlpha]
  );

  useImageLoadEffect(
    (_currentImage) => {
      const isPathTracing = viewerSettings.renderMode === RenderMode.pathTrace;
      const brightness = brightnessSliderToImageValue(viewerSettings.brightness, isPathTracing);
      view3d.updateExposure(brightness);
    },
    [viewerSettings.brightness]
  );

  useImageLoadEffect(
    (currentImage) => {
      const isPathTracing = viewerSettings.renderMode === RenderMode.pathTrace;
      const density = densitySliderToImageValue(viewerSettings.density, isPathTracing);
      view3d.updateDensity(currentImage, density);
    },
    [viewerSettings.density]
  );

  useImageLoadEffect(
    (currentImage) => {
      const imageValues = gammaSliderToImageValues(viewerSettings.levels);
      view3d.setGamma(currentImage, imageValues.min, imageValues.scale, imageValues.max);
    },
    [viewerSettings.levels]
  );

  // `time` is special: because syncing it requires a load, it cannot be dependent on `image`
  useEffect(() => {
    if (image) {
      setSendingQueryRequest(true);
      setAllChannelsUnloaded(image.numChannels);
      view3d.setTime(image, viewerSettings.time);
    }
  }, [viewerSettings.time]);

  useImageLoadEffect(
    (currentImage) => view3d.setInterpolationEnabled(currentImage, viewerSettings.interpolationEnabled),
    [viewerSettings.interpolationEnabled]
  );

  useImageLoadEffect(
    (currentImage) => view3d.setVolumeTranslation(currentImage, props.transform?.translation || [0, 0, 0]),
    [props.transform?.translation]
  );

  useImageLoadEffect(
    (currentImage) => view3d.setVolumeRotation(currentImage, props.transform?.rotation || [0, 0, 0]),
    [props.transform?.rotation]
  );

  const usePerAxisClippingUpdater = (axis: AxisName, [minval, maxval]: [number, number], slice: number): void => {
    useImageEffect(
      // Logic to determine axis clipping range, for each of x,y,z,3d slider:
      // if slider was same as active axis view mode:  [viewerSettings.slice[axis], viewerSettings.slice[axis] + 1.0/volumeSize[axis]]
      // if in 3d mode: viewerSettings.region[axis]
      // else: [0,1]
      (currentImage) => {
        let isOrthoAxis = false;
        let axismin = 0.0;
        let axismax = 1.0;
        if (viewerSettings.viewMode === ViewMode.threeD) {
          axismin = minval;
          axismax = maxval;
          isOrthoAxis = false;
        } else {
          isOrthoAxis = activeAxisMap[viewerSettings.viewMode] === axis;
          const oneSlice = 1 / currentImage.imageInfo.volumeSize[axis];
          axismin = isOrthoAxis ? slice : 0.0;
          axismax = isOrthoAxis ? slice + oneSlice : 1.0;
          if (axis === "z" && viewerSettings.viewMode === ViewMode.xy) {
            view3d.setZSlice(currentImage, Math.floor(slice * currentImage.imageInfo.volumeSize.z));
            if (!currentImage.isLoaded()) {
              setImageLoaded(false);
            }
          }
        }
        // view3d wants the coordinates in the -0.5 to 0.5 range
        view3d.setAxisClip(currentImage, axis, axismin - 0.5, axismax - 0.5, isOrthoAxis);
        view3d.setCameraMode(viewerSettings.viewMode);
      },
      [minval, maxval, slice, viewerSettings.viewMode]
    );
  };

  usePerAxisClippingUpdater("x", viewerSettings.region.x, viewerSettings.slice.x);
  usePerAxisClippingUpdater("y", viewerSettings.region.y, viewerSettings.slice.y);
  usePerAxisClippingUpdater("z", viewerSettings.region.z, viewerSettings.slice.z);

  // Rendering ////////////////////////////////////////////////////////////////

  const visibleControls = useMemo(
    (): ControlVisibilityFlags => ({ ...defaultVisibleControls, ...props.visibleControls }),
    [props.visibleControls]
  );
  const pixelSize = useMemo(
    (): [number, number, number] => (image ? image.imageInfo.physicalPixelSize.toArray() : [1, 1, 1]),
    [image?.imageInfo.physicalPixelSize]
  );

  return (
    <StyleProvider>
      {errorAlert}
      <Layout className="cell-viewer-app" style={{ height: props.appHeight }}>
        {channelSettings.map((channelState, index) => (
          <ChannelUpdater
            key={`${index}_${channelState.name}`}
            {...{ channelState, index }}
            view3d={view3d}
            image={image}
            version={channelVersions[index]}
          />
        ))}
        <Sider
          className="control-panel-holder"
          collapsible={true}
          defaultCollapsed={false}
          collapsedWidth={50}
          trigger={null}
          collapsed={controlPanelClosed}
          width={500}
        >
          <ControlPanel
            visibleControls={visibleControls}
            collapsed={controlPanelClosed}
            // image state
            imageName={image?.name}
            hasImage={!!image}
            pixelSize={pixelSize}
            channelDataChannels={image?.channels}
            channelGroupedByType={channelGroupedByType}
            // functions
            setCollapsed={setControlPanelClosed}
            saveIsosurface={saveIsosurface}
            onApplyColorPresets={applyColorPresets}
            viewerChannelSettings={props.viewerChannelSettings}
            getMetadata={getMetadata}
          />
        </Sider>
        <Layout className="cell-viewer-wrapper" style={{ margin: props.canvasMargin }}>
          <Content>
            <Toolbar
              fovDownloadHref={props.parentImageDownloadHref}
              cellDownloadHref={props.imageDownloadHref}
              hasParentImage={!!props.parentImageUrl}
              hasCellId={!!props.cellId}
              canPathTrace={view3d ? view3d.hasWebGL2() : false}
              resetCamera={resetCamera}
              downloadScreenshot={saveScreenshot}
              visibleControls={visibleControls}
            />
            <CellViewerCanvasWrapper
              view3d={view3d}
              image={image}
              loadingImage={sendingQueryRequest}
              numSlices={numSlices}
              numSlicesLoaded={numSlicesLoaded}
              numTimesteps={numTimesteps}
              playControls={playControls}
              playingAxis={playingAxis}
              appHeight={props.appHeight}
              visibleControls={visibleControls}
              onClippingPanelVisibleChange={onClippingPanelVisibleChange}
              onClippingPanelVisibleChangeEnd={onClippingPanelVisibleChangeEnd}
            />
          </Content>
        </Layout>
      </Layout>
    </StyleProvider>
  );
};

export default App;
