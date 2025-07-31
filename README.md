# Online Ride Booking System

A modern, full-featured ride booking application built with Next.js, TypeScript, and Google Maps integration.

## Quick Setup

### For Windows Users
```bash
# Run the automated setup script
setup.bat
```

### For Mac/Linux Users
```bash
# Make the script executable and run it
chmod +x setup.sh
./setup.sh
```

### Manual Setup
For detailed setup instructions, see **[SETUP_GUIDE.md](./SETUP_GUIDE.md)**

## Features

- 🗺️ **Google Maps Integration** - Interactive maps with real-time location services
- 🚗 **Real-time Booking** - Instant ride booking with live updates
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile
- 🎯 **Draggable Markers** - Easy pickup and dropoff location selection
- 💰 **Fare Calculation** - Automatic fare estimation based on distance
- 📊 **Admin Dashboard** - Comprehensive booking and settings management
- 🔒 **Secure** - Built with security best practices

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Prisma ORM with SQLite (dev) / PostgreSQL (prod)
- **Maps**: Google Maps JavaScript API
- **Authentication**: NextAuth.js

## Project Structure

```
online-reservation/
├── ride-booking-app/          # Main Next.js application
│   ├── src/
│   │   ├── app/              # Next.js app router
│   │   ├── components/       # React components
│   │   ├── lib/             # Utilities and configurations
│   │   └── types/           # TypeScript definitions
│   ├── prisma/              # Database schema and migrations
│   └── public/              # Static assets
├── includes/                 # WordPress plugin files (legacy)
├── SETUP_GUIDE.md           # Detailed setup instructions
├── setup.bat               # Windows setup script
└── setup.sh                # Mac/Linux setup script
```

## Getting Started

1. **Prerequisites**: Node.js 18+, Google Maps API key
2. **Setup**: Run the appropriate setup script for your OS
3. **Configure**: Add your Google Maps API key to `.env.local`
4. **Run**: `npm run dev` in the `ride-booking-app` directory
5. **Access**: Open http://localhost:3000

## API Keys Required

- **Google Maps API** with the following services enabled:
  - Maps JavaScript API
  - Places API
  - Directions API
  - Geocoding API

## Development

```bash
cd ride-booking-app

# Start development server
npm run dev

# Build for production
npm run build

# Database operations
npx prisma studio          # Open database GUI
npx prisma migrate dev     # Run migrations
npx prisma generate        # Generate client
```

## Deployment

The application is ready for deployment on:
- Vercel (recommended for Next.js)
- Netlify
- Railway
- Any Node.js hosting platform

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for production deployment instructions.

## Support

For setup issues or questions:
1. Check [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed instructions
2. Verify all prerequisites are installed
3. Ensure Google Maps API is properly configured
4. Check the console for any error messages

## License

This project is available for educational and commercial use.