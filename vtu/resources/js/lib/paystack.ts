// Frontend helper for redirecting to Paystack checkout URL from backend
export function openPaystackUrl(url: string) {
  window.location.href = url;
}
