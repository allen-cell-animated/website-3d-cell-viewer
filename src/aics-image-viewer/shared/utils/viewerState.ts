import { Volume } from "@aics/volume-viewer";
import {
  ChannelSettingUpdater,
  ChannelState,
  ViewerSettingUpdater,
  ViewerState,
} from "../../components/ViewerStateProvider/types";
import { ViewMode } from "../enums";

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

// TODO: Does this fail if data is chunked in a way that does not allow for subregions of chunk size z=1?
// Is that possible?
export function doesVolumeMatchViewMode(viewMode: ViewMode, volume: Volume): boolean {
  const isXyAndLoadingXy = viewMode === ViewMode.xy && volume.imageInfo.subregionSize.z === 1;
  const is3dAndLoading3d = viewMode !== ViewMode.xy && volume.imageInfo.subregionSize.z > 1;
  const is2dVolume = volume.imageInfo.originalSize.z === 1;
  return isXyAndLoadingXy || is3dAndLoading3d || is2dVolume;
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
