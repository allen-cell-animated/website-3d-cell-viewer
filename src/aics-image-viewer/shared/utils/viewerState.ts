import { Vector3 } from "three/src/Three";

import {
  ChannelSettingUpdater,
  ChannelState,
  ViewerSettingUpdater,
  ViewerState,
} from "../../components/ViewerStateProvider/types";

/** Sets all fields of the viewer state to the values of the `newState`. */
export function overrideViewerState(changeViewerSetting: ViewerSettingUpdater, newState: ViewerState): void {
  for (const key of Object.keys(newState) as (keyof ViewerState)[]) {
    changeViewerSetting(key, newState[key] as any);
  }

  // Pathtrace rendering is not allowed in 2D view mode but is in 3D mode.
  // Since we're not guaranteed on the order of object keys, apply changes to render mode a second time
  // in case we were previously in 2D view mode and the change was blocked, but we're now in 3D.
  changeViewerSetting("renderMode", newState.renderMode);
}

/** Sets all fields of the channel state for a given index using the provided `newState` (except for the name). */
export function overrideChannelState(
  changeChannelSetting: ChannelSettingUpdater,
  index: number,
  newState: ChannelState
): void {
  for (const key of Object.keys(newState) as (keyof ChannelState)[]) {
    // Skip resetting name to default, since this causes channels to be dropped from the UI.
    if (key === "name") {
      continue;
    }
    changeChannelSetting(index, key, newState[key] as any);
  }
}

/** Returns the indices of channels that have either the volume or isosurface enabled. */
export function getEnabledChannelIndices(channelSettings: ChannelState[]): number[] {
  const enabledChannels = [];
  for (let i = 0; i < channelSettings.length; i++) {
    if (channelSettings[i].volumeEnabled || channelSettings[i].isosurfaceEnabled) {
      enabledChannels.push(i);
    }
  }
  return enabledChannels;
}

/** Returns whether two subregions match in the X and Y axes. */
export function matchesSavedSubregion(subregion: Vector3 | null, savedSubregion: Vector3 | null): boolean {
  // Fixes a bug in 2D-XY mode where the initial saved subregion is always saved with a z-thickness of 1, but the
  // actual volume can have slices chunked in z >= 2. We drop the Z dimension from the comparison of (x, y, 1)
  // and (x, y, z) to prevent it from failing.
  return (
    savedSubregion !== null &&
    subregion !== null &&
    subregion.x === savedSubregion.x &&
    subregion.y === savedSubregion.y
  );
}
