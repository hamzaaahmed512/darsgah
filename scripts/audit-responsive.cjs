// Read-only inventory of rendered JSX, including secondary routes and nested components.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : /\.tsx$/.test(e.name) && !e.name.includes('.test.') ? [path.join(dir, e.name)] : []);
}
const inventory = files('src').map(file => {
  const source = fs.readFileSync(file, 'utf8');
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const classes = [], tables = [], dialogs = [];
  function visit(n) {
    if (ts.isJsxAttribute(n) && n.name.getText(tree) === 'className') classes.push(n.initializer?.getText(tree) || '');
    if (ts.isJsxElement(n)) {
      const line = tree.getLineAndCharacterOfPosition(n.getStart()).line + 1;
      const tag = n.openingElement.tagName.getText(tree);
      if (tag === 'table') {
        let parent = n.parent, wrapped = false;
        while (parent) {
          if (ts.isJsxElement(parent) && /overflow-(x-auto|auto)|table-scroll/.test(parent.openingElement.getText(tree))) wrapped = true;
          parent = parent.parent;
        }
        tables.push({line, wrapped});
      }
      if (/fixed inset-0/.test(n.openingElement.getText(tree))) dialogs.push({line, panel: n.children.filter(ts.isJsxElement).map(c => c.openingElement.getText(tree)).join(' ')});
    }
    ts.forEachChild(n, visit);
  }
  visit(tree);
  return {file: file.replaceAll('\\', '/'), classes, tables, dialogs};
});
if (process.argv.includes('--json')) console.log(JSON.stringify(inventory, null, 2));
else for (const item of inventory) console.log(JSON.stringify({file:item.file, layouts:item.classes.filter(c=>/grid-cols|flex-(row|col|wrap)|min-w-|w-\[|overflow-/.test(c)),tables:item.tables,dialogs:item.dialogs}));
