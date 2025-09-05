#!/usr/bin/env node

/**
 * Node.js script for fixing accessibility issues in HTML-like files
 */

import fs from 'fs';
import path from 'path';
import { globby } from 'globby';

const HTML_EXTENSIONS = ['*.html', '*.htm', '*.jsx', '*.tsx'];

async function fixHtmlAccessibility() {
  console.log('🔍 Searching for HTML files to fix...');
  
  const patterns = [
    'src/**/*.{html,htm,jsx,tsx}',
    'app/**/*.{html,htm,jsx,tsx}',
    'client/**/*.{html,htm,jsx,tsx}',
    'public/**/*.{html,htm}'
  ];
  
  try {
    const files = await globby(patterns, {
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
    });
    
    console.log(`📁 Found ${files.length} files to process`);
    
    for (const filePath of files) {
      console.log(`🔧 Processing: ${filePath}`);
      await fixFileAccessibility(filePath);
    }
    
    console.log('✅ HTML accessibility fixes completed!');
  } catch (error) {
    console.error('❌ Error processing files:', error);
    process.exit(1);
  }
}

async function fixFileAccessibility(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let fixedContent = content;
    let hasChanges = false;

    // Fix: Add lang attribute to html elements
    if (filePath.endsWith('.html') || filePath.endsWith('.htm')) {
      if (fixedContent.includes('<html') && !fixedContent.includes('lang=')) {
        fixedContent = fixedContent.replace(
          /<html([^>]*)>/gi,
          '<html$1 lang="no">'
        );
        hasChanges = true;
        console.log(`  ✅ Added lang attribute to <html>`);
      }
    }

    // Fix: Add missing alt attributes to img tags
    const imgRegex = /<img([^>]*?)(?:\s*\/?>)/gi;
    fixedContent = fixedContent.replace(imgRegex, (match, attributes) => {
      if (!attributes.includes('alt=')) {
        hasChanges = true;
        console.log(`  ✅ Added alt attribute to <img>`);
        return `<img${attributes} alt="">`;
      }
      return match;
    });

    // Fix: Add missing for attributes to label elements
    const labelRegex = /<label([^>]*?)>/gi;
    fixedContent = fixedContent.replace(labelRegex, (match, attributes) => {
      if (!attributes.includes('for=') && !attributes.includes('htmlFor=')) {
        // Don't auto-add for attribute as it needs proper linking
        // Just log that it should be manually reviewed
        console.log(`  ⚠️  Label without for/htmlFor attribute found - manual review needed`);
      }
      return match;
    });

    // Fix: Add missing type attributes to button elements
    const buttonRegex = /<button([^>]*?)>/gi;
    fixedContent = fixedContent.replace(buttonRegex, (match, attributes) => {
      if (!attributes.includes('type=')) {
        hasChanges = true;
        console.log(`  ✅ Added type="button" to <button>`);
        return `<button${attributes} type="button">`;
      }
      return match;
    });

    // Fix: Add missing role attributes to interactive elements
    const interactiveElements = ['div', 'span'];
    for (const element of interactiveElements) {
      const regex = new RegExp(`<${element}([^>]*onclick[^>]*?)>`, 'gi');
      fixedContent = fixedContent.replace(regex, (match, attributes) => {
        if (!attributes.includes('role=')) {
          hasChanges = true;
          console.log(`  ✅ Added role="button" to clickable <${element}>`);
          return `<${element}${attributes} role="button">`;
        }
        return match;
      });
    }

    // Write back if changes were made
    if (hasChanges) {
      fs.writeFileSync(filePath, fixedContent, 'utf8');
      console.log(`  💾 Saved changes to ${filePath}`);
    } else {
      console.log(`  ✨ No accessibility issues found`);
    }

  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
  }
}

// Run the script
fixHtmlAccessibility();