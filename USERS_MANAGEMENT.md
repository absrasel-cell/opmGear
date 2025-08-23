# Users Management System

## Overview
The Users Management system provides comprehensive user administration capabilities for the CustomCap platform. Admins can manage user roles, permissions, and account status through an intuitive interface.

## Features

### User Roles
The system supports the following user roles:

1. **Master Admin** - Full system access and control
2. **Admin** - Administrative privileges
3. **Moderator** - Content moderation and user management
4. **Staff** - Customer support and order management
5. **Wholesale** - Bulk order capabilities and wholesale pricing
6. **Supplier** - Product management and inventory
7. **Member** - Standard user access

### User Management Actions

#### View Users
- List all users with pagination (20 users per page)
- Search users by name, email, or company
- Filter by role and status (Active/Banned)
- Sort by creation date

#### Edit User Data
- Update user profile information
- Change user roles
- Modify contact details (phone, company)
- Update avatar

#### User Status Management
- **Ban/Unban Users**: Temporarily restrict or restore user access
- **Delete Users**: Permanently remove user accounts (with confirmation)
- **Role Assignment**: Change user roles with immediate effect

### Security Features

#### Access Control
- Only users with ADMIN role or Master Admin email can access
- Prevents users from deleting their own accounts
- Role-based permission system

#### Data Protection
- Confirmation dialogs for destructive actions
- Audit trail for user changes
- Secure API endpoints with authentication

## Technical Implementation

### Database Schema
```sql
-- User table with new fields
ALTER TABLE "User" ADD COLUMN "isBanned" BOOLEAN DEFAULT false;
ALTER TABLE "User" ADD COLUMN "lastLoginAt" TIMESTAMP;
ALTER TABLE "User" ADD INDEX "User_isBanned_idx" ("isBanned");

-- Extended UserRole enum
ALTER TYPE "UserRole" ADD VALUE 'MASTER_ADMIN';
ALTER TYPE "UserRole" ADD VALUE 'MODERATOR';
ALTER TYPE "UserRole" ADD VALUE 'STAFF';
ALTER TYPE "UserRole" ADD VALUE 'WHOLESALE';
ALTER TYPE "UserRole" ADD VALUE 'SUPPLIER';
```

### API Endpoints

#### GET /api/users
- Fetch users with pagination
- Support for filtering and search
- Returns user list with metadata

#### PATCH /api/users
- Update user information
- Role changes
- Ban/unban status

#### DELETE /api/users/[id]
- Delete specific user
- Prevents self-deletion
- Cascading cleanup

### Frontend Components

#### Users Page (`/dashboard/admin/users`)
- Responsive table layout
- Real-time filtering and search
- Modal dialogs for actions
- Pagination controls

#### Key Features
- **Search**: Real-time search across name, email, company
- **Filters**: Role and status filtering
- **Actions**: Edit, ban/unban, delete with confirmation
- **Pagination**: Efficient data loading
- **Responsive**: Works on all device sizes

## Usage Instructions

### Accessing Users Management
1. Navigate to Admin Dashboard
2. Click on "Users" in the sidebar
3. Or click the Users card on the main dashboard

### Managing User Roles
1. Find the user in the table
2. Click the role dropdown in the "Role" column
3. Select the new role
4. Changes are applied immediately

### Banning/Unbanning Users
1. Click the ban/unban icon in the Actions column
2. Confirm the action in the modal dialog
3. User status is updated immediately

### Editing User Data
1. Click the edit icon in the Actions column
2. Modify the information in the modal
3. Click "Save Changes" to apply

### Deleting Users
1. Click the delete icon in the Actions column
2. Confirm deletion in the warning modal
3. User is permanently removed from the system

## Error Handling

### Database Connection Issues
- Graceful error messages
- Retry functionality
- Fallback to empty state

### Permission Errors
- Clear access denied messages
- Redirect to appropriate dashboard
- Role validation

### API Errors
- User-friendly error messages
- Detailed logging for debugging
- Retry mechanisms

## Future Enhancements

### Planned Features
- **Bulk Actions**: Select multiple users for batch operations
- **User Activity Logs**: Track user actions and login history
- **Advanced Filters**: Date ranges, activity status
- **Export Functionality**: CSV/Excel export of user data
- **User Invitations**: Send email invitations to new users
- **Role Permissions**: Granular permission system per role

### Performance Optimizations
- **Virtual Scrolling**: For large user lists
- **Caching**: User data caching
- **Real-time Updates**: WebSocket integration
- **Search Indexing**: Full-text search capabilities

## Security Considerations

### Data Protection
- All user data is encrypted in transit
- Sensitive operations require confirmation
- Audit logging for all admin actions

### Access Control
- Role-based access control (RBAC)
- Session management
- IP-based restrictions (optional)

### Compliance
- GDPR compliance for user data
- Data retention policies
- Right to be forgotten implementation

## Troubleshooting

### Common Issues

#### Users Not Loading
- Check database connection
- Verify admin permissions
- Check API endpoint status

#### Role Changes Not Applying
- Refresh the page
- Check user permissions
- Verify role enum values

#### Delete Operation Fails
- Ensure user exists
- Check for foreign key constraints
- Verify admin permissions

### Debug Information
- Check browser console for errors
- Review API response status codes
- Verify database schema matches expectations

## Support

For technical support or feature requests, please contact the development team or create an issue in the project repository.
