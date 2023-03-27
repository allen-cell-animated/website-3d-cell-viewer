import React, { useEffect } from "react";

import { View3d, Volume } from "@aics/volume-viewer";

import { controlPointsToLut } from "../../shared/utils/controlPointsToLut";
import { ChannelState } from "../../shared/utils/viewerChannelSettings";
import { UseImageEffectType } from "./types";

interface ChannelUpdaterProps {
  index: number;
  channelState: ChannelState;
  view3d: View3d;
  image: Volume | null;
  channelLoaded: boolean;
}

/**
 * A component that doesn't render anything, but reacts to the provided `ChannelState`
 * and keeps it in sync with the viewer.
 */
const ChannelUpdater: React.FC<ChannelUpdaterProps> = ({ index, channelState, view3d, image, channelLoaded }) => {
  const { volumeEnabled, isosurfaceEnabled, isovalue, colorizeEnabled, colorizeAlpha, opacity, color, controlPoints } =
    channelState;

  // Effects to update channel settings should check if image is present and channel is loaded first
  const useImageEffect: UseImageEffectType = (effect, deps) => {
    useEffect(() => {
      if (image && channelLoaded) {
        return effect(image);
      }
    }, [...deps, image, channelLoaded]);
  };

  useImageEffect(
    (image) => {
      view3d.setVolumeChannelEnabled(image, index, volumeEnabled);
      view3d.updateLuts(image);
    },
    [volumeEnabled]
  );

  useImageEffect((image) => view3d.setVolumeChannelOptions(image, index, { isosurfaceEnabled }), [isosurfaceEnabled]);

  useImageEffect((image) => view3d.setVolumeChannelOptions(image, index, { isovalue }), [isovalue]);

  useImageEffect((image) => view3d.setVolumeChannelOptions(image, index, { isosurfaceOpacity: opacity }), [opacity]);

  useImageEffect(
    (image) => {
      view3d.setVolumeChannelOptions(image, index, { color });
      view3d.updateLuts(image);
    },
    [color]
  );

  useImageEffect(
    (image) => {
      if (colorizeEnabled) {
        // TODO get the labelColors from the tf editor component
        const lut = image.getHistogram(index).lutGenerator_labelColors();
        image.setColorPalette(index, lut.lut);
        image.setColorPaletteAlpha(index, colorizeAlpha);
      } else {
        image.setColorPaletteAlpha(index, 0);
      }
      view3d.updateLuts(image);
    },
    [colorizeEnabled]
  );

  useImageEffect(
    (image) => {
      const gradient = controlPointsToLut(controlPoints);
      image.setLut(index, gradient);
      view3d.updateLuts(image);
    },
    [controlPoints]
  );

  useImageEffect(
    (image) => {
      image.setColorPaletteAlpha(index, colorizeEnabled ? colorizeAlpha : 0);
      view3d.updateLuts(image);
    },
    [colorizeAlpha]
  );

  return null;
};

export default ChannelUpdater;
