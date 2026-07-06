import { readFileSync } from 'fs';
import pdf from 'pdf-parse/lib/pdf-parse.js';

const buf = readFileSync('ATVIDADES ORIENTAÇÃO PROFISSIONAL PRIMEIRA ESCOLHA.pdf');
const data = await pdf(buf);
console.log(data.text);
