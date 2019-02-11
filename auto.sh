1) curl https://www.brsgolf.com/wicklow/member/login -v
2) curl -X POST --cookie "PHPSESSID=okjv54kd2kj0510hopjisjclc4" -d "_username=31190048&_password=jackoe&_csrf_token=14d66a8c5c88b9e552814c91dd41c8cda6a6a2cf"  https://www.brsgolf.com/wicklow/member/login_check -v
3) curl --cookie "PHPSESSID=okjv54kd2kj0510hopjisjclc4;BrsLoggedIn=31190048%23%23Member%23%23wicklow;" "https://www.brsgolf.com/wicklow/members_booking.php?operation=member_info&loggedIn=true" -v
4a) curl --cookie "PHPSESSID=lb9r5ht0qaci1g95b1ig4nib12;myaccount_back_redirect=members_booking.php?operation=member_day&course_id=1&d_date-2019-01-27" "https://www.brsgolf.com/wicklow/members_booking.php?operation=member_day&course_id=1&d_date=2019-01-27" -v
4b) curl --cookie "PHPSESSID=lb9r5ht0qaci1g95b1ig4nib12" "https://www.brsgolf.com/wicklow/members_booking.php?operation=member_day&course_id=1&d_date=2019-01-27" -v

1, 2, 4b - use PHPSESSID from previous URL
