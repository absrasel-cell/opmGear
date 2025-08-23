# Environment Setup Guide

## 🔧 **Required Environment Variables**

Create a `.env.local` file in your project root with the following variables:

```env
# MongoDB Configuration (REQUIRED)
MONGODB_URI=mongodb+srv://absrasel:YOUR_ACTUAL_PASSWORD@redxtrm.o0l67jz.mongodb.net/?retryWrites=true&w=majority&appName=redxtrm

# JWT Configuration (REQUIRED)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Webflow API Configuration (Optional - for product data)
WEBFLOW_API_TOKEN=your_webflow_api_token
WEBFLOW_SITE_ID=your_webflow_site_id

# Collection IDs (Optional - for product data)
WEBFLOW_PRODUCTS_COLLECTION_ID=689ae21c87c9aa3cb52a434c
WEBFLOW_PRODUCT_OPTIONS_COLLECTION_ID=689aeb2e2148dc453aa7e652
WEBFLOW_CUSTOMIZATION_PRICING_COLLECTION_ID=689af530c2a73c3343f29447

# Note: Pricing data is now loaded from CSV file (src/app/csv/Blank Cap Pricings.csv)
# WEBFLOW_PRICING_COLLECTION_ID is no longer needed

# Application
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## 🚨 **Important Notes**

1. **Replace `YOUR_ACTUAL_PASSWORD`** with your actual MongoDB password
2. **Never commit `.env.local`** to version control
3. **Generate a strong JWT_SECRET** for production

## 🧪 **Testing the Connection**

After setting up your `.env.local` file:

1. **Test Database Connection:**
   - Visit: `http://localhost:3000/api/test-auth`
   - Should show: `{"success":true,"databaseConnected":true,"userCount":0,"users":[]}`

2. **Create Test User:**
   - Visit: `http://localhost:3000/api/create-test-user` (or use POST request)
   - Should create a test user with credentials:
     - Email: `test@example.com`
     - Password: `password123`

3. **Test Login:**
   - Go to `/login`
   - Use the test credentials above

## 🔍 **Troubleshooting**

### **If you get "Database connection failed":**
1. Check your MongoDB password is correct
2. Ensure your IP is whitelisted in MongoDB Atlas
3. Verify the connection string format

### **If you get "Invalid credentials":**
1. Check the server console for detailed logs
2. Verify the user was created successfully
3. Check password hashing is working

### **If you get "MONGODB_URI not defined":**
1. Make sure `.env.local` exists in project root
2. Restart your development server after creating `.env.local`
3. Check the file has no extra spaces or quotes

## 📝 **Example .env.local**

```env
MONGODB_URI=mongodb+srv://absrasel:MySecurePassword123@redxtrm.o0l67jz.mongodb.net/?retryWrites=true&w=majority&appName=redxtrm
JWT_SECRET=my-super-secret-jwt-key-for-customcap-2024
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## ✅ **Verification Steps**

1. ✅ Create `.env.local` with correct MongoDB URI
2. ✅ Restart development server
3. ✅ Test database connection at `/api/test-auth`
4. ✅ Create test user at `/api/create-test-user`
5. ✅ Test login with test credentials
6. ✅ Verify forgot password page works at `/forgot-password`
