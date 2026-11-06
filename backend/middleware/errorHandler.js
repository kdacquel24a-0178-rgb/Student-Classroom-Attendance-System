export default function errorHandler(error, _request, response, _next) {
  console.error("API request failed:", error)
  response.status(500).json({ error: "Database query error" })
}
