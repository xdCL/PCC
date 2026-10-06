import {
  getDocument,
  GlobalWorkerOptions,
  PasswordResponses,
} from 'pdfjs-dist';

GlobalWorkerOptions.workerSrc = new URL(
  `${import.meta.env.BASE_URL}pdf.worker.min.mjs`,
  window.location.href,
).href;

export class PdfLoadError extends Error {
  constructor(message, code = 'pdf-error', cause) {
    super(message, { cause });
    this.name = 'PdfLoadError';
    this.code = code;
  }
}

function looksLikePdf(bytes) {
  const sample = new TextDecoder('latin1').decode(bytes.slice(0, 1024));
  return sample.includes('%PDF-');
}

function isPdfFile(file) {
  return file?.type === 'application/pdf' || file?.name?.toLowerCase().endsWith('.pdf');
}

export async function loadPdfFile(file, { onPassword, onProgress } = {}) {
  if (!(file instanceof File)) {
    throw new PdfLoadError('Selecciona un archivo PDF válido.', 'invalid-file');
  }
  if (!isPdfFile(file)) {
    throw new PdfLoadError('El archivo seleccionado no es un PDF.', 'invalid-type');
  }
  if (file.size === 0) {
    throw new PdfLoadError('El archivo está vacío.', 'empty-file');
  }

  let bytes;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch (error) {
    throw new PdfLoadError('El navegador no pudo leer el archivo.', 'read-error', error);
  }

  if (!looksLikePdf(bytes)) {
    bytes.fill(0);
    throw new PdfLoadError('El archivo no contiene un documento PDF reconocible.', 'invalid-pdf');
  }

  const loadingTask = getDocument({
    data: bytes,
    isEvalSupported: false,
    useWorkerFetch: false,
  });

  let passwordCancelled = false;

  if (onProgress) {
    loadingTask.onProgress = ({ loaded, total }) => onProgress(loaded, total || file.size);
  }

  let passwordRequestPending = false;
  loadingTask.onPassword = (updatePassword, reason) => {
    if (passwordRequestPending) return;
    passwordRequestPending = true;

    Promise.resolve(onPassword?.({
      incorrect: reason === PasswordResponses.INCORRECT_PASSWORD,
    }))
      .then((password) => {
        passwordRequestPending = false;
        if (password === null || password === undefined) {
          passwordCancelled = true;
          loadingTask.destroy();
          return;
        }
        updatePassword(String(password));
      })
      .catch(() => {
        passwordRequestPending = false;
        loadingTask.destroy();
      });
  };

  try {
    const document = await loadingTask.promise;
    if (!document.numPages) {
      await document.destroy();
      throw new PdfLoadError('El PDF no contiene páginas.', 'empty-pdf');
    }
    return { document, loadingTask };
  } catch (error) {
    if (error instanceof PdfLoadError) throw error;
    if (passwordCancelled) {
      throw new PdfLoadError('La apertura del PDF fue cancelada.', 'cancelled', error);
    }
    const name = error?.name || '';
    if (name === 'PasswordException') {
      throw new PdfLoadError('No se pudo desbloquear el PDF.', 'password-error', error);
    }
    if (name === 'InvalidPDFException') {
      throw new PdfLoadError('El PDF está dañado o no es válido.', 'invalid-pdf', error);
    }
    if (name === 'MissingPDFException') {
      throw new PdfLoadError('No se pudo leer el PDF.', 'missing-pdf', error);
    }
    if (name === 'UnexpectedResponseException') {
      throw new PdfLoadError('PDF.js no pudo interpretar el documento.', 'pdf-response', error);
    }
    if (name === 'AbortException') {
      throw new PdfLoadError('La apertura del PDF fue cancelada.', 'cancelled', error);
    }
    throw new PdfLoadError('El PDF no pudo abrirse. Puede estar dañado o usar una función no compatible.', 'pdf-error', error);
  } finally {
    bytes = null;
  }
}
