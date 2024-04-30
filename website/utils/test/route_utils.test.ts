import { describe, expect, it } from "@jest/globals";
import { convertQueryStringPathToUrl, convertUrlToQueryStringPath } from "../route_utils";

describe("Route utils", () => {
  describe("convertUrlToQueryStringPath", () => {
    it("converts paths to query string", () => {
      const url = new URL("https://www.example.com/one/two");
      const convertedUrl = convertUrlToQueryStringPath(url, 0);
      expect(convertedUrl.toString()).toEqual("https://www.example.com/?/one/two");
    });

    it("handles extra slashes", () => {
      const url = new URL("https://www.example.com/one/two/");
      const convertedUrl = convertUrlToQueryStringPath(url, 0);
      expect(convertedUrl.toString()).toEqual("https://www.example.com/?/one/two/");
    });

    it("handles original query params and hashes", () => {
      const url = new URL("https://www.example.com/one/two?a=0&b=1#hash");
      const convertedUrl = convertUrlToQueryStringPath(url, 0);
      expect(convertedUrl.toString()).toEqual("https://www.example.com/?/one/two&a=0~and~b=1#hash");
    });

    it("handles base path segments", () => {
      const url = new URL("https://www.example.com/one/two/");
      const convertedUrl1 = convertUrlToQueryStringPath(url, 1);
      expect(convertedUrl1.toString()).toEqual("https://www.example.com/one/?/two/");

      const convertedUrl2 = convertUrlToQueryStringPath(url, 2);
      expect(convertedUrl2.toString()).toEqual("https://www.example.com/one/two/?/");
    });
  });

  describe("convertQueryStringPathToUrl", () => {
    it("returns original url", () => {
      const url = new URL("https://www.example.com/one/two/");
      const convertedUrl = convertUrlToQueryStringPath(url, 0);
      const restoredUrl = convertQueryStringPathToUrl(convertedUrl);
      expect(restoredUrl.toString()).toEqual(url.toString());
    });

    it("ignores normal urls", () => {
      const url = new URL("https://www.example.com/one/two/");
      const restoredUrl = convertQueryStringPathToUrl(url);
      expect(restoredUrl.toString()).toEqual(url.toString());
    });

    it("ignores normal urls with query parameters", () => {
      const url = new URL("https://www.example.com/one/two/?a=0");
      const restoredUrl = convertQueryStringPathToUrl(url);
      expect(restoredUrl.toString()).toEqual(url.toString());
    });

    it("handles converted query params and hashes", () => {
      const url = new URL("https://www.example.com/one/two?a=0&b=1#hash");
      const convertedUrl = convertUrlToQueryStringPath(url, 0);
      const restoredUrl = convertQueryStringPathToUrl(convertedUrl);
      expect(restoredUrl.toString()).toEqual(url.toString());
    });
  });

  describe("Convert GitHub pages URLs", () => {
    it("handles viewer links", () => {
      const urlsToTest: string[][] = [
        [
          "https://allen-cell-animated.github.io/website-3d-cell-viewer/",
          "https://allen-cell-animated.github.io/website-3d-cell-viewer/?/",
        ],
        [
          "https://allen-cell-animated.github.io/website-3d-cell-viewer/viewer",
          "https://allen-cell-animated.github.io/website-3d-cell-viewer/?/viewer",
        ],
        [
          "https://allen-cell-animated.github.io/website-3d-cell-viewer/viewer?url=https://example.com",
          "https://allen-cell-animated.github.io/website-3d-cell-viewer/?/viewer&url=https://example.com",
        ],
        [
          "https://allen-cell-animated.github.io/website-3d-cell-viewer/viewer?url=https://example.com,https://example2.com",
          "https://allen-cell-animated.github.io/website-3d-cell-viewer/?/viewer&url=https://example.com,https://example2.com",
        ],
        [
          "https://allen-cell-animated.github.io/website-3d-cell-viewer/viewer?url=https://example.com&file=example.json",
          "https://allen-cell-animated.github.io/website-3d-cell-viewer/?/viewer&url=https://example.com~and~file=example.json",
        ],
      ];

      for (const [input, expected] of urlsToTest) {
        const url = new URL(input);
        const convertedUrl = convertUrlToQueryStringPath(url, 1);

        expect(convertedUrl.toString()).toEqual(expected);
        expect(convertQueryStringPathToUrl(convertedUrl).toString()).toEqual(input);
      }
    });
  });
});
