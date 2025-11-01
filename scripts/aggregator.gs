const githubToken = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
const githubUsername = PropertiesService.getScriptProperties().getProperty('GITHUB_USERNAME');

function formatDate(date) {
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
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

function getWeeklyGithubActivities() {
  const response = UrlFetchApp.fetch(`https://api.github.com/users/${githubUsername}/events`, {
    method: 'GET',
    headers: {
      Accept: 'application/vnd.github+json',
      'X-Github-API-Version': '2022-11-28',
      Authorization: `Bearer ${githubToken}`,
    }
  });

  return JSON.parse(response.getBlob().getDataAsString());
}

function test() {
  console.log(JSON.stringify(getWeeklyEvents(getCurrentWeekMonday(new Date('2025-10-31'))), null, 2));

  getWeeklyGithubActivities();
}
