const ESCAPED_AMPERSAND = "~and~";

/**
 * Converts the path component of a URL into a query string. Used to redirect the browser
 * for single-page apps when the server is not configured to serve the app for all paths,
 * e.g. GitHub pages.
 *
 * Adapted from https://github.com/rafgraph/spa-github-pages.
 *
 * The original path will be converted into a query string, and the original query string will be
 * escaped and separated with an `&` character.
 *
 * @example
 * ```
 * const url = "https://www.example.com/one/two?a=b&c=d#qwe";
 * //                               Original: "https://www.example.com/one/two?a=b&c=d#qwe"
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
  // Remove the "?" and replace with an "&" to separate the path from the original query string.
  // Escape existing ampersands with "~and~" so "&" is preserved as our path/query separator.
  const queryPath = remainingPath.replace(/&/g, ESCAPED_AMPERSAND);
  const queryString = url.search ? url.search.slice(1).replace(/&/g, ESCAPED_AMPERSAND) : "";

  let newUrl = `${url.origin}${basePath}/?/${queryPath}`;
  newUrl += queryString ? `&${queryString}` : "";
  newUrl += url.hash;

  return new URL(newUrl);
}

export function isQueryStringPath(url: URL): boolean {
  return url.search !== "" && url.search.startsWith("?/");
}

/**
 * Converts a query string back into a complete URL. Used in combination with `convertUrlToQueryStringPath()`.
 * to redirect the browser for single-page apps when the server cannot be configured, e.g. GitHub pages.
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
    .split("&") // Split the original path [idx 0] and query string [idx 1]
    .map((s) => s.replace(new RegExp(ESCAPED_AMPERSAND, "g"), "&")) // Restore escaped ampersands
    .join("?"); // Rejoin the path and query string

  return new URL(`${url.origin}${url.pathname}${newPathAndQueryString}${url.hash}`);
}
