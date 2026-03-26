export function formatCnMonthDayWeek(input = new Date()) {
  const month = input.getMonth() + 1;
  const day = input.getDate();
  const weekdayMap = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"] as const;
  return `${month}月${day}日 ${weekdayMap[input.getDay()]}`;
}
