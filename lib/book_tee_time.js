const request = require('request')
const moment = require('moment')
const utils = require('./utils')

const util = require('util')

const requestPromise = util.promisify(request)
const asyncSetTimeout = util.promisify(setTimeout)

const status = require('./status')

const BRS = 'https://members.brsgolf.com'
const HOME_PAGE = 'https://members.brsgolf.com/wicklow'
const LOGIN_PAGE = 'https://members.brsgolf.com/wicklow/login'
const TEE_TIME_PAGE = 'https://members.brsgolf.com/wicklow/tee-sheet/data/1'
const BOOK_TEE_TIME = 'https://www.brsgolf.com/wicklow/members_booking.php?operation=member_process_booking'
const MEMBERS_BOOKING_FORM = 'https://members.brsgolf.com/wicklow/bookings/book'

const _include_headers = function (body, response, resolveWithFullResponse) {
  return { headers: response.headers, body: body }
}

_get_tee_time_page = async function (whatDate, data) {
  console.log(`whatDate: ${whatDate}`)
  const options = {
    method: 'GET',
    uri: `${TEE_TIME_PAGE}/${moment(whatDate).format('YYYY/MM/DD')}`,
    headers: {
      'User-Agent': 'R2D2 UA',
      Cookie: `rmm_sid=${data.rmmsid};consented=1;auth=${data.auth}`
    },
    transform: _include_headers
  }

  // Get the Page
  const response = await requestPromise(options)
  if (response.statusCode === 200 && response.body.indexOf('"tee_time":{') > 0) {
    console.log(`tee-time page found for ${whatDate}`)
    const json = JSON.parse(response.body)
    return json
  } else {
    console.log(`_get_tee_time_page exception ${response.body}`)
    throw new Error(`tee-time page for ${whatDate} not found`)
  }
}

_numFreeSlots = function (teeTime) {
  let numFree = 0

  for (var i = 0; i < teeTime.participants.length; i++) {
    console.log(`name: ${teeTime.participants[i].name}`)
    if (teeTime.participants[i].name === null) numFree++
  }

  return numFree
}

_get_tee_time = async function (json, time) {
  let freeSlots = [false, false, false, false]

  const teeTime = json.times[time].tee_time
  console.log(`teeTime: ${JSON.stringify(teeTime)}`)
  console.log(`teeTime booked: ${teeTime.booked}`)
  const numFreeSlots = _numFreeSlots(teeTime)

  if (teeTime.reason === 'Not Live Yet' || teeTime.url === null) {
    console.log('This line is not live yet')
    return { status: status.NOT_LIVE_YET, freeSlots: freeSlots }
  } else if ((teeTime.editable === true || teeTime.booked === true) && teeTime.bookable === false) {
    console.log('You can only book 1 tee-time')
    return { status: status.ALREADY_BOOKED_BY_YOU, freeSlots: numFreeSlots }
  } else if (teeTime.bookable === false) {
    console.log('This line is booked')
    return { status: status.ALREADY_BOOKED }
  } else {
    return {
      status: status.AVAILABLE,
      freeSlots: numFreeSlots,
      bookingUrl: teeTime.url
    }
  }
}

_book_the_tee_time_recursive = async function (
  whatDate,
  time,
  dateComesAlive,
  data,
  player1UID,
  player2UID,
  player3UID,
  player4UID
) {
  let response = await _get_tee_time_page(whatDate, data)

  response = await _get_tee_time(response, time)

  console.log(`_get_tee_time status: ${JSON.stringify(response.status)}`)
  switch (response.status) {
    case status.NOT_LIVE_YET:
      console.log('NOT_LIVE_YET')
      return status.NOT_LIVE_YET
      break
    case status.REFRESH:
      console.log('Found REFRESH so going to refresh another page instead')
      // Load another page to fool refresh
      let nextDay = moment(whatDate).add(1, 'days').format('YYYY-MM-DD')
      return _get_tee_time_page(nextDay, data).then(response => {
        console.log('loaded dummy page response....')
        if (
          response.body.indexOf('To book a tee time') >= 0 ||
          response.body.indexOf('you have hit refresh too soon') >= 0
        )
          // TODO console.log(`tee-time page found for ${whatDate}`);
          console.log('dummy refresh done....')
        resolve(
          _book_the_tee_time_recursive(
            whatDate,
            time,
            dateComesAlive,
            data,
            player1UID,
            player2UID,
            player3UID,
            player4UID
          )
        )
      })
      break
    case status.ALREADY_BOOKED:
      console.log('ALREADY_BOOKED')
      return status.ALREADY_BOOKED
      break
    case status.ALREADY_BOOKED_BY_YOU:
      console.log('ALREADY_BOOKED_BY_YOU')
      return status.ALREADY_BOOKED_BY_YOU
      break
    case status.UNAVAILABLE:
      console.log('TeeTime UNAVAILABLE')
      return status.UNAVAILABLE
      break
    case status.AVAILABLE:
      console.log(`Tee-time: ${time} is AVAILABLE on ${whatDate}`)
      console.log(
        `Reserving teeTime: ${time} freeSlots: ${JSON.stringify(response.freeSlots)} url: ${response.bookingUrl}`
      )
      const bookingUrl = `${BRS}${response.bookingUrl}`
      let options = {
        method: 'GET',
        uri: bookingUrl,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'R2D2 UA',
          Cookie: `course=1;rmm_sid=${data.rmmsid};consented=1;auth=${data.auth}`
        },
        transform: _include_headers,
        simple: false
      }

      response = await requestPromise(options)
      if (response.statusCode === 200) {
        let _token = utils.get_key_value('name="_token"', false, response.body)
        _token = _token.replace(/"/g, '')

        await asyncSetTimeout(30000)
        options = {
          method: 'POST',
          uri: `https://members.brsgolf.com/wicklow/bookings/store/1/${moment(whatDate).format(
            'YYYYMMDD'
          )}/${time.replace(/:/g, '')}`,
          form: {
            _token: _token,
            'member_booking_form[player_1]': player1UID,
            'member_booking_form[player_2]': player2UID,
            'member_booking_form[player_3]': player3UID,
            'member_booking_form[player_4]': player4UID
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'R2D2 UA',
            Cookie: `rmm_sid=${data.rmmsid};consented=1;course=1;auth=${data.auth}`
          }
        }
        console.log(`options: ${JSON.stringify(options)}`)
        response = await requestPromise(options)
        if (response.statusCode !== 200 && response.statusCode !== 302) return status.ERROR
        return status.BOOKED
      } else {
        console.log('Bummer, bookingCode not found....')
        return status.ERROR
      }
      break
    default:
      console.log(`Dunno whats happening status is: ${status.STATUS_CODE[resp.status]}`)
      return status.ERROR
  }
}

exports.book_the_tee_time_recursive = async function (
  whatDate,
  time,
  dateComesAlive,
  data,
  player1UID,
  player2UID,
  player3UID,
  player4UID
) {
  const response = await _book_the_tee_time_recursive(
    whatDate,
    time,
    dateComesAlive,
    data,
    player1UID,
    player2UID,
    player3UID,
    player4UID
  )
  return { status: response, data: data }
}

exports.login = async function (login, password) {
  let options = {
    method: 'GET',
    uri: HOME_PAGE,
    headers: {
      'User-Agent': 'R2D2 UA'
    },
    transform: _include_headers
  }

  // Get Home Page
  let response = await requestPromise(options)
  let data = {}
  if (response.body.indexOf('login_form_username') >= 0) {
    console.log('Home Page loaded....')
    const cookies = utils.get_cookies(response.headers['set-cookie'])
    data = {
      token: utils.get_key_value('login_form[_token]', true, response.body),
      rmmsid: utils.get_cookie('rmm_sid', cookies)
    }
  } else throw new Error('home-page page not found')

  // Login
  options = {
    method: 'POST',
    uri: LOGIN_PAGE,
    form: {
      'login_form[_token]': data.token,
      'login_form[username]': login,
      'login_form[password]': password
    },
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'R2D2 UA',
      Cookie: `rmm_sid=${data.rmmsid};consented=1`
    },
    transform: _include_headers,
    simple: false
  }

  response = await requestPromise(options)
  if (response.body.indexOf('Redirecting to /wicklow') >= 0) {
    const cookies = utils.get_cookies(response.headers['set-cookie'])

    data.auth = utils.get_cookie('auth', cookies)

    let options = {
      method: 'POST',
      uri: LOGIN_PAGE,
      form: {
        'login_form[_token]': data.token,
        'login_form[username]': login,
        'login_form[password]': password
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'R2D2 UA',
        Cookie: `rmm_sid=${data.rmmsid};consented=1;auth=${data.auth}`
      },
      transform: _include_headers,
      simple: false
    }

    response = await requestPromise(options)

    options = {
      method: 'GET',
      uri: 'https://members.brsgolf.com/wicklow',
      headers: {
        'User-Agent': 'R2D2 UA',
        Cookie: `rmm_sid=${data.rmmsid};consented=1;auth=${data.auth}`
      },
      transform: _include_headers
    }

    response = await requestPromise(options)
    if (response.body.indexOf('Competition Purse') >= 0) {
      console.log('Logged In....')
      return {
        status: status.LOGGED_IN,
        data
      }
    }
    throw new Error('Failed to login.....')
  } else {
    throw new Error('Failed to login.....')
  }
}
