function getWeeklyEvents(date) {
  return [...Array(5).keys()].map(val => {
    const targetDate = new Date(date);
    targetDate.setDate(targetDate.getDate() + val);
  });
}
