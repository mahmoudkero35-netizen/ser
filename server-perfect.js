import express from "express"
import cors from "cors"

const app = express()
const PORT = 5000

// Middleware
app.use(cors())
app.use(express.json())

// بيانات تجريبية في الذاكرة
let categories = [
    { id: 1, name: "المقبلات", description: "مقبلات لذيذة لبدء وجبتك", color: "#ef4444", icon: "🥗", created_at: new Date().toISOString() },
    { id: 2, name: "الوجبات الرئيسية", description: "وجبات رئيسية شهية", color: "#3b82f6", icon: "🍕", created_at: new Date().toISOString() },
    { id: 3, name: "المشروبات", description: "مشروبات منعشة", color: "#10b981", icon: "🥤", created_at: new Date().toISOString() },
    { id: 4, name: "الحلويات", description: "حلويات لذيذة", color: "#f59e0b", icon: "🍰", created_at: new Date().toISOString() }
]

let products = [
    { id: 1, name: "سلطة يونانية", description: "سلطة طازجة مع الخضار والزيتون والجبنة البيضاء", price: 25, category_id: 1, is_available: true, created_at: new Date().toISOString() },
    { id: 2, name: "حمص بالطحينة", description: "حمص طازج مع الطحينة وزيت الزيتون", price: 18, category_id: 1, is_available: true, created_at: new Date().toISOString() },
    { id: 3, name: "شاورما لحم", description: "شاورما لحم مشوية مع الخضار والصلصات", price: 35, category_id: 2, is_available: true, created_at: new Date().toISOString() },
    { id: 4, name: "كبة مقلية", description: "كبة مقلية مقرمشة مع اللحم والتوابل", price: 28, category_id: 2, is_available: true, created_at: new Date().toISOString() },
    { id: 5, name: "عصير برتقال", description: "عصير برتقال طازج طبيعي 100%", price: 15, category_id: 3, is_available: true, created_at: new Date().toISOString() },
    { id: 6, name: "قهوة عربية", description: "قهوة عربية أصيلة مع الهيل", price: 12, category_id: 3, is_available: true, created_at: new Date().toISOString() },
    { id: 7, name: "كيك الشوكولاتة", description: "كيك شوكولاتة غني بالطعم مع طبقة من الكريمة", price: 20, category_id: 4, is_available: true, created_at: new Date().toISOString() },
    { id: 8, name: "أم علي", description: "حلى أم علي التقليدي مع المكسرات والقشطة", price: 22, category_id: 4, is_available: true, created_at: new Date().toISOString() }
]

let settings = {
    siteName: "مطعمنا الرائع",
    primaryColor: "#3b82f6",
    secondaryColor: "#1e40af", 
    backgroundColor: "#f8fafc"
}

// 🔐 نظام مصادقة مبسط
app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body
    
    if (username === "admin" && password === "admin123") {
        res.json({
            success: true,
            message: "تم تسجيل الدخول بنجاح",
            token: "simple-admin-token",
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
    
    if (token === "simple-admin-token") {
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
    
    if (token === "simple-admin-token") {
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
        category_name: categories.find(cat => cat.id === product.category_id)?.name || "غير مصنف"
    }))
    res.json(productsWithCategory)
})

app.post("/api/admin/products", authMiddleware, (req, res) => {
    const { name, description, price, category_id, is_available } = req.body
    const newProduct = {
        id: products.length + 1,
        name,
        description,
        price: parseFloat(price),
        category_id: parseInt(category_id),
        is_available: is_available !== false,
        created_at: new Date().toISOString()
    }
    products.push(newProduct)
    res.json(newProduct)
})

app.put("/api/admin/products/:id", authMiddleware, (req, res) => {
    const { id } = req.params
    const { name, description, price, category_id, is_available } = req.body
    
    const productIndex = products.findIndex(prod => prod.id === parseInt(id))
    if (productIndex === -1) {
        return res.status(404).json({ error: "المنتج غير موجود" })
    }
    
    products[productIndex] = {
        ...products[productIndex],
        name,
        description,
        price: parseFloat(price),
        category_id: parseInt(category_id),
        is_available: is_available !== false
    }
    
    res.json(products[productIndex])
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

app.put("/api/admin/settings", authMiddleware, (req, res) => {
    const { siteName, primaryColor, secondaryColor, backgroundColor } = req.body
    settings = {
        siteName: siteName || settings.siteName,
        primaryColor: primaryColor || settings.primaryColor,
        secondaryColor: secondaryColor || settings.secondaryColor,
        backgroundColor: backgroundColor || settings.backgroundColor
    }
    res.json(settings)
})

// 🌐 القائمة العامة
app.get("/api/menu", (req, res) => {
    const menu = categories.map(category => ({
        ...category,
        products: products.filter(prod => 
            prod.category_id === category.id && prod.is_available
        )
    }))
    res.json(menu)
})

// 🩺 فحص الصحة
app.get("/api/health", (req, res) => {
    res.json({ 
        status: "✅ OK", 
        message: "الخادم يعمل بشكل صحيح",
        timestamp: new Date().toISOString(),
        version: "5.0.0",
        stats: {
            categories: categories.length,
            products: products.length
        }
    })
})

// بدء الخادم
app.listen(PORT, () => {
    console.log("🚀 الخادم الخلفي يعمل على: http://localhost:" + PORT)
    console.log("🔐 بيانات الدخول: admin / admin123")
    console.log("📊 لوحة الإدارة: http://localhost:3001")
    console.log("🌐 الموقع الرئيسي: http://localhost:3000")
    console.log("🩺 فحص الصحة: http://localhost:5000/api/health")
    console.log("")
    console.log("📦 البيانات المتوفرة:")
    console.log("   📁 الفئات:", categories.length)
    console.log("   🍕 المنتجات:", products.length)
})
