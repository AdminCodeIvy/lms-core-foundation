#!/bin/bash

echo "🚀 Installing LMS Backend..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null
then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null
then
    echo "❌ npm is not installed."
    exit 1
fi

echo "✅ npm version: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Dependencies installed successfully!"
    echo ""
    
    # Check if .env exists
    if [ ! -f .env ]; then
        echo "📝 Creating .env file from template..."
        cp .env.example .env
        echo "✅ .env file created!"
        echo ""
        echo "⚠️  IMPORTANT: Edit .env and add your Supabase credentials:"
        echo "   - SUPABASE_URL"
        echo "   - SUPABASE_SERVICE_KEY"
        echo "   - JWT_SECRET"
        echo ""
    else
        echo "✅ .env file already exists"
        echo ""
    fi
    
    echo "🎉 Installation complete!"
    echo ""
    echo "Next steps:"
    echo "1. Edit .env with your Supabase credentials"
    echo "2. Run: npm run dev"
    echo "3. Visit: http://localhost:3000/api/v1/health"
    echo ""
else
    echo ""
    echo "❌ Installation failed. Please check the errors above."
    exit 1
fi
