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
    it("matches against regexes", () => {
      const channelNames = ["test1", "test2", "test3"];
      const settings: ViewerChannelSettings = {
        groups: [{ name: "Channels", channels: [{ match: "test1" }] }],
        maskChannelName: "",
      };
      const result = channelNames.map((ch, i) => {
        return matchChannel(ch, i, settings.groups[0].channels[0]);
      });
      expect(result).toEqual([true, false, false]);
    });
  });
});
