import { getDataFromDatabase } from "../services/data.service.js"

export async function getData(_request, response, next) {
  try {
    response.json(await getDataFromDatabase())
  } catch (error) {
    next(error)
  }
}
