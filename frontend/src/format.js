export function formatUkTime(isoText) {
  const date = new Date(isoText);
  return date.toLocaleTimeString("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function formatUkDateTime(isoText) {
  const date = new Date(isoText);
  return date.toLocaleString("en-GB", {
    timeZone: "Europe/London",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}