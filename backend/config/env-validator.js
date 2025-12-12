// Environment variable validation
function validateEnv() {
    const required = ['JWT_SECRET'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        console.error('❌ FATAL: Missing required environment variables:', missing.join(', '));
        console.error('Please create a .env file with the required variables.');
        console.error('See .env.example for reference.');
        process.exit(1);
    }
    
    // Warn about weak JWT_SECRET
    if (process.env.JWT_SECRET === 'secret' || process.env.JWT_SECRET.length < 32) {
        console.warn('⚠️  WARNING: JWT_SECRET is weak or default. Use a strong random secret (32+ characters).');
        if (process.env.NODE_ENV === 'production') {
            console.error('❌ FATAL: Cannot use weak JWT_SECRET in production!');
            process.exit(1);
        }
    }
    
    // Warn about missing DATABASE_URL
    if (!process.env.DATABASE_URL) {
        console.warn('⚠️  WARNING: DATABASE_URL not set. Database features will be disabled.');
    }
    
    console.log('✅ Environment variables validated successfully');
}

module.exports = { validateEnv };
