// 3rd Party Imports
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Layout } from "antd";
import {
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

import {
  AppProps,
  ShowControls,
  GlobalViewerSettings,
  ViewerSettingUpdater,
  ViewerSettingChangeHandlers,
  UseImageEffectType,
} from "./types";
import { controlPointsToLut, initializeLut } from "../../shared/utils/controlPointsToLut";
import {
  ChannelState,
  findFirstChannelMatch,
  makeChannelIndexGrouping,
  ChannelGrouping,
  ChannelSettingUpdater,
  MultipleChannelSettingsUpdater,
} from "../../shared/utils/viewerChannelSettings";
import { activeAxisMap, AxisName, IsosurfaceFormat, MetadataRecord, PerAxis } from "../../shared/types";
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
  CONTROL_PANEL_CLOSE_WIDTH,
  INTERPOLATION_ENABLED_DEFAULT,
  AXIS_MARGIN_DEFAULT,
  SCALE_BAR_MARGIN_DEFAULT,
} from "../../shared/constants";

import ChannelUpdater from "./ChannelUpdater";
import ControlPanel from "../ControlPanel";
import Toolbar from "../Toolbar";
import CellViewerCanvasWrapper from "../CellViewerCanvasWrapper";

import "../../assets/styles/globals.css";
import {
  gammaSliderToImageValues,
  densitySliderToImageValue,
  brightnessSliderToImageValue,
  alphaSliderToImageValue,
} from "../../shared/utils/sliderValuesToImageValues";
import { ColorArray, colorArrayToFloats } from "../../shared/utils/colorRepresentations";

import "./styles.css";
import { debounce } from "lodash";

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

const defaultShownControls: ShowControls = {
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

const defaultViewerSettings: GlobalViewerSettings = {
  viewMode: ViewMode.threeD, // "XY", "XZ", "YZ"
  renderMode: RenderMode.volumetric, // "pathtrace", "maxproject"
  imageType: ImageType.segmentedCell,
  showAxes: false,
  showBoundingBox: false,
  backgroundColor: BACKGROUND_COLOR_DEFAULT,
  boundingBoxColor: BOUNDING_BOX_COLOR_DEFAULT,
  autorotate: false,
  maskAlpha: ALPHA_MASK_SLIDER_3D_DEFAULT,
  brightness: BRIGHTNESS_SLIDER_LEVEL_DEFAULT,
  density: DENSITY_SLIDER_LEVEL_DEFAULT,
  levels: LEVELS_SLIDER_DEFAULT,
  interpolationEnabled: INTERPOLATION_ENABLED_DEFAULT,
  region: { x: [0, 1], y: [0, 1], z: [0, 1] },
};

const defaultProps: AppProps = {
  // rawData has a "dtype" which is expected to be "uint8", a "shape":[c,z,y,x] and a "buffer" which is a DataView
  rawData: undefined,
  // rawDims is the volume dims that normally come from a json file
  rawDims: undefined,

  appHeight: "100vh",
  cellPath: "",
  fovPath: "",
  showControls: defaultShownControls,
  viewerSettings: defaultViewerSettings,
  baseUrl: "",
  cellId: "",
  cellDownloadHref: "",
  fovDownloadHref: "",
  pixelSize: undefined,
  canvasMargin: "0 0 0 0",
};

/** A `useState` that also creates a getter function for breaking through closures */
function useStateWithGetter<T>(initialState: T): [T, (value: T) => void, () => T] {
  const [state, setState] = useState(initialState);
  const stateRef = useRef(initialState);
  const wrappedSetState = useCallback((value: T) => {
    stateRef.current = value;
    setState(value);
  }, []);
  const getState = useCallback(() => stateRef.current, []);
  return [state, wrappedSetState, getState];
}

const App: React.FC<AppProps> = (props) => {
  props = { ...defaultProps, ...props };

  // State management /////////////////////////////////////////////////////////

  // TODO is there a better API for values that never change?
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [view3d, _setView3d] = useState(() => new View3d());
  const [image, setImage] = useState<Volume | null>(null);

  const getNumberOfSlices = (): PerAxis<number> => {
    if (image) {
      const { x, y, z } = image;
      return { x, y, z };
    }
    return { x: 0, y: 0, z: 0 };
  };

  // State for image loading/reloading

  // `true` when image data has been requested, but no data has been received yet
  const [sendingQueryRequest, setSendingQueryRequest] = useState(false);
  // `true` when all channels of the current image are loaded
  const [imageLoaded, setImageLoaded] = useState(false);
  // `true` when the image being loaded is related to the previous one, so some settings should be preserved
  const [switchingFov, setSwitchingFov] = useState(false);
  // tracks which channels have been loaded
  const [loadedChannels, setLoadedChannels, getLoadedChannels] = useStateWithGetter<boolean[]>([]);
  // tracks the url of the current image, to keep us from reloading an image that is already open
  const [currentlyLoadedImagePath, setCurrentlyLoadedImagePath] = useState<string | undefined>(undefined);

  const [channelGroupedByType, setChannelGroupedByType] = useState<ChannelGrouping>({});
  const [controlPanelClosed, setControlPanelClosed] = useState(() => window.innerWidth < CONTROL_PANEL_CLOSE_WIDTH);

  // These are the major parts of `App` state
  // `viewerSettings` represents global state, while `channelSettings` represents per-channel state
  const [viewerSettings, setViewerSettings] = useState<GlobalViewerSettings>(() => ({
    ...defaultViewerSettings,
    ...props.viewerSettings,
  }));
  // `channelSettings` gets a getter to break through stale closures when loading images.
  // (`openImage` creates a closure to call back whenever a new channel is loaded, which sets this state.
  // To do this it requires access to the current state value, not the one it closed over)
  const [channelSettings, setChannelSettings, getChannelSettings] = useStateWithGetter<ChannelState[]>([]);

  // Some viewer settings require custom change behaviors to guard against entering an illegal state.
  // (e.g. autorotate must not be on in pathtrace mode.) Those behaviors are defined here.
  const viewerSettingsChangeHandlers: ViewerSettingChangeHandlers = {
    viewMode: (prevSettings, viewMode) => {
      if (viewMode === prevSettings.viewMode) {
        return prevSettings;
      }
      const newSettings: GlobalViewerSettings = {
        ...prevSettings,
        viewMode,
        region: { x: [0, 1], y: [0, 1], z: [0, 1] },
      };
      const activeAxis = activeAxisMap[viewMode];

      // TODO the following behavior/logic is very specific to a particular application's needs
      // and is not necessarily appropriate for a general viewer.
      // Why should the alpha setting matter whether we are viewing the primary image
      // or its parent?

      // If switching between 2D and 3D reset alpha mask to default (off in in 2D, 50% in 3D)
      // If full field, dont mask

      if (activeAxis) {
        // switching to 2d
        const slices = Math.max(1, getNumberOfSlices()[activeAxis]);
        newSettings.region[activeAxis] = [0, 1 / slices];
        if (prevSettings.viewMode === ViewMode.threeD) {
          // Switching from 3D to 2D
          newSettings.maskAlpha = ALPHA_MASK_SLIDER_2D_DEFAULT;
          // if path trace was enabled in 3D turn it off when switching to 2D.
          if (newSettings.renderMode === RenderMode.pathTrace) {
            newSettings.renderMode = RenderMode.volumetric;
          }
        }
      } else if (prevSettings.viewMode !== ViewMode.threeD && prevSettings.imageType === ImageType.segmentedCell) {
        newSettings.maskAlpha = ALPHA_MASK_SLIDER_3D_DEFAULT;
      }
      return newSettings;
    },
    imageType: (prevSettings, imageType) => {
      setSwitchingFov(true);
      return { ...prevSettings, imageType };
    },
    renderMode: (prevSettings, renderMode) => ({
      ...prevSettings,
      renderMode,
      autorotate: renderMode === RenderMode.pathTrace ? false : prevSettings.autorotate,
    }),
    autorotate: (prevSettings, autorotate) => ({
      ...prevSettings,
      // The button should theoretically be unclickable while in pathtrace mode, but this provides extra security
      autorotate: prevSettings.renderMode === RenderMode.pathTrace ? false : autorotate,
    }),
  };

  const changeViewerSetting = useCallback<ViewerSettingUpdater>(
    (key, value) => {
      const changeHandler = viewerSettingsChangeHandlers[key];
      if (changeHandler) {
        setViewerSettings(changeHandler(viewerSettings, value));
      } else {
        setViewerSettings({ ...viewerSettings, [key]: value });
      }
    },
    [viewerSettings, image]
  );

  const changeChannelSetting = useCallback<ChannelSettingUpdater>(
    (index, key, value) => {
      const newChannelSettings = channelSettings.slice();
      newChannelSettings[index] = { ...newChannelSettings[index], [key]: value };
      setChannelSettings(newChannelSettings);
    },
    [channelSettings]
  );

  const applyColorPresets = useCallback(
    (presets: ColorArray[]): void => {
      const newChannelSettings = channelSettings.map((channel, idx) =>
        presets[idx] ? { ...channel, color: presets[idx] } : channel
      );
      setChannelSettings(newChannelSettings);
    },
    [channelSettings]
  );

  const changeMultipleChannelSettings = useCallback<MultipleChannelSettingsUpdater>(
    (indices, key, value) => {
      const newChannelSettings = channelSettings.map((settings, idx) =>
        indices.includes(idx) ? { ...settings, [key]: value } : settings
      );
      setChannelSettings(newChannelSettings);
    },
    [channelSettings]
  );

  // These last state functions are only ever used within this component - no need for a `useCallback`
  const resetOneChannelSetting = (index: number, settings: ChannelState): void => {
    const newSettings = getChannelSettings().slice();
    newSettings[index] = settings;
    setChannelSettings(newSettings);
  };

  const getOneChannelSetting = (channelName: string, settings?: ChannelState[]): ChannelState | undefined => {
    return (settings || getChannelSettings()).find((channel) => channel.name === channelName);
  };

  const setOneChannelLoaded = (index: number): void => {
    const newLoadedChannels = getLoadedChannels().slice();
    newLoadedChannels[index] = true;
    setLoadedChannels(newLoadedChannels);
  };

  // Image loading/initialization functions ///////////////////////////////////

  const onChannelDataLoaded = (
    aimg: Volume,
    thisChannelsSettings: ChannelState,
    channelIndex: number,
    keepLuts?: boolean
  ): ChannelState => {
    let updatedChannelSettings = thisChannelsSettings;

    // if we want to keep the current control points
    // TODO this function is never called with `keepLuts = true`. Should it ever be? On FOV switch e.g.?
    if (thisChannelsSettings.controlPoints && keepLuts) {
      const lut = controlPointsToLut(thisChannelsSettings.controlPoints);
      aimg.setLut(channelIndex, lut);
      view3d.updateLuts(aimg);
    } else {
      // need to choose initial LUT
      const newControlPoints = initializeLut(aimg, channelIndex, props.viewerChannelSettings);
      updatedChannelSettings = { ...thisChannelsSettings, controlPoints: newControlPoints };
    }

    if (aimg.channelNames()[channelIndex] === props.viewerChannelSettings?.maskChannelName) {
      view3d.setVolumeChannelAsMask(aimg, channelIndex);
    }

    // when any channel data has arrived:
    setSendingQueryRequest(false);
    setOneChannelLoaded(channelIndex);
    if (aimg.isLoaded()) {
      view3d.updateActiveChannels(aimg);
      setImageLoaded(true);
      setSwitchingFov(false);
    }

    return updatedChannelSettings;
  };

  const initializeOneChannelSetting = (
    aimg: Volume | null,
    channel: string,
    index: number,
    defaultColor: ColorArray
  ): ChannelState => {
    const { viewerChannelSettings } = props;
    let color = defaultColor;
    let volumeEnabled = false;
    let surfaceEnabled = false;

    // note that this modifies aimg also
    const newControlPoints = aimg ? initializeLut(aimg, index) : undefined;

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
      controlPoints: newControlPoints || [],
    };
  };

  const setChannelStateForNewImage = (channelNames: string[]): ChannelState[] | undefined => {
    const settingsAreEqual = channelNames.every((name, idx) => name === channelSettings[idx]?.name);
    if (settingsAreEqual) {
      return channelSettings;
    }

    // TODO this function's behavior has changed to not recreate channel groupings on every load
    //   verify that this doesn't impact anything
    //   in fact... should creating channel groupings be its own effect, to change on `viewerChannelSettings`?
    setChannelGroupedByType(makeChannelIndexGrouping(channelNames, props.viewerChannelSettings));

    const newChannelSettings = channelNames.map((channel, index) => {
      const color = (INIT_COLORS[index] ? INIT_COLORS[index].slice() : [226, 205, 179]) as ColorArray;
      return initializeOneChannelSetting(null, channel, index, color);
    });
    // TODO could be this shouldn't set state...? leave it to per-channel setters?
    setChannelSettings(newChannelSettings);
    return newChannelSettings;
  };

  const placeImageInViewer = (aimg: Volume, newChannelSettings?: ChannelState[]): void => {
    const channelSetting = newChannelSettings || channelSettings;
    view3d.removeAllVolumes();
    view3d.addVolume(aimg, {
      channels: aimg.channel_names.map((name) => {
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
  };

  const onNewVolumeCreated = (aimg: Volume, imageDirectory: string, doResetViewMode: boolean): ChannelState[] => {
    const channelNames = aimg.imageInfo.channel_names;
    const newChannelSettings = setChannelStateForNewImage(channelNames);

    setImage(aimg);
    setLoadedChannels(new Array(channelNames.length).fill(false));
    setCurrentlyLoadedImagePath(imageDirectory);
    changeViewerSetting("viewMode", doResetViewMode ? ViewMode.threeD : viewerSettings.viewMode);

    placeImageInViewer(aimg, newChannelSettings);
    return newChannelSettings!;
  };

  const openImage = async (): Promise<void> => {
    const { fovPath, cellPath, baseUrl } = props;
    const path = viewerSettings.imageType === ImageType.fullField ? fovPath : cellPath;
    const fullUrl = `${baseUrl}${path}`;

    if (path === currentlyLoadedImagePath) {
      return;
    }

    setSendingQueryRequest(true);
    setImageLoaded(false);

    const loadSpec = new LoadSpec();
    loadSpec.url = fullUrl;
    loadSpec.subpath = path;

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

    const aimg = await loader.createVolume(loadSpec, (_url, v, channelIndex) => {
      // NOTE: this callback runs *after* `onNewVolumeCreated` below, for every loaded channel
      const thisChannelSettings = getOneChannelSetting(v.imageInfo.channel_names[channelIndex]);
      const newChannelSettings = onChannelDataLoaded(v, thisChannelSettings!, channelIndex);
      if (thisChannelSettings === newChannelSettings) return;
      resetOneChannelSetting(channelIndex, newChannelSettings);
    });

    onNewVolumeCreated(aimg, path, !switchingFov);
  };

  const loadFromRaw = (): void => {
    const { rawData, rawDims } = props;
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
      return initializeOneChannelSetting(aimg, channel, index, color);
    });

    let channelGroupedByType = makeChannelIndexGrouping(rawDims.channel_names);

    const channelSetting = newChannelSettings;

    let alphaLevel =
      viewerSettings.viewMode === ViewMode.threeD ? ALPHA_MASK_SLIDER_3D_DEFAULT : ALPHA_MASK_SLIDER_2D_DEFAULT;

    // Here is where we officially hand the image to the volume-viewer
    placeImageInViewer(aimg, newChannelSettings);

    setImage(aimg);
    setChannelGroupedByType(channelGroupedByType);
    setChannelSettings(channelSetting);
    changeViewerSetting("maskAlpha", alphaLevel);
  };

  // Imperative callbacks /////////////////////////////////////////////////////

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
    (open: boolean): void => {
      const CLIPPING_PANEL_HEIGHT = 130;

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
      if (viewerSettings.showAxes) {
        view3d.setShowAxis(false);
      }
    },
    [viewerSettings.showAxes]
  );

  const onClippingPanelVisibleChangeEnd = useCallback(
    (_open: boolean): void => {
      view3d.setShowScaleBar(true);
      if (viewerSettings.showAxes) {
        view3d.setShowAxis(true);
      }
    },
    [viewerSettings.showAxes]
  );

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
    view3d.setAxisPosition(...AXIS_MARGIN_DEFAULT);
    view3d.setScaleBarPosition(...SCALE_BAR_MARGIN_DEFAULT);

    const onResize = (): void => {
      if (window.innerWidth < CONTROL_PANEL_CLOSE_WIDTH) {
        setControlPanelClosed(true);
      }
    };
    const onResizeDebounced = debounce(onResize, 500);

    window.addEventListener("resize", onResizeDebounced);
    return () => window.removeEventListener("resize", onResizeDebounced);
  }, []);

  // Hook to trigger image load: on mount, when `cellId` changes, when `imageType` changes
  useEffect(() => {
    if (props.rawDims && props.rawData) {
      loadFromRaw();
    } else {
      openImage();
    }
  }, [props.cellId, viewerSettings.imageType, props.rawDims, props.rawData]);

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

  // Custom effect hook for viewer updates that depend on `image`, so we don't have to repeatedly null-check it
  const useImageEffect: UseImageEffectType = (effect, deps) => {
    useEffect(() => {
      if (image && imageLoaded) {
        return effect(image);
      }
    }, [...deps, image, imageLoaded]);
  };

  // Effects to imperatively sync `viewerSettings` to `view3d`

  useImageEffect(
    (_image) => {
      view3d.setCameraMode(viewerSettings.viewMode);
      view3d.resize(null);
    },
    [viewerSettings.viewMode]
  );

  useImageEffect((_image) => view3d.setAutoRotate(viewerSettings.autorotate), [viewerSettings.autorotate]);

  useImageEffect((_image) => view3d.setShowAxis(viewerSettings.showAxes), [viewerSettings.showAxes]);

  useImageEffect(
    (_image) => view3d.setBackgroundColor(colorArrayToFloats(viewerSettings.backgroundColor)),
    [viewerSettings.backgroundColor]
  );

  useImageEffect(
    (image) => view3d.setBoundingBoxColor(image, colorArrayToFloats(viewerSettings.boundingBoxColor)),
    [viewerSettings.boundingBoxColor]
  );

  useImageEffect(
    (image) => view3d.setShowBoundingBox(image, viewerSettings.showBoundingBox),
    [viewerSettings.showBoundingBox]
  );

  useImageEffect(
    (image) => {
      const { renderMode } = viewerSettings;
      view3d.setMaxProjectMode(image, renderMode === RenderMode.maxProject);
      view3d.setVolumeRenderMode(renderMode === RenderMode.pathTrace ? RENDERMODE_PATHTRACE : RENDERMODE_RAYMARCH);
      view3d.updateActiveChannels(image);
    },
    [viewerSettings.renderMode]
  );

  useImageEffect(
    (image) => {
      view3d.updateMaskAlpha(image, alphaSliderToImageValue(viewerSettings.maskAlpha));
      view3d.updateActiveChannels(image);
    },
    [viewerSettings.maskAlpha]
  );

  useImageEffect(
    (_image) => {
      const isPathTracing = viewerSettings.renderMode === RenderMode.pathTrace;
      const brightness = brightnessSliderToImageValue(viewerSettings.brightness, isPathTracing);
      view3d.updateExposure(brightness);
    },
    [viewerSettings.brightness]
  );

  useImageEffect(
    (image) => {
      const isPathTracing = viewerSettings.renderMode === RenderMode.pathTrace;
      const density = densitySliderToImageValue(viewerSettings.density, isPathTracing);
      view3d.updateDensity(image, density);
    },
    [viewerSettings.density]
  );

  useImageEffect(
    (image) => {
      const imageValues = gammaSliderToImageValues(viewerSettings.levels);
      view3d.setGamma(image, imageValues.min, imageValues.scale, imageValues.max);
    },
    [viewerSettings.levels]
  );

  useImageEffect(
    (image) => view3d.setInterpolationEnabled(image, viewerSettings.interpolationEnabled),
    [viewerSettings.interpolationEnabled]
  );

  useImageEffect(
    (image) => view3d.setVolumeTranslation(image, props.transform?.translation || [0, 0, 0]),
    [props.transform?.translation]
  );

  useImageEffect(
    (image) => view3d.setVolumeRotation(image, props.transform?.rotation || [0, 0, 0]),
    [props.transform?.rotation]
  );

  const usePerAxisClippingUpdater = (axis: AxisName, [minval, maxval]: [number, number]): void => {
    useImageEffect(
      (image) => {
        const isOrthoAxis = activeAxisMap[viewerSettings.viewMode] === axis;
        view3d.setAxisClip(image, axis, minval - 0.5, maxval - 0.5, isOrthoAxis);
      },
      [minval, maxval]
    );
  };
  usePerAxisClippingUpdater("x", viewerSettings.region.x);
  usePerAxisClippingUpdater("y", viewerSettings.region.y);
  usePerAxisClippingUpdater("z", viewerSettings.region.z);

  // Rendering ////////////////////////////////////////////////////////////////

  const showControls = { ...defaultShownControls, ...props.showControls };

  return (
    <Layout className="cell-viewer-app" style={{ height: props.appHeight }}>
      {channelSettings.map((channelState, index) => (
        <ChannelUpdater
          key={`${index}_${channelState.name}`}
          {...{ channelState, index }}
          view3d={view3d}
          image={image}
          channelLoaded={loadedChannels[index]}
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
          showControls={showControls}
          // image state
          imageName={image?.name}
          imageLoaded={imageLoaded}
          hasImage={!!image}
          pixelSize={image ? image.pixel_size : [1, 1, 1]}
          channelDataChannels={image?.channels}
          channelGroupedByType={channelGroupedByType}
          // user selections
          pathTraceOn={viewerSettings.renderMode === RenderMode.pathTrace}
          channelSettings={channelSettings}
          showBoundingBox={viewerSettings.showBoundingBox}
          backgroundColor={viewerSettings.backgroundColor}
          boundingBoxColor={viewerSettings.boundingBoxColor}
          maskAlpha={viewerSettings.maskAlpha}
          brightness={viewerSettings.brightness}
          density={viewerSettings.density}
          levels={viewerSettings.levels}
          interpolationEnabled={viewerSettings.interpolationEnabled}
          collapsed={controlPanelClosed}
          // functions
          changeViewerSetting={changeViewerSetting}
          setCollapsed={setControlPanelClosed}
          saveIsosurface={saveIsosurface}
          onApplyColorPresets={applyColorPresets}
          changeChannelSetting={changeChannelSetting}
          changeMultipleChannelSettings={changeMultipleChannelSettings}
          viewerChannelSettings={props.viewerChannelSettings}
          getMetadata={getMetadata}
        />
      </Sider>
      <Layout className="cell-viewer-wrapper" style={{ margin: props.canvasMargin }}>
        <Content>
          <Toolbar
            viewMode={viewerSettings.viewMode}
            fovDownloadHref={props.fovDownloadHref}
            cellDownloadHref={props.cellDownloadHref}
            autorotate={viewerSettings.autorotate}
            imageType={viewerSettings.imageType}
            hasParentImage={!!props.fovPath}
            hasCellId={!!props.cellId}
            canPathTrace={view3d ? view3d.hasWebGL2() : false}
            showAxes={viewerSettings.showAxes}
            showBoundingBox={viewerSettings.showBoundingBox}
            renderMode={viewerSettings.renderMode}
            resetCamera={resetCamera}
            downloadScreenshot={saveScreenshot}
            changeViewerSetting={changeViewerSetting}
            showControls={showControls}
          />
          <CellViewerCanvasWrapper
            view3d={view3d}
            image={image}
            viewMode={viewerSettings.viewMode}
            autorotate={viewerSettings.autorotate}
            loadingImage={sendingQueryRequest}
            numSlices={getNumberOfSlices()}
            region={viewerSettings.region}
            appHeight={props.appHeight}
            showControls={showControls}
            changeViewerSetting={changeViewerSetting}
            onClippingPanelVisibleChange={onClippingPanelVisibleChange}
            onClippingPanelVisibleChangeEnd={onClippingPanelVisibleChangeEnd}
          />
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;
