# Custom Cap - E-commerce Platform

A comprehensive Next.js e-commerce platform for custom cap customization and ordering, featuring advanced user management, real-time messaging, and sophisticated order management.

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to access the application.

### Default Admin Access
- **Email:** `absrasel@gmail.com`
- **Password:** `Admin123!`

## 🎯 Core Features

### 🔐 Authentication & User Management
- JWT-based authentication with HTTP-only cookies
- Role-based access control (Admin/Member)
- Secure password hashing with bcrypt
- User registration and login system
- Protected routes and middleware

### 🛍️ Product Customization
- Dynamic product catalog with Webflow CMS integration
- Real-time cost calculation with volume pricing
- Color and option selection with image previews
- Logo setup with position, size, and application options
- Size selection with quantity management
- Accessories and cap style configuration

### 🛒 Shopping Experience
- Persistent cart system (localStorage for guests, MongoDB for users)
- Real-time cart updates with cost breakdown
- Multi-step checkout process
- Order confirmation and tracking
- Saved orders for future reference

### 📊 Dashboard System
- **Admin Dashboard:** Comprehensive order management, user analytics, system oversight
- **Member Dashboard:** Personalized order history, statistics, quick actions
- **Enhanced UI:** Stunning layouts with animations and visual feedback
- **Real-time Updates:** Live notifications and status tracking

### 💬 Advanced Messaging System
- Bidirectional communication between admins and members
- iMessage-style UI with bubbles and animations
- File attachments (images, documents)
- Message categories and priority levels
- Reply-to functionality with right-click support
- Real-time unread counts and notifications
- Emoji support with built-in picker

### 📋 Order Management
- Complete order lifecycle management
- Status tracking (pending, confirmed, processing, shipped, delivered, cancelled)
- Saved orders with editing capabilities
- Reorder functionality for previous orders
- Order analytics and reporting

### 👤 User Profile Management
- Comprehensive profile page with stunning UI
- Personal information management
- Security settings with password changes
- User preferences and notifications
- Order statistics and analytics

### 💰 Quote Request System
- Customer quote request forms
- Admin quote management
- Quote status tracking
- Email notifications (ready for integration)

## 🏗️ Architecture

### Frontend
- **Next.js 14** with TypeScript
- **React** with hooks and context
- **Tailwind CSS** for styling
- **Client-side state management** with React Context

### Backend
- **Next.js API Routes** for server-side logic
- **MongoDB** with native driver
- **JWT** for authentication
- **File upload** handling

### Database Collections
- **Users** - User accounts and profiles
- **Orders** - Order data and status
- **Messages** - Communication system
- **Quote Requests** - Customer inquiries
- **Carts** - Shopping cart data

## 🔌 Key API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/session` - Session validation

### Orders & Cart
- `GET /api/orders` - Get orders (filtered by user/admin)
- `POST /api/orders` - Create new order
- `PATCH /api/orders/[id]` - Update order
- `GET /api/cart` - Get user cart
- `POST /api/cart` - Add to cart

### Messaging
- `GET /api/messages` - Get conversations/messages
- `POST /api/messages` - Send message
- `PUT /api/messages` - Mark messages as read
- `POST /api/upload` - Upload file attachments

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update profile
- `POST /api/user/change-password` - Change password
- `GET /api/user/stats` - Get user statistics

## 🎨 UI/UX Highlights

### Animations & Visual Effects
- CSS animations for enhanced user experience
- Interactive hover effects and transitions
- Loading states and progress indicators
- iMessage-style chat interface
- Dynamic volume pricing with visual feedback

### Responsive Design
- Mobile-first approach
- Adaptive layouts for all devices
- Touch-friendly interfaces
- Optimized navigation

## 🔒 Security

- JWT authentication with secure cookies
- Password hashing with bcrypt
- Role-based access control
- Protected API endpoints
- Input validation and sanitization
- Secure file upload handling

## 📈 Development Status

### ✅ Completed
- Complete authentication system
- Product customization with real-time pricing
- Shopping cart and checkout
- Order management system
- Admin and member dashboards
- Advanced messaging system
- Saved orders and reorder functionality
- User profile management
- File upload system
- Enhanced UI/UX with animations

### 🔄 In Progress
- Payment gateway integration
- Email notification system
- Advanced analytics dashboard

### 📋 Future Roadmap
- Multi-language support
- Advanced product filtering
- Bulk order management
- Shipping provider integration
- Customer review system
- Loyalty program

## 🧪 Testing

### Manual Testing Checklist
- [ ] User registration and login
- [ ] Product customization flow
- [ ] Cart functionality
- [ ] Checkout process
- [ ] Order management
- [ ] Admin dashboard features
- [ ] Messaging system
- [ ] File uploads
- [ ] Saved orders and reorder
- [ ] Profile management
- [ ] Password changes
- [ ] Quote requests

## 🚀 Deployment

### Environment Variables
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### Production Build
```bash
npm run build
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

**Last Updated:** December 2024  
**Version:** 2.0.0  
**Status:** Production Ready