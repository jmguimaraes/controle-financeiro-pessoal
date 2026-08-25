const fs = require('fs');
const path = require('path');

const dir = __dirname;
const shell = fs.readFileSync(path.join(dir, 'src', 'shell.html'), 'utf8');
const logic = fs.readFileSync(path.join(dir, 'src', 'logic.js'), 'utf8');
const i18n = fs.readFileSync(path.join(dir, 'src', 'i18n.js'), 'utf8');
const render = fs.readFileSync(path.join(dir, 'src', 'render.js'), 'utf8');
const app = fs.readFileSync(path.join(dir, 'src', 'app.js'), 'utf8');

const script = `<script>\n${logic}\n${i18n}\n${render}\n${app}\n</script>`;
const saida = shell.replace('<!-- SCRIPT_INJECT -->', script);

if (saida === shell) {
  throw new Error('Marcador <!-- SCRIPT_INJECT --> não encontrado em shell.html');
}

fs.mkdirSync(path.join(dir, 'dist'), { recursive: true });
fs.writeFileSync(path.join(dir, 'dist', 'index.html'), saida, 'utf8');
console.log('Gerado dist/index.html —', saida.length, 'bytes');
