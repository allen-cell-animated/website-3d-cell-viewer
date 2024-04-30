import { convertUrlToQueryStringPath } from "../../website/utils/route_utils";
import "./styles.css";

// This script is used in the 404.html page to redirect the browser to the correct URL.
// Convert the current URL to a query string path and redirect the browser.
const location = window.location;
const locationUrl = new URL(location.toString());
const newUrl = convertUrlToQueryStringPath(locationUrl, 1);
location.replace(newUrl);
console.log("Redirecting to " + newUrl.toString());
