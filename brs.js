const commandLineArgs = require('command-line-args')
const brs = require('./lib/book_tee_time')
const whatsApp = require('./lib/messaging')
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
let testMode = profile.config.testMode
const player1UID = profile.config.whichProfile.player1UID
const player2UID = profile.config.whichProfile.player2UID
const player3UID = profile.config.whichProfile.player3UID
const player4UID = profile.config.whichProfile.player4UID

const players = { JACK: '64', PHILIP: '158', PADDY: '1239', CORMAC: '666', COLM: '566', GUEST: '-2' }

_seconds_to_time = function (seconds) {
  let measuredTime = new Date(null)
  measuredTime.setSeconds(seconds) // specify value of SECONDS
  return measuredTime.toISOString().substr(11, 8)
}

_get_time_difference = function (dateComesAlive) {
  console.log('_get_time_difference: ', dateComesAlive)
  const comesAlive = moment(dateComesAlive, 'YYYY-MM-DD HH:mm:ss')
  const now = moment(new Date())
  return moment.duration(comesAlive.diff(now)).asSeconds()
}

_who_is_playing = function (options) {
  console.log(`_who_is_playing options: ${JSON.stringify(options.golfers)}`)
  let whoIsPlaying = []

  if (options.golfers === null || options.golfers.length === 0) {
    console.log(`\n***Nooooo players specified\n\n`)
    return null
  }

  const player1 = players[options.golfers[0]] != undefined ? players[options.golfers[0].toUpperCase()] : null
  const player2 = players[options.golfers[1]] != undefined ? players[options.golfers[1].toUpperCase()] : null
  const player3 = players[options.golfers[2]] != undefined ? players[options.golfers[2].toUpperCase()] : null
  const player4 = players[options.golfers[3]] != undefined ? players[options.golfers[3].toUpperCase()] : null

  if (player1 !== null) whoIsPlaying.push(player1)
  else if (options.golfers[0] !== undefined) {
    console.log(`\n***Player ${options.golfers[0]} does not exist\n\n`)
    return null
  }

  if (player2 !== null) whoIsPlaying.push(player2)
  else if (options.golfers[1] !== undefined) {
    console.log(`\n***Player ${options.golfers[1]} does not exist\n\n`)
    return null
  }

  if (player3 !== null) whoIsPlaying.push(player3)
  else if (options.golfers[2] !== undefined) {
    console.log(`\n***Player ${options.golfers[2]} does not exist\n\n`)
    return null
  }

  if (player4 !== null) whoIsPlaying.push(player4)
  else if (options.golfers[3] !== undefined) {
    console.log(`\n***Player ${options.golfers[3]} does not exist\n\n`)
    return null
  }

  return whoIsPlaying
}

_brs_recursive = async function (options, data) {
  let teeTime = options.teeTime

  options.golferIDs = _who_is_playing(options)
  if (!options.golferIDs) return

  let response = await brs.book_the_tee_time_recursive(
    options.dateRequired,
    teeTime,
    options.dateComesAlive,
    data,
    options.golferIDs
  )

  switch (response.status) {
    case status.NOT_LIVE_YET:
      let timeDiff = _get_time_difference(options.dateComesAlive)
      let sleepTime = 0

      if (timeDiff > 90) sleeptime = 60000
      else if (timeDiff > 60) sleeptime = 10000
      else if (timeDiff > 10) sleeptime = 5000
      else if (timeDiff >= 1) sleeptime = 1000
      else if (timeDiff >= 0.4) sleeptime = 200
      else {
        console.log(`Date comes alive is in the past ${options.dateComesAlive}`)
        sleeptime = 100
        notLiveRetries++
      }

      if (notLiveRetries <= 3) {
        console.log(
          `Not Live Yet (retries: ${notLiveRetries}) so going to sleep for ${
            sleeptime / 1000
          } seconds as time_diff is: ${_seconds_to_time(timeDiff >= 0 ? timeDiff : -timeDiff)}\n\n`
        )
        setTimeout(async function () {
          await _brs_recursive(options, data)
        }, sleeptime)
      } else console.log('Giving up.... exceeded notLiveRetries.... goodbye')
      break
    case status.BOOKED:
      console.log(`A Tee-time for ${teeTime} on ${options.dateRequired} has been booked\n`)
      break
    case status.UNAVAILABLE:
      console.log(
        `Trying the next tee-time ${moment(options.teeTime, 'HH:mm')
          .add(10, 'minutes')
          .format('HH:mm')
          .toString()} ${retries}\n`
      )
      retries++

      if (retries <= 3) {
        options.teeTime = moment(options.teeTime, 'HH:mm').add(10, 'minutes').format('HH:mm').toString()
        await _brs_recursive(options, data)
      } else console.log('Giving up.... exceeded retries.... goodbye')
      break
    case status.ALREADY_BOOKED_BY_YOU:
      console.log(`What are doing, you have already booked a Tee-time for ${teeTime} on ${options.dateRequired}`)
      break
    case status.ALREADY_BOOKED:
      console.log(`Bummer the Tee-time for ${teeTime} for ${options.dateRequired} is already taken`)
      console.log(`We should try the next one retries: ${retries}\n\n`)

      retries++

      if (retries <= 3) {
        teeTime = moment(teeTime, 'HH:mm').add(10, 'minutes').format('HH:mm')
        console.log(`retry[${retries}]: ${status.STATUS_CODE[response.status]}\n\n`)
        await _brs_recursive(teeTime, data)
      }
      break
    case status.error:
      console.log(`There was an error when trying to book the Tee-time for ${teeTime} for ${dateRequired}`)
      break
    default:
      console.log('Bummer.... we ran in to an error')
  }
}

start = async function () {
  const optionDefinitions = [
    { name: 'userName', alias: 'u', type: String },
    { name: 'password', alias: 'p', type: String },
    { name: 'teeTime', alias: 't', type: String },
    { name: 'dateRequired', alias: 'd', type: String },
    { name: 'dateComesAlive', alias: 'a', type: String },
    { name: 'golfers', alias: 'g', type: String, multiple: true, defaultOption: true }
  ]

  if (process.argv.length < 15) {
    console.log(
      '\n\nusage: node brs.js -u <BRS_NUMBER> -p <PASSWORD> -a <YYYY-MM-DD:HH:MM> -d <YYYY-MM-DD:HH:MM> -g <PLAYERS> -t <HH:MM>\n\n'
    )
    return
  }

  const options = commandLineArgs(optionDefinitions)
  const response = await brs.login(options.userName, options.password)
  if (response.status == status.LOGGED_IN) {
    await _brs_recursive(options, response.data)
  } else console.log('Login failed..... goodbye\n\n')
}

start()
