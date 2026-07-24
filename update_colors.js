const fs = require('fs');
const path = require('path');

const directories = [
  path.join(__dirname, 'src/screens'),
  path.join(__dirname, 'src/components')
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const original = content;

      // Primary / Blue Colors
      content = content.replace(/bg-\[\#005BBB\]/g, 'bg-brand-primary');
      content = content.replace(/text-\[\#005BBB\]/g, 'text-brand-primary');
      content = content.replace(/border-\[\#005BBB\]/g, 'border-brand-primary');
      
      content = content.replace(/text-\[\#82A0D8\]/g, 'text-brand-electric-light');
      content = content.replace(/bg-\[\#82A0D8\]/g, 'bg-brand-electric-light');
      content = content.replace(/border-\[\#82A0D8\]/g, 'border-brand-electric-light');

      // Dark Mode Backgrounds
      content = content.replace(/dark:bg-\[\#121212\]/g, 'dark:bg-brand-bg');
      content = content.replace(/dark:bg-\[\#1A1A1A\]/g, 'dark:bg-brand-surface');
      content = content.replace(/dark:bg-\[\#2A2A2A\]/g, 'dark:bg-brand-border');
      
      // Dark Mode Borders
      content = content.replace(/dark:border-\[\#1A1A1A\]/g, 'dark:border-brand-border');
      content = content.replace(/dark:border-\[\#2A2A2A\]/g, 'dark:border-brand-border-focus');
      content = content.replace(/dark:border-\[\#333\]/g, 'dark:border-brand-border-focus');

      // Light Mode Adjustments (Domino Aesthetic)
      content = content.replace(/bg-gray-50/g, 'bg-[#f2ece0]');
      content = content.replace(/bg-white/g, 'bg-[#e6ddca]');
      content = content.replace(/border-gray-200/g, 'border-[#d8ccb4]');
      
      // Some explicit hex checks
      content = content.replace(/#005BBB/g, '#2563EB'); // replacing pure hex strings for icons
      content = content.replace(/#82A0D8/g, '#3B82F6'); 
      content = content.replace(/#121212/g, '#0a0a0a'); 
      content = content.replace(/#1A1A1A/g, '#1c1c1c'); 
      content = content.replace(/#2A2A2A/g, '#262626'); 

      if (content !== original) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated colors in ${file}`);
      }
    }
  }
}

directories.forEach(processDirectory);
console.log('Finished updating colors.');
