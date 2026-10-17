const s = require('/app/zite.schema.json');
for (const t of s.tables) {
  console.log('### ' + t.name + '  sdk=' + t.sdkName);
  for (const f of t.fields) {
    const d = f.definition || {};
    let ty = d.type;
    if (d.template && d.template.options) ty += '(' + d.template.options.map((o) => o.label).join('|') + ')';
    if (d.template && d.template.allowedTypes) ty += ' allowed=' + d.template.allowedTypes.join('|');
    if (d.template && d.template.max) ty += ' max=' + d.template.max;
    console.log('   - ' + f.sdkName + ': ' + ty + (f.primary ? ' PK' : ''));
  }
  console.log('');
}
