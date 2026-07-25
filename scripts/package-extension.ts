/**
 * @file scripts/package-extension.ts
 * @description Packages the built extension dist/ directory into a ZIP file
 * suitable for Chrome Web Store submission or manual loading.
 *
 * Usage:
 *   npx tsx scripts/package-extension.ts
 *   RELEASE_VERSION=1.2.3 npx tsx scripts/package-extension.ts
 *
 * Output:
 *   swagger-api-auto-tester-<version>.zip
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ROOT = resolve(import.meta.dirname, '..');
const DIST_DIR = join(ROOT, 'dist');
const PKG_PATH = join(ROOT, 'package.json');

interface PackageJson {
  name: string;
  version: string;
}

const pkg: PackageJson = JSON.parse(readFileSync(PKG_PATH, 'utf-8'));
const version = process.env['RELEASE_VERSION'] ?? pkg.version;
const outputName = `swagger-api-auto-tester-${version}.zip`;
const outputPath = join(ROOT, outputName);

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

if (!existsSync(DIST_DIR)) {
  console.error('❌ dist/ directory not found. Run `npm run build:prod` first.');
  process.exit(1);
}

const requiredFiles = ['manifest.json'];
for (const file of requiredFiles) {
  if (!existsSync(join(DIST_DIR, file))) {
    console.error(`❌ Required file missing from dist/: ${file}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Package
// ---------------------------------------------------------------------------

console.log(`\n📦 Packaging extension v${version}...`);
console.log(`   Source: ${DIST_DIR}`);
console.log(`   Output: ${outputPath}\n`);

try {
  // Remove existing ZIP if present
  if (existsSync(outputPath)) {
    execSync(`rm -f "${outputPath}"`);
  }

  // Create ZIP from dist/ contents (not the dist/ folder itself)
  execSync(`cd "${DIST_DIR}" && zip -r "${outputPath}" .`, { stdio: 'inherit' });

  // Report file size
  const stats = execSync(`du -sh "${outputPath}"`).toString().trim();
  console.log(`\n✅ Extension packaged successfully: ${outputName}`);
  console.log(`   Size: ${stats.split('\t')[0]}`);
} catch (err) {
  console.error('❌ Packaging failed:', err);
  process.exit(1);
}
