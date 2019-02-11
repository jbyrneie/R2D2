require_relative './lib/book_tee_time'
require_relative './lib/status'
require_relative './lib/config'
require_relative './lib/sms'
require 'time'
require 'date'

FIVE_MINUTES_IN_SECONDS = 5*60

class Brs

  @@login = nil
  @@password = nil
  @@smsDMIN = nil
  @@smsLogin = nil
  @@smsPassword = nil
  @@smsRecipients = []
  @@dateRequired = nil
  @@dateComesAlive = nil
  @@nextTime = nil
  @@timeInterval = nil
  @@theTime = nil
  @@numTries = nil
  @@numNotLiveRetries = nil
  @@player1UID = nil
  @@player2UID = nil
  @@player3UID = nil
  @@player4UID = nil

  def self.load_config()
    @@config = BRS::Config.new({})

    @@login = @@config.application['login']
    @@password = @@config.application['password']
    @@smsAdmin = @@config.application['smsAdmin']
    @@smsLogin = @@config.application['smsLogin']
    @@smsPassword = @@config.application['smsPassword']
    whichProfile = @@config.application['whichProfile']

    p "whichProfile: #{whichProfile}"

    if whichProfile == 'me'
      @@dateComesAlive = @@config.me['dateComesAlive']
      @@dateRequired = @@config.me['dateRequired']
      @@nextTime = @@config.me['teeTime']
      @@timeInterval = @@config.me['intervals']
      @@numNotLiveRetries = @@config.me['numNotLiveRetries']
      @@numTries = @@config.me['numRetries']

      @@smsRecipients << @@config.me['player1SMS'] if @@config.me['player1SMS'] != -1
      @@smsRecipients << @@config.me['player2SMS'] if @@config.me['player2SMS'] != -1
      @@smsRecipients << @@config.me['player3SMS'] if @@config.me['player3SMS'] != -1
      @@smsRecipients << @@config.me['player4SMS'] if @@config.me['player4SMS'] != -1

      @@player1UID = @@config.me['player1UID'] if @@config.me['player1UID'] != -1
      @@player2UID = @@config.me['player2UID'] if @@config.me['player2UID'] != -1
      @@player3UID = @@config.me['player3UID'] if @@config.me['player3UID'] != -1
      @@player4UID = @@config.me['player4UID'] if (@@config.me['player4UID'] != -1)
    elsif whichProfile == 'casual'
      @@dateComesAlive = @@config.casual['dateComesAlive']
      @@dateRequired = @@config.casual['dateRequired']
      @@nextTime = @@config.casual['teeTime']
      @@timeInterval = @@config.casual['intervals']
      @@numTries = @@config.casual['numRetries']
      @@numNotLiveRetries = @@config.casual['numNotLiveRetries']

      @@smsRecipients << @@config.casual['player1SMS'] if @@config.casual['player1SMS'] != -1
      @@smsRecipients << @@config.casual['player2SMS'] if @@config.casual['player2SMS'] != -1
      @@smsRecipients << @@config.casual['player3SMS'] if @@config.casual['player3SMS'] != -1
      @@smsRecipients << @@config.casual['player4SMS'] if @@config.casual['player4SMS'] != -1

      @@player1UID = @@config.casual['player1UID'] if (@@config.casual['player1UID'] != -1)
      @@player2UID = @@config.casual['player2UID'] if @@config.casual['player2UID'] != -1
      @@player3UID = @@config.casual['player3UID'] if @@config.casual['player3UID'] != -1
      @@player4UID = @@config.casual['player4UID'] if @@config.casual['player4UID'] != -1
    elsif whichProfile == 'competition'
      @@dateComesAlive = @@config.competition['dateComesAlive']
      @@dateRequired = @@config.competition['dateRequired']
      @@nextTime = @@config.competition['teeTime']
      @@timeInterval = @@config.competition['intervals']
      @@numTries = @@config.competition['numRetries']
      @@numNotLiveRetries = @@config.competition['numNotLiveRetries']

      @@smsRecipients << @@config.competition['player1SMS'] if @@config.competition['player1SMS'] != -1
      @@smsRecipients << @@config.competition['player2SMS'] if @@config.competition['player2SMS'] != -1
      @@smsRecipients << @@config.competition['player3SMS'] if @@config.competition['player3SMS'] != -1
      @@smsRecipients << @@config.competition['player4SMS'] if @@config.competition['player4SMS'] != -1

      @@player1UID = @@config.competition['player1UID'] if @@config.competition['player1UID'] != -1
      @@player2UID = @@config.competition['player2UID'] if @@config.competition['player2UID'] != -1
      @@player3UID = @@config.competition['player3UID'] if @@config.competition['player3UID'] != -1
      @@player4UID = @@config.competition['player4UID'] if @@config.competition['player4UID'] != -1
    end

  end

  def self.get_time_difference

    comesAlive = Time.parse(@@dateComesAlive)

    totalSeconds = comesAlive - Time.now

    return totalSeconds
  end

  def self.wake_up()

    totalSeconds = get_time_difference()

    p "TimeDifference: #{Time.at(totalSeconds).gmtime.strftime('%R:%S')}"

    if totalSeconds > 0

      if totalSeconds >= FIVE_MINUTES_IN_SECONDS
        sleepTime = totalSeconds - FIVE_MINUTES_IN_SECONDS

        #p "Going to sleep for #{dd} days, #{hh} hours, #{mm} minutes and #{ss} seconds"
        p "Going to sleep for #{Time.at(sleepTime).gmtime.strftime('%R:%S')}"

        sleep(sleepTime)
        p 'Waking up now'
      end
    end
  end

  def self.book_tee_time(sessionCookies)
    p "Looking for a tee-Time of: #{@@nextTime} on #{@@dateRequired}"

    @@theTime = Time.parse(@@nextTime)

    booked = false
    tries = 0
    notLiveRetries = 0
    status = nil

    page = BookTeeTime.load_tee_time_page(@@dateRequired)
    while !booked && tries < @@numTries

      status = BookTeeTime.get_tee_time(page, "#{format('%02d', @@theTime.hour)}:#{format('%02d', @@theTime.min)}")

      case status
        when Status::NOT_LIVE_YET
          timeDiff = get_time_difference()
          if timeDiff > 90
            p "Not Live Yet so going to sleep for 60 seconds as time_diff is: #{Time.at(timeDiff).gmtime.strftime('%R:%S')}"
            sleep(60)
          elsif timeDiff > 60
            p "Not Live Yet so going to sleep for 10 seconds as time_diff is: #{Time.at(timeDiff).gmtime.strftime('%R:%S')}"
            sleep(10)
          elsif timeDiff > 30
            p "Not Live Yet so going to sleep for 5 seconds as time_diff is: #{Time.at(timeDiff).gmtime.strftime('%R:%S')}"
            sleep(5)
          elsif timeDiff > 10
            p "Not Live Yet so going to sleep for 5 seconds as time_diff is: #{Time.at(timeDiff).gmtime.strftime('%R:%S')}"
            sleep(5)
          elsif timeDiff > 5
            p "Not Live Yet so going to sleep for 1 second as time_diff is: #{Time.at(timeDiff).gmtime.strftime('%R:%S')}"
            sleep(1)
          elsif timeDiff >= 1
            p "Not Live Yet so going to sleep for 1 seconds as time_diff is: #{Time.at(timeDiff).gmtime.strftime('%R:%S')}"
            sleep(1)
          elsif timeDiff >= 0.4
            p "Not Live Yet so going to sleep for 0.2 seconds as time_diff is: #{Time.at(timeDiff).gmtime.strftime('%R:%S')}"
            sleep(0.2)
          else
            p "Not Live Yet but very close as time_diff is: #{Time.at(timeDiff).gmtime.strftime('%R:%S')} time:diff: #{timeDiff}"

            notLiveRetries += 1
            if notLiveRetries >= @@numNotLiveRetries
              p "Giving up waiting for NotLiveYet after #{notLiveRetries} tries"
              status = Status::NOT_LIVE_YET
              booked = true
            end
            sleep(0.5)
          end

          BookTeeTime.load_tee_time_page(@@dateRequired + 1)
          page = BookTeeTime.load_tee_time_page(@@dateRequired)
        when Status::REFRESH
          p 'Found REFRESH so going to sleep for a while and will check AGAIN in 1 second'
          BookTeeTime.load_tee_time_page(@@dateRequired + 1) # Load another page to fool refresh
          BookTeeTime.load_tee_time_page(@@dateRequired)
        when Status::ALREADY_BOOKED
          @@theTime += (@@timeInterval*60)
          tries += 1
        when Status::ALREADY_BOOKED_BY_YOU
          booked = true
        when Status::AVAILABLE
          p "Have a slot for #{format('%02d', @@theTime.hour)}:#{format('%02d', @@theTime.min)}"
          status = BookTeeTime.reserve_tee_time(@@dateRequired, "#{format('%02d', @@theTime.hour)}:#{format('%02d', @@theTime.min)}", @@player1UID, @@player2UID, @@player3UID, @@player4UID)
          booked = true
        else
          p "Dunno whats happening status is: #{status}"
          tries += 1
          @@theTime += (@@timeInterval*60)
      end
    end

    return status
  end

  def self.brs
    load_config()

    wake_up()

    BookTeeTime.get_home_page()
    sessionCookies = BookTeeTime.login(@@login, @@password)
    if sessionCookies
      p 'We are logged in...'
      status = book_tee_time(sessionCookies)
      p "tee-time booked returned with status: #{Status::STATUS_CODE[status]}"

      if status == Status::BOOKED
        p "All done... Yeaaaah...."
        Sms.send_sms(@@smsLogin, @@smsPassword, @@smsRecipients, "R2D2 has booked a tee-time for you on #{@@dateRequired} at #{format('%02d', @@theTime.hour)}:#{format('%02d', @@theTime.min)}.R2D2 would like you to buy him breakfast as a gesture of your appreciation!!")
      end
    else
      p 'Not logged in...'
    end
  end

  # Book a tee-time
  brs()
end
