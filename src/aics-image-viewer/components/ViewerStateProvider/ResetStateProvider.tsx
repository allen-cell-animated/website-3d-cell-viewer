import { Volume } from "@aics/volume-viewer";
import { isEqual } from "lodash";
import React, { useRef, useCallback, useContext, useMemo } from "react";

import { ChannelState, ViewerState, ViewerStateContextType } from "./types";
import { getDefaultViewerState, getDefaultCameraState, getDefaultChannelState } from "../../shared/constants";
import { ViewMode } from "../../shared/enums";
import {
  overrideViewerState,
  overrideChannelState,
  getEnabledChannelIndices,
  doesVolumeMatchViewMode,
} from "../../shared/utils/viewerState";
import { ViewerStateContext } from ".";

type ResetStateProviderProps = {
  viewerStateInputProps?: Partial<ViewerState>;
};

/**
 * A wrapper intended to be used inside ViewerStateProvider that provides
 * reset functionality to the viewer state. Overrides
 */
const ResetStateProvider: React.FC<ResetStateProviderProps> = (props) => {
  const { ref } = useContext(ViewerStateContext);
  const { viewerStateInputProps } = props;
  const { changeChannelSetting, changeViewerSetting, channelSettings, viewMode, time, region } = ref.current;

  /**
   * A map from channel indices to their reset states. Channels that are in this map
   * should be reset to the state value once they are loaded, and will be removed
   * from the map once the reset is applied.
   */
  const channelIdxToResetState = useRef(new Map<number, ChannelState>());

  // Setup Callbacks ////////////////////////////////////////////////////////////////////

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
    (newState: ViewerState, newChannelStates: ChannelState[]) => {
      // Needs reset on reload if one of the view modes is 2D while the other is 3D,
      // if the timestamp is different,
      // TODO: or if playback is currently enabled in 2D mode
      const isInDifferentViewMode =
        viewMode !== newState.viewMode && (viewMode === ViewMode.xy || newState.viewMode === ViewMode.xy);
      const isAtDifferentTime = time !== newState.time;
      const isAtDifferentZSlice = newState.viewMode === ViewMode.xy && !isEqual(newState.region.z, region.z);
      const willNeedResetOnLoad = isInDifferentViewMode || isAtDifferentTime || isAtDifferentZSlice;

      overrideViewerState(changeViewerSetting, newState);

      for (let i = 0; i < newChannelStates.length; i++) {
        overrideChannelState(changeChannelSetting, i, newChannelStates[i]);
      }

      if (willNeedResetOnLoad) {
        const enabledChannelsAndResetState = getEnabledChannelIndices(newChannelStates).map((index) => {
          return [index, newChannelStates[index]] as const;
        });
        channelIdxToResetState.current = new Map(enabledChannelsAndResetState);
      }
    },
    [time, viewMode, changeViewerSetting, changeChannelSetting]
  );

  /** Resets to the initial saved state of the viewer, as shown to the user on load. */
  const resetToSavedViewerState = useCallback(() => {
    const savedViewerState = {
      ...getDefaultViewerState(),
      cameraState: getDefaultCameraState(),
      ...viewerStateInputProps,
    };
    const newChannelSettings = channelSettings.map((_, index) => {
      return savedChannelSettings[index] || getDefaultChannelState(index);
    });

    resetToState(savedViewerState, newChannelSettings);
  }, [viewerStateInputProps, resetToState, channelSettings]);

  const resetToDefaultViewerState = useCallback(() => {
    const defaultChannelStates = channelSettings.map((_, index) => getDefaultChannelState(index));
    for (let i = 0; i < defaultChannelStates.length; i++) {
      if (i < 3) {
        defaultChannelStates[i].volumeEnabled = true;
      }
      // Flags that this needs to be initialized with the default LUT
      defaultChannelStates[i].needsDefaultLut = true;
    }
    resetToState({ ...getDefaultViewerState(), cameraState: getDefaultCameraState() }, defaultChannelStates);
  }, [viewerStateInputProps, resetToState, channelSettings]);

  const onChannelLoadedCallback = useCallback(
    (volume: Volume, channelIndex: number) => {
      // Check if the channel needs to be reset after loading by checking if it's in the reset map;
      // if so, apply the reset state and remove it from the map.
      if (channelIdxToResetState.current.has(channelIndex) && doesVolumeMatchViewMode(viewMode, volume)) {
        const resetState = channelIdxToResetState.current.get(channelIndex);
        if (resetState) {
          overrideChannelState(changeChannelSetting, channelIndex, resetState);
          channelIdxToResetState.current.delete(channelIndex);
        }
      }
    },
    [viewMode, channelSettings]
  );

  // Because `onChannelLoaded` is passed to the volume loaders only at initialization,
  // we pass the `onChannelLoaded` callback through a ref to break through stale closures.
  const onChannelLoadedRef = useRef<ViewerStateContextType["onChannelLoaded"]>(() => {});
  onChannelLoadedRef.current = onChannelLoadedCallback;
  const onChannelLoaded = useCallback(
    (volume: Volume, channelIndex: number) => onChannelLoadedRef.current(volume, channelIndex),
    [onChannelLoadedRef.current]
  );

  // Update Context ////////////////////////////////////////////////////////////////////

  const callbacks = {
    resetToSavedViewerState,
    resetToDefaultViewerState,
    onChannelLoaded,
    getSavedChannelState,
    setSavedChannelState,
  };
  const callbacksAsDependencyArray = Object.values(callbacks);

  const context = useMemo(() => {
    ref.current = {
      ...ref.current,
      ...callbacks,
    };
    return { ref };
  }, [ref.current, ...callbacksAsDependencyArray]);

  return <ViewerStateContext.Provider value={context}>{props.children}</ViewerStateContext.Provider>;
};

export default ResetStateProvider;
