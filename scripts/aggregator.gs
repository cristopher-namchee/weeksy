const githubToken = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
const githubUsername = PropertiesService.getScriptProperties().getProperty('GITHUB_USERNAME');

function formatDate(date) {
  const month = ('0' + (date.getMonth() + 1)).slice(-2);
  const actualDate = ('0' + date.getDate()).slice(-2);

  return `${date.getFullYear()}-${month}-${actualDate}`;
}

function getCurrentWeekMonday(date) {
  const monday = new Date(date);
  
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return monday;
}

function getWeeklyEvents(date) {
  return [...Array(5).keys()].reduce((acc, curr) => {
    const targetDate = new Date(date);
    targetDate.setDate(targetDate.getDate() + curr);

    const events = CalendarApp.getEventsForDay(targetDate);

    const meetings = events
      .filter(event => event.getEventType() === CalendarApp.EventType.DEFAULT)
      .map(event => ({ time: [event.getStartTime(), event.getEndTime()], name: event.getTitle() }));

    acc[formatDate(targetDate)] = meetings;

    return acc;
  }, {});
}

function getWeeklyPullRequest(from, to) {
  const query = `is:pr author:${githubUsername} created:${formatDate(from)}..${formatDate(to)}`;

  const url = 'https://api.github.com/search/issues?q=' + encodeURIComponent(query);
  const response = UrlFetchApp.fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/vnd.github+json'
    }
  })

  const body = response.getBlob().getDataAsString();

  return JSON.parse(body);
}

function getWeeklyReviews(since) {

}

function test() {
  const today = new Date('2025-11-01');
  const monday = getCurrentWeekMonday(today);

  // console.log(JSON.stringify(getWeeklyEvents(monday), null, 2));

  console.log(getWeeklyPullRequest(monday, today));
}
