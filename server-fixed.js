import express from "express"
import cors from "cors"
import sqlite3 from "sqlite3"
import path from "path"
import { fileURLToPath } from "url"
import fs from "fs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 5000

// قاعدة بيانات مبسطة
const dbPath = path.join(__dirname, "db", "menu.db")
const db = new sqlite3.Database(dbPath)

// جعل دوال قاعدة بيانات async
db.runAsync = function (sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err)
            else resolve({ lastID: this.lastID, changes: this.changes })
        })
    })
}

db.getAsync = function (sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err)
            else resolve(row)
        })
    })
}

db.allAsync = function (sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err)
            else resolve(rows)
        })
    })
}

// Middleware
app.use(cors())
app.use(express.json())
app.use("/uploads", express.static(path.join(__dirname, "uploads")))

// 🔐 نظام مصادقة مبسط
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
app.get("/api/admin/categories", authMiddleware, async (req, res) => {
    try {
        const categories = await db.allAsync("SELECT * FROM categories ORDER BY created_at DESC")
        res.json(categories)
    } catch (error) {
        res.status(500).json({ error: "خطأ في جلب الفئات" })
    }
})

app.post("/api/admin/categories", authMiddleware, async (req, res) => {
    try {
        const { name, description, color, icon } = req.body
        const result = await db.runAsync(
            "INSERT INTO categories (name, description, color, icon) VALUES (?, ?, ?, ?)",
            [name, description, color, icon]
        )
        res.json({ id: result.lastID, name, description, color, icon })
    } catch (error) {
        res.status(500).json({ error: "خطأ في إضافة الفئة" })
    }
})

app.put("/api/admin/categories/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params
        const { name, description, color, icon } = req.body
        await db.runAsync(
            "UPDATE categories SET name = ?, description = ?, color = ?, icon = ? WHERE id = ?",
            [name, description, color, icon, id]
        )
        res.json({ message: "تم تحديث الفئة بنجاح" })
    } catch (error) {
        res.status(500).json({ error: "خطأ في تحديث الفئة" })
    }
})

app.delete("/api/admin/categories/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params
        await db.runAsync("DELETE FROM categories WHERE id = ?", [id])
        res.json({ message: "تم حذف الفئة بنجاح" })
    } catch (error) {
        res.status(500).json({ error: "خطأ في حذف الفئة" })
    }
})

// 🍕 المنتجات
app.get("/api/admin/products", authMiddleware, async (req, res) => {
    try {
        const products = await db.allAsync(`
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            ORDER BY p.created_at DESC
        `)
        res.json(products)
    } catch (error) {
        res.status(500).json({ error: "خطأ في جلب المنتجات" })
    }
})

app.post("/api/admin/products", authMiddleware, async (req, res) => {
    try {
        const { name, description, price, category_id, is_available } = req.body
        const result = await db.runAsync(
            "INSERT INTO products (name, description, price, category_id, is_available) VALUES (?, ?, ?, ?, ?)",
            [name, description, price, category_id, is_available]
        )
        res.json({ id: result.lastID, name, description, price, category_id, is_available })
    } catch (error) {
        res.status(500).json({ error: "خطأ في إضافة المنتج" })
    }
})

app.put("/api/admin/products/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params
        const { name, description, price, category_id, is_available } = req.body
        await db.runAsync(
            "UPDATE products SET name = ?, description = ?, price = ?, category_id = ?, is_available = ? WHERE id = ?",
            [name, description, price, category_id, is_available, id]
        )
        res.json({ message: "تم تحديث المنتج بنجاح" })
    } catch (error) {
        res.status(500).json({ error: "خطأ في تحديث المنتج" })
    }
})

app.delete("/api/admin/products/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params
        await db.runAsync("DELETE FROM products WHERE id = ?", [id])
        res.json({ message: "تم حذف المنتج بنجاح" })
    } catch (error) {
        res.status(500).json({ error: "خطأ في حذف المنتج" })
    }
})

// ⚙️ الإعدادات
app.get("/api/admin/settings", async (req, res) => {
    try {
        const settings = await db.getAsync("SELECT * FROM site_settings WHERE id = 1")
        res.json(settings || {
            siteName: "مطعمنا الرائع",
            primaryColor: "#3b82f6",
            secondaryColor: "#1e40af",
            backgroundColor: "#f8fafc"
        })
    } catch (error) {
        res.json({
            siteName: "مطعمنا الرائع",
            primaryColor: "#3b82f6",
            secondaryColor: "#1e40af",
            backgroundColor: "#f8fafc"
        })
    }
})

app.put("/api/admin/settings", authMiddleware, async (req, res) => {
    try {
        const { siteName, primaryColor, secondaryColor, backgroundColor } = req.body
        await db.runAsync(`
            INSERT OR REPLACE INTO site_settings 
            (id, site_name, primary_color, secondary_color, background_color) 
            VALUES (1, ?, ?, ?, ?)
        `, [siteName, primaryColor, secondaryColor, backgroundColor])
        res.json({ message: "تم حفظ الإعدادات بنجاح" })
    } catch (error) {
        res.status(500).json({ error: "خطأ في حفظ الإعدادات" })
    }
})

// 🌐 القائمة العامة
app.get("/api/menu", async (req, res) => {
    try {
        const categories = await db.allAsync("SELECT * FROM categories ORDER BY created_at DESC")
        
        for (let category of categories) {
            const products = await db.allAsync(
                "SELECT * FROM products WHERE category_id = ? AND is_available = 1",
                [category.id]
            )
            category.products = products
        }
        
        res.json(categories)
    } catch (error) {
        res.status(500).json({ error: "خطأ في جلب القائمة" })
    }
})

// 🩺 فحص الصحة
app.get("/api/health", (req, res) => {
    res.json({ 
        status: "✅ OK", 
        message: "الخادم يعمل بشكل صحيح",
        timestamp: new Date().toISOString(),
        version: "2.0.0"
    })
})

// بدء الخادم
app.listen(PORT, () => {
    console.log("🚀 الخادم الخلفي يعمل على: http://localhost:" + PORT)
    console.log("🔐 بيانات الدخول: admin / admin123")
    console.log("📊 لوحة الإدارة: http://localhost:3001")
    console.log("🌐 الموقع الرئيسي: http://localhost:3000")
})
