// 3rd Party Imports
import React, { useCallback, useEffect, useState } from "react";
import { Layout } from "antd";
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

import { AppProps, ShowControls, ViewerSettingsKey, GlobalViewerSettings, ViewerSettingUpdater } from "./types";
import { controlPointsToLut } from "../../shared/utils/controlPointsToLut";
import {
  ChannelState,
  findFirstChannelMatch,
  makeChannelIndexGrouping,
  ChannelGrouping,
  ViewerChannelSettings,
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

type ViewerSettingsChangeHandlers = {
  [K in ViewerSettingsKey]?: (settings: GlobalViewerSettings, value: GlobalViewerSettings[K]) => GlobalViewerSettings;
};

// Some viewer settings require custom change handlers to guard against entering an illegal state.
// (e.g. autorotate must not be on in pathtrace mode.) Those handlers go here.
// TODO should these be in their own file?
const viewerSettingsChangeHandlers: ViewerSettingsChangeHandlers = {
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
      // TODO this shows the whole volume and not a single slice
      newSettings.region[activeAxis] = [0, 1];
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

// TODO move to utils file?
function initializeLut(aimg: Volume, channelIndex: number, channelSettings?: ViewerChannelSettings): ControlPoint[] {
  const histogram = aimg.getHistogram(channelIndex);

  // find channelIndex among viewerChannelSettings.
  const name = aimg.channel_names[channelIndex];
  // default to percentiles
  let lutObject = histogram.lutGenerator_percentiles(LUT_MIN_PERCENTILE, LUT_MAX_PERCENTILE);
  // and if init settings dictate, recompute it:
  if (channelSettings) {
    const initSettings = findFirstChannelMatch(name, channelIndex, channelSettings);
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

const App: React.FC<AppProps> = (props) => {
  props = { ...defaultProps, ...props };

  // State management /////////////////////////////////////////////////////////

  // TODO is there a better API for values that never change?
  const [view3d, _setView3d] = useState(() => new View3d());
  const [image, setImage] = useState<Volume | null>(null);

  const [sendingQueryRequest, setSendingQueryRequest] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [currentlyLoadedImagePath, setCurrentlyLoadedImagePath] = useState<string | undefined>(undefined);
  const [controlPanelClosed, setControlPanelClosed] = useState(() => window.innerWidth < CONTROL_PANEL_CLOSE_WIDTH);

  const [channelGroupedByType, setChannelGroupedByType] = useState<ChannelGrouping>({});

  // These are the major parts of `App` state
  // `viewerSettings` represents global state, while `channelSettings` represents per-channel state
  // TODO this is a second application of defaults... which one should remain?
  const [viewerSettings, setViewerSettings] = useState(() => ({ ...defaultViewerSettings, ...props.viewerSettings }));
  const changeViewerSetting = useCallback<ViewerSettingUpdater>(
    (key, value) => {
      const changeHandler = viewerSettingsChangeHandlers[key];
      if (changeHandler) {
        setViewerSettings(changeHandler(viewerSettings, value));
      } else {
        setViewerSettings({ ...viewerSettings, [key]: value });
      }
    },
    [viewerSettings]
  );

  const [channelSettings, setChannelSettings] = useState<ChannelState[]>([]);
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

  // Image loading/initialization functions ///////////////////////////////////

  const getOneChannelSetting = (channelName: string, settings?: ChannelState[]): ChannelState | undefined => {
    return (settings || channelSettings).find((channel) => channel.name === channelName);
  };

  // TODO: ...can this be derived? would we want it to be if so?
  const createChannelGrouping = (channels: string[]): ChannelGrouping => {
    if (!channels) {
      return {};
    }
    if (!props.viewerChannelSettings) {
      // return all channels
      return { [SINGLE_GROUP_CHANNEL_KEY]: channels.map((_val, index) => index) };
    }
    return makeChannelIndexGrouping(channels, props.viewerChannelSettings);
  };

  const onChannelDataLoaded = (
    aimg: Volume,
    thisChannelsSettings: ChannelState,
    channelIndex: number,
    keepLuts?: boolean
  ): ChannelState => {
    let updatedChannelSettings = thisChannelsSettings;
    // TODO necessary?
    view3d.setVolumeChannelOptions(aimg, channelIndex, {
      enabled: thisChannelsSettings.volumeEnabled,
      color: thisChannelsSettings.color,
      isosurfaceEnabled: thisChannelsSettings.isosurfaceEnabled,
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
      const newControlPoints = initializeLut(aimg, channelIndex, props.viewerChannelSettings);
      updatedChannelSettings = { ...thisChannelsSettings, controlPoints: newControlPoints };
    }

    if (aimg.channelNames()[channelIndex] === props.viewerChannelSettings?.maskChannelName) {
      view3d.setVolumeChannelAsMask(aimg, channelIndex);
    }

    // when any channel data has arrived:
    setSendingQueryRequest(false);
    if (aimg.isLoaded()) {
      view3d.updateActiveChannels(aimg);
      setImageLoaded(true);
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
      return undefined;
    }

    // TODO this function's behavior has changed to not recreate channel groupings on every load
    //   verify that this doesn't impact anything
    //   in fact... should creating channel groupings be its own effect, to change on `viewerChannelSettings`?
    setChannelGroupedByType(createChannelGrouping(channelNames));

    const newChannelSettings = channelNames.map((channel, index) => {
      const color = (INIT_COLORS[index] ? INIT_COLORS[index].slice() : [226, 205, 179]) as ColorArray;
      return initializeOneChannelSetting(null, channel, index, color);
    });
    // TODO could be this shouldn't set state...? leave it to per-channel setters?
    setChannelSettings(newChannelSettings);
    return newChannelSettings;
  };

  const placeImageInViewer = (aimg: Volume, newChannelSettings?: ChannelState[]): void => {
    // TODO old code imperatively set `maskAlpha` to 2D or 3D default.
    //   I think the reducer should take care of this now, but should test to verify
    const channelSetting = newChannelSettings || channelSettings;
    view3d.removeAllVolumes();
    view3d.addVolume(aimg, {
      channels: aimg.channel_names.map((name) => {
        // TODO why this check?
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
    const newChannelSettings = setChannelStateForNewImage(aimg.imageInfo.channel_names);

    setImage(aimg);
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

    const settingsRef = { current: [] as ChannelState[] };

    const aimg = await loader.createVolume(loadSpec, (_url, v, channelIndex) => {
      const thisChannelSettings = getOneChannelSetting(v.imageInfo.channel_names[channelIndex], settingsRef.current);
      const newChannelSettings = onChannelDataLoaded(v, thisChannelSettings!, channelIndex);
      if (thisChannelSettings !== newChannelSettings) {
        const newSettings = settingsRef.current!.slice();
        newSettings[channelIndex] = newChannelSettings;
        settingsRef.current = newSettings;
        setChannelSettings(newSettings);
      }
      // TODO: original behavior is to reset view mode on completely new image only
      //   add state to enact this behavior
    });

    settingsRef.current = onNewVolumeCreated(aimg, path, false);
  };

  // TODO TODO TODO
  const loadFromRaw = () => {};

  // Imperative callbacks /////////////////////////////////////////////////////

  const saveIsosurface = useCallback(
    (channelIndex: number, type: IsosurfaceFormat): void => {
      if (image) view3d.saveChannelIsosurface(image, channelIndex, type);
    },
    [image]
  );

  // TODO should this be a per-channel effect?
  const updateChannelTransferFunction = useCallback(
    (index: number, lut: Uint8Array): void => {
      if (image) {
        image.setLut(index, lut);
        view3d?.updateLuts(image);
      }
    },
    [image]
  );

  const resetCamera = useCallback((): void => view3d.resetCamera(), []);

  const saveScreenshot = useCallback((): void => {
    view3d.capture((dataUrl: string) => {
      const anchor = document.createElement("a");
      anchor.href = dataUrl;
      anchor.download = "screenshot.png";
      anchor.click();
    });
  }, []);

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

  // TODO wrap in useCallback?
  const getNumberOfSlices = (): PerAxis<number> => {
    if (image) {
      const { x, y, z } = image;
      return { x, y, z };
    }
    return { x: 0, y: 0, z: 0 };
  };

  // Effects //////////////////////////////////////////////////////////////////

  // Hook to trigger image load: on mount, when `cellId` changes, when `imageType` changes
  // TODO this should have some logic to trigger `loadFromRaw`
  useEffect(() => void openImage(), [props.cellId, viewerSettings.imageType]);

  useEffect(
    () => props.onControlPanelToggle && props.onControlPanelToggle(controlPanelClosed),
    [controlPanelClosed, props.onControlPanelToggle]
  );

  useEffect(() => {
    // delayed for the animation to finish
    void setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 200);
  }, [controlPanelClosed]);

  // Custom hook for updating settings to view3d
  const useViewerEffect: typeof useEffect = (effect, deps) => {
    useEffect(() => {
      if (imageLoaded) {
        return effect();
      }
    }, [...deps!, imageLoaded]);
  };

  // Another custom hook for viewer updates that depend on `image`, so we don't have to repeatedly null-check it
  const useImageEffect = (effect: (image: Volume) => void | (() => void), deps: ReadonlyArray<any>) => {
    useViewerEffect(() => {
      if (image) {
        return effect(image);
      }
    }, [...deps, image]);
  };

  // Effects to imperatively sync `viewerSettings` to `view3d`
  // TODO should all these be ImageEffects, even if not required by the API?

  useViewerEffect(() => view3d.setCameraMode(viewerSettings.viewMode), [viewerSettings.viewMode]);
  useViewerEffect(() => view3d.setAutoRotate(viewerSettings.autorotate), [viewerSettings.autorotate]);
  useViewerEffect(() => view3d.setShowAxis(viewerSettings.showAxes), [viewerSettings.showAxes]);
  useViewerEffect(
    () => view3d.setBackgroundColor(colorArrayToFloats(viewerSettings.backgroundColor)),
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

  const usePerAxisClippingUpdater = (axis: AxisName, [minval, maxval]: [number, number]) => {
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
          updateChannelTransferFunction={updateChannelTransferFunction}
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
