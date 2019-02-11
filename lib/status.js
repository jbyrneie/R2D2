const ALREADY_BOOKED = 0
const ALREADY_BOOKED_BY_YOU = 1
const TIME_NOT_FOUND = 2
const NOT_LIVE_YET = 3
const AVAILABLE = 4
const UNAVAILABLE = 5
const BOOKED = 6
const REFRESH = 7
const ERROR = 8
const LOGED_IN = 9

const STATUS_CODE = ['Already Booked',
                     'Already Booked By You',
                     'Time Not Found',
                     'Not Live Yet',
                     'Slot Available',
                     'Slot Unavailable',
                     'Booked',
                     'Refresh Page Returned',
                     'Error Found',
                     'Logged In'
]

module.exports = {
  ALREADY_BOOKED,
  ALREADY_BOOKED_BY_YOU,
  TIME_NOT_FOUND,
  NOT_LIVE_YET,
  AVAILABLE,
  UNAVAILABLE,
  AVAILABLE,
  BOOKED,
  REFRESH,
  ERROR,
  LOGED_IN,
  STATUS_CODE
}
