import { convertUrlToQueryStringPath } from "../website/utils/route_utils";

// Convert the current URL to a query string path and redirect the browser.
const location = window.location;
const locationUrl = new URL(location.toString());
location.replace(convertUrlToQueryStringPath(locationUrl));
