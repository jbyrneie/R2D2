const _ = require('lodash')
let Cookie = require('request-cookies').Cookie

exports.get_index = function (arr, subString) {
  let index = -1

  for (i = 0; i < arr.length; i++) {
    if (arr[i].indexOf(subString) >= 0) return i
  }

  return index
  /*
  return(_.filter(
                  arr,
                  function(s) {
                    //console.log('s: ', s);
                    return s.indexOf(subString)
                  }
                )
        )
  */
}

exports.get_key_value = function (key, stripWhiteSpace, stringData) {
  let value = null
  const splitted = stringData.split('\n')
  splitted.map((line, index) => {
    if (line.indexOf(key) >= 0) {
      const subSplit = line.split('=')
      subSplit.map((token, index) => {
        if (token.indexOf('value') >= 0) {
          value = subSplit[index + 1].replace(/>\s*$/, '')
          value = stripWhiteSpace ? value.substring(1, value.indexOf(' ') - 1) : value
        }
      })
    }
  })

  return value
}

exports.get_cookies = function (cookieString) {
  let cookies = []
  for (var i in cookieString) {
    const cookie = new Cookie(cookieString[i])

    if (cookie.value != 'deleted') cookies.push(cookie)
  }
  return cookies
}

exports.get_cookie = function (cookieName, cookies) {
  let value = null
  for (var i = 0; i < cookies.length; i++) if (cookies[i].key == cookieName) return cookies[i].value

  return null
}
