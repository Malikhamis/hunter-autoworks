const fs = require('fs');
const path = require('path');

const adminDir = path.resolve(__dirname, '..', 'website', 'admin');

function getHtmlFiles(dir) {
  return fs.readdirSync(dir).filter(f => f.endsWith('.html')).map(f => path.join(dir, f));
}

function ensureLangAndDoctype(content) {
  // Ensure single doctype and <html lang="en">
  content = content.replace(/<!doctype html>\s*/i, '<!doctype html>\n');
  // Replace multiple <html ...> occurrences by a single <html lang="en"> on first
  content = content.replace(/<html[^>]*>/i, '<html lang="en">');
  return content;
}

function ensureHeadMetaAndLink(content) {
  const headMatch = content.match(/<head>[\s\S]*?<\/head>/i);
  if (!headMatch) return content;
  let head = headMatch[0];
  let changed = false;

  if (!/charset=['"]?utf-8['"]?/i.test(head)) {
    head = head.replace(/<head>/i, '<head>\n    <meta charset="utf-8">');
    changed = true;
  }
  if (!/name=["']viewport["']/i.test(head)) {
    head = head.replace(/<meta charset=[^>]*>/i, '$&\n    <meta name="viewport" content="width=device-width,initial-scale=1">');
    changed = true;
  }
  if (!/href=["']styles\.css["']/i.test(head)) {
    // add link before closing </head>
    head = head.replace(/<\/head>/i, '    <link rel="stylesheet" href="styles.css">\n</head>');
    changed = true;
  }

  if (changed) {
    content = content.replace(/<head>[\s\S]*?<\/head>/i, head);
  }
  return content;
}

function ensureAdminJsBeforeInline(content) {
  if (/src=["']admin\.js["']/i.test(content)) return content; // already present

  // find first inline <script> without src
  const inlineScriptMatch = content.match(/<script(?![^>]*src)[^>]*>/i);
  if (inlineScriptMatch) {
    const idx = inlineScriptMatch.index;
    // insert admin.js just before this inline script
    content = content.slice(0, idx) + '    <script src="admin.js"></script>\n' + content.slice(idx);
  } else {
    // fallback: insert before closing </body>
    content = content.replace(/<\/body>/i, '    <script src="admin.js"></script>\n</body>');
  }
  return content;
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  content = ensureLangAndDoctype(content);
  content = ensureHeadMetaAndLink(content);
  content = ensureAdminJsBeforeInline(content);

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

function main() {
  const files = getHtmlFiles(adminDir);
  const changed = [];
  files.forEach(f => {
    try {
      if (processFile(f)) changed.push(path.basename(f));
    } catch (e) {
      console.error('Error processing', f, e.message);
    }
  });

  if (changed.length) {
    console.log('Updated files:', changed.join(', '));
  } else {
    console.log('No changes needed');
  }
}

if (require.main === module) main();
