// Fixed scenes for screenshots: ?shot=editor shows the page with sample photos
// loaded; ?shot=cover shows the cover alone, full frame. The query picks the
// layout, grade, size and caption. window.__shotReady is set once painted.
export async function runShot(shot, query, api) {
  const photos = await api.loadSamples();
  const statePatch = { photos };
  const layout = query.get('layout');
  if (layout) statePatch.layout = layout;
  const grade = query.get('grade');
  if (grade) statePatch.grade = grade;
  const size = query.get('size');
  if (size) statePatch.size = size;
  const title = query.get('title');
  if (title) statePatch.title = title;
  const subtitle = query.get('subtitle');
  if (subtitle) statePatch.subtitle = subtitle;
  const tagline = query.get('tagline');
  if (tagline) statePatch.tagline = tagline;
  const quote = query.get('quote');
  if (quote) statePatch.quote = quote;
  if (query.get('halftone') === '1') statePatch.halftone = true;
  api.setState(statePatch);
  api.spreadPhotos();
  api.syncControls();
  await document.fonts.ready;
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('100px Pacifico'),
    ]);
  } catch { /* fonts fall back to sans-serif if a load fails */ }
  if (shot === 'cover') document.body.classList.add('shot-cover');
  api.render();
  api.markReady();
}
