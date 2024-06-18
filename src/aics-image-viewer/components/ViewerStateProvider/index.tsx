import React, { useCallback, useContext, useMemo, useState, useRef, useEffect } from "react";

import type {
  ViewerStateContextType,
  ViewerState,
  ViewerSettingChangeHandlers,
  ViewerSettingUpdater,
  ChannelSettingUpdater,
  ChannelState,
  MultipleChannelSettingsUpdater,
  PartialIfObject,
} from "./types";
import { ImageType, RenderMode, ViewMode } from "../../shared/enums";
import {
  ALPHA_MASK_SLIDER_DEFAULT,
  BACKGROUND_COLOR_DEFAULT,
  BOUNDING_BOX_COLOR_DEFAULT,
  BRIGHTNESS_SLIDER_LEVEL_DEFAULT,
  DENSITY_SLIDER_LEVEL_DEFAULT,
  INTERPOLATION_ENABLED_DEFAULT,
  LEVELS_SLIDER_DEFAULT,
} from "../../shared/constants";
import { ColorArray } from "../../shared/utils/colorRepresentations";

const isObject = <T,>(val: T): val is Extract<T, Record<string, unknown>> =>
  typeof val === "object" && val !== null && !Array.isArray(val);

const DEFAULT_VIEWER_SETTINGS: ViewerState = {
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
  slice: { x: 0.5, y: 0.5, z: 0.5 },
  time: 0,
} as const;

// Some viewer settings require custom change behaviors to change related settings simultaneously or guard against
// entering an illegal state (e.g. autorotate must not be on in pathtrace mode). Those behaviors are defined here.
const VIEWER_SETTINGS_CHANGE_HANDLERS: ViewerSettingChangeHandlers = {
  // View mode: if we're switching to 2d, switch to volumetric rendering
  viewMode: (prevSettings, viewMode) => {
    const switchToVolumetric = viewMode !== ViewMode.threeD && prevSettings.renderMode === RenderMode.pathTrace;
    return {
      ...prevSettings,
      viewMode,
      renderMode: switchToVolumetric ? RenderMode.volumetric : prevSettings.renderMode,
    };
  },
  // Render mode: if we're switching to pathtrace, turn off autorotate
  renderMode: (prevSettings, renderMode) => ({
    ...prevSettings,
    renderMode,
    autorotate: renderMode === RenderMode.pathTrace ? false : prevSettings.autorotate,
  }),
  // Autorotate: do not enable autorotate while in pathtrace mode
  autorotate: (prevSettings, autorotate) => ({
    ...prevSettings,
    // The button should theoretically be unclickable while in pathtrace mode, but this provides extra security
    autorotate: prevSettings.renderMode === RenderMode.pathTrace ? false : autorotate,
  }),
};

const extractViewerSettings = (context: ViewerStateContextType): ViewerState => {
  const {
    channelSettings: _channelSettings,
    changeViewerSetting: _changeViewerSetting,
    changeChannelSetting: _changeChannelSetting,
    changeMultipleChannelSettings: _changeMultipleChannelSettings,
    applyColorPresets: _applyColorPresets,
    ...settings
  } = context;
  return settings;
};

/** Changes a key in a given `ViewerState` object, keeping the object in a valid state and applying partial values */
const applyChangeToViewerSettings = <K extends keyof ViewerState>(
  viewerSettings: ViewerState,
  key: K,
  value: PartialIfObject<ViewerState[K]>
): ViewerState => {
  const changeHandler = VIEWER_SETTINGS_CHANGE_HANDLERS[key];

  if (changeHandler) {
    // This setting has a custom change handler. Let it handle creating a new state object.
    return changeHandler(viewerSettings, value);
  } else {
    const setting = viewerSettings[key];
    if (isObject(setting) && isObject(value)) {
      // This setting is an object, and we may be updating it with a partial object.
      return { ...viewerSettings, [key]: { ...setting, ...value } };
    } else {
      // This setting is regular. Update it the regular way.
      return { ...viewerSettings, [key]: value };
    }
  }
};

const nullfn = (): void => {};

const DEFAULT_VIEWER_CONTEXT: ViewerStateContextType = {
  ...DEFAULT_VIEWER_SETTINGS,
  channelSettings: [],
  changeViewerSetting: nullfn,
  setChannelSettings: nullfn,
  changeChannelSetting: nullfn,
  changeMultipleChannelSettings: nullfn,
  applyColorPresets: nullfn,
};

export const ALL_VIEWER_STATE_KEYS = Object.keys(DEFAULT_VIEWER_CONTEXT) as (keyof ViewerStateContextType)[];

const DEFAULT_VIEWER_CONTEXT_OUTER = { ref: { current: DEFAULT_VIEWER_CONTEXT } };

type NoNull<T> = { [K in keyof T]: NonNullable<T[K]> };
type ContextRefType = NoNull<React.MutableRefObject<ViewerStateContextType>>;

export const ViewerStateContext = React.createContext<{ ref: ContextRefType }>(DEFAULT_VIEWER_CONTEXT_OUTER);

type ViewerStateProviderProps = {
  viewerSettings?: Partial<ViewerState>;
  onViewerSettingsChange?: (settings: ViewerState) => void;
};

/** Provides a central store for the state of the viewer, and the methods to update it. */
const ViewerStateProvider: React.FC<ViewerStateProviderProps> = (props) => {
  const [viewerSettings, setViewerSettings] = useState<ViewerState>({ ...DEFAULT_VIEWER_SETTINGS });
  const [channelSettings, setChannelSettings] = useState<ChannelState[]>([]);
  // Provide viewer state via a ref, so that closures that run asynchronously can capture the ref instead of the
  // specific values they need and always have the most up-to-date state.
  const ref = useRef(DEFAULT_VIEWER_CONTEXT);

  // Below callbacks get no dependencies since we're accessing state via the ref

  const changeViewerSetting = useCallback<ViewerSettingUpdater>((key, value) => {
    const currentSettings = extractViewerSettings(ref.current);
    setViewerSettings(applyChangeToViewerSettings(currentSettings, key, value));
  }, []);

  const changeChannelSetting = useCallback<ChannelSettingUpdater>((index, key, value) => {
    const newChannelSettings = ref.current.channelSettings.slice();
    newChannelSettings[index] = { ...newChannelSettings[index], [key]: value };
    setChannelSettings(newChannelSettings);
  }, []);

  const changeMultipleChannelSettings = useCallback<MultipleChannelSettingsUpdater>((indices, key, value) => {
    const newChannelSettings = ref.current.channelSettings.map((settings, idx) =>
      indices.includes(idx) ? { ...settings, [key]: value } : settings
    );
    setChannelSettings(newChannelSettings);
  }, []);

  const applyColorPresets = useCallback((presets: ColorArray[]): void => {
    const newChannelSettings = ref.current.channelSettings.map((channel, idx) =>
      presets[idx] ? { ...channel, color: presets[idx] } : channel
    );
    setChannelSettings(newChannelSettings);
  }, []);

  // Sync viewer settings prop with state
  // React docs seem to be fine with syncing state with props directly in the render function:
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  // Changing to useEffect to prevent state updates from causing infinite loops...
  // TBD whether this is needed
  useEffect(() => {
    if (props.viewerSettings) {
      let newSettings = viewerSettings;

      for (const key of Object.keys(props.viewerSettings) as (keyof ViewerState)[]) {
        if (viewerSettings[key] !== props.viewerSettings[key]) {
          // Update viewer settings one at a time to allow change handlers to keep state valid
          newSettings = applyChangeToViewerSettings(newSettings, key, props.viewerSettings[key] as any);
        }
      }

      if (newSettings !== viewerSettings) {
        setViewerSettings(newSettings);
        props.onViewerSettingsChange?.(newSettings);
      }
    }
  }, [props.viewerSettings]);

  const context = useMemo(() => {
    ref.current = {
      ...viewerSettings,
      channelSettings,
      changeViewerSetting,
      setChannelSettings,
      changeChannelSetting,
      changeMultipleChannelSettings,
      applyColorPresets,
    };

    // `ref` is wrapped in another object to ensure that the context updates when state does.
    // (`ref` on its own would always compare equal to itself and the context would never update.)
    return { ref };
  }, [viewerSettings, channelSettings]);

  return <ViewerStateContext.Provider value={context}>{props.children}</ViewerStateContext.Provider>;
};

/**
 * Higher-order component that connects a component to the viewer state context.
 *
 * Accepts a `component` and an array of `keys` from the viewer state context, and returns a new memoized component
 * which "subscribes" to only those fields of state, and will not re-render if other fields change. This works by
 * creating a component which is "split in two" as described
 * [here](https://react.dev/reference/react/memo#updating-a-memoized-component-using-a-context).
 *
 * NOTE that while higher-order components don't seem to be explicitly considered an anti-pattern, they don't appear in
 * modern documentation because they are "[not commonly used in modern React
 * code](https://legacy.reactjs.org/docs/higher-order-components.html)." React-redux, which inspired this "connect"
 * pattern, has also generally moved away from this pattern [in favor of a hooks-based
 * approach](https://react-redux.js.org/api/hooks). I too would love to use hooks to connect to viewer state, but there
 * is currently no way to hook into context without agreeing to re-render on every change. I feel okay using a higher-
 * order component in this case because, analogous to a custom hook, it extends a provided primitive HOC (`memo`).
 */
export function connectToViewerState<
  Keys extends keyof ViewerStateContextType,
  Props extends Pick<ViewerStateContextType, Keys>
>(component: React.ComponentType<Props>, keys: Keys[]): React.FC<Omit<Props, Keys>> {
  const MemoedComponent = React.memo(component);

  const ConnectedComponent: React.FC<Omit<Props, Keys>> = (props) => {
    const viewerState = useContext(ViewerStateContext);

    const mergedProps = { ...props } as Props;
    for (const key of keys) {
      (mergedProps as Pick<ViewerStateContextType, Keys>)[key] = viewerState.ref.current[key];
    }

    return <MemoedComponent {...mergedProps} />;
  };

  ConnectedComponent.displayName = `Connected(${component.displayName || component.name})`;
  return ConnectedComponent;
}

export default ViewerStateProvider;
