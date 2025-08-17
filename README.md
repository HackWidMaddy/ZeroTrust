# ZeroTrace - Red Team Simulation Platform

A Next.js-based red team simulation platform designed for educational purposes and cybersecurity training.

## Features

- **Secure Authentication**: MD5-hashed password validation against JSON user database
- **Educational Warning System**: Comprehensive warning dialog before access
- **Role-Based Access**: Different user roles (administrator, user, tester)
- **Protected Routes**: Middleware-based route protection
- **Modern UI**: Dark theme with responsive design

## Demo Credentials

The system comes with pre-configured demo accounts:

| Username | Password | Role |
|----------|----------|------|
| admin    | admin    | administrator |
| user     | password | user |
| test     | test     | tester |

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Development Server**
   ```bash
   npm run dev
   ```

3. **Access the Application**
   - Open [http://localhost:3000](http://localhost:3000)
   - The login form is displayed directly on the main page
   - Use one of the demo credentials above

## User Flow

1. **Main Page** (`/`)
   - Login form is displayed directly
   - Enter username and password
   - System validates against `public/users.json`
   - Passwords are stored as MD5 hashes

2. **Warning Dialog**
   - After successful authentication, users see the educational warning
   - Must acknowledge and accept terms to proceed
   - Can decline to return to login

3. **Dashboard** (`/dashboard`)
   - Protected route requiring authentication
   - Shows user information and system status
   - Provides quick actions and recent activity

## File Structure

```
app/
├── dashboard/
│   └── page.tsx          # Protected dashboard page
├── utils/
│   └── md5.ts            # MD5 hashing utility
├── layout.tsx             # Root layout
└── page.tsx               # Main page with login form

public/
└── users.json             # User database with MD5 hashes

middleware.ts              # Route protection middleware
```

## Security Features

- **Password Hashing**: All passwords stored as MD5 hashes
- **Route Protection**: Middleware prevents unauthorized access
- **Cookie Security**: Secure cookie settings with SameSite=Strict
- **Session Management**: Automatic session expiration (1 hour)

## Customization

### Adding New Users

Edit `public/users.json` to add new users:

```json
{
  "username": "newuser",
  "password": "md5hash",
  "role": "user"
}
```

### Modifying Warning Text

Edit the warning dialog in `app/page.tsx` to customize the educational warning content.

### Changing User Roles

Modify the role system in both the main page and dashboard components to add new roles or modify existing ones.

## Technical Details

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **Authentication**: Cookie-based with middleware protection
- **Password Hashing**: crypto-js MD5 implementation
- **State Management**: React hooks with client-side storage

## Important Notes

⚠️ **This platform is for educational purposes only.**

- All activities are logged and monitored
- Ensure compliance with applicable laws and ethical guidelines
- Unauthorized use for malicious purposes is strictly prohibited
- Designed for red team simulation exercises and blue team defense training

## Development

### Building for Production

```bash
npm run build
npm start
```

### Type Checking

```bash
npm run type-check
```

## License

This project is for educational purposes only. Please ensure responsible use in compliance with applicable laws and ethical guidelines.
