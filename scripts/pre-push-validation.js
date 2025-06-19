/**
 * Pre-Push Validation Script
 * Validates project is ready for GitHub push
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PrePushValidator {
  constructor() {
    this.validations = [];
    this.projectRoot = path.join(__dirname, '..');
  }

  validate(category, name, condition, details) {
    const status = condition ? 'READY' : 'MISSING';
    const icon = condition ? '✅' : '❌';
    
    console.log(`${icon} [${category}] ${name}: ${status}`);
    if (details && !condition) console.log(`   ${details}`);
    
    this.validations.push({ category, name, status, condition });
    return condition;
  }

  async run() {
    console.log('SiZu Pay Platform - Pre-Push Validation');
    console.log('======================================\n');

    // Core files validation
    console.log('📁 Core Project Files:');
    this.validate('Core', 'Package Configuration', 
      fs.existsSync(path.join(this.projectRoot, 'package.json')));
    this.validate('Core', 'TypeScript Config', 
      fs.existsSync(path.join(this.projectRoot, 'tsconfig.json')));
    this.validate('Core', 'Vite Configuration', 
      fs.existsSync(path.join(this.projectRoot, 'vite.config.ts')));
    this.validate('Core', 'Frontend Entry Point', 
      fs.existsSync(path.join(this.projectRoot, 'client/src/App.tsx')));
    this.validate('Core', 'Backend Entry Point', 
      fs.existsSync(path.join(this.projectRoot, 'server/index.ts')));

    console.log('\n🔧 CI/CD & Automation:');
    this.validate('CI/CD', 'GitHub Actions Workflow', 
      fs.existsSync(path.join(this.projectRoot, '.github/workflows/ci.yml')));
    this.validate('CI/CD', 'Quick Smoke Tests', 
      fs.existsSync(path.join(this.projectRoot, 'scripts/quickSmokeTest.js')));
    this.validate('CI/CD', 'Full Test Suite', 
      fs.existsSync(path.join(this.projectRoot, 'scripts/autoSmokeTest.js')));
    this.validate('CI/CD', 'Deployment Validation', 
      fs.existsSync(path.join(this.projectRoot, 'scripts/deployment-readiness-check.js')));

    console.log('\n📚 Documentation:');
    this.validate('Docs', 'Project README', 
      fs.existsSync(path.join(this.projectRoot, 'README.md')));
    this.validate('Docs', 'GitHub Setup Guide', 
      fs.existsSync(path.join(this.projectRoot, 'GITHUB_SETUP.md')));
    this.validate('Docs', 'Deployment Summary', 
      fs.existsSync(path.join(this.projectRoot, 'DEPLOYMENT_SUMMARY.md')));
    this.validate('Docs', 'CI/CD Implementation', 
      fs.existsSync(path.join(this.projectRoot, 'docs/CI-CD-Implementation.md')));

    console.log('\n🗂️ Project Structure:');
    this.validate('Structure', 'Git Ignore File', 
      fs.existsSync(path.join(this.projectRoot, '.gitignore')));
    this.validate('Structure', 'Environment Template', 
      fs.existsSync(path.join(this.projectRoot, '.env.example')));
    this.validate('Structure', 'Reports Directory', 
      fs.existsSync(path.join(this.projectRoot, 'reports')));

    // Count validations
    const total = this.validations.length;
    const ready = this.validations.filter(v => v.condition).length;
    const missing = total - ready;

    console.log('\n📊 Pre-Push Summary:');
    console.log(`Total Checks: ${total}`);
    console.log(`Ready: ${ready}`);
    console.log(`Missing: ${missing}`);
    console.log(`Success Rate: ${Math.round((ready / total) * 100)}%`);

    if (missing === 0) {
      console.log('\n🚀 PROJECT READY FOR GITHUB PUSH');
      console.log('All required files are present and configured.');
      console.log('\nRun these commands in your terminal:');
      console.log('git add .');
      console.log('git commit -m "Initial commit: Complete SiZu Pay Platform with CI/CD"');
      console.log('git remote add origin https://github.com/chayan3812/PeterGiftShop.git');
      console.log('git branch -M main');
      console.log('git push -u origin main');
    } else {
      console.log('\n⚠️ Some files are missing. Please ensure all components are in place.');
    }

    return missing === 0;
  }
}

const validator = new PrePushValidator();
validator.run().catch(console.error);