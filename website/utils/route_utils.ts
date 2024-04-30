const ESCAPED_AMPERSAND = "~and~";

/**
 * Converts the path component of a URL into a query string. Used to redirect the browser
 * for single-page apps when the server is not configured to serve the app for all paths.
 * Adapted from https://github.com/rafgraph/spa-github-pages.
 *
 * @example
 * ```
 * const url = "https://www.example.com/one/two?a=b&c=d#qwe";
 * convertUrlToQueryStringPath(url, 0); // => "https://www.example.com/?/one/two&a=b~and~c=d#qwe"
 * convertUrlToQueryStringPath(url, 1); // => "https://www.example.com/one/?/two&a=b~and~c=d#qwe"
 * ```
 *
 * @param url - The URL to convert.
 * @param basePathSegments - The number of path segments to keep in the URL. 0 by default.
 *
 * @returns The URL with the path converted to a query string, and the original query string escaped.
 */
export function convertUrlToQueryStringPath(url: URL, basePathSegments: number = 0): URL {
  const pathSegments = url.pathname.split("/");
  const basePath = pathSegments.slice(0, basePathSegments + 1).join("/");
  const remainingPath = pathSegments.slice(basePathSegments + 1).join("/");
  const queryPath = remainingPath.replace(/&/g, ESCAPED_AMPERSAND);
  // Remove the `?` and replace with an `&` if there are already query parameters
  const queryString = url.search ? url.search.slice(1).replace(/&/g, ESCAPED_AMPERSAND) : "";

  return new URL(`${url.origin}${basePath}/?/${queryPath}&${queryString}${url.hash}`);
}

export function isQueryStringPath(url: URL): boolean {
  return url.search !== "" && url.search.startsWith("?/");
}

/**
 * Converts a query string back into a complete URL. Used in combination with `convertUrlToQueryStringPath`.
 * to redirect the browser for single-page apps when the server cannot be configured.
 * Adapted from https://github.com/rafgraph/spa-github-pages.
 *
 * @param url - The URL with a path converted to a query string, and the original query string escaped.
 * @returns The original URL, with path instead of a query string.
 */
export function convertQueryStringPathToUrl(url: URL): URL {
  if (!url.search || !url.search.startsWith("?/")) {
    return url;
  }

  const newPathAndQueryString = url.search
    .slice(2) // Remove first ? character and slash
    .split("&") // Split the original path [0] and query string [1]
    .map((s) => s.replace(new RegExp(ESCAPED_AMPERSAND, "g"), "&")) // Restore escaped ampersands
    .join("?"); // Rejoin the path and query string

  return new URL(`${url.origin}${newPathAndQueryString}${url.hash}`);
}
