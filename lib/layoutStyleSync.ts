const ELEMENT_STYLE_FIELDS = [
  'x', 'y', 'w', 'h',
  'fontSize', 'fontWeight', 'line_pitch', 'textAlign',
] as const;

/**
 * Copy EN geometry and typography into another language while preserving
 * localized text, assets, frame backgrounds, and language metadata.
 */
export function applyEnglishStyle(source: any, target: any): any {
  const next = JSON.parse(JSON.stringify(target));
  if (source?.font_family) next.font_family = source.font_family;

  Object.entries(source?.frames || {}).forEach(([fid, sourceFrame]: [string, any]) => {
    const targetFrame = next.frames?.[fid];
    if (!targetFrame?.elements) return;

    Object.entries(sourceFrame?.elements || {}).forEach(([eid, sourceElement]: [string, any]) => {
      const targetElement = targetFrame.elements[eid];
      if (!targetElement) return;

      const style: Record<string, unknown> = {};
      ELEMENT_STYLE_FIELDS.forEach((field) => {
        if (sourceElement[field] !== undefined) style[field] = sourceElement[field];
        else delete targetElement[field];
      });
      targetFrame.elements[eid] = { ...targetElement, ...style };
    });
  });

  next._style_source = 'en';
  next._style_synced_at = new Date().toISOString();
  return next;
}
