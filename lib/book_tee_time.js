const request = require('request-promise');
const utils = require('./utils');
const status = require('./status');
const moment = require('moment');
const HOME_PAGE = 'https://www.brsgolf.com/wicklow/member/login'
const LOGIN_PAGE = 'https://www.brsgolf.com/wicklow/member/login_check'
const TEE_TIME_PAGE = 'https://www.brsgolf.com/wicklow/members_booking.php?operation=member_day&course_id1=1&d_date='
const BOOK_TEE_TIME = 'https://www.brsgolf.com/wicklow/members_booking.php?operation=member_process_booking'
const MEMBERS_BOOKING_FORM = 'https://www.brsgolf.com/wicklow/members_booking.php?operation=member_booking_form'

const _include_headers = function(body, response, resolveWithFullResponse) {
  return {'headers': response.headers, 'body': body};
};

_get_tee_time_page = function(whatDate, phpsessid) {
  const options = {
    method: 'GET',
    uri: `${TEE_TIME_PAGE}${whatDate}`,
    headers: {
      'User-Agent': 'R2D2 UA',
      'Cookie': `PHPSESSID=${phpsessid};`
    },
    transform: _include_headers
  };

  // Get the Page
  return new Promise(function(resolve, reject) {
    request(options)
    .then((response) => {
      if ((response.body.indexOf('To book a tee time') >= 0) || (response.body.indexOf('you have hit refresh too soon') >= 0)) {
        console.log(`tee-time page found for ${whatDate}`);
        resolve(response)
      } else {
        console.log(response.body);
        throw new Error(`tee-time page for ${whatDate} not found`)
      }
    })
  })
}

_numFreeSlots = function(slots) {
    let numFree = 0;

    for (var i = 0; i < slots.length; i++)
      if (slots[i])
        numFree++

    return numFree
}

_get_tee_time = function(response, time) {
  const splitted = response.split("\n")
  let index = utils.get_index(splitted, `${time}</td>`)

  let freeSlots = [false, false, false, false]
  if (index >= 0) {
    console.log(`tee-time ${time} found`);

    if (splitted[index+4] == '<td></td>')
      freeSlots[0] = true

    if (splitted[index+5] == '<td></td>')
      freeSlots[1] = true

    if (splitted[index+6] == '<td></td>')
      freeSlots[2] = true

    if (splitted[index+7] == '<td></td>')
      freeSlots[3] = true

    console.log(`Free Slots: ${_numFreeSlots(freeSlots)}`);
    const isItBooked = splitted[index+8]
    const edit = splitted[index+14]

    if (isItBooked.indexOf('Booked') >= 0) {
      console.log('This line is booked')
      return {status: status.ALREADY_BOOKED, freeSlots: freeSlots}
    } else if (isItBooked.indexOf('Only Allowed 1 tee time') >= 0) {
      console.log('You can only book 1 tee-time')
      return {status: status.ALREADY_BOOKED_BY_YOU, freeSlots: freeSlots}
    } else if (isItBooked.indexOf('Only&nbsp;Allowed<br>4 Players') >= 0) {
      console.log('4 Players are booked already')
      return {status: status.ALREADY_BOOKED, freeSlots: freeSlots}
    } else if (isItBooked.indexOf('All 4 players are already booked') >= 0) {
      console.log('All 4 Players are aleady booked already')
      return {status: status.ALREADY_BOOKED, freeSlots: freeSlots}
    } else if (isItBooked.indexOf('Not Live Yet') >= 0) {
      console.log('This line is not live yet')
      return {status: status.NOT_LIVE_YET, freeSlots: freeSlots}
    } else if (edit.indexOf('Edit') >= 0) {
      console.log('This line is already booked by you')
      return {status: status.ALREADY_BOOKED_BY_YOU, freeSlots: freeSlots}
    }
    /*
    else {
      console.log('isItBooked: ', isItBooked);
      // TODO
    }
    */

    //else @@courseId = get_key_value('value', splitted[index+11])

    let bookingType = splitted[index+14]
    if (bookingType.indexOf('Casual') >= 0)
      bookingType = 'casual'
    else
      bookingType = 'competition'

    const bookNow = splitted[index+14]
    if (bookNow.indexOf('Book Now') >= 0) {
      return {status: status.AVAILABLE, freeSlots: freeSlots}
    } else {
      return {status: status.UNAVAILABLE, freeSlots: freeSlots}
    }
  } else {
    console.log(`didnt find tee-time for ${time}`);
    index = utils.get_index(splitted, 'you have hit refresh too soon')
    if (index >= 0)
      return {status: status.REFRESH, freeSlots: freeSlots}
    else
      return {status: status.TIME_NOT_FOUND, freeSlots: freeSlots}
  }
}

_fillSlots = function(form, freeSlots, player1UID, player2UID, player3UID, player4UID) {
  let playerUIDs = [player1UID?player1UID:null, player2UID?player2UID:null, player3UID?player3UID:null, player4UID?player4UID:null]
  const slots = ['Player1_uid', 'Player2_uid', 'Player3_uid', 'Player4_uid']

  for (var i = 0; i < freeSlots.length; i++) {
    if (freeSlots[i]) {
      for (var j = 0; j < playerUIDs.length; j++) {
        if (playerUIDs[j] && playerUIDs[j]!=-1) {
          form[slots[i]] = playerUIDs[j]
          playerUIDs[j] = null
          break;
        }
      }
    }
  }

  //console.log('form: ', JSON.stringify(form));
  return form
}

_book_the_tee_time = function(bookingCode, phpsessid, freeSlots, teeTime, dateRequired, player1UID, player2UID, player3UID, player4UID) {
  const options = {
    method: 'POST',
    uri: BOOK_TEE_TIME,
    headers: {
      'User-Agent': 'R2D2 UA',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': `PHPSESSID=${phpsessid};`
    },
    form: {
      'double_click': 'Yes',
      'course_id': '1',
      'd_date': dateRequired,
      'TeeTime': `${teeTime}:00`,
      'bookingCode': bookingCode // get this from previous page
    },
    transform: _include_headers,
    simple: false,
  };

  options.form = _fillSlots(options.form, freeSlots, player1UID, player2UID, player3UID, player4UID)
  console.log('Booking Tee Time for: ', JSON.stringify(options.form));

  // Book the tee-time
  return new Promise(function(resolve, reject) {
    request(options)
    .then((response) => {
      if (response.body.indexOf('The tee time has been successfully booked') >= 0) {
        console.log(`tee-time booked for ${teeTime} on ${dateRequired}`);
        resolve(response.body)
      } else throw new Error(`Bummer, the tee-time was not booked ${teeTime} on ${dateRequired}`)
    })
    .catch(function (err) {
      console.log('error: ', err);
      resolve(status.ERROR)
    })
  })
}

_get_time_difference = function(dateComesAlive) {
  console.log('_get_time_difference: ', dateComesAlive);
  const comesAlive = moment(dateComesAlive, 'YYYY-MM-DD HH:mm:ss')
	const now = moment(new Date());
  return moment.duration(comesAlive.diff(now)).asSeconds()
}

_book_the_tee_time_recursive = function(whatDate, time, dateComesAlive, phpsessid, player1UID, player2UID, player3UID, player4UID) {
  return new Promise(function(resolve, reject) {
    return _get_tee_time_page(whatDate, phpsessid)
    .then((response) => {
      const resp = _get_tee_time(response.body, time)

      switch (resp.status) {
        case status.NOT_LIVE_YET:
          console.log('NOT_LIVE_YET')
          resolve(status.NOT_LIVE_YET)
          break;
        case status.REFRESH:
          console.log('Found REFRESH so going to refresh another page instead')
          // Load another page to fool refresh
          let nextDay = moment(whatDate).add(1,'days').format('YYYY-MM-DD')
          return _get_tee_time_page(nextDay, phpsessid)
          .then((response) => {
            console.log('loaded dummy page response....');
            if ((response.body.indexOf('To book a tee time') >= 0) || (response.body.indexOf('you have hit refresh too soon') >= 0))
              // TODO console.log(`tee-time page found for ${whatDate}`);
              console.log('dummy refresh done....');
            resolve(_book_the_tee_time_recursive(whatDate, time, dateComesAlive, phpsessid, player1UID, player2UID, player3UID, player4UID))
          })
          break
        case status.ALREADY_BOOKED:
          console.log('ALREADY_BOOKED')
          resolve(status.ALREADY_BOOKED)
          break
        case status.ALREADY_BOOKED_BY_YOU:
          console.log('ALREADY_BOOKED_BY_YOU')
          resolve(status.ALREADY_BOOKED_BY_YOU)
          break
        case status.UNAVAILABLE:
          console.log('TeeTime UNAVAILABLE')
          resolve(status.UNAVAILABLE)
          break
        case status.AVAILABLE:
          console.log(`Tee-time: ${time} is AVAILABLE on ${whatDate}`)
          console.log(`Reserving teeTime: ${time} freeSlots: ${JSON.stringify(resp.freeSlots)}`)
          const options = {
              method: 'POST',
              uri: MEMBERS_BOOKING_FORM,
              form: {
                'double_click': 'Yes',
                'course_id': '1',
                'd_date': whatDate,
                'TeeTime': `${time}:00`,
                'bookingCode': 'casual' //bookingType TODO
              },
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'R2D2 UA',
                'Cookie': `PHPSESSID=${phpsessid};`
              },
              transform: _include_headers,
              simple: false,
          };

          return request(options)
          .then((response) => {
            if (response.body.indexOf('bookingCode') >= 0) {
              const splitted = response.body.split("\n")
              let index = utils.get_index(splitted, 'bookingCode')

              if (index >= 0) {
                const bookingCode = utils.get_key_value('value', splitted[index])
                console.log('Going to sleep for 20 seconds....')
                //console.log('bookingCode: ', bookingCode, splitted[index]);
                setTimeout(function() {
                  return _book_the_tee_time(bookingCode, phpsessid, resp.freeSlots, time, whatDate, player1UID, player2UID, player3UID, player4UID)
                  .then((response) => {
                    //console.log('_reserve_tee_time response: ', JSON.stringify(response));
                    resolve(status.BOOKED)
                  })
                }, 5000);
              } else {
                console.log('Bummer, bookingCode not found....')
                resolve(status.ERROR)
              }
            } else {
              console.log('Bummer, bookingCode not found....');
              resolve(status.ERROR)
            }
          })
          break
        default:
          console.log(`Dunno whats happening status is: ${status.STATUS_CODE[resp.status]}`)
          resolve(status.ERROR)
      }
    })
  })
}

exports.book_the_tee_time_recursive = function(whatDate, time, dateComesAlive, phpsessid, player1UID, player2UID, player3UID, player4UID) {
  return new Promise(function(resolve, reject) {
    _book_the_tee_time_recursive(whatDate, time, dateComesAlive, phpsessid, player1UID, player2UID, player3UID, player4UID)
    .then((response) => {
      resolve({status: response, phpsessid: phpsessid})
    })
    .catch(function (err) {
      console.log('error: ', err);
      resolve({status: response, phpsessid: phpsessid})
    })
  })
}

exports.book_tee_time = function(login, password, whatDate, time, dateComesAlive, player1UID, player2UID, player3UID, player4UID) {
  const options = {
      method: 'GET',
      uri: HOME_PAGE,
      headers: {
        'User-Agent': 'R2D2 UA'
      },
      transform: _include_headers
  };

  return new Promise(function(resolve, reject) {
    // Get Home Page
    request(options)
    .then((response) => {
      if (response.body.indexOf('Enter Username and Password') >= 0) {
        console.log('Home Page loaded....');
        const cookies = utils.get_cookies(response.headers['set-cookie'])
        return {token: utils.get_key_value('_csrf_token', response.body), phpsessid: utils.get_cookie('PHPSESSID', cookies)}
      } else throw new Error('home-page page not found')
    })
    // Login
    .then((data) => {
      console.log(`Ready to Login username: ${login} password: ${password} _csrf_token: ${data.token} phpsessid: ${data.phpsessid}`);
      const options = {
          method: 'POST',
          uri: LOGIN_PAGE,
          form: {
            '_csrf_token': data.token,
            '_username': login,
            '_password': password
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'R2D2 UA',
            'Cookie': `PHPSESSID=${data.phpsessid};`
          },
          transform: _include_headers,
          simple: false,
      };

      return request(options)
      .then((response) => {
        if (response.body.indexOf('loggedIn=true') >= 0) {
          console.log('Logged In....');
          const cookies = utils.get_cookies(response.headers['set-cookie'])
          return utils.get_cookie('PHPSESSID', cookies)
        } else {
          throw new Error('Failed to login.....')
        }
      })
    })
    .then((phpsessid) => {
      return _book_the_tee_time_recursive(whatDate, time, dateComesAlive, phpsessid, player1UID, player2UID, player3UID, player4UID)
      .then((response) => {
        resolve({status: response, phpsessid: phpsessid})
      })
    })
    .catch(function (err) {
      console.log('error: ', err);
      resolve({status: status.ERROR, phpsessid: null})
    })
  })
}


exports.login = function(login, password) {
  const options = {
      method: 'GET',
      uri: HOME_PAGE,
      headers: {
        'User-Agent': 'R2D2 UA'
      },
      transform: _include_headers
  };

  return new Promise(function(resolve, reject) {
    // Get Home Page
    request(options)
    .then((response) => {
      if (response.body.indexOf('Enter Username and Password') >= 0) {
        console.log('Home Page loaded....');
        const cookies = utils.get_cookies(response.headers['set-cookie'])
        return {token: utils.get_key_value('_csrf_token', response.body), phpsessid: utils.get_cookie('PHPSESSID', cookies)}
      } else throw new Error('home-page page not found')
    })
    // Login
    .then((data) => {
      console.log(`Ready to Login username: ${login} password: ${password} _csrf_token: ${data.token} phpsessid: ${data.phpsessid}`);
      const options = {
          method: 'POST',
          uri: LOGIN_PAGE,
          form: {
            '_csrf_token': data.token,
            '_username': login,
            '_password': password
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'R2D2 UA',
            'Cookie': `PHPSESSID=${data.phpsessid};`
          },
          transform: _include_headers,
          simple: false,
      };

      return request(options)
      .then((response) => {
        if (response.body.indexOf('loggedIn=true') >= 0) {
          console.log('Logged In....');
          const cookies = utils.get_cookies(response.headers['set-cookie'])
          resolve({status: status.LOGGED_IN, phpsessid: utils.get_cookie('PHPSESSID', cookies)})
        } else {
          throw new Error('Failed to login.....')
        }
      })
    })
    .catch(function (err) {
      console.log('error: ', err);
      resolve({status: status.ERROR, phpsessid: null})
    })
  })
}
