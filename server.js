import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import menuRoutes from './routes/menu.js'
import adminRoutes from './routes/admin.js'
import authRoutes from './routes/auth.js'
import { initDatabase } from './db/database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 5000
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
    console.log('✅ Created uploads directory:', uploadsDir)
}

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Serve uploaded files - FIXED PATH
app.use('/uploads', express.static(uploadsDir))

// Routes
app.use('/api', menuRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/auth', authRoutes)

// Settings route (for frontend)
app.get('/api/settings', async (req, res) => {
  try {
    const { db } = await import('./db/database.js')
    const settings = await db.getAsync('SELECT * FROM site_settings WHERE id = 1')
    
    if (settings) {
      const logoPath = settings.logo_path ? `/uploads/${settings.logo_path}` : null
      res.json({
        siteName: settings.site_name,
        logo: logoPath,
        primaryColor: settings.primary_color,
        secondaryColor: settings.secondary_color,
        backgroundColor: settings.background_color
      })
    } else {
      // Return default settings
      res.json({
        siteName: "قائمة الطعام",
        logo: null,
        primaryColor: "#3b82f6",
        secondaryColor: "#1e40af",
        backgroundColor: "#f8fafc"
      })
    }
  } catch (error) {
    console.error('Error fetching settings:', error)
    res.json({
      siteName: "قائمة الطعام",
      logo: null,
      primaryColor: "#3b82f6",
      secondaryColor: "#1e40af",
      backgroundColor: "#f8fafc"
    })
  }
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Menu API is running',
    timestamp: new Date().toISOString(),
    uploadsDir: uploadsDir
  })
})

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Global error handler:', error)
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message 
  })
})

// Initialize database and start server
initDatabase().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`)
    console.log(`📁 Uploads directory: ${uploadsDir}`)
    console.log(`🔐 Authentication system: Ready`)
    console.log(`✅ Default admin credentials: admin / admin123`)
    console.log(`✅ Health check: http://localhost:${PORT}/api/health`)
  })
}).catch(error => {
  console.error('❌ Failed to initialize database:', error)
  process.exit(1)
})
