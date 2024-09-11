import { Volume } from "@aics/volume-viewer";
import { isEqual } from "lodash";
import { Vector3 } from "three";
import React, { useRef, useCallback, useContext, useMemo } from "react";

import { ChannelState, ViewerState, ViewerStateContextType } from "./types";
import { getDefaultViewerState, getDefaultCameraState, getDefaultChannelState } from "../../shared/constants";
import { ViewMode } from "../../shared/enums";
import {
  overrideViewerState,
  overrideChannelState,
  getEnabledChannelIndices,
  matchesSavedSubregion,
} from "../../shared/utils/viewerState";
import { ViewerStateContext } from ".";

type ResetStateProviderProps = {
  viewerStateInputProps?: Partial<ViewerState>;
};

/**
 * A wrapper that provides reset functionality in the ViewerStateContext, defining and overriding
 * reset-related callbacks. Must be used inside a ViewerStateProvider.
 */
const ResetStateProvider: React.FC<ResetStateProviderProps> = (props) => {
  const { ref } = useContext(ViewerStateContext);
  const { viewerStateInputProps } = props;
  const { changeChannelSetting, changeViewerSetting, channelSettings, viewMode, time, slice } = ref.current;

  /**
   * A map from channel indices to their reset states. Channels that are in this map
   * should be reset to the state value once they are loaded, and will be removed
   * from the map once the reset is applied.
   */
  const channelIdxToResetState = useRef(new Map<number, ChannelState>());
  /**
   * The subregion size of the volume for the currently saved viewer and channel settings.
   * Can be used for comparison to determine whether the correct volume has been loaded
   * during reset (or when saving channels that are loaded for the first time).
   */
  const savedSubregionSize = useRef<Vector3 | null>(null);
  const savedChannelSettings = useRef<Record<number, ChannelState | undefined>>({});
  // Because `onChannelLoaded` is passed to the volume loaders only at initialization,
  // we pass the `onChannelLoaded` callback through a ref to break through stale closures.
  const onChannelLoadedRef = useRef<ViewerStateContextType["onChannelLoaded"]>(() => {});

  // Setup Callbacks ////////////////////////////////////////////////////////////////////

  const setSavedChannelState = useCallback((index: number, state: ChannelState | undefined) => {
    savedChannelSettings.current[index] = state;
  }, []);
  const getSavedChannelState = useCallback((index: number) => savedChannelSettings.current[index], []);

  /**
   * Helper method. Resets the viewer and all channels to the provided state. If new data needs to
   * be loaded, handles setup so the reset will be applied to each channel as it loads in.
   */
  const resetToState = useCallback(
    (newState: ViewerState, newChannelStates: ChannelState[]) => {
      // Needs reset on reload if one of the view modes is 2D while the other is 3D,
      // if the timestamp is different, or if we're on a different z slice.
      // TODO: Handle stopping playback? Requires playback to be part of ViewerStateContext
      const isInDifferentViewMode =
        viewMode !== newState.viewMode && (viewMode === ViewMode.xy || newState.viewMode === ViewMode.xy);
      const isAtDifferentTime = time !== newState.time;
      const isAtDifferentZSlice = newState.viewMode === ViewMode.xy && !isEqual(newState.slice.z, slice.z);
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
    [time, slice, viewMode, changeViewerSetting, changeChannelSetting]
  );

  /** Resets to the initial saved state of the viewer, as shown to the user on load. */
  const resetToSavedViewerState = useCallback(() => {
    const newViewerState = {
      ...getDefaultViewerState(),
      cameraState: getDefaultCameraState(viewerStateInputProps?.viewMode || ViewMode.threeD),
      ...viewerStateInputProps,
    };
    const newChannelSettings = channelSettings.map((_, index) => {
      return savedChannelSettings.current[index] || getDefaultChannelState(index);
    });

    resetToState(newViewerState, newChannelSettings);
  }, [viewerStateInputProps, resetToState, channelSettings]);

  /** Reset to global default viewer state, as if loading the volume with no parameters. */
  const resetToDefaultViewerState = useCallback(() => {
    const defaultViewerState = { ...getDefaultViewerState(), cameraState: getDefaultCameraState(ViewMode.threeD) };
    const defaultChannelStates = channelSettings.map((_, index) => getDefaultChannelState(index));
    for (let i = 0; i < defaultChannelStates.length; i++) {
      if (i < 3) {
        defaultChannelStates[i].volumeEnabled = true;
      }
      defaultChannelStates[i].needsDefaultLut = true;
    }
    resetToState(defaultViewerState, defaultChannelStates);
  }, [viewerStateInputProps, resetToState, channelSettings]);

  const onChannelLoadedCallback = useCallback(
    (volume: Volume, channelIndex: number) => {
      // Check if the channel needs to be reset after loading by checking if it's in the reset map;
      // if so, apply the reset state and remove it from the map.
      const resetState = channelIdxToResetState.current.get(channelIndex);
      if (resetState && matchesSavedSubregion(savedSubregionSize.current, volume.imageInfo.subregionSize)) {
        overrideChannelState(changeChannelSetting, channelIndex, resetState);
        channelIdxToResetState.current.delete(channelIndex);
      }
    },
    [viewMode, channelSettings]
  );
  onChannelLoadedRef.current = onChannelLoadedCallback;

  const onChannelLoaded = useCallback(
    (volume: Volume, channelIndex: number) => onChannelLoadedRef.current(volume, channelIndex),
    [onChannelLoadedRef.current]
  );

  const setSavedSubregionSize = useCallback((size: Vector3 | null) => {
    savedSubregionSize.current = size;
  }, []);
  const getSavedSubregionSize = useCallback(() => savedSubregionSize.current, []);

  // Update Context ////////////////////////////////////////////////////////////////////

  const callbacks = {
    resetToSavedViewerState,
    resetToDefaultViewerState,
    onChannelLoaded,
    getSavedChannelState,
    setSavedChannelState,
    setSavedSubregionSize,
    getSavedSubregionSize,
  };
  const callbacksAsDependencyArray = Object.values(callbacks);

  // Update current context with new callbacks
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
