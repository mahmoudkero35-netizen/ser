import express from "express"
import cors from "cors"
import multer from "multer"
import path from "path"
import { fileURLToPath } from "url"
import fs from "fs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 5000

// إنشاء مجلد uploads إذا لم يكن موجوداً
const uploadsDir = path.join(__dirname, "uploads")
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
    console.log("✅ تم إنشاء مجلد uploads")
}

// تكوين multer لرفع الملفات مع حجم أكبر
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname)
    cb(null, "image-" + uniqueSuffix + ext)
  }
})

// زيادة حجم الملف إلى 20MB وإضافة معالجة أخطاء
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB - زيادة الحجم
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)
    
    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error("يسمح برفع الصور فقط (JPEG, PNG, GIF, WebP)"))
    }
  }
})

// Middleware لمعالجة أخطاء multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false,
        error: 'حجم الملف كبير جداً. الحد الأقصى 20MB' 
      })
    }
  }
  next(error)
}

// Middleware
app.use(cors())
app.use(express.json())
app.use("/uploads", express.static(uploadsDir))

// بيانات في الذاكرة
let categories = [
    { id: 1, name: "المقبلات", description: "مقبلات لذيذة لبدء وجبتك", color: "#ef4444", icon: "🥗", created_at: new Date().toISOString() },
    { id: 2, name: "الوجبات الرئيسية", description: "وجبات رئيسية شهية", color: "#3b82f6", icon: "🍕", created_at: new Date().toISOString() },
    { id: 3, name: "المشروبات", description: "مشروبات منعشة", color: "#10b981", icon: "🥤", created_at: new Date().toISOString() },
    { id: 4, name: "الحلويات", description: "حلويات لذيذة", color: "#f59e0b", icon: "🍰", created_at: new Date().toISOString() }
]

let products = [
    { 
        id: 1, 
        name: "سلطة يونانية", 
        description: "سلطة طازجة مع الخضار والزيتون والجبنة البيضاء", 
        price: 25, 
        category_id: 1, 
        is_available: true, 
        image: null,
        created_at: new Date().toISOString() 
    },
    { 
        id: 2, 
        name: "شاورما لحم", 
        description: "شاورما لحم مشوية مع الخضار والصلصات", 
        price: 35, 
        category_id: 2, 
        is_available: true, 
        image: null,
        created_at: new Date().toISOString() 
    }
]

let settings = {
    siteName: "مطعمنا الرائع",
    primaryColor: "#3b82f6",
    secondaryColor: "#1e40af", 
    backgroundColor: "#f8fafc",
    logo: null,
    description: "أفضل المأكولات والمشروبات في المدينة",
    phone: "+966 123 456 789",
    address: "الرياض، السعودية",
    workingHours: "٨ ص - ١٢ م",
    facebook: "",
    instagram: "",
    twitter: ""
}

// 🔐 نظام مصادقة
app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body
    
    if (username === "admin" && password === "admin123") {
        res.json({
            success: true,
            message: "تم تسجيل الدخول بنجاح",
            token: "admin-token-123",
            user: { id: 1, username: "admin", fullName: "مدير النظام" }
        })
    } else {
        res.status(401).json({
            success: false,
            error: "اسم المستخدم أو كلمة المرور غير صحيحة"
        })
    }
})

app.post("/api/auth/verify", (req, res) => {
    const { token } = req.body
    
    if (token === "admin-token-123") {
        res.json({
            success: true,
            user: { id: 1, username: "admin", fullName: "مدير النظام" }
        })
    } else {
        res.status(401).json({
            success: false,
            error: "رمز التحقق غير صالح"
        })
    }
})

// Middleware للمصادقة
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.replace("Bearer ", "")
    
    if (token === "admin-token-123") {
        next()
    } else {
        res.status(401).json({ error: "غير مصرح بالوصول" })
    }
}

// 📁 الفئات
app.get("/api/admin/categories", authMiddleware, (req, res) => {
    res.json(categories)
})

app.post("/api/admin/categories", authMiddleware, (req, res) => {
    const { name, description, color, icon } = req.body
    const newCategory = {
        id: categories.length + 1,
        name,
        description,
        color: color || "#3b82f6",
        icon: icon || "📁",
        created_at: new Date().toISOString()
    }
    categories.push(newCategory)
    res.json(newCategory)
})

app.put("/api/admin/categories/:id", authMiddleware, (req, res) => {
    const { id } = req.params
    const { name, description, color, icon } = req.body
    
    const categoryIndex = categories.findIndex(cat => cat.id === parseInt(id))
    if (categoryIndex === -1) {
        return res.status(404).json({ error: "الفئة غير موجودة" })
    }
    
    categories[categoryIndex] = {
        ...categories[categoryIndex],
        name,
        description,
        color,
        icon
    }
    
    res.json(categories[categoryIndex])
})

app.delete("/api/admin/categories/:id", authMiddleware, (req, res) => {
    const { id } = req.params
    categories = categories.filter(cat => cat.id !== parseInt(id))
    res.json({ message: "تم حذف الفئة بنجاح" })
})

// 🍕 المنتجات
app.get("/api/admin/products", authMiddleware, (req, res) => {
    const productsWithCategory = products.map(product => ({
        ...product,
        category_name: categories.find(cat => cat.id === product.category_id)?.name || "غير مصنف",
        image_url: product.image ? `/uploads/${product.image}` : null
    }))
    res.json(productsWithCategory)
})

app.post("/api/admin/products", authMiddleware, upload.single("image"), (req, res) => {
    try {
        const { name, description, price, category_id, is_available } = req.body
        
        console.log("رفع ملف:", req.file)
        
        const newProduct = {
            id: products.length + 1,
            name,
            description,
            price: parseFloat(price),
            category_id: parseInt(category_id),
            is_available: is_available === "true",
            image: req.file ? req.file.filename : null,
            created_at: new Date().toISOString()
        }
        products.push(newProduct)
        res.json(newProduct)
    } catch (error) {
        console.error("خطأ في إضافة المنتج:", error)
        res.status(500).json({ error: "خطأ في إضافة المنتج: " + error.message })
    }
})

app.put("/api/admin/products/:id", authMiddleware, upload.single("image"), (req, res) => {
    try {
        const { id } = req.params
        const { name, description, price, category_id, is_available } = req.body
        
        console.log("تحديث المنتج:", id, req.file)
        
        const productIndex = products.findIndex(prod => prod.id === parseInt(id))
        if (productIndex === -1) {
            return res.status(404).json({ error: "المنتج غير موجود" })
        }
        
        // تحديث المنتج
        products[productIndex] = {
            ...products[productIndex],
            name,
            description,
            price: parseFloat(price),
            category_id: parseInt(category_id),
            is_available: is_available === "true",
            image: req.file ? req.file.filename : products[productIndex].image
        }
        
        res.json(products[productIndex])
    } catch (error) {
        console.error("خطأ في تحديث المنتج:", error)
        res.status(500).json({ error: "خطأ في تحديث المنتج: " + error.message })
    }
})

app.delete("/api/admin/products/:id", authMiddleware, (req, res) => {
    const { id } = req.params
    products = products.filter(prod => prod.id !== parseInt(id))
    res.json({ message: "تم حذف المنتج بنجاح" })
})

// ⚙️ الإعدادات
app.get("/api/admin/settings", (req, res) => {
    res.json(settings)
})

app.put("/api/admin/settings", authMiddleware, upload.single("logo"), (req, res) => {
    try {
        const { 
            siteName, 
            primaryColor, 
            secondaryColor, 
            backgroundColor,
            description,
            phone,
            address,
            workingHours,
            facebook,
            instagram,
            twitter
        } = req.body
        
        console.log("رفع لوجو:", req.file)
        
        // تحديث الإعدادات
        settings = {
            siteName: siteName || settings.siteName,
            primaryColor: primaryColor || settings.primaryColor,
            secondaryColor: secondaryColor || settings.secondaryColor,
            backgroundColor: backgroundColor || settings.backgroundColor,
            description: description || settings.description,
            phone: phone || settings.phone,
            address: address || settings.address,
            workingHours: workingHours || settings.workingHours,
            facebook: facebook || settings.facebook,
            instagram: instagram || settings.instagram,
            twitter: twitter || settings.twitter,
            logo: req.file ? req.file.filename : settings.logo
        }
        
        res.json(settings)
    } catch (error) {
        console.error("خطأ في حفظ الإعدادات:", error)
        res.status(500).json({ error: "خطأ في حفظ الإعدادات: " + error.message })
    }
})

// 🌐 القائمة العامة - بدون طلبات
app.get("/api/menu", (req, res) => {
    const menu = categories.map(category => ({
        ...category,
        products: products.filter(prod => 
            prod.category_id === category.id && prod.is_available
        ).map(prod => ({
            ...prod,
            image_url: prod.image ? `/uploads/${prod.image}` : null
        }))
    }))
    res.json(menu)
})

// إعدادات الموقع للعامة
app.get("/api/settings", (req, res) => {
    res.json({
        ...settings,
        logo_url: settings.logo ? `/uploads/${settings.logo}` : null
    })
})

// 🩺 فحص الصحة
app.get("/api/health", (req, res) => {
    res.json({ 
        status: "✅ OK", 
        message: "الخادم يعمل بشكل صحيح",
        timestamp: new Date().toISOString(),
        version: "3.0.0",
        stats: {
            categories: categories.length,
            products: products.length,
            uploads_dir: uploadsDir
        }
    })
})

// استخدام middleware لمعالجة أخطاء multer
app.use(handleMulterError)

// معالجة الأخطاء العامة
app.use((error, req, res, next) => {
    console.error('خطأ عام:', error)
    res.status(500).json({ 
        success: false,
        error: 'حدث خطأ في الخادم: ' + error.message 
    })
})

// بدء الخادم
app.listen(PORT, () => {
    console.log("🚀 الخادم الخلفي المصلح يعمل على: http://localhost:" + PORT)
    console.log("🔐 بيانات الدخول: admin / admin123")
    console.log("📊 لوحة الإدارة: http://localhost:3001")
    console.log("🌐 الموقع الرئيسي: http://localhost:3000")
    console.log("📁 مجلد الصور: " + uploadsDir)
    console.log("💾 الحد الأقصى للملف: 20MB")
    console.log("")
    console.log("📦 البيانات المتوفرة:")
    console.log("   📁 الفئات:", categories.length)
    console.log("   🍕 المنتجات:", products.length)
    console.log("   🖼️  المنتجات ذات الصور:", products.filter(p => p.image).length)
})
