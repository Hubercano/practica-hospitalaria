const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.html')) {
                results.push(file);
            }
        }
    });
    return results;
}

const htmlFiles = walk('src/app');

htmlFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    // Fix PowerShell escaped dollar signs from earlier manual edits
    content = content.replace(/\\\$event/g, '$event');
    content = content.replace(/`\$event/g, '$event');
    
    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Fixed syntax in:', file);
    }
});
