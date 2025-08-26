#!/bin/bash

# Start Django development server with Poetry
echo "🚀 Starting VRidge Django Backend Development Server with Poetry..."

# Change to backend directory
cd /home/winnmedia/VLANET/vridge_back

# Check if poetry is installed
if ! command -v poetry &> /dev/null; then
    echo "📦 Installing Poetry..."
    pip install --user poetry
    export PATH="$HOME/.local/bin:$PATH"
fi

# Install dependencies with poetry
echo "📦 Installing dependencies with Poetry..."
poetry install --no-interaction --quiet 2>/dev/null || {
    echo "⚠️  Poetry install failed, trying with pip..."
    pip install --user django djangorestframework django-cors-headers
}

# Simple Django run without migrations (for testing)
echo "🌐 Starting Django server on http://localhost:8000"
echo "📝 Admin panel: http://localhost:8000/admin"
echo "❤️  Health check: http://localhost:8000/health/"
echo ""
echo "Press Ctrl+C to stop the server..."

# Try with poetry first, fallback to direct python
if command -v poetry &> /dev/null; then
    poetry run python manage.py runserver 0.0.0.0:8000 2>/dev/null || python3 manage.py runserver 0.0.0.0:8000
else
    python3 manage.py runserver 0.0.0.0:8000
fi