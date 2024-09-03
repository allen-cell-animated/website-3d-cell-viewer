import React, { useCallback, useContext, useMemo, useReducer, useRef } from "react";

import type {
  ViewerStateContextType,
  ViewerState,
  ViewerSettingChangeHandlers,
  ViewerSettingUpdater,
  ChannelSettingUpdater,
  ChannelState,
  PartialIfObject,
} from "./types";
import { RenderMode, ViewMode } from "../../shared/enums";
import { ColorArray } from "../../shared/utils/colorRepresentations";
import { getDefaultCameraState, getEmptyChannelState, getEmptyViewerState } from "../../shared/constants";
import {
  doesVolumeMatchViewMode,
  getEnabledChannelIndices,
  resetChannelState,
  resetViewerState,
} from "../../shared/utils/viewerState";
import { Volume } from "@aics/volume-viewer";

const isObject = <T,>(val: T): val is Extract<T, Record<string, unknown>> =>
  typeof val === "object" && val !== null && !Array.isArray(val);

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
  // Also, do not change the mode if the view mode is not 3D
  renderMode: (prevSettings, renderMode) => {
    if (renderMode === RenderMode.pathTrace && prevSettings.viewMode !== ViewMode.threeD) {
      return { ...prevSettings };
    }
    return {
      ...prevSettings,
      renderMode,
      autorotate: renderMode === RenderMode.pathTrace ? false : prevSettings.autorotate,
    };
  },
  // Autorotate: do not enable autorotate while in pathtrace mode
  autorotate: (prevSettings, autorotate) => ({
    ...prevSettings,
    // The button should theoretically be unclickable while in pathtrace mode, but this provides extra security
    autorotate: prevSettings.renderMode === RenderMode.pathTrace ? false : autorotate,
  }),
};

type ViewerStateAction<K extends keyof ViewerState> = {
  key: K;
  value: PartialIfObject<ViewerState[K]>;
};

const viewerSettingsReducer = <K extends keyof ViewerState>(
  viewerSettings: ViewerState,
  { key, value }: ViewerStateAction<K>
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

/** Utility type to explicitly assert that one or more properties will *not* be defined on an object */
type WithExplicitlyUndefined<K extends keyof any, T> = T & { [key in K]?: never };

/** Set channel setting `key` on one or more channels specified by `index` to value `value`. */
type ChannelSettingUniformUpdateAction<K extends keyof ChannelState> = {
  index: number | number[];
  key: K;
  value: ChannelState[K];
};
/** Set the values of channel setting `key` for all channels from an array of values ordered by channel index */
type ChannelSettingArrayUpdateAction<K extends keyof ChannelState> = {
  key: K;
  value: ChannelState[K][];
};
/** Initialize list of channel states */
type ChannelSettingInitAction = {
  value: ChannelState[];
};

type ChannelStateAction<K extends keyof ChannelState> =
  | ChannelSettingUniformUpdateAction<K>
  | WithExplicitlyUndefined<"index", ChannelSettingArrayUpdateAction<K>>
  | WithExplicitlyUndefined<"index" | "key", ChannelSettingInitAction>;

const channelSettingsReducer = <K extends keyof ChannelState>(
  channelSettings: ChannelState[],
  { index, key, value }: ChannelStateAction<K>
): ChannelState[] => {
  if (key === undefined) {
    // ChannelSettingInitAction
    return value as ChannelState[];
  } else if (index === undefined) {
    // ChannelSettingArrayUpdateAction
    return channelSettings.map((channel, idx) => {
      return value[idx] ? { ...channel, [key]: value[idx] } : channel;
    });
  } else if (Array.isArray(index)) {
    // ChannelSettingUniformUpdateAction on potentially multiple channels
    return channelSettings.map((channel, idx) => (index.includes(idx) ? { ...channel, [key]: value } : channel));
  } else {
    // ChannelSettingUniformUpdateAction on a single channel
    const newSettings = channelSettings.slice();
    if (index >= 0 && index < channelSettings.length) {
      newSettings[index] = { ...newSettings[index], [key]: value };
    }
    return newSettings;
  }
};

const nullfn = (): void => {};

const DEFAULT_VIEWER_CONTEXT: ViewerStateContextType = {
  ...getEmptyViewerState(),
  resetToSavedViewerState: nullfn,
  resetToDefaultViewerState: nullfn,
  setSavedChannelState: nullfn,
  getSavedChannelState: (index) => getEmptyChannelState(index),
  onChannelLoaded: nullfn,
  channelSettings: [],
  changeViewerSetting: nullfn,
  setChannelSettings: nullfn,
  changeChannelSetting: nullfn,
  applyColorPresets: nullfn,
};

export const ALL_VIEWER_STATE_KEYS = Object.keys(DEFAULT_VIEWER_CONTEXT) as (keyof ViewerStateContextType)[];

const DEFAULT_VIEWER_CONTEXT_OUTER = { ref: { current: DEFAULT_VIEWER_CONTEXT } };

type NoNull<T> = { [K in keyof T]: NonNullable<T[K]> };
type ContextRefType = NoNull<React.MutableRefObject<ViewerStateContextType>>;

export const ViewerStateContext = React.createContext<{ ref: ContextRefType }>(DEFAULT_VIEWER_CONTEXT_OUTER);

/** Provides a central store for the state of the viewer, and the methods to update it. */
const ViewerStateProvider: React.FC<{ viewerSettings?: Partial<ViewerState> }> = (props) => {
  const [viewerSettings, viewerDispatch] = useReducer(viewerSettingsReducer, { ...getEmptyViewerState() });
  const [channelSettings, channelDispatch] = useReducer(channelSettingsReducer, []);
  /** The set of channels that are blocking the current reset operation until they are loaded. */
  const channelsBlockingReset = useRef(new Set<number>());
  const onBlockingChannelsLoaded = useRef<() => void>(nullfn);

  // Provide viewer state via a ref, so that closures that run asynchronously can capture the ref instead of the
  // specific values they need and always have the most up-to-date state.
  const ref = useRef(DEFAULT_VIEWER_CONTEXT);

  const changeViewerSetting = useCallback<ViewerSettingUpdater>((key, value) => viewerDispatch({ key, value }), []);

  const changeChannelSetting = useCallback<ChannelSettingUpdater>((index, key, value) => {
    channelDispatch({ index, key, value });
  }, []);

  const applyColorPresets = useCallback((value: ColorArray[]): void => channelDispatch({ key: "color", value }), []);

  const setChannelSettings = useCallback((channels: ChannelState[]) => channelDispatch({ value: channels }), []);

  // Sync viewer settings prop with state
  // React docs seem to be fine with syncing state with props directly in the render function, but that caused an
  // infinite render loop, so now it's in a `useMemo`:
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  useMemo(() => {
    if (props.viewerSettings) {
      for (const key of Object.keys(props.viewerSettings) as (keyof ViewerState)[]) {
        if (viewerSettings[key] !== props.viewerSettings[key]) {
          changeViewerSetting(key, props.viewerSettings[key] as any);
        }
      }
    }
  }, [props.viewerSettings]);

  // Getters and setters for default viewer and channel states

  const savedChannelSettings = useRef<Record<number, ChannelState>>({}).current;
  const setSavedChannelState = useCallback((index: number, state: ChannelState) => {
    savedChannelSettings[index] = state;
  }, []);
  const getSavedChannelState = useCallback((index: number) => savedChannelSettings[index], []);

  /**
   * Resets the viewer and all channels to the provided state. If new data needs to be loaded,
   * handles setup so the reset will be reapplied again once all the data is loaded.
   */
  const resetToState = useCallback(
    (newState: ViewerState, newChannelStates: ChannelState[], allowRecursive = true) => {
      // Needs reset on reload if one of the view modes is 2D while the other is 3D,
      // if the timestamp is different,
      // TODO: or if playback is currently enabled in 2D mode
      const isInDifferentViewMode =
        viewerSettings.viewMode !== newState.viewMode &&
        (viewerSettings.viewMode === ViewMode.xy || newState.viewMode === ViewMode.xy);
      const isAtDifferentTime = viewerSettings.time !== newState.time;
      const isAtDifferentZSlice = newState.viewMode === ViewMode.xy && newState.region.z !== viewerSettings.region.z;
      const willNeedResetOnLoad = isInDifferentViewMode || isAtDifferentTime || isAtDifferentZSlice;

      resetViewerState(changeViewerSetting, newState);

      for (let i = 0; i < newChannelStates.length; i++) {
        resetChannelState(changeChannelSetting, i, newChannelStates[i]);
      }

      if (willNeedResetOnLoad && allowRecursive) {
        channelsBlockingReset.current = getEnabledChannelIndices(newChannelStates);
        // Call this operation once more when all channels are loaded
        onBlockingChannelsLoaded.current = () => resetToState(newState, newChannelStates, false);
      }
    },
    [viewerSettings, viewerSettings.viewMode, changeViewerSetting, changeChannelSetting]
  );

  /** Resets to the initial saved state of the viewer, as shown to the user on load. */
  const resetToSavedViewerState = useCallback(() => {
    const savedViewerState = {
      ...getEmptyViewerState(),
      cameraState: getDefaultCameraState(),
      ...props.viewerSettings,
    };
    const newChannelSettings = channelSettings.map((_, index) => {
      return savedChannelSettings[index] || getEmptyChannelState(index);
    });
    resetToState(savedViewerState, newChannelSettings);
  }, [props.viewerSettings, resetToState, channelSettings]);

  const resetToDefaultViewerState = useCallback(() => {
    const defaultChannelStates = channelSettings.map((_, index) => getEmptyChannelState(index));
    resetToState({ ...getEmptyViewerState(), cameraState: getDefaultCameraState() }, defaultChannelStates);
  }, [props.viewerSettings, resetToState, channelSettings]);

  const onChannelLoadedRef = useRef<ViewerStateContextType["onChannelLoaded"]>(nullfn);
  const onChannelLoaded = useCallback(
    (volume: Volume, channelIndex: number) => {
      console.log("onChannelLoaded", channelIndex);
      if (channelsBlockingReset.current.has(channelIndex) && doesVolumeMatchViewMode(viewerSettings.viewMode, volume)) {
        console.log("onChannelLoaded: Found match for ", channelIndex, " after load");
        channelsBlockingReset.current.delete(channelIndex);
        if (channelsBlockingReset.current.size === 0) {
          console.log("onChannelLoaded: Resetting after load");
          onBlockingChannelsLoaded.current();
        }
      }
    },
    [viewerSettings, channelSettings]
  );
  onChannelLoadedRef.current = onChannelLoaded;

  const context = useMemo(() => {
    ref.current = {
      ...viewerSettings,
      channelSettings,
      resetToSavedViewerState,
      resetToDefaultViewerState,
      changeViewerSetting,
      setChannelSettings,
      onChannelLoaded: (volume: Volume, channelIndex: number) => onChannelLoadedRef.current(volume, channelIndex),
      changeChannelSetting,
      applyColorPresets,
      setSavedChannelState,
      getSavedChannelState,
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
