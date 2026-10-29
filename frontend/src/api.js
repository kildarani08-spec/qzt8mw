const API_URL = import.meta.env.VITE_API_URL;

async function fetchFromBackend(path) {
  const response = await fetch(API_URL + path);
  if (!response.ok) {
    throw new Error("Request failed: " + response.status);
  }
  const data = await response.json();
  return data;
}

export function getDay(date) {
  return fetchFromBackend("/day?date=" + date);
}

export function getAccuracy() {
  return fetchFromBackend("/accuracy");
}