const bugsSheet = '1ZGlbEKvVqaP4BL2a81sKSHaBJw11cYxkyKQpCPdPV7A';

const GithubToken = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
const ReportUsername = PropertiesService.getScriptProperties().getProperty('REPORT_USERNAME');

const OOTMSheetName = 'REPORT';

// Fill this yourself
const IgnoredWeeklyEvents = ['Lunch'];

const PlaceholderText = 'Note: Please refer to this guide on how to fill your weekly report';

const Heading = {
  Issues: 'Issues',
  Task: 'Accomplishments',
  Events: 'Meetings/Events/Training/Conferences',
  Todo: 'Next Actions',
  Article: 'Technology, Business, Communication, Leadership, Management & Marketing',
  OMTM: 'Key Metrics / OMTM',
  OutOfOffice: 'Out of Office',
};

// Also fill this yourself
const Repository = {
  'https://api.github.com/repos/GDP-ADMIN/glchat': 'GLChat',
  'https://api.github.com/repos/GDP-ADMIN/glchat-sdk': 'GLChat SDK',
  'https://api.github.com/repos/cristopher-namchee/deploynaut': 'Deploynaut',
  'https://github.com/stainless-sdks/glchat-sdk-typescript': 'GLChat SDK',
};

function validateInput() {
  if (!GithubToken) {
    throw new Error('GitHub token is required for listing accomplishments. Please ensure that GITHUB_TOKEN is filled in script properties.');
  }

  if (!ReportUsername) {
    throw new Error('Report username is required for finding the weekly report document. Please ensure that REPORT_USERNAME is filled in script properties.')
  }
}

function formatGithubDate(date) {
  const month = ('0' + (date.getMonth() + 1)).slice(-2);
  const actualDate = ('0' + date.getDate()).slice(-2);

  return `${date.getFullYear()}-${month}-${actualDate}`;
}

function formatDate(date, options = {}) {
  return date.toLocaleString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', ...options });
}

function getCurrentWeekMonday(date) {
  const monday = new Date(date);

  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  monday.setHours(0, 0, 0);

  return monday;
}

function getLatestReportLink(date) {
  const prevSunday = new Date(date);
  prevSunday.setDate(prevSunday.getDate() - 1);

  const nextSaturday = new Date(date);
  nextSaturday.setDate(nextSaturday.getDate() + 5);

  const documentName = `[Weekly Report: ${ReportUsername}] ${formatDate(prevSunday)} - ${formatDate(nextSaturday)}`;

  const files = DriveApp.getFilesByName(documentName);

  while (files.hasNext()) {
    return files.next().getId();
  }

  throw new Error(`Report file with name ${documentName} cannot found. Please ensure that your REPORT_USERNAME is correct.`);
}

function getWeeklyEvents(from, to) {
  const weeklyEvents = CalendarApp.getEvents(from, to)
    .filter(event => (event.getEventType() === CalendarApp.EventType.DEFAULT && event.getMyStatus() === CalendarApp.GuestStatus.YES)
      || event.getEventType() === CalendarApp.EventType.OUT_OF_OFFICE);

  const table = new Set();
  const meetings = [];

  const oof = [];

  for (const event of weeklyEvents) {
    switch (event.getEventType()) {
      case CalendarApp.EventType.DEFAULT:
        if (!table.has(event.getTitle()) && !IgnoredWeeklyEvents.includes(event.getTitle())) {
          table.add(event.getTitle());
          meetings.push(event.getTitle());
        }
        break;
      case CalendarApp.EventType.OUT_OF_OFFICE: 
        oof.push({ name: event.getTitle(), time: [event.getStartTime(), event.getEndTime()] });
    }
  }

  return {
    meetings,
    oof,
  }
}

function fetchGithubData(query) {
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

function getWeeklyIssues(from, to) {
  const query = `is:issue author:@me created:${formatGithubDate(from)}..${formatGithubDate(to)}`;

  return fetchGithubData(query);
}

function getWeeklyUpdates(from, to) {
  const query = `is:pr author:@me is:draft is:open updated:${formatGithubDate(from)}..${formatGithubDate(to)}`;

  return fetchGithubData(query);
}

function getWeeklyPullRequest(from, to) {
  const query = `is:pr author:@me -is:draft created:${formatGithubDate(from)}..${formatGithubDate(to)}`;

  return fetchGithubData(query);
}

function getWeeklyReviews(from, to) {
  const query = `is:pr reviewed-by:@me updated:${formatGithubDate(from)}..${formatGithubDate(to)} -author:@me`;

  return fetchGithubData(query);
}

function getCurrentlyAssignedIssues() {
  const query = `is:issue is:open assignee:@me`;

  return fetchGithubData(query);
}

function cleanSection(section) {
  const text = section.getText();

  const parent = section.getParent();
  const index = parent.getChildIndex(section);

  const count = parent.getNumChildren();
  const target = [];

  for (let idx = index + 1; idx < count; idx++) {
    const child = parent.getChild(idx);

    if (child.getText() === '' || child.getText() === PlaceholderText) {
      break;
    }

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
    rootItem.setNestingLevel(1);

    for (const item of group) {
      const el = parent.insertListItem(++index, item.title);
      el.setGlyphType(DocumentApp.GlyphType.NUMBER);
      el.setNestingLevel(2);

      const text = el.editAsText();

      text.setLinkUrl(0, text.getText().length - 1, item.url);
    }
  }

  return index;
}

function fillSectionWithNone(parent, index) {
  const paragraph = parent.insertParagraph(++index, 'None');
  paragraph.setBold(false);
  paragraph.setFontFamily('Arial');
}

function fillAccomplishments({ pullRequests, reviews, issues, progress }, section) {
  const parent = section.getParent();
  let index = parent.getChildIndex(section);

  if (Object.keys(pullRequests).length === 0 && Object.keys(reviews).length === 0 && Object.keys(issues).length === 0 && Object.keys(progress).length === 0) {
    fillSectionWithNone(parent, index);

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
    fillSectionWithNone(parent, index);

    return;
  }

  for (const event of events) {
    const item = parent.insertListItem(++index, event);
    item.setGlyphType(DocumentApp.GlyphType.NUMBER);
    item.setBold(false);
    item.setFontFamily('Arial');
  }
}

function fillNextActions(todos, section) {
  const parent = section.getParent();
  let index = parent.getChildIndex(section);

  if (Object.keys(todos).length === 0) {
    fillSectionWithNone(parent, index);

    return;
  }

  for (const [todo, group] of Object.entries(todos)) {
    const rootItem = parent.insertListItem(++index, todo);
    rootItem.setGlyphType(DocumentApp.GlyphType.NUMBER);
    rootItem.setBold(false);
    rootItem.setFontFamily('Arial');
    rootItem.setNestingLevel(1);

    for (const item of group) {
      const groupItem = parent.insertListItem(++index, item.title);
      groupItem.setGlyphType(DocumentApp.GlyphType.NUMBER);
      groupItem.setBold(false);
      groupItem.setNestingLevel(2);

      const text = groupItem.editAsText();

      text.setLinkUrl(0, text.getText().length - 1, item.url);
    }
  }
}

// Fill with None for now
function fillIssues(section) {
  const parent = section.getParent();
  let index = parent.getChildIndex(section);

  fillSectionWithNone(parent, index);
}

function getOMTMData() {
  const ss = SpreadsheetApp.openById(bugsSheet);
  const sheet = ss.getSheets().find(value => value.getName() === OOTMSheetName);

  const bugs = Bugle.getBugReport(sheet);
  const aip = Bugle.getAIPReport();
  const performance = Bugle.getLLMPerformanceReport(sheet);

  return {
    bugs,
    aip,
    performance,
  };
}

function fillBugReport(bugs, heading, parent, index) {
  const header = parent.insertParagraph(++index, heading);
  header.setHeading(DocumentApp.ParagraphHeading.HEADING4);
  header.setBold(true);

  const openedHeader = parent.insertParagraph(++index, `Total Opened: ${bugs.open.reduce((acc, curr) => acc + curr, 0)} bugs`);
  openedHeader.setHeading(DocumentApp.ParagraphHeading.HEADING5);
  openedHeader.setItalic(true);

  let p = parent.insertParagraph(++index, `      P0: ${bugs.open[0]} bugs`);
  p.setItalic(false);
  parent.insertParagraph(++index, `      P1: ${bugs.open[1]} bugs`);
  parent.insertParagraph(++index, `      P2: ${bugs.open[2]} bugs`);

  const closedHeader = parent.insertParagraph(++index, `Total Closed: ${bugs.closed.reduce((acc, curr) => acc + curr, 0)} bugs`);
  closedHeader.setHeading(DocumentApp.ParagraphHeading.HEADING5);
  closedHeader.setItalic(true);

  p = parent.insertParagraph(++index, `      P0: ${bugs.closed[0]} bugs`);
  p.setItalic(false);
  parent.insertParagraph(++index, `      P1: ${bugs.closed[1]} bugs`);
  parent.insertParagraph(++index, `      P2: ${bugs.closed[2]} bugs`);
  parent.insertParagraph(++index, `      Closed as enhancements: ${bugs.closed[3]} bugs`);

  return index;
}

function fillPerformanceReport(performance, parent, index) {
  const header = parent.insertParagraph(++index, 'GLChat Performance Report');
  header.setHeading(DocumentApp.ParagraphHeading.HEADING4);
  header.setBold(true);

  const modelDesc = parent.insertParagraph(++index, performance[0]);
  modelDesc.setHeading(DocumentApp.ParagraphHeading.HEADING5);
  modelDesc.setItalic(true);

  for (let idx = 1; idx < performance.length; idx++) {
    const paragraph = parent.insertParagraph(++index, `      ${performance[idx]}`);
    paragraph.setBold(false);
    paragraph.setItalic(false);
  }
  return index;
}

function fillAIPReport(aip, parent, index) {
  const header = parent.insertParagraph(++index, 'GL AIP Performance Report');
  header.setHeading(DocumentApp.ParagraphHeading.HEADING4);
  header.setBold(true);

  // this is fixed for now
  const modelDesc = parent.insertParagraph(++index, `gpt-4.1 ${aip.users} Concurrent Users`);
  modelDesc.setHeading(DocumentApp.ParagraphHeading.HEADING5);
  modelDesc.setItalic(true);

  let counter = 1;

  for (const [scenario, target] of Object.entries(aip.scenario)) {
    if (typeof target[0] !== 'number') {
      continue;
    }

    const paragraph = parent.insertParagraph(++index, `      Scenario ${counter++}: ${scenario} — ${target[0].toFixed(3)}s from target ${target[1]}`);
    paragraph.setBold(false);
    paragraph.setItalic(false);
  }

  return index;
}

function fillOMTM({ bugs, performance, aip }, section, date) {
  const parent = section.getParent();
  let index = parent.getChildIndex(section);

  const firstDay = new Date(date);
  firstDay.setDate(1);

  const header = parent.insertParagraph(++index, `Month-to-Date (${formatDate(firstDay)} - ${formatDate(date)})`);
  header.setHeading(DocumentApp.ParagraphHeading.HEADING4);
  header.setBold(false);

  index = fillBugReport(bugs.internal, 'Bugs from Internal Report', parent, index);
  index = fillBugReport(bugs.external, 'Bugs from External Report', parent, index);
  index = fillPerformanceReport(performance, parent, index);
  index = fillAIPReport(aip, parent, index);
}

function fillOutOfOffice(oof, section) {
  const parent = section.getParent();
  let index = parent.getChildIndex(section);

  if (oof.length === 0) {
    fillSectionWithNone(parent, index);

    return;
  }

  const sharedFormattingOptions = {
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
    timeZone: 'Asia/Jakarta',
  };

  for (const event of oof) {
    const text = `${formatDate(event.time[0], sharedFormattingOptions)} - ${formatDate(event.time[1], sharedFormattingOptions)}: ${event.name}`;
    const item = parent.insertListItem(++index, text);
    item.setGlyphType(DocumentApp.GlyphType.NUMBER);
    item.setBold(false);
    item.setFontFamily('Arial');
  }
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

function cleanPlaceholderNoteText(body) {
  const lastChild = body.getChild(body.getNumChildren() - 1);
  
  if (lastChild.asParagraph().getText() === PlaceholderText) {
    lastChild.clear();
  }
}

function main() {
  const self = Session.getActiveUser().getEmail();

  const today = new Date();

  try {
    validateInput();

    const monday = getCurrentWeekMonday(today);
    const saturday = new Date(monday);
    saturday.setDate(saturday.getDate() + 5);

    const id = getLatestReportLink(monday);

    const document = DocumentApp.openById(id);

    const { meetings, oof } = getWeeklyEvents(monday, saturday);
    const issues = getWeeklyIssues(monday, saturday);
    const pullRequests = getWeeklyPullRequest(monday, saturday);
    const reviews = getWeeklyReviews(monday, saturday);
    const progress = getWeeklyUpdates(monday, saturday);

    const issuesSection = findSection(Heading.Issues, document);
    cleanSection(issuesSection);

    fillIssues(issuesSection);

    const meetingSection = findSection(Heading.Events, document);
    cleanSection(meetingSection);

    fillWeeklyEvents(meetings, meetingSection, document);

    const accomplishmentSection = findSection(Heading.Task, document);
    cleanSection(accomplishmentSection);

    fillAccomplishments({ pullRequests, reviews, issues, progress }, accomplishmentSection);

    const nextActions = getCurrentlyAssignedIssues();
    const nextActionSection = findSection(Heading.Todo, document);
    cleanSection(nextActionSection);

    fillNextActions(nextActions, nextActionSection);

    const omtmData = getOMTMData();
    const omtmSection = findSection(Heading.OMTM, document);
    cleanSection(omtmSection);

    fillOMTM(omtmData, omtmSection, today);

    const oofSection = findSection(Heading.OutOfOffice, document);
    cleanSection(oofSection);

    fillOutOfOffice(oof, oofSection);

    cleanPlaceholderNoteText(document.getBody());

    GmailApp.sendEmail(self, '✅ [Weeksy] Weekly Report Filled', '', {
      htmlBody: `
        <div style="font-family: Helvetica, Arial, sans-serif; color: #333; line-height: 1.6;">
          <h2>Weekly Report Filled</h2>

          <p>
            <b>Weeksy</b> has successfully filled your weekly report <a href="${document.getUrl()}">here</a>.
          
            Please double-check the contents to ensure its validity.
          </p>

          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">

          <p style="font-size: 13px; color: #666;">
            This is an automated message from <b>Weeksy</b>.
          </p>
        </div>`,
    });

    document.saveAndClose();
  } catch (err) {
    GmailApp.sendEmail(self, '⚠️ [Weeksy] Execution Failed', '', {
      htmlBody: `
        <div style="font-family: Helvetica, Arial, sans-serif; color: #333; line-height: 1.6;">
          <h2>Failed to Execute</h2>

          <p><b>Weeksy</b> encountered an error during execution:</p>

          <div style="background-color: #f8d7da; border: 1px solid #f5c2c7; padding: 10px 15px; border-radius: 6px; margin: 10px 0;">
            <pre style="margin: 0; font-family: Consolas, monospace; white-space: pre-wrap;">${JSON.stringify(err, Object.getOwnPropertyNames(err), 2)}</pre>
          </div>

          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">

          <p style="font-size: 13px; color: #666;">
            This is an automated message from <b>Weeksy</b>.
          </p>
        </div>`,
    });
  }
}
