const BASE_URL = process.env.IMAGE_VIEWER_SERVICE_URL;

export default class HttpClient {

  // fetch response.json() is a promise but we want return the json itself
  static parseJSON(response, options) {
    return response.json()
      .then((json) => ({
        locationHeader: (options && options.absolute) ? '' : `${BASE_URL}/${response.headers.get('Location')}`,
        status: response.status,
        ok: response.ok,
        data: json || {
          data: [],
          total_count: 0
        }
      }))
      .catch(() => ({
        status: response.status,
        ok: response.ok,
        data: {
          error: 'unknown_error',
          message: 'error in parsing response json',
          host: BASE_URL,
          time: (new Date()).toISOString()
        }
      }));
  }

  static getJSON(url, options) {
    return fetch((options && options.absolute) ? `${url}` : `${BASE_URL}${url}`, options)
      .then(response => {
        return HttpClient.parseJSON(response, options);
      })
      .then(response => {
        if (response.ok) {
          return response;
        } else {
          // fetch will not automatically reject error status codes
          // however, we want to treat error status codes as failures
          // so we reject here
          return Promise.reject(response);
        }
      });
  }
}
