import './issue-report.css';
import { createIcons, icons } from 'lucide';

const WORKER_URL = 'https://nav0-issue-creation.100-percent-ketan.workers.dev';
const API_KEY = process.env.NAV0_ISSUE_API_KEY || '';
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

let containerEl: HTMLElement;
const attachedImages: AttachedImage[] = [];

const ISSUE_REPORT_HTML = `
  <div class="issue-report-overlay" id="ir-issue-report-overlay">
    <div class="issue-report-scrim" id="ir-issue-report-scrim"></div>
    <div class="issue-report-dialog" id="ir-issue-report-dialog" role="dialog" aria-modal="true" aria-labelledby="issue-report-title">

      <div class="issue-report-header">
        <i data-lucide="bug" width="16" height="16"></i>
        <span id="ir-issue-report-title">Report an Issue</span>
      </div>

      <div class="issue-report-body">
        <div class="form-group">
          <label class="form-label" for="ir-issue-title">Title</label>
          <input type="text" class="form-control" id="ir-issue-title" placeholder="Brief summary of the issue" maxlength="200" />
        </div>

        <div class="form-group">
          <label class="form-label" for="ir-issue-type">Type</label>
          <select class="form-control" id="ir-issue-type">
            <option value="bug">Bug Report</option>
            <option value="feature">Feature Request</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="ir-issue-description">Description</label>
          <textarea class="form-control" id="ir-issue-description" rows="5" placeholder="Describe the issue or suggestion in detail..."></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Attachments</label>
          <div class="attachment-area" id="ir-attachment-area">
            <label class="attachment-drop-zone" id="ir-attachment-drop-zone" for="ir-attachment-input">
              <i data-lucide="image-plus" width="20" height="20"></i>
              <span>Click to attach images (max 3, 5MB each)</span>
            </label>
            <input type="file" id="ir-attachment-input" accept="image/png,image/jpeg,image/gif,image/webp" multiple style="display:none;" />
            <div class="attachment-previews" id="ir-attachment-previews"></div>
          </div>
        </div>

        <div class="issue-report-sysinfo">
          <label class="form-label">System Info (auto-attached)</label>
          <div class="sysinfo-preview" id="ir-sysinfo-preview"></div>
        </div>
      </div>

      <div class="issue-report-status" id="ir-issue-report-status" style="display:none;"></div>

      <div class="issue-report-actions">
        <button id="ir-issue-cancel-btn" class="btn btn-secondary">Cancel</button>
        <button id="ir-issue-submit-btn" class="btn btn-primary">Submit</button>
      </div>

    </div>
  </div>
`;

async function getSystemInfo(): Promise<string> {
  const platform = window.BrowserAPI?.platform || navigator.platform;
  let electronVersion = 'unknown';
  let chromeVersion = 'unknown';
  try {
    const info = await window.BrowserAPI.getAboutInfo();
    electronVersion = info.electronVersion || 'unknown';
    chromeVersion = info.chromiumVersion || 'unknown';
  } catch {
    const userAgent = navigator.userAgent;
    const electronMatch = userAgent.match(/Electron\/([\d.]+)/);
    const chromeMatch = userAgent.match(/Chrome\/([\d.]+)/);
    electronVersion = electronMatch ? electronMatch[1] : 'unknown';
    chromeVersion = chromeMatch ? chromeMatch[1] : 'unknown';
  }
  const lines = [
    `Platform: ${platform}`,
    `Electron: ${electronVersion}`,
    `Chrome: ${chromeVersion}`,
  ];
  return lines.join('\n');
}

function closePanel(): void {
  window.BrowserAPI.hideIssueReport(window.BrowserAPI.appWindowId);
}

function showStatus(message: string, type: 'success' | 'error'): void {
  const statusEl = containerEl.querySelector('#ir-issue-report-status') as HTMLElement;
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = `issue-report-status ${type}`;
    statusEl.style.display = '';
  }
}

function showStatusWithLink(message: string, url: string): void {
  const statusEl = containerEl.querySelector('#ir-issue-report-status') as HTMLElement;
  if (statusEl) {
    statusEl.innerHTML = '';
    statusEl.className = 'issue-report-status success';
    statusEl.style.display = '';

    const text = document.createTextNode(message + ' ');
    statusEl.appendChild(text);

    const link = document.createElement('a');
    link.href = '#';
    link.textContent = 'View on GitHub';
    link.style.color = 'var(--success-color)';
    link.style.textDecoration = 'underline';
    link.style.fontWeight = '500';
    link.style.cursor = 'pointer';
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const appWindowId = window.BrowserAPI?.appWindowId;
      if (appWindowId) {
        window.BrowserAPI.createTab(appWindowId, url, true);
        closePanel();
      }
    });
    statusEl.appendChild(link);

    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy URL';
    copyBtn.className = 'issue-copy-url-btn';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(url).then(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = 'Copy URL';
        }, 2000);
      });
    });
    statusEl.appendChild(document.createTextNode(' '));
    statusEl.appendChild(copyBtn);
  }
}

function renderAttachmentPreviews(): void {
  const previewContainer = containerEl.querySelector('#ir-attachment-previews') as HTMLElement;
  if (!previewContainer) return;
  previewContainer.innerHTML = '';

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

    previewContainer.appendChild(wrapper);
  });

  // Update drop zone text
  const dropZone = containerEl.querySelector('#ir-attachment-drop-zone') as HTMLElement;
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
  const input = containerEl.querySelector('#ir-attachment-input') as HTMLInputElement;
  if (input) input.value = '';
}

function resetForm(): void {
  const titleInput = containerEl.querySelector('#ir-issue-title') as HTMLInputElement;
  const descInput = containerEl.querySelector('#ir-issue-description') as HTMLTextAreaElement;
  const typeSelect = containerEl.querySelector('#ir-issue-type') as HTMLSelectElement;
  const statusEl = containerEl.querySelector('#ir-issue-report-status') as HTMLElement;

  if (titleInput) titleInput.value = '';
  if (descInput) descInput.value = '';
  if (typeSelect) typeSelect.value = 'bug';
  if (statusEl) statusEl.style.display = 'none';

  // Clear attachments
  attachedImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
  attachedImages.length = 0;
  renderAttachmentPreviews();
}

async function submitIssue(): Promise<void> {
  const titleInput = containerEl.querySelector('#ir-issue-title') as HTMLInputElement;
  const descriptionInput = containerEl.querySelector(
    '#ir-issue-description'
  ) as HTMLTextAreaElement;
  const typeSelect = containerEl.querySelector('#ir-issue-type') as HTMLSelectElement;
  const submitBtn = containerEl.querySelector('#ir-issue-submit-btn') as HTMLButtonElement;

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

  const typeLabel =
    type === 'bug' ? 'Bug Report' : type === 'feature' ? 'Feature Request' : 'Other';

  const images = attachedImages.map((img) => ({
    name: img.name.replace(/\.[^.]+$/, '.jpg'),
    base64: img.base64,
    mimeType: img.mimeType,
  }));

  const sysInfo = await getSystemInfo();
  const body = `**Type:** ${typeLabel}\n\n**Description:**\n${description}\n\n---\n**System Info:**\n\`\`\`\n${sysInfo}\n\`\`\`\n\n*Submitted from Nav0 Browser in-app issue reporter*`;

  try {
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
      body: JSON.stringify({
        title: `[${typeLabel}] ${title}`,
        body,
        images,
      }),
    });

    let data: any = null;
    try {
      data = await response.json();
    } catch (_) {
      // response body wasn't JSON
    }

    if (response.ok) {
      // Reset form fields first (this hides status), then show the success message
      resetForm();
      const issueUrl = data?.issue_url;
      if (issueUrl) {
        showStatusWithLink('Issue submitted successfully!', issueUrl);
      } else {
        showStatus('Issue submitted successfully! Thank you for your feedback.', 'success');
      }
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

export function init(container: HTMLElement): void {
  containerEl = container;
  container.innerHTML = ISSUE_REPORT_HTML;

  // Populate system info preview
  const sysinfoEl = container.querySelector('#ir-sysinfo-preview') as HTMLElement;
  if (sysinfoEl) {
    getSystemInfo().then((info) => {
      sysinfoEl.textContent = info;
    });
  }

  // Attachment file input
  const attachmentInput = container.querySelector('#ir-attachment-input') as HTMLInputElement;
  attachmentInput?.addEventListener('change', () => {
    if (attachmentInput.files && attachmentInput.files.length > 0) {
      handleFiles(attachmentInput.files);
    }
  });

  // Prevent drop zone from opening when max reached
  const dropZone = container.querySelector('#ir-attachment-drop-zone') as HTMLLabelElement;
  dropZone?.addEventListener('click', (e) => {
    if (attachedImages.length >= MAX_ATTACHMENTS) {
      e.preventDefault();
      showStatus(`Maximum ${MAX_ATTACHMENTS} attachments allowed.`, 'error');
    }
  });

  // Button handlers
  container.querySelector('#ir-issue-submit-btn')?.addEventListener('click', submitIssue);
  container.querySelector('#ir-issue-cancel-btn')?.addEventListener('click', () => {
    resetForm();
    closePanel();
  });

  // Scrim click = close
  container.querySelector('#ir-issue-report-scrim')?.addEventListener('click', () => {
    resetForm();
    closePanel();
  });

  // Escape = close
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    // Only handle events when this panel is visible
    if (containerEl.hasAttribute('hidden')) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      resetForm();
      closePanel();
    }
  });
}

export function show(_data?: any): void {
  // Reset form on show
  resetForm();

  // Re-populate system info
  const sysinfoEl = containerEl.querySelector('#ir-sysinfo-preview') as HTMLElement;
  if (sysinfoEl) {
    getSystemInfo().then((info) => {
      sysinfoEl.textContent = info;
    });
  }

  // Re-create icons
  createIcons({ icons });

  // Focus title input
  setTimeout(() => {
    (containerEl.querySelector('#ir-issue-title') as HTMLInputElement)?.focus();
  }, 100);
}

export function hide(): void {
  // Nothing special needed on hide
}
