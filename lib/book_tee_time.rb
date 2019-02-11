require_relative "../lib/status"
require_relative "../lib/search"
require 'rubygems'
require 'open-uri'
require 'restclient'
require 'net/http'
#require 'httplog'
require 'cgi'
require 'cookiejar'

BRS_PAGE = 'https://www.brsgolf.com'
HOME_PAGE = 'https://www.brsgolf.com/wicklow/member/login'
LOGIN_PAGE = 'https://www.brsgolf.com/wicklow/member/login_check'
TEE_TIME_PAGE = 'https://www.brsgolf.com/wicklow/members_booking.php?operation=member_day&course_id1=1&d_date='
BOOK_TEE_TIME = 'https://www.brsgolf.com/wicklow/members_booking.php?operation=member_process_booking'
MEMBERS_BOOKING_FORM = 'https://www.brsgolf.com/wicklow/members_booking.php?operation=member_booking_form'

class BookTeeTime

  @@sessionCookies = nil
  @@freeSlots = 0
  @@uniqueId = 0
  @@bookingType = nil

  def self.get_cookie(cookieName)
    cookie = nil
    cookies = @@sessionCookies.split(';')
    cookies.each do |value|
      if value[cookieName] && !value["deleted"]
        splitted = value.split('=')
        return splitted[2]
      end
    end
  end

  # @param [Object] theString
  def self.get_key_value(key, theString)
    #myarray = theString.split(' ').map { |item| item = item.split('=')
    theString.split(' ').map { |item| item = item.split('=')
    {
      :type => item[0], :id => item[1]}
      return item[1].gsub(/[^0-9]/, '') if (item[0] == key)
    }
    return nil
  end

  # @param [Object] theString
  def self.get_full_key_value(key, theString)
    theString.split(' ').map { |item| item = item.split('=')
    {:type => item[0], :id => item[1]}

    return item[1].gsub(/[^A-Za-z0-9]/, '') if (item[0] == key)
    }
    return nil
  end

  # @param [Object] uriStr
  def self.fetch(uriStr, limit = 10)
    uriStr = BRS_PAGE + uriStr

    # You should choose better exception.
    raise ArgumentError, 'HTTP redirect too deep' if limit == 0

    #url = URI.parse(URI.encode(uriStr.strip))
    url = URI.parse(URI.encode(uriStr))

    #get path
    headers = {USER_AGENT => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_4) AppleWebKit/534.57.5 (KHTML, like Gecko) Version/5.1.7 Safari/534.57.4'}
    req = Net::HTTP::Get.new(url.path, headers)
    req['Cookie'] = "PHPSESSID=#{@@sessionCookies['PHPSESSID']}"
    req['User-Agent'] = 'R2D2 UA'
    response = Net::HTTP.start(url.host, url.port, :use_ssl => true) { |http|
      http.request(req)
    }

    case response
      when Net::HTTPSuccess
      then #print final redirect to a file
        return response
      # if you get a 302 response
      when Net::HTTPRedirection
      then
        return fetch(response['location'], limit-1)
      else
        response.error!
    end
  end

  def self.find_tee_time(response, time)
    splitted = response.force_encoding("iso-8859-1").split(/\r?\n/)
    index = Search.search(0, splitted, time)
    if index > 0
      p "Time: #{time} found...."
      @@freeSlots = 0
      player1 = splitted[index+4]
      @@freeSlots += 1 if player1=='<td></td>'

      player2 = splitted[index+5]
      @@freeSlots += 1 if player2=='<td></td>'

      player3 = splitted[index+6]
      @@freeSlots += 1 if player3=='<td></td>'

      player4 = splitted[index+7]
      @@freeSlots += 1 if player4=='<td></td>'

      p "Free Slots: #{@@freeSlots}"

      isItBooked = splitted[index+8]
      edit = splitted[index+14]

      if isItBooked.include?('Booked')
        p 'This line is booked'
        return Status::ALREADY_BOOKED
      elsif isItBooked.include?('Only Allowed 1 tee time')
        p 'You can only book 1 tee-time'
        return Status::ALREADY_BOOKED_BY_YOU
      elsif isItBooked.include?('Only&nbsp;Allowed<br>4 Players')
        p '4 Players are booked already'
        return Status::ALREADY_BOOKED
      elsif isItBooked.include?('All 4 players are already booked')
        p 'All 4 Players are aleady booked already'
        return Status::ALREADY_BOOKED
      elsif isItBooked.include?('Not Live Yet')
        p 'This line is not live yet'
        return Status::NOT_LIVE_YET
      elsif edit.include?('Edit')
        p 'This line is already booked by you'
        return Status::ALREADY_BOOKED_BY_YOU
      else
        @@courseId = get_key_value('value', splitted[index+11])
      end

      @@bookingType = splitted[index+14]

      if @@bookingType.include?('Casual')
        @@bookingType = 'casual'
      else
        @@bookingType = 'competition'
      end

      bookNow = splitted[index+14]
      if bookNow.include?('Book Now')
        return Status::AVAILABLE
      else
        return Status::UNAVAILABLE
      end
    else
      index = Search.search(0, splitted, 'you have hit refresh too soon')

      if index > 0 then
        return Status::REFRESH
      else
        return Status::TIME_NOT_FOUND
      end
    end
  end

  def self.get_home_page()
    @page = RestClient.get(HOME_PAGE)
    @@sessionCookies = @page.cookies
    splitted = @page.force_encoding("iso-8859-1").split(/\r?\n/)
    index = Search.search(0, splitted, "_csrf_token")
    if index > 0
      @@csrfToken = get_full_key_value('value', splitted[index])
    end
  end

  def self.login(userName, password)
    uri = URI(LOGIN_PAGE)
    p "Logging in #{userName} #{password} #{@@csrfToken} #{uri.hostname} #{uri.port} #{uri.path}"
    req = Net::HTTP::Post.new(uri, {"Cookie" => "PHPSESSID=Somerubbish;"})
    req.add_field 'Content-Type', 'application/x-www-form-urlencoded'
    req['Cookie'] = "PHPSESSID=#{@@sessionCookies['PHPSESSID']}"
    req['User-Agent'] = 'R2D2 UA'
    req.set_form_data('_username' => userName, '_password' => password, '_csrf_token' => "#{@@csrfToken}")

    res = Net::HTTP.start(uri.hostname, uri.port, :use_ssl => true) do |http|
      http.request(req)
    end

    @@sessionCookies = res.response['Set-Cookie']
    case res.code
      when Net::HTTPSuccess then
        p "Ok we are logged in #{res.body}"
      when '302' then
        return @@sessionCookies
      else
        p res.value
    end

    return null
  end

  def self.load_tee_time_page(whatDate)
    uri = URI("#{TEE_TIME_PAGE}#{whatDate}")
    req = Net::HTTP::Get.new(uri)
    req.add_field 'Content-Type', 'application/x-www-form-urlencoded'
    req['Cookie'] = "#{@@sessionCookies}"
    req['User-Agent'] = 'R2D2 UA'
    phpsessid = get_cookie('PHPSESSID')
    Net::HTTP.start(uri.host, uri.port,:use_ssl => uri.scheme == 'https') do |http|
      request = Net::HTTP::Get.new uri
      request['Cookie'] = "PHPSESSID=#{phpsessid}"
      request['User-Agent'] = 'R2D2 UA'
      res = http.request request
      return res.body
    end
  end

  def self.get_tee_time(page, teeTime)
    status = find_tee_time(page, teeTime)
    return status
  end

  def self.load_members_booking_form(dateRequired, teeTime)
    uri = URI.parse(URI.encode(MEMBERS_BOOKING_FORM))
    req = Net::HTTP::Post.new(uri)
    req.add_field 'Content-Type', 'application/x-www-form-urlencoded'
    req['Cookie'] = "PHPSESSID=#{get_cookie('PHPSESSID')}"
    req['User-Agent'] = 'R2D2 UA'

    formData = Hash.new
    formData.store('double_click', 'Yes')
    formData.store('course_id', '1')
    formData.store('d_date', dateRequired)
    formData.store('TeeTime', "#{teeTime}:00")

    req.set_form_data(formData)

    # Request page:
    begin
      http = Net::HTTP.new(uri.host, uri.port)
      resp = Net::HTTP.start(uri.hostname, uri.port, :use_ssl => true) do |http|
        http.request(req)
      end

      splitted = resp.body.force_encoding("iso-8859-1").split(/\r?\n/)
      index = Search.search(0, splitted, 'bookingCode')
      if index > 0
        @@bookingCode = get_key_value('value', splitted[index])
        p "Going to sleep for 20 seconds...."
        sleep(2)
        return true
      else
        p 'Bummer, bookingCode not found....'
        return false
      end
    rescue Exception => e
      p e.message
      p e.backtrace
      return false
    end
  end

  def self.book_the_tee_time(numSlots, teeTime, dateRequired, player1UID, player2UID, player3UID, player4UID)
    uri = URI.parse(URI.encode(BOOK_TEE_TIME))
    req = Net::HTTP::Post.new(uri)
    req.add_field 'Content-Type', 'application/x-www-form-urlencoded'
    req['Cookie'] = "PHPSESSID=#{get_cookie('PHPSESSID')}"
    req['User-Agent'] = 'R2D2 UA'

    type = nil
    if @@bookingType == 'competition'
      type = 'Confirm Competition Booking'
    elsif @@bookingType == 'casual'
      type = 'Confirm Casual Booking'
    end

    formData = Hash.new
    formData.store('double_click', 'Yes')
    formData.store('course_id', '1')
    formData.store('d_date', dateRequired)
    formData.store('TeeTime', "#{teeTime}:00")
    formData.store('bookingCode', @@bookingCode)

    if numSlots <= 0
      p "numSlots #{numSlots} is wrong...."
      return false
    elsif numSlots == 1
      formData.store('Player4_uid', player1UID) if player1UID != nil
      req.set_form_data(formData)
    elsif numSlots == 2
      formData.store('Player3_uid', player1UID) if player1UID != nil
      formData.store('Player4_uid', player2UID) if player2UID != nil
      req.set_form_data(formData)
    elsif numSlots == 3
      formData.store('Player2_uid', player1UID) if player1UID != nil
      formData.store('Player3_uid', player2UID) if player2UID != nil
      formData.store('Player4_uid', player3UID) if player3UID != nil
      req.set_form_data(formData)
    elsif numSlots == 4
      formData.store('Player1_uid', player1UID) if player1UID != nil
      formData.store('Player2_uid', player2UID) if player2UID != nil
      formData.store('Player3_uid', player3UID) if player3UID != nil
      formData.store('Player4_uid', player4UID) if player4UID != nil
      req.set_form_data(formData)
    end

    # Request page:
    begin
      http = Net::HTTP.new(uri.host, uri.port)
      resp = Net::HTTP.start(uri.hostname, uri.port, :use_ssl => true) do |http|
        http.request(req)
      end

      if Search.string_search(resp.body, 'The tee time has been successfully booked')
        p 'Yeah, the tee-time has been booked'
        return true
      else
        p 'Bummer, the tee-time was not booked....'
        return false
      end
    rescue Exception => e
      p e.message
      p e.backtrace
      return false
    end
  end

  def self.reserve_tee_time(dateRequired, teeTime, player1UID, player2UID, player3UID, player4UID)
    p "Reserving teeTime: #{teeTime} freeSlots: #{@@freeSlots}"
    if load_members_booking_form(dateRequired, teeTime)
      if book_the_tee_time(@@freeSlots, teeTime, dateRequired, player1UID, player2UID, player3UID, player4UID) then
        return Status::BOOKED
      else
        return Status::ERROR
      end
    else
      return Status::ERROR
    end
  end
end
