import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const app = express()
app.use(cors())
app.use(express.json())

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for admin access on the server
)

app.get('/api/students', async (req, res) => {
  const { data, error } = await supabase.from('students').select('*')
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

app.listen(3000, () => console.log('Server running on port 3000'))