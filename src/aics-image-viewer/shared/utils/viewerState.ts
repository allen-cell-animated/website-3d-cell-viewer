import { Volume } from "@aics/volume-viewer";
import {
  ChannelSettingUpdater,
  ChannelState,
  ViewerSettingUpdater,
  ViewerState,
} from "../../components/ViewerStateProvider/types";
import { ViewMode } from "../enums";

export function resetViewerState(changeViewerSetting: ViewerSettingUpdater, newState: ViewerState): void {
  for (const key of Object.keys(newState) as (keyof ViewerState)[]) {
    changeViewerSetting(key, newState[key] as any);
  }

  // Pathtrace mode is not allowed in 2D mode. Handle the edge case where the user switched
  // from 2D mode to 3D mode but pathtrace mode was forcibly disabled.
  changeViewerSetting("renderMode", newState.renderMode);
}

export function resetChannelState(
  changeChannelSetting: ChannelSettingUpdater,
  index: number,
  newState: ChannelState
): void {
  console.log("Resetting channel ", index);
  for (const key of Object.keys(newState) as (keyof ChannelState)[]) {
    // Skip resetting name to default, since this causes channels to be dropped from the
    // UI altogether.
    if (key === "name") {
      continue;
    }
    changeChannelSetting(index, key, newState[key] as any);
  }
}

// TODO: Does this fail if data is chunked in a way that does not allow for subregions of chunk size z=1? Is that possible?
export function doesVolumeMatchViewMode(viewMode: ViewMode, volume: Volume): boolean {
  const isXyAndLoadingXy = viewMode === ViewMode.xy && volume.imageInfo.subregionSize.z === 1;
  const is3dAndLoading3d = viewMode === ViewMode.threeD && volume.imageInfo.subregionSize.z > 1;
  return isXyAndLoadingXy || is3dAndLoading3d;
}
