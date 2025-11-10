const githubToken = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
const githubUsername = PropertiesService.getScriptProperties().getProperty('GITHUB_USERNAME');

function formatDate(date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function getCurrentWeekMonday(date) {
  const monday = new Date(date);
  monday.setDate(monday.getDate() - 4);

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

function getWeeklyPullRequest(repo, since) {
  const query = `is:pr author:${githubUsername} created:>=${formatDate(since)}`;

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

function test() {
  const monday = getCurrentWeekMonday(new Date('2025-10-31'));

  // console.log(JSON.stringify(getWeeklyEvents(monday), null, 2));

  for (const repo of githubRepositories) {
    console.log(getWeeklyPullRequest(repo, monday));
  }
}
