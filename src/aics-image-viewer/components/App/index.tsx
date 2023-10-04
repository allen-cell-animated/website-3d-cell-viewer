// 3rd Party Imports
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Layout } from "antd";
import { debounce } from "lodash";
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
  VolumeCache,
} from "@aics/volume-viewer";

import {
  AppProps,
  ShowControls,
  GlobalViewerSettings,
  ViewerSettingUpdater,
  ViewerSettingChangeHandlers,
  UseImageEffectType,
} from "./types";
import { useStateWithGetter, useConstructor } from "../../shared/utils/hooks";
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
  ALPHA_MASK_SLIDER_DEFAULT,
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
  maskAlpha: ALPHA_MASK_SLIDER_DEFAULT,
  brightness: BRIGHTNESS_SLIDER_LEVEL_DEFAULT,
  density: DENSITY_SLIDER_LEVEL_DEFAULT,
  levels: LEVELS_SLIDER_DEFAULT,
  interpolationEnabled: INTERPOLATION_ENABLED_DEFAULT,
  region: { x: [0, 1], y: [0, 1], z: [0, 1] },
  time: 0,
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
  }

  view3d.setAxisPosition(AXIS_MARGIN_DEFAULT[0], axisY);
  view3d.setTimestepIndicatorPosition(SCALE_BAR_MARGIN_DEFAULT[0], scaleBarY);
  view3d.setScaleBarPosition(scaleBarX, scaleBarY);
};

const App: React.FC<AppProps> = (props) => {
  props = { ...defaultProps, ...props };

  // State management /////////////////////////////////////////////////////////

  // TODO is there a better API for values that never change?
  const view3d = useConstructor(() => new View3d());
  const volumeCache = useConstructor(() => new VolumeCache());
  const [image, setImage] = useState<Volume | null>(null);
  const imageUrlRef = useRef<string>("");

  const getNumberOfSlices = (): PerAxis<number> => {
    if (image) {
      const { x, y, z } = image.imageInfo.volumeSize;
      return { x, y, z };
    }
    return { x: 0, y: 0, z: 0 };
  };
  const numberOfTimesteps = image?.imageInfo.times || 1;

  // State for image loading/reloading

  // `true` when image data has been requested, but no data has been received yet
  const [sendingQueryRequest, setSendingQueryRequest] = useState(false);
  // `true` when all channels of the current image are loaded
  const [imageLoaded, setImageLoaded] = useState(false);
  // `true` when the image being loaded is related to the previous one, so some settings should be preserved
  const [switchingFov, setSwitchingFov] = useState(false);
  // tracks which channels have been loaded
  const [channelVersions, setChannelVersions, getChannelVersions] = useStateWithGetter<number[]>([]);

  const [channelGroupedByType, setChannelGroupedByType] = useState<ChannelGrouping>({});
  const [controlPanelClosed, setControlPanelClosed] = useState(() => window.innerWidth < CONTROL_PANEL_CLOSE_WIDTH);
  // Clipping panel state doesn't need to trigger renders on change, so it can go in a ref
  const clippingPanelOpenRef = useRef(true);

  // These are the major parts of `App` state
  // `viewerSettings` represents global state, while `channelSettings` represents per-channel state
  const [viewerSettings, setViewerSettings, getViewerSettings] = useStateWithGetter<GlobalViewerSettings>(() => ({
    ...defaultViewerSettings,
    ...props.viewerSettings,
  }));
  // `channelSettings` gets a getter to break through stale closures when loading images.
  // (`openImage` creates a closure to call back whenever a new channel is loaded, which sets this state.
  // To do this it requires access to the current state value, not the one it closed over)
  const [channelSettings, setChannelSettings, getChannelSettings] = useStateWithGetter<ChannelState[]>([]);

  // Some viewer settings require custom change behaviors to change related settings simultaneously or guard against
  // entering an illegal state (e.g. autorotate must not be on in pathtrace mode). Those behaviors are defined here.
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
        const middleSlice = Math.floor(slices / 2);
        newSettings.region[activeAxis] = [middleSlice / slices, (middleSlice + 1) / slices];
        if (prevSettings.viewMode === ViewMode.threeD && newSettings.renderMode === RenderMode.pathTrace) {
          // Switching from 3D to 2D
          // if path trace was enabled in 3D turn it off when switching to 2D.
          newSettings.renderMode = RenderMode.volumetric;
        }
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
        setViewerSettings(changeHandler(getViewerSettings(), value));
      } else {
        setViewerSettings({ ...getViewerSettings(), [key]: value });
      }
    },
    [viewerSettings, image]
  );

  const changeChannelSetting = useCallback<ChannelSettingUpdater>(
    (index, key, value) => {
      const newChannelSettings = getChannelSettings().slice();
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

  const getOneChannelSetting = (channelName: string, settings?: ChannelState[]): ChannelState | undefined => {
    return (settings || getChannelSettings()).find((channel) => channel.name === channelName);
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

  const onChannelDataLoaded = (
    aimg: Volume,
    thisChannelsSettings: ChannelState,
    channelIndex: number,
    keepLuts = false
  ): void => {
    // if we want to keep the current control points
    if (thisChannelsSettings.controlPoints && keepLuts) {
      const lut = controlPointsToLut(thisChannelsSettings.controlPoints);
      aimg.setLut(channelIndex, lut);
    } else {
      // need to choose initial LUT
      const newControlPoints = initializeLut(aimg, channelIndex, props.viewerChannelSettings);
      changeChannelSetting(channelIndex, "controlPoints", newControlPoints);
    }
    view3d.updateLuts(aimg);
    view3d.onVolumeData(aimg, [channelIndex]);

    if (aimg.channelNames[channelIndex] === props.viewerChannelSettings?.maskChannelName) {
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
    const grouping = makeChannelIndexGrouping(channelNames, props.viewerChannelSettings);
    setChannelGroupedByType(grouping);

    const settingsAreEqual = channelNames.every((name, idx) => name === channelSettings[idx]?.name);
    if (settingsAreEqual) {
      return channelSettings;
    }

    const newChannelSettings = channelNames.map((channel, index) => {
      const color = (INIT_COLORS[index] ? INIT_COLORS[index].slice() : [226, 205, 179]) as ColorArray;
      return initializeOneChannelSetting(null, channel, index, color);
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

    view3d.updateActiveChannels(aimg);
  };

  const openImage = async (): Promise<void> => {
    const { fovPath, cellPath, baseUrl } = props;
    const path = viewerSettings.imageType === ImageType.fullField ? fovPath : cellPath;
    const fullUrl = `${baseUrl}${path}`;

    // If this is the same image at a different time, keep luts. If same image at same time, don't bother reloading.
    const samePath = fullUrl === imageUrlRef.current;
    // future TODO: check for whether multiresolution level (subpath) would be different too.
    if (samePath && viewerSettings.time === image?.loadSpec.time) {
      return;
    }

    setSendingQueryRequest(true);
    setImageLoaded(false);

    const loadSpec = new LoadSpec();
    loadSpec.time = viewerSettings.time;

    // if this does NOT end with tif or json,
    // then we assume it's zarr.
    let loader: IVolumeLoader;
    if (fullUrl.endsWith(".json")) {
      loader = new JsonImageInfoLoader(fullUrl, volumeCache);
    } else if (fullUrl.endsWith(".tif") || fullUrl.endsWith(".tiff")) {
      loader = new TiffLoader(fullUrl);
    } else {
      loader = new OMEZarrLoader(fullUrl, volumeCache);
    }

    const aimg = await loader.createVolume(loadSpec, (v, channelIndex) => {
      // NOTE: this callback runs *after* `onNewVolumeCreated` below, for every loaded channel
      // TODO is this search by name necessary or will the `channelIndex` passed to the callback always match state?
      const thisChannelSettings = getOneChannelSetting(v.imageInfo.channelNames[channelIndex]);
      onChannelDataLoaded(v, thisChannelSettings!, channelIndex, samePath);
    });
    loader.loadVolumeData(aimg);

    const channelNames = aimg.imageInfo.channelNames;
    const newChannelSettings = setChannelStateForNewImage(channelNames);

    setAllChannelsUnloaded(channelNames.length);

    // if this image is completely unrelated to the previous image, switch view mode
    if (!switchingFov && !samePath) {
      changeViewerSetting("viewMode", ViewMode.threeD);
    }

    imageUrlRef.current = fullUrl;
    placeImageInViewer(aimg, newChannelSettings);
  };

  const loadFromRaw = (): void => {
    const { rawData, rawDims } = props;
    if (!rawData || !rawDims) {
      console.error("ERROR loadFromRaw called without rawData or rawDims being set");
      return;
    }

    const aimg = new Volume(rawDims);
    const volsize = rawData.shape[1] * rawData.shape[2] * rawData.shape[3];
    for (let i = 0; i < rawDims.numChannels; ++i) {
      aimg.setChannelDataFromVolume(i, new Uint8Array(rawData.buffer.buffer, i * volsize, volsize));
    }

    let channelSetting = rawDims.channelNames.map((channel, index) => {
      let color = (INIT_COLORS[index] ? INIT_COLORS[index].slice() : [226, 205, 179]) as ColorArray; // guard for unexpectedly longer channel list
      return initializeOneChannelSetting(aimg, channel, index, color);
    });

    setChannelGroupedByType(makeChannelIndexGrouping(rawDims.channelNames, props.viewerChannelSettings));
    setChannelSettings(channelSetting);

    // Here is where we officially hand the image to the volume-viewer
    placeImageInViewer(aimg, channelSetting);
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
        setControlPanelClosed(true);
      }
    };
    const onResizeDebounced = debounce(onResize, 500);

    window.addEventListener("resize", onResizeDebounced);
    return () => window.removeEventListener("resize", onResizeDebounced);
  }, []);

  // Hook to trigger image load: on mount, when image source props/state change (`cellId`, `imageType`, `time`)
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

  const usePerAxisClippingUpdater = (axis: AxisName, [minval, maxval]: [number, number]): void => {
    useImageEffect(
      (currentImage) => {
        const isOrthoAxis = activeAxisMap[viewerSettings.viewMode] === axis;
        view3d.setAxisClip(currentImage, axis, minval - 0.5, maxval - 0.5, isOrthoAxis);
      },
      [minval, maxval]
    );
  };
  usePerAxisClippingUpdater("x", viewerSettings.region.x);
  usePerAxisClippingUpdater("y", viewerSettings.region.y);
  usePerAxisClippingUpdater("z", viewerSettings.region.z);
  // Z slice is a separate property that also must be updated
  useImageEffect(
    (currentImage) => {
      const slice = Math.floor(viewerSettings.region.z[0] * currentImage.imageInfo.volumeSize.z);
      view3d.setZSlice(currentImage, slice);
    },
    [viewerSettings.region.z[0]]
  );

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
          showControls={showControls}
          // image state
          imageName={image?.name}
          imageLoaded={imageLoaded}
          hasImage={!!image}
          pixelSize={image ? image.imageInfo.physicalPixelSize.toArray() : [1, 1, 1]}
          channelDataChannels={image?.channels}
          channelGroupedByType={channelGroupedByType}
          // user selections
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
            hasImage={!!image}
            viewMode={viewerSettings.viewMode}
            autorotate={viewerSettings.autorotate}
            loadingImage={sendingQueryRequest}
            numSlices={getNumberOfSlices()}
            numTimesteps={numberOfTimesteps}
            region={viewerSettings.region}
            time={viewerSettings.time}
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
