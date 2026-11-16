const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
)

  .replace(/\/+$/, "")

export class ApiError extends Error {
  constructor(
    message: string,

    public readonly status: number,
  ) {
    super(message)

    this.name = "ApiError"
  }
}

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(
    `${API_BASE_URL}/${path.replace(/^\/+/, "")}`,

    {
      headers: { Accept: "application/json" },
    },
  )

  if (!response.ok) {
    const details = await response.text()

    throw new ApiError(
      details || `Request failed with status ${response.status}`,

      response.status,
    )
  }

  return (await response.json()) as T
}
