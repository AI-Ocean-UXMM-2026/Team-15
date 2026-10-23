const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const locales=Object.fromEntries(['en','my'].map(code=>[code,JSON.parse(fs.readFileSync(path.join(root,'locales',code+'.json'),'utf8'))]));
fs.writeFileSync(path.join(root,'assets/locales.js'),'// Generated from locales/en.json and locales/my.json. English is the explicit fallback.\nwindow.INVENTO_LOCALES = '+JSON.stringify(locales)+';\n');
console.log(`Generated ${Object.keys(locales.en).length} English and ${Object.keys(locales.my).length} Myanmar keys.`);
