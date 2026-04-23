import './index.css';

interface PickerSource {
  idx: number;
  name: string;
  type: 'Screen' | 'Window';
  thumbnail: string;
}

declare global {
  interface Window {
    DisplayCapturePickerAPI: {
      getSources: () => Promise<PickerSource[]>;
      select: (idx: number | null) => void;
    };
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('picker-grid') as HTMLDivElement;
  const empty = document.getElementById('picker-empty') as HTMLParagraphElement;
  const shareBtn = document.getElementById('picker-share') as HTMLButtonElement;
  const cancelBtn = document.getElementById('picker-cancel') as HTMLButtonElement;

  let selectedIdx: number | null = null;

  const cancel = () => window.DisplayCapturePickerAPI.select(null);
  const commit = () => {
    if (selectedIdx !== null) window.DisplayCapturePickerAPI.select(selectedIdx);
  };

  cancelBtn.addEventListener('click', cancel);
  shareBtn.addEventListener('click', commit);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cancel();
    else if (e.key === 'Enter' && selectedIdx !== null) commit();
  });

  let sources: PickerSource[] = [];
  try {
    sources = await window.DisplayCapturePickerAPI.getSources();
  } catch (err) {
    console.error('Failed to fetch capture sources:', err);
  }

  if (sources.length === 0) {
    empty.hidden = false;
    return;
  }

  sources.forEach((source) => {
    const card = document.createElement('div');
    card.className = 'picker-source';
    card.setAttribute('role', 'option');
    card.tabIndex = 0;

    const img = document.createElement('img');
    img.className = 'picker-source-thumb';
    img.src = source.thumbnail;
    img.alt = '';

    const type = document.createElement('div');
    type.className = 'picker-source-type';
    type.textContent = source.type;

    const name = document.createElement('div');
    name.className = 'picker-source-name';
    name.title = source.name;
    name.textContent = source.name;

    card.appendChild(img);
    card.appendChild(type);
    card.appendChild(name);

    const pick = () => {
      selectedIdx = source.idx;
      grid
        .querySelectorAll('.picker-source.selected')
        .forEach((el) => el.classList.remove('selected'));
      card.classList.add('selected');
      shareBtn.disabled = false;
    };
    card.addEventListener('click', pick);
    card.addEventListener('dblclick', () => {
      pick();
      commit();
    });
    card.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        pick();
      }
    });
    grid.appendChild(card);
  });
});
