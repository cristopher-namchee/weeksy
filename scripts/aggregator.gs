const GithubToken = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
const ReportUsername = PropertiesService.getScriptProperties().getProperty('REPORT_USERNAME');

const Heading = {
  Issues: 'Issues',
  Task: 'Accomplishments',
  Events: 'Meetings/Events/Training/Conferences',
  Todo: 'Next Actions',
  Article: 'Technology, Business, Communication, Leadership, Management & Marketing',
};

const Repository = {
  'https://api.github.com/repos/GDP-ADMIN/glchat': 'GLChat',
  'https://api.github.com/repos/GDP-ADMIN/glchat-sdk': 'GLChat SDK',
  'https://api.github.com/repos/cristopher-namchee/deploynaut': 'Deploynaut',
  'https://github.com/stainless-sdks/glchat-sdk-typescript': 'GLChat SDK',
};

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

  const documentName = `[Weekly Report: ${ReportUsername}] ${sunday.toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} - ${saturday.toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`;

  const files = DriveApp.getFilesByName(documentName);

  while (files.hasNext()) {
    return files.next().getId();
  }

  throw new Error('Report file not found');
}

function getWeeklyEvents(date) {
  const events = [...Array(5).keys()].reduce((acc, curr) => {
    const targetDate = new Date(date);
    targetDate.setDate(targetDate.getDate() + curr);

    const events = CalendarApp.getEventsForDay(targetDate);

    const meetings = events
      .filter(event => event.getEventType() === CalendarApp.EventType.DEFAULT && event.getMyStatus() === CalendarApp.GuestStatus.YES)
      .map(event => ({ time: [event.getStartTime(), event.getEndTime()], name: event.getTitle() }));

    acc[formatDate(targetDate)] = meetings;

    return acc;
  }, {});

  const table = new Set();
  const deduplicatedEvents = [];

  for (const eventOfDay of Object.values(events)) {
    for (const { name } of eventOfDay) {
      if (!table.has(name)) {
        deduplicatedEvents.push(name);
        table.add(name);
      }
    }
  }

  return deduplicatedEvents;
}

function getWeeklyIssues(from, to) {
  const query = `is:issue author:@me created:${formatDate(from)}..${formatDate(to)}`;

  const url = 'https://api.github.com/search/issues?q=' + encodeURIComponent(query);
  const response = UrlFetchApp.fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${GithubToken}`,
      Accept: 'application/vnd.github+json'
    }
  })

  const body = response.getBlob().getDataAsString();
  const issues = JSON.parse(body).items;

  return groupSearchItems(issues.map(pr => ({
    url: pr.html_url,
    repository: pr.repository_url,
    title: pr.title,
  })));
}

function getWeeklyUpdates(from, to) {
  const query = `is:pr author:@me is:draft updated:${formatDate(from)}..${formatDate(to)}`;

  const url = 'https://api.github.com/search/issues?q=' + encodeURIComponent(query);
  const response = UrlFetchApp.fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${GithubToken}`,
      Accept: 'application/vnd.github+json'
    }
  })

  const body = response.getBlob().getDataAsString();
  const updates = JSON.parse(body).items;

  return groupSearchItems(updates.map(pr => ({
    url: pr.html_url,
    repository: pr.repository_url,
    title: pr.title,
  })));
}

function getWeeklyPullRequest(from, to) {
  const query = `is:pr author:@me -is:draft created:${formatDate(from)}..${formatDate(to)}`;

  const url = 'https://api.github.com/search/issues?q=' + encodeURIComponent(query);
  const response = UrlFetchApp.fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${GithubToken}`,
      Accept: 'application/vnd.github+json'
    }
  })

  const body = response.getBlob().getDataAsString();
  const pullRequests = JSON.parse(body).items;

  return groupSearchItems(pullRequests.map(pr => ({
    url: pr.html_url,
    repository: pr.repository_url,
    title: pr.title,
  })));
}

function getWeeklyReviews(from, to) {
  const query = `is:pr reviewed-by:@me updated:${formatDate(from)}..${formatDate(to)} -author:@me`;

  const url = 'https://api.github.com/search/issues?q=' + encodeURIComponent(query);
  const response = UrlFetchApp.fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${GithubToken}`,
      Accept: 'application/vnd.github+json'
    }
  })

  const body = response.getBlob().getDataAsString();
  const reviews = JSON.parse(body).items;

  return groupSearchItems(reviews.map(review => ({
    url: review.html_url,
    repository: review.repository_url,
    title: review.title,
  })));
}

function getCurrentlyAssignedIssues() {
  const query = `is:issue is:open assignee:@me`;

  const url = 'https://api.github.com/search/issues?q=' + encodeURIComponent(query);
  const response = UrlFetchApp.fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${GithubToken}`,
      Accept: 'application/vnd.github+json'
    }
  })

  const body = response.getBlob().getDataAsString();
  const assigned = JSON.parse(body).items;

  return groupSearchItems(assigned.map(review => ({
    url: review.html_url,
    repository: review.repository_url,
    title: review.title,
  })));
}

function cleanSection(section) {
  const text = section.getText();

  const parent = section.getParent();
  const index = parent.getChildIndex(section);

  const count = parent.getNumChildren();
  const target = [];

  for (let idx = index + 1; idx < count; idx++) {
    const child = parent.getChild(idx);

    if (child.getType() === DocumentApp.ElementType.PARAGRAPH) {
      const heading = child.asParagraph().getHeading();

      if (heading === DocumentApp.ParagraphHeading.HEADING2 && child.getText() !== text) {
        break;
      }
    }

    target.push(child);
  }

  for (const t of target) {
    parent.removeChild(t);
  }
}

function groupSearchItems(items) {
  return items.reduce((acc, curr) => {
    const label = Repository[curr.repository] ?? 'Others';

    if (!(label in acc)) {
      acc[label] = [];
    }

    acc[label].push(curr);

    return acc;
  }, {});
}

function createSection(title, items, parent, index) {
  const section = parent.insertListItem(++index, title);
  section.setGlyphType(DocumentApp.GlyphType.NUMBER);
  section.setBold(false);
  section.setFontFamily('Arial');

  for (const [repo, group] of Object.entries(items)) {
    const rootItem = parent.insertListItem(++index, repo);
    rootItem.setGlyphType(DocumentApp.GlyphType.NUMBER);
    rootItem.setBold(false);
    rootItem.setFontFamily('Arial');
    rootItem.setNestingLevel(1);

    for (const item of group) {
      const el = parent.insertListItem(++index, item.title);
      el.setGlyphType(DocumentApp.GlyphType.NUMBER);
      el.setBold(false);
      el.setFontFamily('Arial');
      el.setNestingLevel(2);

      const text = el.editAsText();

      text.setLinkUrl(0, text.getText().length - 1, item.url);
    }
  }

  return index;
}

function fillAccomplishments({ pullRequests, reviews, issues, progress }, section) {
  const parent = section.getParent();
  let index = parent.getChildIndex(section);

  if (Object.keys(pullRequests).length === 0 && Object.keys(reviews).length === 0 && Object.keys(issues).length === 0 && Object.keys(progress).length === 0) {
    const paragraph = parent.insertParagraph(++index, 'None');
    paragraph.setBold(false);
    paragraph.setFontFamily('Arial');

    return;
  }

  if (Object.keys(issues).length > 0) {
    index = createSection('Issue(s) Reported', issues, parent, index);
  }

  if (Object.keys(progress).length > 0) {
    index = createSection('In Progress', progress, parent, index);
  }

  if (Object.keys(pullRequests).length > 0) {
    index = createSection('Pull Request(s) Created', pullRequests, parent, index);
  }

  if (Object.keys(reviews).length > 0) {
    index = createSection('Pull Request Review(s)', reviews, parent, index);
  }
}

function fillWeeklyEvents(events, section) {
  const parent = section.getParent();
  let index = parent.getChildIndex(section);

  if (events.length === 0) {
    const paragraph = parent.insertParagraph(++index, 'None');
    paragraph.setBold(false);
    paragraph.setFontFamily('Arial');

    return;
  }

  for (const event of events) {
    const part = parent.insertListItem(++index, event);
    part.setGlyphType(DocumentApp.GlyphType.NUMBER);
    part.setBold(false);
    part.setFontFamily('Arial');
  }
}

function fillNextActions(todos, section) {
  const parent = section.getParent();
  let index = parent.getChildIndex(section);

  if (Object.keys(todos).length === 0) {
    const paragraph = parent.insertParagraph(++index, 'None');
    paragraph.setBold(false);
    paragraph.setFontFamily('Arial');

    return;
  }

  for (const [todo, group] of Object.entries(todos)) {
    const rootItem = parent.insertListItem(++index, todo);
    rootItem.setGlyphType(DocumentApp.GlyphType.NUMBER);
    rootItem.setBold(false);
    rootItem.setFontFamily('Arial');
    rootItem.setNestingLevel(1);

    for (const item of group) {
      const el = parent.insertListItem(++index, item.title);
      el.setGlyphType(DocumentApp.GlyphType.NUMBER);
      el.setBold(false);
      el.setFontFamily('Arial');
      el.setNestingLevel(2);

      const text = el.editAsText();

      text.setLinkUrl(0, text.getText().length - 1, item.url);
    }
  }
}

// Fill with None for now
function fillIssues(section) {
  const parent = section.getParent();
  let index = parent.getChildIndex(section);

  const paragraph = parent.insertParagraph(++index, 'None');
  paragraph.setBold(false);
  paragraph.setFontFamily('Arial');
}

function findSection(search, document) {
  const body = document.getBody();
  const headingText = body.findText(search);
  if (!headingText) {
    return null;
  }

  const section = headingText.getElement().getParent().asParagraph();
  if (section.getType() !== DocumentApp.ElementType.PARAGRAPH) {
    return null;
  }

  const headingStyle = section.getHeading();
  if (headingStyle !== DocumentApp.ParagraphHeading.HEADING2) {
    return null;
  }

  return section;
}

function main() {
  const today = new Date();

  const monday = getCurrentWeekMonday(today);
  const saturday = new Date(monday);
  saturday.setDate(saturday.getDate() + 5);

  const events = getWeeklyEvents(monday);

  const issues = getWeeklyIssues(monday, saturday);
  const pullRequests = getWeeklyPullRequest(monday, saturday);
  const reviews = getWeeklyReviews(monday, saturday);
  const progress = getWeeklyUpdates(monday, saturday);

  const id = getLatestReportLink(monday);

  const document = DocumentApp.openById(id);

  const issuesSection = findSection(Heading.Issues, document);
  cleanSection(issuesSection);

  fillIssues(issuesSection);

  const meetingSection = findSection(Heading.Events, document);
  cleanSection(meetingSection);

  fillWeeklyEvents(events, meetingSection, document);

  const accomplishmentSection = findSection(Heading.Task, document);
  cleanSection(accomplishmentSection);

  fillAccomplishments({ pullRequests, reviews, issues, progress }, accomplishmentSection);

  const nextActions = getCurrentlyAssignedIssues();
  const nextActionSection = findSection(Heading.Todo, document);
  cleanSection(nextActionSection);

  fillNextActions(nextActions, nextActionSection);

  document.saveAndClose();
}
