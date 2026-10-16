const trimTrailingSlash = (value) => value?.replace(/\/+$/, "");

module.exports = {
  secretKey: process.env.CHAPA_SECRET_KEY,
  apiBaseUrl: trimTrailingSlash(
    process.env.CHAPA_API_BASE_URL || "https://api.chapa.co/v1",
  ),
  currency: (process.env.CHAPA_CURRENCY || "ETB").toUpperCase(),
  backendUrl: trimTrailingSlash(process.env.BACKEND_URL),
  frontendUrl: trimTrailingSlash(process.env.FRONTEND_URL),
};