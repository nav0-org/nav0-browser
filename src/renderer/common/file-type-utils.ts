// File type display utilities — shared across renderer pages.

/** Color palette for file display types. */
export const TYPE_COLORS: Record<string, string> = {
  document: '#6366f1',
  spreadsheet: '#6366f1',
  presentation: '#6366f1',
  image: '#06b6d4',
  video: '#06b6d4',
  installer: '#f59e0b',
  archive: '#8b5cf6',
  audio: '#ec4899',
  code: '#10b981',
  other: '#a1a1aa',
};

/** Maps file extensions to a human-friendly display type. */
export const EXTENSION_TYPE_MAP: Record<string, string> = {
  // Documents
  pdf: 'document', doc: 'document', docx: 'document', txt: 'document',
  rtf: 'document', odt: 'document', md: 'document', pages: 'document',
  tex: 'document', latex: 'document', epub: 'document', mobi: 'document',
  djvu: 'document', xps: 'document', oxps: 'document', wp: 'document',
  wpd: 'document', wps: 'document', hwp: 'document', hwpx: 'document',
  log: 'document', nfo: 'document', readme: 'document',

  // Spreadsheets
  csv: 'spreadsheet', xlsx: 'spreadsheet', xls: 'spreadsheet',
  ods: 'spreadsheet', numbers: 'spreadsheet', tsv: 'spreadsheet',
  xlsm: 'spreadsheet', xlsb: 'spreadsheet', xltx: 'spreadsheet',

  // Presentations
  ppt: 'presentation', pptx: 'presentation', odp: 'presentation',
  pptm: 'presentation', key: 'presentation', ppsx: 'presentation',

  // Images
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', svg: 'image',
  bmp: 'image', webp: 'image', tiff: 'image', tif: 'image', ico: 'image',
  psd: 'image', ai: 'image', eps: 'image', raw: 'image', cr2: 'image',
  nef: 'image', orf: 'image', sr2: 'image', arw: 'image', dng: 'image',
  heic: 'image', heif: 'image', avif: 'image', jxl: 'image',
  xcf: 'image', sketch: 'image', fig: 'image', indd: 'image',

  // Audio
  mp3: 'audio', wav: 'audio', ogg: 'audio', flac: 'audio', aac: 'audio',
  m4a: 'audio', wma: 'audio', aiff: 'audio', opus: 'audio', mid: 'audio',
  midi: 'audio', ape: 'audio', alac: 'audio', dsf: 'audio', dff: 'audio',
  wv: 'audio', mka: 'audio', ac3: 'audio', dts: 'audio', pcm: 'audio',
  amr: 'audio', ra: 'audio', caf: 'audio',

  // Video
  mp4: 'video', mov: 'video', avi: 'video', mkv: 'video',
  wmv: 'video', flv: 'video', webm: 'video', m4v: 'video',
  mpg: 'video', mpeg: 'video', '3gp': 'video', '3g2': 'video',
  ts: 'video', mts: 'video', m2ts: 'video', vob: 'video',
  ogv: 'video', rm: 'video', rmvb: 'video', asf: 'video',
  divx: 'video', f4v: 'video', swf: 'video',

  // Archives
  zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive',
  gz: 'archive', bz2: 'archive', xz: 'archive', zst: 'archive',
  lz: 'archive', lzma: 'archive', lz4: 'archive', cab: 'archive',
  z: 'archive', tgz: 'archive', tbz2: 'archive', txz: 'archive',
  ace: 'archive', arj: 'archive', sit: 'archive', sitx: 'archive',
  war: 'archive', ear: 'archive', cpio: 'archive', shar: 'archive',

  // Disk images
  iso: 'installer', img: 'installer', dmg: 'installer', vhd: 'installer',
  vhdx: 'installer', vmdk: 'installer', qcow2: 'installer',

  // Installers / executables
  exe: 'installer', msi: 'installer', app: 'installer',
  pkg: 'installer', deb: 'installer', rpm: 'installer',
  snap: 'installer', flatpak: 'installer', appimage: 'installer',
  apk: 'installer', ipa: 'installer', xapk: 'installer', aab: 'installer',
  com: 'installer', gadget: 'installer',
  run: 'installer', bin: 'installer', bundle: 'installer',

  // Scripts / shell
  sh: 'code', bat: 'code', cmd: 'code', ps1: 'code', psm1: 'code',
  bash: 'code', zsh: 'code', fish: 'code', csh: 'code',

  // Code / programming
  py: 'code', js: 'code', jsx: 'code', mjs: 'code', cjs: 'code',
  tsx: 'code', json: 'code', xml: 'code',
  yaml: 'code', yml: 'code', toml: 'code', ini: 'code',
  cfg: 'code', conf: 'code', sql: 'code', dat: 'code',
  c: 'code', cpp: 'code', cc: 'code', cxx: 'code', h: 'code', hpp: 'code',
  java: 'code', kt: 'code', kts: 'code', scala: 'code', groovy: 'code',
  cs: 'code', fs: 'code', vb: 'code',
  go: 'code', rs: 'code', swift: 'code', m: 'code', mm: 'code',
  rb: 'code', pl: 'code', pm: 'code', php: 'code', phtml: 'code',
  lua: 'code', r: 'code', jl: 'code', dart: 'code', zig: 'code',
  nim: 'code', v: 'code', ex: 'code', exs: 'code', erl: 'code',
  hs: 'code', ml: 'code', clj: 'code', cljs: 'code', lisp: 'code',
  html: 'code', htm: 'code', css: 'code', scss: 'code', sass: 'code',
  less: 'code', vue: 'code', svelte: 'code',
  proto: 'code', graphql: 'code', gql: 'code', wasm: 'code',
  dockerfile: 'code', makefile: 'code', cmake: 'code',
  gradle: 'code', sbt: 'code', pom: 'code',

  // Fonts
  ttf: 'other', otf: 'other', woff: 'other', woff2: 'other', eot: 'other',

  // 3D / CAD
  stl: 'other', obj: 'other', fbx: 'other', gltf: 'other', glb: 'other',
  blend: 'other', dwg: 'other', dxf: 'other', step: 'other', stp: 'other',

  // Database
  db: 'other', sqlite: 'other', sqlite3: 'other', mdb: 'other', accdb: 'other',

  // Misc data
  ics: 'other', vcf: 'other', bak: 'other', tmp: 'other', crx: 'other',
  xpi: 'other', torrent: 'other', nzb: 'other',
};

/**
 * Get the display type for a file extension.
 * Accepts extensions with or without leading dot (e.g. ".pdf" or "pdf").
 */
export const getDisplayTypeFromExtension = (fileExtension: string): string => {
  const ext = fileExtension.startsWith('.')
    ? fileExtension.slice(1).toLowerCase()
    : fileExtension.toLowerCase();
  return EXTENSION_TYPE_MAP[ext] || 'other';
};

/** Get the type color for a display type. */
export const getTypeColor = (displayType: string): string => {
  return TYPE_COLORS[displayType] || TYPE_COLORS.other;
};

/** Convert hex color to rgba string. */
export const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/** Maps file extensions to Lucide icon names. */
const FILE_ICON_MAP: Record<string, string> = {
  // Documents - Text
  pdf: 'file-text', doc: 'file-text', docx: 'file-text', txt: 'file-text',
  rtf: 'file-text', odt: 'file-text', md: 'file-text', pages: 'file-text',
  tex: 'file-text', latex: 'file-text', epub: 'file-text', mobi: 'file-text',
  djvu: 'file-text', xps: 'file-text', oxps: 'file-text', wp: 'file-text',
  wpd: 'file-text', wps: 'file-text', hwp: 'file-text', hwpx: 'file-text',
  nfo: 'file-text', readme: 'file-text', log: 'file-text',

  // Spreadsheets
  csv: 'file-spreadsheet', xlsx: 'file-spreadsheet', xls: 'file-spreadsheet',
  ods: 'file-spreadsheet', numbers: 'file-spreadsheet', tsv: 'file-spreadsheet',
  xlsm: 'file-spreadsheet', xlsb: 'file-spreadsheet', xltx: 'file-spreadsheet',

  // Presentations
  ppt: 'file-presentation', pptx: 'file-presentation', odp: 'file-presentation',
  pptm: 'file-presentation', key: 'file-presentation', ppsx: 'file-presentation',

  // Images
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', svg: 'image',
  bmp: 'image', webp: 'image', tiff: 'image', tif: 'image', ico: 'image',
  psd: 'image', ai: 'image', eps: 'image', raw: 'image', cr2: 'image',
  nef: 'image', orf: 'image', sr2: 'image', arw: 'image', dng: 'image',
  heic: 'image', heif: 'image', avif: 'image', jxl: 'image',
  xcf: 'image', sketch: 'image', fig: 'image', indd: 'image',

  // Audio
  mp3: 'music', wav: 'music', ogg: 'music', flac: 'music', aac: 'music',
  m4a: 'music', wma: 'music', aiff: 'music', opus: 'music', mid: 'music',
  midi: 'music', ape: 'music', alac: 'music', dsf: 'music', dff: 'music',
  wv: 'music', mka: 'music', ac3: 'music', dts: 'music', pcm: 'music',
  amr: 'music', ra: 'music', caf: 'music',

  // Video
  mp4: 'video', mov: 'video', avi: 'video', mkv: 'video',
  wmv: 'video', flv: 'video', webm: 'video', m4v: 'video',
  mpg: 'video', mpeg: 'video', '3gp': 'video', '3g2': 'video',
  ts: 'video', mts: 'video', m2ts: 'video', vob: 'video',
  ogv: 'video', rm: 'video', rmvb: 'video', asf: 'video',
  divx: 'video', f4v: 'video', swf: 'video',

  // Archives
  zip: 'file-archive', rar: 'file-archive', '7z': 'file-archive',
  tar: 'file-archive', gz: 'file-archive', bz2: 'file-archive',
  xz: 'file-archive', zst: 'file-archive', iso: 'file-archive',
  lz: 'file-archive', lzma: 'file-archive', lz4: 'file-archive',
  cab: 'file-archive', z: 'file-archive', tgz: 'file-archive',
  tbz2: 'file-archive', txz: 'file-archive', ace: 'file-archive',
  arj: 'file-archive', sit: 'file-archive', sitx: 'file-archive',
  war: 'file-archive', ear: 'file-archive', cpio: 'file-archive',

  // Disk images
  img: 'disc', dmg: 'disc', vhd: 'disc', vhdx: 'disc',
  vmdk: 'disc', qcow2: 'disc',

  // Installers / executables
  exe: 'download', msi: 'download', app: 'download',
  pkg: 'download', deb: 'download', rpm: 'download',
  snap: 'download', flatpak: 'download', appimage: 'download',
  apk: 'download', ipa: 'download', xapk: 'download', aab: 'download',
  com: 'download', gadget: 'download', jar: 'download',
  run: 'download', bin: 'download', bundle: 'download',

  // Scripts / shell
  sh: 'terminal', bat: 'terminal', cmd: 'terminal', ps1: 'terminal',
  psm1: 'terminal', bash: 'terminal', zsh: 'terminal', fish: 'terminal',
  csh: 'terminal',

  // Code / programming
  py: 'code', js: 'code', jsx: 'code', mjs: 'code', cjs: 'code',
  tsx: 'code', c: 'code', cpp: 'code', cc: 'code', cxx: 'code',
  h: 'code', hpp: 'code', java: 'code', kt: 'code', kts: 'code',
  scala: 'code', groovy: 'code', cs: 'code', fs: 'code', vb: 'code',
  go: 'code', rs: 'code', swift: 'code', m: 'code', mm: 'code',
  rb: 'code', pl: 'code', pm: 'code', php: 'code', phtml: 'code',
  lua: 'code', r: 'code', jl: 'code', dart: 'code', zig: 'code',
  nim: 'code', v: 'code', ex: 'code', exs: 'code', erl: 'code',
  hs: 'code', ml: 'code', clj: 'code', cljs: 'code', lisp: 'code',
  vue: 'code', svelte: 'code', wasm: 'code',

  // Data / config / markup
  json: 'file-code', xml: 'file-code', yaml: 'file-code', yml: 'file-code',
  toml: 'file-code', proto: 'file-code', graphql: 'file-code', gql: 'file-code',
  html: 'file-code', htm: 'file-code', css: 'file-code', scss: 'file-code',
  sass: 'file-code', less: 'file-code',
  ini: 'settings', cfg: 'settings', conf: 'settings',
  dockerfile: 'file-code', makefile: 'file-code', cmake: 'file-code',
  gradle: 'file-code', sbt: 'file-code', pom: 'file-code',
  sql: 'database', dat: 'file',

  // Fonts
  ttf: 'type', otf: 'type', woff: 'type', woff2: 'type', eot: 'type',

  // 3D / CAD
  stl: 'box', obj: 'box', fbx: 'box', gltf: 'box', glb: 'box',
  blend: 'box', dwg: 'box', dxf: 'box', step: 'box', stp: 'box',

  // Database
  db: 'database', sqlite: 'database', sqlite3: 'database',
  mdb: 'database', accdb: 'database',
};

/**
 * Get the Lucide icon name for a file extension.
 * Accepts extensions with or without leading dot (e.g. ".pdf" or "pdf").
 */
export const getFileIcon = (fileExtension: string): string => {
  const ext = fileExtension.startsWith('.')
    ? fileExtension.slice(1).toLowerCase()
    : fileExtension.toLowerCase();
  return FILE_ICON_MAP[ext] || 'file';
};
