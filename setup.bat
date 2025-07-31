@echo off
echo ========================================
echo Ride Booking App Setup Script
echo ========================================
echo.

echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js found!
node --version
echo.

echo Checking npm installation...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not installed!
    pause
    exit /b 1
)

echo npm found!
npm --version
echo.

echo Navigating to ride-booking-app directory...
cd ride-booking-app
if %errorlevel% neq 0 (
    echo ERROR: ride-booking-app directory not found!
    echo Make sure you're running this script from the project root.
    pause
    exit /b 1
)

echo Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)

echo.
echo Checking for .env.local file...
if not exist ".env.local" (
    echo Creating .env.local template...
    echo # Google Maps API Key > .env.local
    echo NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here >> .env.local
    echo. >> .env.local
    echo # Database URL ^(SQLite for development^) >> .env.local
    echo DATABASE_URL="file:./prisma/dev.db" >> .env.local
    echo. >> .env.local
    echo # Next.js Configuration >> .env.local
    echo NEXTAUTH_SECRET=your_random_secret_key_here >> .env.local
    echo NEXTAUTH_URL=http://localhost:3000 >> .env.local
    echo.
    echo IMPORTANT: Please edit .env.local and add your Google Maps API key!
    echo.
) else (
    echo .env.local already exists.
)

echo Setting up database...
echo Generating Prisma client...
npx prisma generate
if %errorlevel% neq 0 (
    echo ERROR: Failed to generate Prisma client!
    pause
    exit /b 1
)

echo Running database migrations...
npx prisma migrate dev --name init
if %errorlevel% neq 0 (
    echo WARNING: Database migration failed. This might be normal for first-time setup.
)

echo Seeding database...
npm run seed
if %errorlevel% neq 0 (
    echo WARNING: Database seeding failed. You may need to run this manually later.
)

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Edit .env.local and add your Google Maps API key
echo 2. Run 'npm run dev' to start the development server
echo 3. Open http://localhost:3000 in your browser
echo.
echo For detailed setup instructions, see SETUP_GUIDE.md
echo.
pause