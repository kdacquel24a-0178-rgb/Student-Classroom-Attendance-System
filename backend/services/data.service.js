import db from "../config/db.js"

export function getDataFromDatabase() {
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM my_table", (error, results) => {
      if (error) {
        reject(error)
        return
      }

      resolve(results)
    })
  })
}
