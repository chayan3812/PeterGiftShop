/**
 * Secure JWT Secret Generator for Peter Digital Enterprise Security Platform
 * Generates cryptographically secure JWT secrets following security best practices
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate a cryptographically secure JWT secret
 * @param {number} length - Length in bytes (32 bytes = 256 bits recommended)
 * @returns {string} Base64 encoded secure random string
 */
function generateSecureJWTSecret(length = 32) {
  // Generate cryptographically secure random bytes
  const randomBytes = crypto.randomBytes(length);
  
  // Convert to base64 for easy storage and use
  const base64Secret = randomBytes.toString('base64');
  
  return base64Secret;
}

/**
 * Generate multiple JWT secrets for different environments
 */
function generateJWTSecrets() {
  const secrets = {
    development: generateSecureJWTSecret(32),
    staging: generateSecureJWTSecret(32),
    production: generateSecureJWTSecret(64), // 512-bit for production
    test: generateSecureJWTSecret(32)
  };
  
  return secrets;
}

/**
 * Validate JWT secret strength
 * @param {string} secret - JWT secret to validate
 * @returns {object} Validation result with score and recommendations
 */
function validateJWTSecret(secret) {
  const validation = {
    length: secret.length,
    entropy: calculateEntropy(secret),
    strength: 'weak',
    recommendations: []
  };
  
  // Check minimum length (256 bits = 44 base64 characters)
  if (secret.length < 44) {
    validation.recommendations.push('Use at least 256 bits (32 bytes) for JWT secret');
  }
  
  // Check entropy
  if (validation.entropy < 5.0) {
    validation.recommendations.push('Secret has low entropy, use cryptographically secure random generation');
  }
  
  // Determine strength
  if (secret.length >= 88 && validation.entropy >= 5.5) {
    validation.strength = 'excellent';
  } else if (secret.length >= 64 && validation.entropy >= 5.0) {
    validation.strength = 'strong';
  } else if (secret.length >= 44 && validation.entropy >= 4.5) {
    validation.strength = 'good';
  } else if (secret.length >= 32) {
    validation.strength = 'acceptable';
  }
  
  return validation;
}

/**
 * Calculate Shannon entropy of a string
 * @param {string} str - String to calculate entropy for
 * @returns {number} Entropy value
 */
function calculateEntropy(str) {
  const freq = {};
  for (let char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }
  
  const len = str.length;
  let entropy = 0;
  
  for (let char in freq) {
    const p = freq[char] / len;
    entropy -= p * Math.log2(p);
  }
  
  return entropy;
}

/**
 * Generate environment file with secure JWT secrets
 */
function generateEnvFile(secrets) {
  const envContent = `# JWT Secrets - Generated ${new Date().toISOString()}
# Production-ready cryptographically secure secrets

# Primary JWT secret for token signing (512-bit for production)
JWT_SECRET=${secrets.production}

# Development environment secret
JWT_SECRET_DEV=${secrets.development}

# Staging environment secret  
JWT_SECRET_STAGING=${secrets.staging}

# Test environment secret
JWT_SECRET_TEST=${secrets.test}

# JWT Configuration
JWT_ISSUER=peter-digital-security-platform
JWT_AUDIENCE=api.petershop.com
JWT_ACCESS_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d

# Security Configuration
JWT_ENABLE_BLACKLIST=true
JWT_ENABLE_REFRESH_ROTATION=true
JWT_RATE_LIMIT_MAX=5
JWT_RATE_LIMIT_WINDOW=15m

# Additional Security Settings
JWT_ALGORITHM=HS256
JWT_CLOCK_TOLERANCE=30
JWT_MAX_AGE=86400
`;

  return envContent;
}

/**
 * Update existing .env file with new JWT secret
 */
function updateEnvFile(newSecret) {
  const envPath = path.join(process.cwd(), '..', '.env');
  
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // Update or add JWT_SECRET
  const jwtSecretRegex = /^JWT_SECRET=.*$/m;
  if (jwtSecretRegex.test(envContent)) {
    envContent = envContent.replace(jwtSecretRegex, `JWT_SECRET=${newSecret}`);
  } else {
    envContent += `\n# JWT Secret - Generated ${new Date().toISOString()}\nJWT_SECRET=${newSecret}\n`;
  }
  
  return envContent;
}

/**
 * Generate security documentation for JWT secrets
 */
function generateSecurityDocumentation(secrets) {
  const validation = validateJWTSecret(secrets.production);
  
  const documentation = {
    generationDate: new Date().toISOString(),
    secretStrength: validation.strength,
    entropyScore: validation.entropy.toFixed(2),
    secretLength: validation.length,
    algorithm: 'HS256',
    
    securityFeatures: {
      cryptographicallySecure: true,
      minimumBitStrength: '512-bit for production',
      entropySource: 'crypto.randomBytes()',
      encoding: 'Base64',
      rotation: 'Recommended every 90 days'
    },
    
    environmentSecrets: {
      production: {
        strength: validateJWTSecret(secrets.production).strength,
        length: secrets.production.length,
        entropy: validateJWTSecret(secrets.production).entropy.toFixed(2)
      },
      development: {
        strength: validateJWTSecret(secrets.development).strength,
        length: secrets.development.length,
        entropy: validateJWTSecret(secrets.development).entropy.toFixed(2)
      }
    },
    
    bestPractices: [
      'Never commit JWT secrets to version control',
      'Use environment variables for secret management',
      'Rotate secrets regularly (every 90 days recommended)',
      'Use minimum 256-bit secrets (512-bit for production)',
      'Store secrets in secure key management systems',
      'Audit secret access and usage regularly'
    ],
    
    rotationSchedule: {
      frequency: 'Every 90 days',
      process: 'Generate new secret, deploy with overlap, retire old secret',
      emergencyRotation: 'Immediately if secret compromise suspected'
    }
  };
  
  return documentation;
}

/**
 * Main execution function
 */
function main() {
  console.log('🔐 Secure JWT Secret Generator');
  console.log('================================\n');
  
  // Generate secrets for all environments
  const secrets = generateJWTSecrets();
  
  console.log('✅ Generated cryptographically secure JWT secrets:');
  console.log(`Production Secret: ${secrets.production.substring(0, 20)}... (${secrets.production.length} chars)`);
  console.log(`Development Secret: ${secrets.development.substring(0, 20)}... (${secrets.development.length} chars)`);
  console.log(`Staging Secret: ${secrets.staging.substring(0, 20)}... (${secrets.staging.length} chars)\n`);
  
  // Validate production secret strength
  const validation = validateJWTSecret(secrets.production);
  console.log('🛡️ Security Validation:');
  console.log(`Secret Strength: ${validation.strength.toUpperCase()}`);
  console.log(`Entropy Score: ${validation.entropy.toFixed(2)}/8.0`);
  console.log(`Secret Length: ${validation.length} characters`);
  
  if (validation.recommendations.length > 0) {
    console.log('\n⚠️ Recommendations:');
    validation.recommendations.forEach(rec => console.log(`• ${rec}`));
  }
  
  // Generate environment file
  const envContent = generateEnvFile(secrets);
  const envExamplePath = path.join(process.cwd(), '..', '.env.secure-example');
  fs.writeFileSync(envExamplePath, envContent);
  
  // Update existing .env file
  const updatedEnvContent = updateEnvFile(secrets.production);
  const envPath = path.join(process.cwd(), '..', '.env');
  fs.writeFileSync(envPath, updatedEnvContent);
  
  // Generate security documentation
  const securityDoc = generateSecurityDocumentation(secrets);
  const securityPath = path.join(process.cwd(), '..', 'docs', 'jwt-secret-security.json');
  fs.writeFileSync(securityPath, JSON.stringify(securityDoc, null, 2));
  
  console.log('\n📄 Files Generated:');
  console.log(`• .env updated with production secret`);
  console.log(`• .env.secure-example created with all environment secrets`);
  console.log(`• docs/jwt-secret-security.json created with security documentation`);
  
  console.log('\n🔐 Security Best Practices:');
  securityDoc.bestPractices.forEach(practice => {
    console.log(`• ${practice}`);
  });
  
  console.log('\n⚡ Next Steps:');
  console.log('1. Review the generated secrets and security documentation');
  console.log('2. Deploy the updated .env file to production environment');
  console.log('3. Set up secret rotation schedule (every 90 days)');
  console.log('4. Configure secure key management system for production');
  console.log('5. Restart application to use new JWT secret');
  
  console.log('\n✅ JWT Secret generation completed successfully!');
  
  return {
    secrets,
    validation,
    documentation: securityDoc
  };
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { 
  generateSecureJWTSecret, 
  generateJWTSecrets, 
  validateJWTSecret, 
  generateEnvFile,
  main as generateJWTSecretSystem
};