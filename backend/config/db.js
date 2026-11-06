import mysql from "mysql2"

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root123",
  database: "attendaces",
})

db.connect((error) => {
  if (error) {
    console.error("Error connecting to the database:", error)
    return
  }

  console.log("Connected to the database.")
})

export default db
