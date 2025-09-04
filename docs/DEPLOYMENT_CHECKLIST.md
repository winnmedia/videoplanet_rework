# VRidge Web Deployment Checklist

## 📋 Pre-Deployment Checklist

### 1. Environment Configuration
- [ ] Copy `.env.example` to `.env.local` for local development
- [ ] Configure all required environment variables
- [ ] Verify API URLs are correct for the target environment
- [ ] Ensure secret keys are properly set (min 32 characters for NEXTAUTH_SECRET)
- [ ] Test environment variable loading with `npm run dev`

### 2. Code Quality
- [ ] Run linter: `npm run lint`
- [ ] Run tests: `npm run test:run`
- [ ] Check test coverage: `npm run test:coverage`
- [ ] Build project locally: `npm run build`
- [ ] Test production build: `npm run start`

### 3. Security
- [ ] Remove all console.log statements from production code
- [ ] Verify no sensitive data in committed files
- [ ] Check that `.env.local` is in `.gitignore`
- [ ] Ensure CORS settings are properly configured
- [ ] Verify authentication flow works correctly

## 🚀 Vercel Deployment

### Initial Setup
1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Link Project**
   ```bash
   vercel link
   ```

### Environment Variables Setup
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Navigate to Settings → Environment Variables
4. Add the following variables:

   **Required Variables:**
   - `NODE_ENV` = production
   - `NEXT_PUBLIC_APP_ENV` = production
   - `NEXT_PUBLIC_API_URL` = https://your-api-url.com
   - `NEXT_PUBLIC_BACKEND_URL` = https://vridge-api.railway.app
   - `NEXTAUTH_SECRET` = [generate with: openssl rand -base64 32]
   
   **Optional Variables:**
   - `DATABASE_URL` = your-database-connection-string
   - `REDIS_URL` = your-redis-connection-string
   - `GOOGLE_CLIENT_ID` = your-google-oauth-client-id
   - `GOOGLE_CLIENT_SECRET` = your-google-oauth-secret

### Deploy Commands
```bash
# Preview deployment
vercel

# Production deployment
vercel --prod

# Deploy with specific environment
vercel --env preview
vercel --env production
```

### Post-Deployment Verification
- [ ] Check deployment URL is accessible
- [ ] Verify all pages load correctly
- [ ] Test API connections
- [ ] Check authentication flow
- [ ] Monitor error logs in Vercel dashboard

## 🚂 Railway Deployment

### Initial Setup
1. **Install Railway CLI**
   ```bash
   npm i -g @railway/cli
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

3. **Initialize Project**
   ```bash
   railway init
   ```

### Environment Variables Setup
```bash
# Set environment variables via CLI
railway variables set NODE_ENV=production
railway variables set NEXT_PUBLIC_APP_ENV=production
railway variables set NEXT_PUBLIC_API_URL=https://your-api-url.com
railway variables set NEXT_PUBLIC_BACKEND_URL=https://vridge-api.railway.app
railway variables set NEXTAUTH_SECRET=$(openssl rand -base64 32)
```

Or use Railway Dashboard:
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Select your project
3. Click on Variables tab
4. Add all required environment variables

### Deploy Commands
```bash
# Deploy to Railway
railway up

# Deploy with specific environment
railway up --environment production

# Check deployment status
railway status

# View logs
railway logs
```

### Database Setup (if needed)
```bash
# Add PostgreSQL plugin
railway add postgresql

# Get database URL
railway variables get DATABASE_URL
```

## 📦 Docker Deployment (Alternative)

### Build Docker Image
```bash
# Create Dockerfile if not exists
cat > Dockerfile << 'EOF'
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]
EOF

# Build image
docker build -t vridge-web:latest .

# Run container
docker run -p 3000:3000 --env-file .env.local vridge-web:latest
```

## 🔄 CI/CD Pipeline

### GitHub Actions Setup
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run test:ci
      - run: npm run build

  deploy-vercel:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

## 🔍 Monitoring & Maintenance

### Health Check Endpoints
Create `/app/api/health/route.ts`:
```typescript
export async function GET() {
  return Response.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION,
  });
}
```

### Performance Monitoring
- [ ] Set up Google Analytics (add GA_TRACKING_ID)
- [ ] Configure Sentry for error tracking (add SENTRY_DSN)
- [ ] Enable Vercel Analytics
- [ ] Set up uptime monitoring (e.g., UptimeRobot)

### Regular Maintenance Tasks
- [ ] Weekly: Check error logs
- [ ] Weekly: Review performance metrics
- [ ] Monthly: Update dependencies
- [ ] Monthly: Review and rotate API keys
- [ ] Quarterly: Security audit

## 🚨 Rollback Procedures

### Vercel Rollback
```bash
# List deployments
vercel list

# Rollback to specific deployment
vercel rollback [deployment-url]

# Or use Vercel Dashboard:
# 1. Go to Deployments tab
# 2. Find previous working deployment
# 3. Click "Promote to Production"
```

### Railway Rollback
```bash
# View deployment history
railway deployments

# Rollback to previous deployment
railway rollback

# Or use Railway Dashboard:
# 1. Go to Deployments tab
# 2. Select previous deployment
# 3. Click "Redeploy"
```

## 📝 Environment-Specific Configurations

### Development
- API URL: `http://localhost:8000`
- Debug mode: Enabled
- Source maps: Enabled
- Hot reload: Enabled

### Staging
- API URL: `https://staging-api.vridge.com`
- Debug mode: Enabled
- Source maps: Enabled
- Performance monitoring: Enabled at 10% sample rate

### Production
- API URL: `https://api.vridge.com`
- Debug mode: Disabled
- Source maps: Hidden
- Performance monitoring: Enabled at 1% sample rate
- CDN: Enabled
- Caching: Aggressive

## 🔐 Secret Management

### Generating Secrets
```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate API keys
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Storing Secrets Securely
- Never commit secrets to git
- Use environment variables for all secrets
- Rotate secrets regularly (every 90 days)
- Use different secrets for each environment
- Consider using secret management services (AWS Secrets Manager, HashiCorp Vault)

## ✅ Final Checklist

### Before Going Live
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] SSL certificate active
- [ ] Domain configured and pointing to deployment
- [ ] Monitoring and alerting set up
- [ ] Backup strategy in place
- [ ] Team notified of deployment
- [ ] Documentation updated

### After Deployment
- [ ] Smoke test all critical paths
- [ ] Check analytics tracking
- [ ] Verify error reporting
- [ ] Monitor performance metrics for 24 hours
- [ ] Document any issues or improvements needed

## 📞 Support Contacts

- **DevOps Team**: devops@vridge.com
- **On-call Engineer**: +82-10-XXXX-XXXX
- **Escalation**: cto@vridge.com

## 📚 Additional Resources

- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Project Repository](https://github.com/your-org/vridge-web)
- [API Documentation](https://api.vridge.com/docs)

---

Last Updated: 2025-08-25
Version: 1.0.0