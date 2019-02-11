require_relative '../lib/search'
require 'open-uri'

# 9zxAS8fg0J2Bq04e40Gvt92swgOKEjdUARj3TzRc

class Sms
  @@sessionCookies = nil

  SMS_HOME_PAGE = 'https://webtexts.three.ie/'
  SMS_LOGIN = 'https://webtexts.three.ie/users/login'
  SMS_SEND = 'https://webtexts.three.ie/messages/send'

  def self.get_full_key_value(key, theString)
    theString.split(' ').map { |item| item = item.split('=')
    {:type => item[0], :id => item[1]}

    return item[1].gsub(/[^A-Za-z0-9]/, '') if (item[0] == key)
    }
    return nil
  end

  def self.get_cookie(cookieName)
    cookie = nil
    cookies = @@sessionCookies.split(';')
    cookies.each do |value|
      #p "value: #{value}"
      if value[cookieName] && !value["deleted"]
        splitted = value.split('=')
        return splitted[2] || splitted[1]
      end
    end
  end

  def self.send_sms_message(recipient, message)
    awsalb = get_cookie('AWSALB')
    laravel_session = get_cookie('laravel_session')
    uri = URI(SMS_SEND)
    req = Net::HTTP::Post.new(uri)
    req.add_field 'Content-Type', 'application/x-www-form-urlencoded'
    req['User-Agent'] = 'R2D2 UA'
    req.set_form_data('_token' => "#{@@token}", 'message': "#{message}", 'recipients_contacts[]': "#{recipient}|contact")
    req['Cookie'] = "AWSALB=#{awsalb}; laravel_session=#{laravel_session}"

    res = Net::HTTP.start(uri.hostname, uri.port, :use_ssl => true) do |http|
      http.request(req)
    end

    case res.code
      when Net::HTTPSuccess then
        p "SMS message sent to #{recipient}"
      when '302' then
        p "SMS message sent to #{recipient}"
      else
        p "SMS message NOT sent to #{recipient}"
        p res.value
    end
  end

  def self.send_sms(login, password, recipients, message)
    @page = RestClient.get(SMS_HOME_PAGE)
    @@sessionCookies = @page.cookies
    splitted = @page.force_encoding("iso-8859-1").split(/\r?\n/)
    index = Search.search(0, splitted, "_token")
    if index > 0
      @@token = get_full_key_value('value', splitted[index])

      uri = URI(SMS_LOGIN)
      p "Logging in #{login} #{password} #{@@token} #{uri.hostname} #{uri.port} #{uri.path}"
      req = Net::HTTP::Post.new(uri)
      req.add_field 'Content-Type', 'application/x-www-form-urlencoded'
      req['User-Agent'] = 'R2D2 UA'
      req.set_form_data('email' => login, 'password' => password, '_token' => "#{@@token}")

      res = Net::HTTP.start(uri.hostname, uri.port, :use_ssl => true) do |http|
        http.request(req)
      end

      loggedIn = false
      @@sessionCookies = res.response['Set-Cookie']
      case res.code
        when Net::HTTPSuccess then
          loggedIn = true
        when '302' then
          loggedIn = true
        else
          p res.value
      end

      if loggedIn
        p "Ok we are logged in...."
        recipients.each do |recipient|
          send_sms_message(recipient, message)
        end
      else
        p "Bummer we are NOT logged in"
      end
    else
      p 'Bummer no SMS token....'
    end
  end
end
