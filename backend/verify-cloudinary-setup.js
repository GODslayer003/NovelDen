#!/usr/bin/env node

/**
 * 🚀 Cloudinary Setup Verification Script
 * Run this after setting up your .env file to verify everything is working
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

console.log('\n📋 Novel Den - Cloudinary Setup Check\n');

const required = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

let allGood = true;

required.forEach(key => {
  const value = process.env[key];
  if (value) {
    console.log(`✅ ${key}: ${value.substring(0, 10)}...`);
  } else {
    console.log(`❌ ${key}: NOT SET`);
    allGood = false;
  }
});

console.log();

if (allGood) {
  console.log('✨ All Cloudinary environment variables are set!');
  console.log('📸 Ready to upload images, PDFs, and other media.\n');
  console.log('Next steps:');
  console.log('  1. npm install cloudinary multer-storage-cloudinary');
  console.log('  2. npm run dev');
  console.log('  3. Try uploading a book cover in the admin panel\n');
} else {
  console.log('⚠️  Missing environment variables!');
  console.log('Setup instructions: https://github.com/yourrepo/CLOUDINARY_SETUP.md\n');
  process.exit(1);
}
