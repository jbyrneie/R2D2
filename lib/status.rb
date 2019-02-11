module Status
  ALREADY_BOOKED = 1
  ALREADY_BOOKED_BY_YOU = 2
  TIME_NOT_FOUND = 3
  NOT_LIVE_YET = 4
  AVAILABLE = 5
  UNAVAILABLE = 6
  BOOKED = 7
  REFRESH = 8
  ERROR = 9

  STATUS_CODE = {
    ALREADY_BOOKED => 'Already Booked',
    ALREADY_BOOKED_BY_YOU => 'Already Booked By You',
    TIME_NOT_FOUND => 'Time Not Found',
    NOT_LIVE_YET => 'Not Live Yet',
    AVAILABLE => 'Slot Available',
    BOOKED => 'Booked',
    REFRESH => 'Refresh Page Returned',
    ERROR => 'Error Found'
  }
end
