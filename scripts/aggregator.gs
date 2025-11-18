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

function getLatestReportLink(date) {
  const sunday = new Date(date);
  sunday.setDate(sunday.getDate() - 1);

  const saturday = new Date(date);
  saturday.setDate(saturday.getDate() + 5);

  const documentName = `[Weekly Report: Cristopher] ${sunday.toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} - ${saturday.toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`;

  const files = DriveApp.getFilesByName(documentName);

  while (files.hasNext()) {
    return files.next().getId();
  }

  throw new Error('Report file not found');
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

function getWeeklyReviews(from, to) {
  const query = `is:pr commenter:${githubUsername} created:${formatDate(from)}..${formatDate(to)}`;

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

function findSection(text, document) {
  const body = document.getBody();
  const search = body.findText(text);
  if (!search) {
    console.log('cannot find text');
    return null;
  }

  const element = search.getElement().getParent().asParagraph();
  if (element.getType() !== DocumentApp.ElementType.PARAGRAPH) {
    return null;
  }

  const headingStyle = element.getHeading();
  if (headingStyle !== DocumentApp.ParagraphHeading.HEADING2) {
    return null;
  }

  const parent = element.getParent();
  const index = parent.getChildIndex(element);

  const newParagraph = parent.insertParagraph(index + 1, 'foo bar');
  const range = newParagraph.findText('foo bar');

  if (range) {
    const text = range.getElement().asText();

    text.setBold(false);
    text.setFontFamily('Arial');
  }

  document.saveAndClose();

  return true;
}

function test() {
  const today = new Date('2025-11-21');
  const monday = getCurrentWeekMonday(today);
  const friday = new Date(monday);
  friday.setDate(friday.getDate() + 4);

  // const events = getWeeklyEvents(monday);
  // const pullRequest = getWeeklyPullRequest(monday, friday);
  // const review = getWeeklyReviews(monday, friday);

  const id = getLatestReportLink(monday);

  const document = DocumentApp.openById(id);
  console.log(findSection('Issues', document));
}
