const fs = require('fs');

// The custom copyFolderRecursiveSync function is no longer needed.
// The custom removeFolderRecursive function can also be inlined for simplicity.

console.log('🔄 Syncing Convex folders...');

// 1. & 2. Remove mobile and web convex folders if they exist.
console.log('🗑️  Removing old directories...');
fs.rmSync('./mobile/convex', { recursive: true, force: true });
fs.rmSync('./web/convex', { recursive: true, force: true });

// 3. & 4. Copy the main convex folder to mobile and web using the built-in method.
console.log('📲➡️💻 Copying source directory...');
fs.cpSync('./convex', './mobile/convex', { recursive: true });
fs.cpSync('./convex', './web/convex', { recursive: true });

console.log('✅ Done! Convex folders synchronized.');