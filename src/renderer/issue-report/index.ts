import './index.css';
import { initTheme } from '../common/theme';
import { createIcons, icons } from 'lucide';

initTheme();

const WORKER_URL = 'https://nav0-issue-creation.100-percent-ketan.workers.dev';
const MAX_ATTACHMENTS = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGE_DIMENSION = 1280; // max width or height in pixels
const JPEG_QUALITY = 0.8;

interface AttachedImage {
  name: string;
  base64: string; // base64 without data URI prefix
  mimeType: string;
  previewUrl: string;
}

const attachedImages: AttachedImage[] = [];

function getSystemInfo(): string {
  const platform = (window as any).BrowserAPI?.platform || navigator.platform;
  const userAgent = navigator.userAgent;
  const electronMatch = userAgent.match(/Electron\/([\d.]+)/);
  const chromeMatch = userAgent.match(/Chrome\/([\d.]+)/);
  const lines = [
    `Platform: ${platform}`,
    `Electron: ${electronMatch ? electronMatch[1] : 'unknown'}`,
    `Chrome: ${chromeMatch ? chromeMatch[1] : 'unknown'}`,
  ];
  return lines.join('\n');
}

function close(): void {
  (window as any).BrowserAPI.hideIssueReport((window as any).BrowserAPI.appWindowId);
}

function showStatus(message: string, type: 'success' | 'error'): void {
  const statusEl = document.getElementById('issue-report-status');
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = `issue-report-status ${type}`;
    statusEl.style.display = '';
  }
}

function renderAttachmentPreviews(): void {
  const container = document.getElementById('attachment-previews');
  if (!container) return;
  container.innerHTML = '';

  attachedImages.forEach((img, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'attachment-preview';

    const imgEl = document.createElement('img');
    imgEl.src = img.previewUrl;
    imgEl.alt = img.name;
    wrapper.appendChild(imgEl);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'attachment-remove';
    removeBtn.textContent = '\u00d7';
    removeBtn.title = 'Remove';
    removeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      URL.revokeObjectURL(img.previewUrl);
      attachedImages.splice(index, 1);
      renderAttachmentPreviews();
    });
    wrapper.appendChild(removeBtn);

    container.appendChild(wrapper);
  });

  // Update drop zone text
  const dropZone = document.getElementById('attachment-drop-zone') as HTMLElement;
  if (dropZone) {
    const span = dropZone.querySelector('span');
    if (span) {
      if (attachedImages.length >= MAX_ATTACHMENTS) {
        span.textContent = 'Maximum attachments reached';
      } else {
        span.textContent = `Click to attach images (${attachedImages.length}/${MAX_ATTACHMENTS})`;
      }
    }
  }
}

function resizeAndCompressImage(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Downscale if either dimension exceeds the limit
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        if (width > height) {
          height = Math.round(height * (MAX_IMAGE_DIMENSION / width));
          width = MAX_IMAGE_DIMENSION;
        } else {
          width = Math.round(width * (MAX_IMAGE_DIMENSION / height));
          height = MAX_IMAGE_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Always output as JPEG for smaller size (unless it's a PNG with transparency needs — but for issue screenshots JPEG is fine)
      const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
      const base64 = dataUrl.split(',')[1];
      resolve({ base64, mimeType: 'image/jpeg' });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load image: ${file.name}`));
    };

    img.src = objectUrl;
  });
}

async function handleFiles(files: FileList): Promise<void> {
  for (let i = 0; i < files.length; i++) {
    if (attachedImages.length >= MAX_ATTACHMENTS) {
      showStatus(`Maximum ${MAX_ATTACHMENTS} attachments allowed.`, 'error');
      break;
    }

    const file = files[i];

    if (!file.type.startsWith('image/')) {
      showStatus(`"${file.name}" is not an image file.`, 'error');
      continue;
    }

    if (file.size > MAX_FILE_SIZE) {
      showStatus(`"${file.name}" exceeds 5MB size limit.`, 'error');
      continue;
    }

    const { base64, mimeType } = await resizeAndCompressImage(file);
    const previewUrl = URL.createObjectURL(file);
    attachedImages.push({
      name: file.name,
      base64,
      mimeType,
      previewUrl,
    });
  }

  renderAttachmentPreviews();
  // Clear the file input so the same file can be re-selected
  const input = document.getElementById('attachment-input') as HTMLInputElement;
  if (input) input.value = '';
}

function resetForm(): void {
  (document.getElementById('issue-title') as HTMLInputElement).value = '';
  (document.getElementById('issue-description') as HTMLTextAreaElement).value = '';
  (document.getElementById('issue-type') as HTMLSelectElement).value = 'bug';
  const statusEl = document.getElementById('issue-report-status');
  if (statusEl) statusEl.style.display = 'none';
  // Clear attachments
  attachedImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
  attachedImages.length = 0;
  renderAttachmentPreviews();
}

async function submitIssue(): Promise<void> {
  const titleInput = document.getElementById('issue-title') as HTMLInputElement;
  const descriptionInput = document.getElementById('issue-description') as HTMLTextAreaElement;
  const typeSelect = document.getElementById('issue-type') as HTMLSelectElement;
  const submitBtn = document.getElementById('issue-submit-btn') as HTMLButtonElement;

  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();
  const type = typeSelect.value;

  if (!title) {
    showStatus('Please enter a title.', 'error');
    titleInput.focus();
    return;
  }

  if (!description) {
    showStatus('Please enter a description.', 'error');
    descriptionInput.focus();
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  const typeLabel = type === 'bug' ? 'Bug Report' : type === 'feature' ? 'Feature Request' : 'Other';

  const images = attachedImages.map(img => ({
    name: img.name,
    base64: img.base64,
    mimeType: img.mimeType,
  }));

  const body = `**Type:** ${typeLabel}\n\n**Description:**\n${description}\n\n---\n**System Info:**\n\`\`\`\n${getSystemInfo()}\n\`\`\`\n\n*Submitted from Nav0 Browser in-app issue reporter*`;

  try {
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `[${typeLabel}] ${title}`,
        body,
        images,
      }),
    });

    const data = await response.json().catch(() => null);

    if (response.ok) {
      showStatus('Issue submitted successfully! Thank you for your feedback.', 'success');
      resetForm();
      setTimeout(() => close(), 2000);
    } else {
      const errorMsg = data?.error || data?.message || `Server error (${response.status})`;
      showStatus(`Failed to submit: ${errorMsg}`, 'error');
    }
  } catch (err) {
    showStatus('Network error. Please check your connection and try again.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  createIcons({ icons });

  // Populate system info preview
  const sysinfoEl = document.getElementById('sysinfo-preview');
  if (sysinfoEl) {
    sysinfoEl.textContent = getSystemInfo();
  }

  // Attachment file input
  const attachmentInput = document.getElementById('attachment-input') as HTMLInputElement;
  attachmentInput?.addEventListener('change', () => {
    if (attachmentInput.files && attachmentInput.files.length > 0) {
      handleFiles(attachmentInput.files);
    }
  });

  // Prevent drop zone from opening when max reached
  const dropZone = document.getElementById('attachment-drop-zone') as HTMLLabelElement;
  dropZone?.addEventListener('click', (e) => {
    if (attachedImages.length >= MAX_ATTACHMENTS) {
      e.preventDefault();
      showStatus(`Maximum ${MAX_ATTACHMENTS} attachments allowed.`, 'error');
    }
  });

  // Button handlers
  document.getElementById('issue-submit-btn')?.addEventListener('click', submitIssue);
  document.getElementById('issue-cancel-btn')?.addEventListener('click', () => {
    resetForm();
    close();
  });

  // Scrim click = close
  document.getElementById('issue-report-scrim')?.addEventListener('click', () => {
    resetForm();
    close();
  });

  // Escape = close
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      resetForm();
      close();
    }
  });

  // Focus title input on open
  setTimeout(() => {
    (document.getElementById('issue-title') as HTMLInputElement)?.focus();
  }, 100);
});
