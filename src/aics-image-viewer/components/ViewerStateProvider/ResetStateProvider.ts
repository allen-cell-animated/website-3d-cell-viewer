import { Volume } from "@aics/volume-viewer";
import { isEqual } from "lodash";
import { Vector3 } from "three";

import { ChannelState, ViewerState, ViewerStateContextType } from "./types";
import { getDefaultViewerState, getDefaultCameraState, getDefaultChannelState } from "../../shared/constants";
import { ViewMode } from "../../shared/enums";
import {
  overrideViewerState,
  overrideChannelState,
  getEnabledChannelIndices,
  matchesSavedSubregion,
} from "../../shared/utils/viewerState";

/**
 * Provides reset functionality for the viewer and channel states.
 */
export default class ResetStateProvider {
  savedViewerState: Partial<ViewerState>;
  /**
   * A map from channel indices to their reset states. Channels that are in this map
   * should be reset to the state value once they are loaded, and will be removed
   * from the map once the reset is applied.
   */
  channelIdxToResetState: Map<number, ChannelState>;
  /**
   * The subregion size of the volume for the currently saved viewer and channel settings.
   * Can be used for comparison to determine whether the correct volume has been loaded
   * during reset (or when saving channels that are loaded for the first time).
   */
  savedSubregionSize: Vector3 | null;
  savedChannelSettings: Record<number, ChannelState | undefined>;

  ref: React.MutableRefObject<ViewerStateContextType>;

  constructor(ref: React.MutableRefObject<ViewerStateContextType>) {
    this.savedViewerState = {};
    this.channelIdxToResetState = new Map();
    this.savedSubregionSize = null;
    this.savedChannelSettings = {};
    this.ref = ref;

    this.resetToSavedViewerState = this.resetToSavedViewerState.bind(this);
    this.resetToDefaultViewerState = this.resetToDefaultViewerState.bind(this);
    this.setSavedViewerState = this.setSavedViewerState.bind(this);
    this.setSavedChannelState = this.setSavedChannelState.bind(this);
    this.getSavedChannelState = this.getSavedChannelState.bind(this);
    this.onChannelLoaded = this.onChannelLoaded.bind(this);
    this.setSavedSubregionSize = this.setSavedSubregionSize.bind(this);
    this.getSavedSubregionSize = this.getSavedSubregionSize.bind(this);
  }

  // Setup Callbacks ////////////////////////////////////////////////////////////////////

  public setSavedViewerState(state: Partial<ViewerState>) {
    this.savedViewerState = state;
  }

  public setSavedChannelState(index: number, state: ChannelState | undefined) {
    this.savedChannelSettings[index] = state;
  }

  public getSavedChannelState(index: number): ChannelState | undefined {
    return this.savedChannelSettings[index];
  }

  /**
   * Helper method. Resets the viewer and all channels to the provided state. If new data needs to
   * be loaded, handles setup so the reset will be applied to each channel as it loads in.
   */
  private resetToState(newState: ViewerState, newChannelStates: ChannelState[]) {
    const { changeViewerSetting, changeChannelSetting, viewMode, time, slice } = this.ref.current;

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
      this.channelIdxToResetState = new Map(enabledChannelsAndResetState);
    }
  }

  /** Resets to the initial saved state of the viewer, as shown to the user on load. */
  public resetToSavedViewerState() {
    const { channelSettings } = this.ref.current;
    const newViewerState = {
      ...getDefaultViewerState(),
      cameraState: getDefaultCameraState(this.savedViewerState.viewMode || ViewMode.threeD),
      ...this.savedViewerState,
    };
    const newChannelSettings = channelSettings.map((_, index) => {
      return this.savedChannelSettings[index] || getDefaultChannelState(index);
    });

    this.resetToState(newViewerState, newChannelSettings);
  }

  /** Reset to global default viewer state, as if loading the volume with no parameters. */
  public resetToDefaultViewerState() {
    const { channelSettings } = this.ref.current;
    const defaultViewerState = { ...getDefaultViewerState(), cameraState: getDefaultCameraState(ViewMode.threeD) };
    const defaultChannelStates = channelSettings.map((_, index) => getDefaultChannelState(index));
    for (let i = 0; i < defaultChannelStates.length; i++) {
      if (i < 3) {
        defaultChannelStates[i].volumeEnabled = true;
      }
      defaultChannelStates[i].needsDefaultLut = true;
    }

    this.resetToState(defaultViewerState, defaultChannelStates);
  }

  public onChannelLoaded(volume: Volume, channelIndex: number) {
    const { changeChannelSetting } = this.ref.current;
    // Check if the channel needs to be reset after loading by checking if it's in the reset map;
    // if so, apply the reset state and remove it from the map.
    const resetState = this.channelIdxToResetState.get(channelIndex);
    if (resetState && matchesSavedSubregion(this.savedSubregionSize, volume.imageInfo.subregionSize)) {
      overrideChannelState(changeChannelSetting, channelIndex, resetState);
      this.channelIdxToResetState.delete(channelIndex);
    }
  }

  public setSavedSubregionSize(size: Vector3 | null): void {
    this.savedSubregionSize = size;
  }

  public getSavedSubregionSize(): Vector3 | null {
    return this.savedSubregionSize;
  }
}
