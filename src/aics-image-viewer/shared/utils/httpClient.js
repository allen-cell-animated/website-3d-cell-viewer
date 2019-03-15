export default class HttpClient {

  // fetch response.json() is a promise but we want return the json itself
  parseJSON(response, options) {
    return response.json()
      .then((json) => ({
        locationHeader: response.headers.get('Location'),
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
          host: this.BASE_URL,
          time: (new Date()).toISOString()
        }
      }));
  }

  getJSON(url, options) {
    return fetch(url, options)
      .then(response => {
        return this.parseJSON(response, options);
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
