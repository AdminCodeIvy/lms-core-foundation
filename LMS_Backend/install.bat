@echo off
echo Installing LMS Backend...
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Node.js is not installed. Please install Node.js 18+ first.
    echo Visit: https://nodejs.org/
    exit /b 1
)

echo Node.js version:
node --version
echo.

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo npm is not installed.
    exit /b 1
)

echo npm version:
npm --version
echo.

REM Install dependencies
echo Installing dependencies...
call npm install

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Dependencies installed successfully!
    echo.
    
    REM Check if .env exists
    if not exist .env (
        echo Creating .env file from template...
        copy .env.example .env
        echo .env file created!
        echo.
        echo IMPORTANT: Edit .env and add your Supabase credentials:
        echo    - SUPABASE_URL
        echo    - SUPABASE_SERVICE_KEY
        echo    - JWT_SECRET
        echo.
    ) else (
        echo .env file already exists
        echo.
    )
    
    echo Installation complete!
    echo.
    echo Next steps:
    echo 1. Edit .env with your Supabase credentials
    echo 2. Run: npm run dev
    echo 3. Visit: http://localhost:3000/api/v1/health
    echo.
) else (
    echo.
    echo Installation failed. Please check the errors above.
    exit /b 1
)
