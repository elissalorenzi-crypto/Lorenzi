const PDFParser = require('pdf2json');
const parser = new PDFParser();
parser.on('pdfParser_dataReady', data => {
  const pages = data.Pages || [];
  pages.forEach((pg, pi) => {
    pg.Texts.forEach(t => {
      const s = decodeURIComponent(t.R.map(r => r.T).join(''));
      process.stdout.write(s + ' ');
    });
    process.stdout.write('\n--- PAGINA ' + (pi+1) + ' ---\n');
  });
});
parser.on('pdfParser_dataError', e => console.error(e));
parser.loadPDF('C:/Users/POSITIVO/Desktop/erro agenda cliente.pdf');
