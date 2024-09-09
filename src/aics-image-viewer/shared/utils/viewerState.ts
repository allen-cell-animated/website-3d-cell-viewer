import { Vector3 } from "three/src/Three";

import {
  ChannelSettingUpdater,
  ChannelState,
  ViewerSettingUpdater,
  ViewerState,
} from "../../components/ViewerStateProvider/types";

export function overrideViewerState(changeViewerSetting: ViewerSettingUpdater, newState: ViewerState): void {
  for (const key of Object.keys(newState) as (keyof ViewerState)[]) {
    changeViewerSetting(key, newState[key] as any);
  }

  // Pathtrace rendering is not allowed in 2D view mode.
  // Since we're not guaranteed on the order of object keys, handle the edge case
  // where the viewer was in 2D mode and we are trying to set it to pathtrace + 3D mode, but
  // render mode was set before the view mode.
  changeViewerSetting("renderMode", newState.renderMode);
}

export function overrideChannelState(
  changeChannelSetting: ChannelSettingUpdater,
  index: number,
  newState: ChannelState
): void {
  for (const key of Object.keys(newState) as (keyof ChannelState)[]) {
    // Skip resetting name to default, since this causes channels to be dropped from the
    // UI altogether.
    if (key === "name") {
      continue;
    }
    changeChannelSetting(index, key, newState[key] as any);
  }
}

/** Returns the indices of any channels that have either the volume or isosurface enabled. */
export function getEnabledChannelIndices(channelSettings: ChannelState[]): number[] {
  const enabledChannels = [];
  for (let i = 0; i < channelSettings.length; i++) {
    if (channelSettings[i].volumeEnabled || channelSettings[i].isosurfaceEnabled) {
      enabledChannels.push(i);
    }
  }
  return enabledChannels;
}

// Convenience method
export function subregionMatches(subregion: Vector3 | null, savedSubregion: Vector3 | null): boolean {
  return savedSubregion !== null && subregion !== null && subregion.equals(savedSubregion);
}
