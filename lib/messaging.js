var https = require('follow-redirects').https
var fs = require('fs')

exports.send = async function (key, stripWhiteSpace, stringData) {
  const url = 'https://telesign-telesign-send-sms-verification-code-v1.p.rapidapi.com/sms-verification-code'
  const options = {
    method: 'POST',
    headers: {
      'x-rapidapi-key': 'da4da1448fmsh5c05297cfa9f345p14442ajsn4414f57672d9',
      'x-rapidapi-host': 'telesign-telesign-send-sms-verification-code-v1.p.rapidapi.com',
      'Content-Type': 'application/json'
    },
    body: {}
  }

  try {
    const response = await fetch(url, options)
    const result = await response.text()
    console.log(result)
  } catch (error) {
    console.error(error)
  }
}
