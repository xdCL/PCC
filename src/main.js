import './styles/tokens.css';
import './styles/main.css';
import { loadPdfFile, PdfLoadError } from './pdf/pdf-loader.js';
import { PresentationController } from './presentation/presentation.js';
import { Dialogs } from './ui/dialogs.js';
import { loadLocalFonts } from './ui/fonts.js';

void loadLocalFonts();

const dialogs = new Dialogs();
const fileInput = document.querySelector('#file-input');
const selectButton = document.querySelector('#select-file-button');
const dropZone = document.querySelector('#drop-zone');
let loadGeneration = 0;

const presentation = new PresentationController({
  dialogs,
  onOpenFile: () => fileInput.click(),
});

function chooseFile() {
  fileInput.click();
}

async function openFile(file) {
  if (!file) return;
  const generation = ++loadGeneration;
  const originalButtonText = selectButton.textContent;
  selectButton.disabled = true;
  selectButton.textContent = 'Abriendo…';
  dropZone.classList.add('is-loading');
  if (presentation.active) presentation.setLoading(true, 'Abriendo documento…');

  if (file.size > 250 * 1024 * 1024) {
    dialogs.toast('Es un archivo grande. La apertura inicial puede tardar un poco.', 5000);
  }

  try {
    const { document: pdfDocument } = await loadPdfFile(file, {
      onPassword: (state) => dialogs.requestPassword(state),
      onProgress: (loaded, total) => {
        if (generation !== loadGeneration || !total) return;
        const progress = Math.min(99, Math.round((loaded / total) * 100));
        const message = progress > 1 ? `Leyendo PDF… ${progress}%` : 'Leyendo PDF…';
        selectButton.textContent = message;
        if (presentation.active) presentation.setLoading(true, message);
      },
    });

    if (generation !== loadGeneration) {
      await pdfDocument.destroy();
      return;
    }
    await presentation.open(pdfDocument, file);
  } catch (error) {
    if (generation !== loadGeneration) return;
    console.error(error);
    const message = error instanceof PdfLoadError
      ? error.message
      : 'No se pudo abrir el archivo. Comprueba que sea un PDF válido.';
    if (error?.code !== 'cancelled') dialogs.error(message);
  } finally {
    if (generation === loadGeneration) {
      selectButton.disabled = false;
      selectButton.textContent = originalButtonText;
      dropZone.classList.remove('is-loading', 'is-dragging');
      presentation.setLoading(false);
      fileInput.value = '';
    }
  }
}

selectButton.addEventListener('click', (event) => {
  event.stopPropagation();
  chooseFile();
});

dropZone.addEventListener('click', (event) => {
  if (event.target !== selectButton) chooseFile();
});

dropZone.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    chooseFile();
  }
});

fileInput.addEventListener('change', () => void openFile(fileInput.files?.[0]));

let dragDepth = 0;
window.addEventListener('dragenter', (event) => {
  if (!event.dataTransfer?.types.includes('Files')) return;
  event.preventDefault();
  dragDepth += 1;
  dropZone.classList.add('is-dragging');
});

window.addEventListener('dragover', (event) => {
  if (!event.dataTransfer?.types.includes('Files')) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
});

window.addEventListener('dragleave', (event) => {
  if (!event.dataTransfer?.types.includes('Files')) return;
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) dropZone.classList.remove('is-dragging');
});

window.addEventListener('drop', (event) => {
  event.preventDefault();
  dragDepth = 0;
  dropZone.classList.remove('is-dragging');
  const file = [...(event.dataTransfer?.files || [])].find(
    (candidate) => candidate.type === 'application/pdf' || candidate.name.toLowerCase().endsWith('.pdf'),
  );
  if (!file) {
    dialogs.error('Suelta un archivo con extensión .pdf.');
    return;
  }
  void openFile(file);
});

window.addEventListener('beforeunload', () => presentation.destroy());
