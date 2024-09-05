import { ControlPoint, Volume } from "@aics/volume-viewer";
import { isEqual } from "lodash";
import React, { useRef, useCallback, useContext, useMemo } from "react";

import { ChannelState, ViewerState, ViewerStateContextType } from "./types";
import { getDefaultViewerState, getDefaultCameraState, getDefaultChannelState } from "../../shared/constants";
import { ViewMode } from "../../shared/enums";
import { getDefaultLut, controlPointsToRamp } from "../../shared/utils/controlPointsToLut";
import {
  resetViewerState,
  resetChannelState,
  getEnabledChannelIndices,
  doesVolumeMatchViewMode,
} from "../../shared/utils/viewerState";
import { connectToViewerState, ViewerStateContext } from ".";

const USE_DEFAULT_LUT_FOR_CONTROL_POINTS: ControlPoint[] = [];

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
    (newState: ViewerState, newChannelStates: ChannelState[]) => {
      // Needs reset on reload if one of the view modes is 2D while the other is 3D,
      // if the timestamp is different,
      // TODO: or if playback is currently enabled in 2D mode
      const isInDifferentViewMode =
        viewMode !== newState.viewMode && (viewMode === ViewMode.xy || newState.viewMode === ViewMode.xy);
      const isAtDifferentTime = time !== newState.time;
      const isAtDifferentZSlice = newState.viewMode === ViewMode.xy && !isEqual(newState.region.z, region.z);
      const willNeedResetOnLoad = isInDifferentViewMode || isAtDifferentTime || isAtDifferentZSlice;

      resetViewerState(changeViewerSetting, newState);

      for (let i = 0; i < newChannelStates.length; i++) {
        resetChannelState(changeChannelSetting, i, newChannelStates[i]);
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
      defaultChannelStates[i].controlPoints = USE_DEFAULT_LUT_FOR_CONTROL_POINTS;
    }
    resetToState({ ...getDefaultViewerState(), cameraState: getDefaultCameraState() }, defaultChannelStates);
  }, [viewerStateInputProps, resetToState, channelSettings]);

  const onChannelLoadedRef = useRef<ViewerStateContextType["onChannelLoaded"]>(() => {});
  const onChannelLoaded = useCallback(
    (volume: Volume, channelIndex: number) => {
      // Check if the channel needs to be reset after loading by checking if it's in the reset map;
      // if so, apply the reset state and remove it from the map.
      if (channelIdxToResetState.current.has(channelIndex) && doesVolumeMatchViewMode(viewMode, volume)) {
        const resetState = channelIdxToResetState.current.get(channelIndex);
        if (resetState) {
          // Initialize default LUT if needed
          if (isEqual(resetState.controlPoints, USE_DEFAULT_LUT_FOR_CONTROL_POINTS)) {
            const lut = getDefaultLut(volume.getHistogram(channelIndex));
            resetState.controlPoints = lut.controlPoints;
            resetState.ramp = controlPointsToRamp(lut.controlPoints);
          }
          resetChannelState(changeChannelSetting, channelIndex, resetState);
        }
        channelIdxToResetState.current.delete(channelIndex);
      }
    },
    [viewMode, channelSettings]
  );
  onChannelLoadedRef.current = onChannelLoaded;

  const context = useMemo(() => {
    ref.current = {
      ...ref.current,
      resetToSavedViewerState,
      resetToDefaultViewerState,
      onChannelLoaded: (volume: Volume, channelIndex: number) => onChannelLoadedRef.current(volume, channelIndex),
      setSavedChannelState,
      getSavedChannelState,
    };

    // `ref` is wrapped in another object to ensure that the context updates when state does.
    // (`ref` on its own would always compare equal to itself and the context would never update.)
    return { ref };
  }, [
    ref.current,
    props.viewerStateInputProps,
    channelSettings,
    resetToDefaultViewerState,
    resetToSavedViewerState,
    onChannelLoaded,
    getSavedChannelState,
    setSavedChannelState,
  ]);

  return <ViewerStateContext.Provider value={context}>{props.children}</ViewerStateContext.Provider>;
};

export default ResetStateProvider;
