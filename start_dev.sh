#!/bin/bash

# Start Django development server script
echo "🚀 Starting VRidge Django Backend Development Server..."

# Change to backend directory
cd /home/winnmedia/VLANET/vridge_back

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
source .venv/bin/activate

# Install dependencies if needed
echo "📦 Installing dependencies..."
pip install -q django djangorestframework django-cors-headers psycopg2-binary channels redis daphne

# Apply migrations
echo "🔄 Applying database migrations..."
python manage.py migrate --noinput 2>/dev/null || echo "⚠️  Migrations skipped (database may not be configured)"

# Create superuser if it doesn't exist
echo "👤 Checking for superuser..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@vridge.kr', 'admin123')
    print('✅ Superuser created: admin/admin123')
else:
    print('✅ Superuser already exists')
" 2>/dev/null || echo "⚠️  Superuser creation skipped"

# Start the development server
echo "🌐 Starting Django server on http://localhost:8000"
echo "📝 Admin panel: http://localhost:8000/admin"
echo "❤️  Health check: http://localhost:8000/health/"
echo ""
echo "Press Ctrl+C to stop the server..."
python manage.py runserver 0.0.0.0:8000