import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import menuRoutes from './routes/menu.js'
import adminRoutes from './routes/admin-simple.js'
import { initDatabase } from './db/database-simple.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 5000

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

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir))

// Routes
app.use('/api', menuRoutes)
app.use('/api/admin', adminRoutes)

// Simple authentication middleware (temporary)
const simpleAuth = (req, res, next) => {
    const authHeader = req.headers['authorization']
    
    if (!authHeader) {
        return res.status(401).json({ error: 'التوثيق مطلوب' })
    }

    // Simple token check (in production use JWT)
    if (authHeader !== 'Bearer simple-admin-token') {
        return res.status(403).json({ error: 'رمز التوثيق غير صالح' })
    }

    req.user = { id: 1, username: 'admin', fullName: 'مدير النظام' }
    next()
}

// Apply simple auth to admin routes
app.use('/api/admin', simpleAuth)

// Settings route (for frontend)
app.get('/api/settings', async (req, res) => {
  try {
    const { db } = await import('./db/database-simple.js')
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

// Simple login endpoint
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body

    if (!username || !password) {
        return res.status(400).json({ 
            success: false,
            error: 'اسم المستخدم وكلمة المرور مطلوبان' 
        })
    }

    // Simple credentials check
    if (username === 'admin' && password === 'admin123') {
        res.json({
            success: true,
            message: 'تم تسجيل الدخول بنجاح',
            token: 'simple-admin-token',
            user: {
                id: 1,
                username: 'admin',
                fullName: 'مدير النظام'
            }
        })
    } else {
        res.status(401).json({ 
            success: false,
            error: 'اسم المستخدم أو كلمة المرور غير صحيحة' 
        })
    }
})

// Simple token verification
app.post('/api/auth/verify', (req, res) => {
    const { token } = req.body

    if (token === 'simple-admin-token') {
        res.json({
            success: true,
            user: {
                id: 1,
                username: 'admin',
                fullName: 'مدير النظام'
            }
        })
    } else {
        res.status(401).json({ 
            success: false,
            error: 'رمز التحقق غير صالح' 
        })
    }
})

// Simple change password
app.post('/api/auth/change-password', (req, res) => {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ 
            success: false,
            error: 'جميع الحقول مطلوبة' 
        })
    }

    if (currentPassword !== 'admin123') {
        return res.status(401).json({ 
            success: false,
            error: 'كلمة المرور الحالية غير صحيحة' 
        })
    }

    // In a real app, you would update the password in database
    res.json({
        success: true,
        message: 'تم تغيير كلمة المرور بنجاح'
    })
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Menu API is running',
    timestamp: new Date().toISOString(),
    uploadsDir: uploadsDir,
    auth: 'simple'
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
    console.log(`🔐 Simple authentication: Ready`)
    console.log(`✅ Default admin credentials: admin / admin123`)
    console.log(`✅ Health check: http://localhost:${PORT}/api/health`)
  })
}).catch(error => {
  console.error('❌ Failed to initialize database:', error)
  process.exit(1)
})
