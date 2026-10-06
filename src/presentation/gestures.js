export function setupGestures(element, { next, previous }) {
  let start = null;

  const onStart = (event) => {
    if (event.pointerType === 'mouse' || event.target.closest('button, input, nav')) return;
    start = { x: event.clientX, y: event.clientY, id: event.pointerId };
  };

  const onEnd = (event) => {
    if (!start || event.pointerId !== start.id) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    start = null;
    if (Math.abs(deltaX) < 58 || Math.abs(deltaX) < Math.abs(deltaY) * 1.35) return;
    if (deltaX < 0) next();
    else previous();
  };

  const cancel = () => { start = null; };
  element.addEventListener('pointerdown', onStart);
  element.addEventListener('pointerup', onEnd);
  element.addEventListener('pointercancel', cancel);

  return () => {
    element.removeEventListener('pointerdown', onStart);
    element.removeEventListener('pointerup', onEnd);
    element.removeEventListener('pointercancel', cancel);
  };
}
