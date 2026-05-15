export function readCsrfCookie() {
  const match = document.cookie.match(
    /(?:^|;\s*)(?:__Host-)?x-csrf-token=([^;]+)/
  );
  return match ? decodeURIComponent(match[1]) : null;
}
