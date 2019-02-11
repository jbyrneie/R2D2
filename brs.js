const brs = require('./lib/book_tee_time')
const moment = require('moment')
const profile = require('./profile')
const status = require('./lib/status')

let retries = 0
let notLiveRetries = 0
let teeTime = profile.config.whichProfile.teeTime
let dateRequired = profile.config.whichProfile.dateRequired
let login = profile.config.login
let password = profile.config.password
let dateComesAlive = profile.config.whichProfile.dateComesAlive
const player1UID = profile.config.whichProfile.player1UID
const player2UID = profile.config.whichProfile.player2UID
const player3UID = profile.config.whichProfile.player3UID
const player4UID = profile.config.whichProfile.player4UID

console.log(`login: ${profile.config.login} password: ${profile.config.password} dateRequired: ${dateRequired} teeTime: ${teeTime} dateComesAlive: ${dateComesAlive}`);

_seconds_to_time = function(seconds) {
  let measuredTime = new Date(null);
  measuredTime.setSeconds(seconds); // specify value of SECONDS
  return measuredTime.toISOString().substr(11, 8);
}

_get_time_difference = function(dateComesAlive) {
  console.log('_get_time_difference: ', dateComesAlive);
  const comesAlive = moment(dateComesAlive, 'YYYY-MM-DD HH:mm:ss')
	const now = moment(new Date());
  return moment.duration(comesAlive.diff(now)).asSeconds()
}

_book_tee_time = function() {
  return new Promise(function(resolve, reject) {
    brs.book_tee_time(login, password, dateRequired, teeTime, dateComesAlive, player1UID, player2UID, player3UID, player4UID)
    .then((response) => {
      console.log('brs.book_tee_time response: ', JSON.stringify(response));
      resolve(response)
    })
    .catch(function (err) {
      console.log('_book_tee_time error: ', err);
      resolve({status: status.STATUS_CODE.ERROR, phpsessid:null})
    })
  })
}

_brs_recursive = function(teeTime, phpsessid) {
  console.log(`_brs_recursive teeTime:${teeTime} phpsessid: ${phpsessid}`);

  brs.book_the_tee_time_recursive(dateRequired, teeTime, dateComesAlive, phpsessid, player1UID, player2UID, player3UID, player4UID)
  .then((response) => {
    console.log('_brs_recursive response: ', JSON.stringify(response));
    console.log('_brs_recursive response: ', status.STATUS_CODE[response.status]);
    switch(response.status) {
      case status.NOT_LIVE_YET:
        let timeDiff = _get_time_difference(dateComesAlive)
        console.log('timeDiff: ', timeDiff);
        let sleepTime = 0

        if (timeDiff > 90)
          sleeptime = 60000
        else if (timeDiff > 60)
          sleeptime = 10000
        else if (timeDiff > 10)
          sleeptime = 5000
        else if (timeDiff >= 1)
          sleeptime = 1000
        else if (timeDiff >= 0.4)
          sleeptime = 200
        else {
          console.log(`Date comes alive is in the past ${dateComesAlive}`);
          sleeptime = 100
          notLiveRetries++
        }

        if (notLiveRetries <= 3) {
          console.log(`Not Live Yet (retries: ${notLiveRetries}) so going to sleep for ${sleeptime/1000} seconds as time_diff is: ${_seconds_to_time(timeDiff>=0?timeDiff:-timeDiff)}\n\n`)
          setTimeout(function() {
            _brs_recursive(teeTime, response.phpsessid)
          }, sleeptime);
        } else console.log('Giving up.... exceeded notLiveRetries.... goodbye');
        break;
      case status.BOOKED:
        console.log(`A Tee-time for ${teeTime} has been booked ${dateRequired}`);
        break;
      case status.UNAVAILABLE:
        console.log(`A Tee-time for ${teeTime} is unavailable on ${dateRequired}`);
        break;
      case status.ALREADY_BOOKED_BY_YOU:
        console.log(`What are doing, you have already booked a Tee-time for ${teeTime} on ${dateRequired}`);
        break;
      case status.ALREADY_BOOKED:
        console.log(`Bummer the Tee-time for ${teeTime} for ${dateRequired} is already taken`);
        console.log(`We should try the next one retries: ${retries}\n\n`);

        retries++

        if (retries <= 3) {
          teeTime = moment(teeTime, 'HH:mm').add(10, 'minutes').format('HH:mm')
          console.log(`retry[${retries}]: ${status.STATUS_CODE[response.status]}\n\n`);
          _brs_recursive(teeTime, response.phpsessid)
        }
        break;
      case status.error:
        console.log(`There was an error when trying to book the Tee-time for ${teeTime} for ${dateRequired}`);
        break;
      default:
        console.log('Bummer.... we ran in to an error');
    }
  })
  .catch(function (err) {
    console.log('BRS error: ', err);
  })
}

/*
_book_tee_time()
.then((response) => {
  if (response.status != status.BOOKED) {
    console.log('Not booked yet..... go again.....\n\n');
    _brs_recursive(teeTime, response.phpsessid)
  }
})
*/


brs.login(login, password)
.then((response) => {
  if (response.status == status.LOGGED_IN) {
    console.log('Logged In, ready to go.....\n\n');
    _brs_recursive(teeTime, response.phpsessid)
  } else console.log('Login failed..... goodbye\n\n');
})
