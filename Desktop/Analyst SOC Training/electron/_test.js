// Check all process properties and globals for electron-specific items
console.log('versions.electron:', process.versions.electron);
console.log('versions.node:', process.versions.node);
console.log('type:', process.type);
console.log('resourcesPath:', process.resourcesPath);

// Try to find app in bindings
const bindings = ['electron_browser_app', 'electron_browser_main_internal', 'electron_main_app'];
for (const b of bindings) {
  try {
    const m = process._linkedBinding(b);
    console.log(b, ':', typeof m, Object.keys(m||{}).slice(0,3).join(','));
  } catch(e) {
    console.log(b, ': ERROR');
  }
}
process.exit(0);
