function getWeeklyEvents(date) {
  return [...Array(5).keys()].map(val => {
    const targetDate = new Date(date);
    targetDate.setDate(targetDate.getDate() + val);

    const events = CalendarApp.getEventsForDay(targetDate);

    return events
      .filter(event => event.getEventType() === CalendarApp.EventType.DEFAULT)
      .map(event => ({ time: [event.getStartTime(), event.getEndTime()], name: event.getTitle() }))
  }).flat();
}

function test() {
  console.log(getWeeklyEvents(new Date('2025-10-30')))
}
