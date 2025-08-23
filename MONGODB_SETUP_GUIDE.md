# MongoDB Setup Guide - Fix Order Submission Error

## 🚨 **Current Issue**
You're getting this error when submitting orders:
```
Module not found: Can't resolve '../../lib/mongodb'
```

This is because the MongoDB connection is not properly configured.

## 🔧 **Step 1: Create Environment File**

Create a `.env.local` file in your project root (same level as `package.json`) with this content:

```env
# MongoDB Configuration (REQUIRED)
MONGODB_URI=mongodb+srv://absrasel:YOUR_ACTUAL_PASSWORD@redxtrm.o0l67jz.mongodb.net/customcap?retryWrites=true&w=majority&appName=redxtrm

# JWT Configuration (REQUIRED)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Webflow API Configuration
WEBFLOW_API_TOKEN=your_webflow_api_token
WEBFLOW_SITE_ID=your_webflow_site_id

# Collection IDs
WEBFLOW_PRODUCTS_COLLECTION_ID=689ae21c87c9aa3cb52a434c
WEBFLOW_PRICING_COLLECTION_ID=689af13ab391444ed2a11577
WEBFLOW_PRODUCT_OPTIONS_COLLECTION_ID=689aeb2e2148dc453aa7e652
WEBFLOW_CUSTOMIZATION_PRICING_COLLECTION_ID=689af530c2a73c3343f29447

# Application
NEXT_PUBLIC_BASE_URL=http://localhost:3001
```

## 🔑 **Step 2: Replace Placeholders**

1. **Replace `YOUR_ACTUAL_PASSWORD`** with your actual MongoDB password
2. **Replace `your-super-secret-jwt-key-change-this-in-production`** with a strong secret key

## 🗄️ **Step 3: Database Setup**

The connection string includes `/customcap` which will create a database named "customcap" with these collections:

- **`savedOrders`** - Store submitted orders from product customization
- **`savedQuotes`** - Store quote requests from customers  
- **`users`** - Store user accounts
- **`test`** - Store test/development data

## 🧪 **Step 4: Test Database Connection**

After creating `.env.local`, restart your development server and test:

1. **Visit:** `http://localhost:3001/api/test-db`
2. **Expected Response:**
```json
{
  "success": true,
  "message": "Database connection successful",
  "database": "customcap",
  "collections": {
    "savedOrders": {"exists": true, "documentCount": 0},
    "savedQuotes": {"exists": true, "documentCount": 0},
    "users": {"exists": true, "documentCount": 0},
    "test": {"exists": true, "documentCount": 0}
  }
}
```

## 🔄 **Step 5: Restart Development Server**

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## ✅ **Step 6: Test Order Submission**

1. Go to `/store`
2. Click "Customize" on any product
3. Complete the customization
4. Submit order - should work without errors now

## 🐛 **Troubleshooting**

### **If you still get "Module not found":**
1. Make sure `.env.local` is in the project root
2. Restart the development server completely
3. Check file permissions

### **If you get "MONGODB_URI not defined":**
1. Verify `.env.local` exists and has correct content
2. Check for typos in the environment variable name
3. Restart the server

### **If you get "Authentication failed":**
1. Check your MongoDB password is correct
2. Ensure your IP is whitelisted in MongoDB Atlas
3. Verify the connection string format

### **If you get "Database connection failed":**
1. Check MongoDB Atlas is running
2. Verify network connectivity
3. Check MongoDB Atlas logs

## 📊 **Database Schema**

Once connected, your MongoDB will have these collections:

### SavedOrders Collection
```typescript
{
  _id: ObjectId,
  productName: string,
  selectedColors: Record<string, { sizes: Record<string, number> }>,
  logoSetupSelections: Record<string, { position?: string; size?: string; application?: string }>,
  selectedOptions: Record<string, string>,
  multiSelectOptions: Record<string, string[]>,
  customerInfo: {
    name: string,
    email: string,
    phone?: string,
    company?: string,
    address?: {
      street: string,
      city: string,
      state: string,
      zipCode: string,
      country: string;
    };
  },
  userId?: string | null,
  userEmail?: string,
  orderType: 'authenticated' | 'guest',
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled',
  createdAt: Date,
  updatedAt: Date,
  ipAddress?: string,
  userAgent?: string
}
```

### Users Collection
```typescript
{
  _id: ObjectId,
  email: string,
  password: string, // bcrypt hashed
  name: string,
  role: 'customer' | 'admin' | 'member',
  createdAt: Date,
  updatedAt: Date
}
```

### SavedQuotes Collection
```typescript
{
  _id: ObjectId,
  productSlug: string,
  productName: string,
  customerInfo: {
    name: string,
    email: string,
    phone: string,
    company: string
  },
  requirements: {
    quantity: string,
    colors: string,
    sizes: string,
    customization: string,
    timeline: string,
    additionalNotes: string
  },
  createdAt: Date,
  status: 'pending' | 'reviewed' | 'quoted' | 'accepted' | 'rejected',
  ipAddress?: string,
  userAgent?: string
}
```

## 🎯 **Expected Results**

After completing these steps:

1. ✅ Database connection working
2. ✅ Order submission without errors
3. ✅ Orders stored in MongoDB
4. ✅ Dashboard showing order history
5. ✅ Authentication working properly

## 📞 **Need Help?**

If you're still having issues:

1. Check the browser console for detailed error messages
2. Check the terminal/server logs for database connection errors
3. Verify your MongoDB Atlas cluster is active
4. Ensure your IP address is whitelisted in MongoDB Atlas

---

**Last Updated**: December 2024
**Status**: Ready for Implementation
