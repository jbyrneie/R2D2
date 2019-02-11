const request = require('request-promise');
const moment = require('moment');
const utils = require('./utils');
const _ = require('lodash');
let Cookie = require('request-cookies').Cookie;
const SMS_HOME_PAGE = 'https://webtexts.three.ie/'
const SMS_LOGIN = 'https://webtexts.three.ie/users/login'
const SMS_SEND = 'https://webtexts.three.ie/messages/send'

const _include_headers = function(body, response, resolveWithFullResponse) {
  return {'headers': response.headers, 'body': body};
};

exports.send_sms = function(login, password, recipient, message) {
  const options = {
      method: 'GET',
      uri: SMS_HOME_PAGE,
      headers: {
        'User-Agent': 'R2D2 UA'
      },
      transform: _include_headers
  };

  // Get Home Page
  request(options)
  .then((response) => {
    return utils.get_key_value('_token', response.body)
  })
  // Login
  .then((token) => {
    const options = {
        method: 'POST',
        uri: SMS_LOGIN,
        form: {
          '_token': token,
          'email': login,
          'password': password
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'R2D2 UA'
        },
        transform: _include_headers,
        simple: false
    };

    return request(options)
    .then((response) => {
      console.log('Logged In....');
      const cookies = utils.get_cookies(response.headers['set-cookie'])
      const data = {AWSALB: utils.get_cookie('AWSALB', cookies), laravel_session: utils.get_cookie('laravel_session', cookies), _token: token}
      return data
    })
  })
  // Send SMS
  .then((data) => {
    console.log('About to send SMS');
    const options = {
        method: 'POST',
        uri: SMS_SEND,
        form: {
          '_token': data._token,
          'message': message,
          'recipients_contacts[]': `${recipient}|contact`
        },
        headers: {
          'Cookie': `AWSALB=${data.AWSALB}; laravel_session=${data.laravel_session}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        transform: _include_headers,
        simple: false,
    };

    return request(options)
    .then((response) => {
      console.log(`Messgae sent to ${recipient}`);
    })
  })
  .catch(function (err) {
    console.log('error: ', err);
  })
}
