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

      // Check if SafeAreaView is imported from 'react-native'
      const rnImportMatch = content.match(/import\s+{([^}]*)}\s+from\s+['"]react-native['"];?/);
      if (rnImportMatch) {
        let destructured = rnImportMatch[1];
        if (destructured.includes('SafeAreaView')) {
          // Remove SafeAreaView from the react-native import
          let newDestructured = destructured
            .split(',')
            .map(s => s.trim())
            .filter(s => s !== 'SafeAreaView')
            .join(', ');
          
          let newRnImport = '';
          if (newDestructured.length > 0) {
            newRnImport = `import { ${newDestructured} } from 'react-native';\n`;
          }
          
          content = content.replace(rnImportMatch[0], newRnImport);

          // Add the safe-area-context import
          const safeAreaImport = "import { SafeAreaView } from 'react-native-safe-area-context';\n";
          // We can insert it after the react-native import or at the top
          // Find the last import
          const lastImportIndex = content.lastIndexOf('import ');
          if (lastImportIndex !== -1) {
            const endOfLine = content.indexOf('\n', lastImportIndex);
            content = content.slice(0, endOfLine + 1) + safeAreaImport + content.slice(endOfLine + 1);
          } else {
            content = safeAreaImport + content;
          }
        }
      }

      if (content !== original) {
        fs.writeFileSync(fullPath, content);
        console.log(`Fixed SafeAreaView in ${file}`);
      }
    }
  }
}

directories.forEach(processDirectory);
console.log('Finished fixing SafeAreaView.');
