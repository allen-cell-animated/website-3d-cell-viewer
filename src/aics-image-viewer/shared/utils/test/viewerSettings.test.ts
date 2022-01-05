import { describe, expect, it } from "@jest/globals";

import {
  getDisplayName,
  matchChannel,
  findFirstChannelMatch,
  ViewerChannelSettings,
  ViewerChannelSetting,
  ViewerChannelGroup,
} from "../initialViewerSettings";

describe("viewer settings", () => {
  describe("matching names", () => {
    it.each([
      ["test1", [true, false, false]],
      ["test", [true, true, true]],
      ["^test$", [false, false, false]],
      ["1|2", [true, true, false]],
      [1, [false, true, false]],
    ])("matches against %p", (re, expected) => {
      const channelNames = ["test1", "test2", "test3"];
      const setting: ViewerChannelSetting = { match: re };
      const result = channelNames.map((ch, i) => {
        return matchChannel(ch, i, setting);
      });
      expect(result).toEqual(expected);
    });
  });
});
