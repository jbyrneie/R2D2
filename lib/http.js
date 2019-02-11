import request from 'superagent-bluebird-promise'
import QueryString from 'query-string';
import Cookie from "js-cookie";

export function post(path, data) {
  return request
    .post(path)
    .timeout(60000)
    .withCredentials()
    .send(data)
    .then((res) => {
      return res.text ? JSON.parse(res.text) : null
    })
}

export function get(path) {
  return request
    .get(path)
    .timeout(60000)
    .withCredentials()
    .then((res) => {
      return JSON.parse(res.text)
    })
}

export function getCookie(cookieName, doNotTrim = false) {
  if (cookieName === undefined || cookieName === null || cookieName === '') {
    console.warn('Empty/null/undefined cookie name provided.');
    return '';
  }
  const cookieValue = Cookie.get(cookieName) || '';
  return doNotTrim ? cookieValue : cookieValue.trim();
}
