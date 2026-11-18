import cors from "cors"
import express from "express"
import dataRoutes from "./routes/data.routes.js"
import errorHandler from "./middleware/errorHandler.js"

const app = express()

app.use(cors())
app.use(express.json())
app.use("/api", dataRoutes)
app.use(errorHandler)

export default app
