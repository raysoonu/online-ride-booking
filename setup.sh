#!/bin/bash

echo "========================================"
echo "Ride Booking App Setup Script"
echo "========================================"
echo

echo "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "Node.js found!"
node --version
echo

echo "Checking npm installation..."
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm is not installed!"
    exit 1
fi

echo "npm found!"
npm --version
echo

echo "Navigating to ride-booking-app directory..."
cd ride-booking-app || {
    echo "ERROR: ride-booking-app directory not found!"
    echo "Make sure you're running this script from the project root."
    exit 1
}

echo "Installing dependencies..."
npm install || {
    echo "ERROR: Failed to install dependencies!"
    exit 1
}

echo
echo "Checking for .env.local file..."
if [ ! -f ".env.local" ]; then
    echo "Creating .env.local template..."
    cat > .env.local << EOF
# Google Maps API Key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Database URL (SQLite for development)
DATABASE_URL="file:./prisma/dev.db"

# Next.js Configuration
NEXTAUTH_SECRET=your_random_secret_key_here
NEXTAUTH_URL=http://localhost:3000
EOF
    echo
    echo "IMPORTANT: Please edit .env.local and add your Google Maps API key!"
    echo
else
    echo ".env.local already exists."
fi

echo "Setting up database..."
echo "Generating Prisma client..."
npx prisma generate || {
    echo "ERROR: Failed to generate Prisma client!"
    exit 1
}

echo "Running database migrations..."
npx prisma migrate dev --name init || {
    echo "WARNING: Database migration failed. This might be normal for first-time setup."
}

echo "Seeding database..."
npm run seed || {
    echo "WARNING: Database seeding failed. You may need to run this manually later."
}

echo
echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo
echo "Next steps:"
echo "1. Edit .env.local and add your Google Maps API key"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Open http://localhost:3000 in your browser"
echo
echo "For detailed setup instructions, see SETUP_GUIDE.md"
echo

# Make the script executable
chmod +x setup.sh