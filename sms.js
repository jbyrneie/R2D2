const sms = require('./lib/send_sms')
const moment = require('moment')

sms.send_sms('0861633110', 'Lusmagh01', '0861633110', `Hello the time is ${moment().format('HH:mm:ss')}`)
