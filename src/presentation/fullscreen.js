export async function toggleFullscreen(element) {
  const activeElement = document.fullscreenElement || document.webkitFullscreenElement;
  if (activeElement) {
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    await exit.call(document);
    return false;
  }

  const request = element.requestFullscreen || element.webkitRequestFullscreen;
  if (!request) throw new Error('Fullscreen API no disponible');

  try {
    await request.call(element, { navigationUI: 'hide' });
  } catch (error) {
    if (error instanceof TypeError) await request.call(element);
    else throw error;
  }
  return true;
}

export function onFullscreenChange(callback) {
  const handler = () => {
    const element = document.fullscreenElement || document.webkitFullscreenElement;
    callback(Boolean(element), element);
  };
  document.addEventListener('fullscreenchange', handler);
  document.addEventListener('webkitfullscreenchange', handler);
  return () => {
    document.removeEventListener('fullscreenchange', handler);
    document.removeEventListener('webkitfullscreenchange', handler);
  };
}
