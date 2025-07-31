# Ride Booking App Setup Guide

This guide will help you set up the ride booking application on a new laptop.

## Prerequisites

### Required Software
1. **Node.js** (version 18 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version` and `npm --version`

2. **Git** (for cloning the repository)
   - Download from: https://git-scm.com/
   - Verify installation: `git --version`

### Required API Keys
1. **Google Maps API Key**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable the following APIs:
     - Maps JavaScript API
     - Places API
     - Directions API
     - Geocoding API
   - Create credentials (API Key)
   - Restrict the API key to your domain for security

## Installation Steps

### 1. Clone or Copy the Project
```bash
# If using Git (recommended)
git clone <repository-url>
cd online-reservation

# Or copy the entire project folder to the new laptop
```

### 2. Navigate to the App Directory
```bash
cd ride-booking-app
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Environment Configuration
Create a `.env.local` file in the `ride-booking-app` directory:

```env
# Google Maps API Key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Database URL (SQLite for development)
DATABASE_URL="file:./prisma/dev.db"

# Next.js Configuration
NEXTAUTH_SECRET=your_random_secret_key_here
NEXTAUTH_URL=http://localhost:3000
```

### 5. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed the database with initial data
npm run seed
```

### 6. Start the Development Server
```bash
npm run dev
```

The application will be available at: http://localhost:3000

## Configuration Details

### Google Maps Setup
1. Replace `your_google_maps_api_key_here` in `.env.local` with your actual API key
2. Ensure all required APIs are enabled in Google Cloud Console
3. For production, restrict API key to your domain

### Database Configuration
- The app uses SQLite by default (suitable for development)
- Database file will be created at `prisma/dev.db`
- For production, consider PostgreSQL or MySQL

### Environment Variables
- **NEXT_PUBLIC_GOOGLE_MAPS_API_KEY**: Your Google Maps API key
- **DATABASE_URL**: Database connection string
- **NEXTAUTH_SECRET**: Random secret for authentication (generate with `openssl rand -base64 32`)
- **NEXTAUTH_URL**: Your application URL

## Troubleshooting

### Common Issues

1. **"Module not found" errors**
   - Run `npm install` again
   - Delete `node_modules` and `package-lock.json`, then run `npm install`

2. **Google Maps not loading**
   - Check if API key is correctly set in `.env.local`
   - Verify required APIs are enabled in Google Cloud Console
   - Check browser console for API errors

3. **Database errors**
   - Run `npx prisma generate`
   - Run `npx prisma migrate reset` (this will reset the database)

4. **Port already in use**
   - Change port: `npm run dev -- -p 3001`
   - Or kill the process using port 3000

### Development Commands
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run database migrations
npx prisma migrate dev

# Open Prisma Studio (database GUI)
npx prisma studio

# Reset database
npx prisma migrate reset
```

## Project Structure
```
ride-booking-app/
├── src/
│   ├── app/                 # Next.js app router pages
│   ├── components/          # React components
│   ├── lib/                 # Utility functions
│   └── types/               # TypeScript type definitions
├── prisma/                  # Database schema and migrations
├── public/                  # Static assets
├── .env.local              # Environment variables (create this)
├── package.json            # Dependencies and scripts
└── tsconfig.json           # TypeScript configuration
```

## Features
- Real-time ride booking with Google Maps integration
- Draggable pickup and dropoff markers
- Route calculation and fare estimation
- Responsive design for mobile and desktop
- Admin panel for managing bookings and settings

## Security Notes
- Never commit `.env.local` to version control
- Use environment-specific API keys
- Restrict Google Maps API key to your domains
- Use HTTPS in production

## Support
If you encounter issues during setup, check:
1. Node.js and npm versions
2. Google Maps API key configuration
3. Database connection
4. Environment variables

For additional help, refer to the project documentation or contact the development team.