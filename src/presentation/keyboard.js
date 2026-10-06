import { isEditableTarget } from '../utils/helpers.js';

export function setupKeyboard(actions) {
  const handler = (event) => {
    if (!actions.isActive() || isEditableTarget(event.target)) return;

    const key = event.key;
    const lower = key.toLowerCase();
    let handled = true;

    if (['ArrowRight', 'ArrowDown', 'PageDown', 'Enter'].includes(key)) actions.next();
    else if (key === ' ' && event.shiftKey) actions.previous();
    else if (key === ' ') actions.next();
    else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(key)) actions.previous();
    else if (key === 'Home') actions.first();
    else if (key === 'End') actions.last();
    else if (lower === 'f') actions.present();
    else if (lower === 't') actions.toggleThumbnails();
    else if (lower === 'p') actions.togglePointer();
    else if (lower === 'b') actions.blank('black');
    else if (lower === 'w') actions.blank('white');
    else if (key === '0') actions.fitPage();
    else if (key === '+' || key === '=') actions.zoom(10);
    else if (key === '-' || key === '_') actions.zoom(-10);
    else handled = false;

    if (handled) {
      event.preventDefault();
      actions.revealControls();
    }
  };

  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}
