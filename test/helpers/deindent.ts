export default function deindent(strings: TemplateStringsArray) {
  let lines = strings[0].split('\n');
  let indent: string | null = null;

  for (let i = 0; i < lines.length && indent === null; i++) {
    let line = lines[i];
    if (line.length > 0) {
      let match = line.match(/^(\s*)/);
      if (match) { indent = match[1]; }
    }
  }

  lines = lines.map(line => {
    return line.replace(new RegExp(`^${indent}`), '');
  });

  return lines.join('\n').trim();
}