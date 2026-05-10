import { app, dialog } from 'electron';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const MAC_SYMLINK_PATH = '/usr/local/bin/nav0';

// Windows: drop nav0.cmd in %LocalAppData%\Microsoft\WindowsApps which is on
// user PATH by default on Windows 10/11. The cmd shim re-invokes the running
// binary (or the Squirrel-managed stub) with the original argv.
function getWindowsCmdPath(): string {
  const localAppData =
    process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Local');
  return path.join(localAppData, 'Microsoft', 'WindowsApps', 'nav0.cmd');
}

function escapeForAppleScript(value: string): string {
  // The string lives inside a double-quoted shell command, which itself lives
  // inside a single-quoted AppleScript expression. Escape backslashes and the
  // shell's double quotes; AppleScript single quotes pass through fine.
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildWindowsCmdContents(exePath: string): string {
  // %~dp0 isn't useful here because the cmd lives outside the install dir.
  // Hard-coding the resolved exe path is fine — Squirrel updates rewrite the
  // versioned dir, but `app.getPath('exe')` at install time points to the
  // current binary; user re-runs install after major updates if needed.
  return ['@echo off', 'setlocal', `start "" "${exePath}" %*`, 'endlocal', ''].join('\r\n');
}

export interface InstallResult {
  ok: boolean;
  path?: string;
  error?: string;
}

export abstract class CLIInstaller {
  static isSupported(): boolean {
    return process.platform === 'darwin' || process.platform === 'win32';
  }

  static getInstallPath(): string | null {
    if (process.platform === 'darwin') return MAC_SYMLINK_PATH;
    if (process.platform === 'win32') return getWindowsCmdPath();
    return null;
  }

  static isInstalled(): boolean {
    if (process.platform === 'darwin') {
      try {
        const stat = fs.lstatSync(MAC_SYMLINK_PATH);
        if (!stat.isSymbolicLink()) return false;
        return fs.readlinkSync(MAC_SYMLINK_PATH) === app.getPath('exe');
      } catch {
        return false;
      }
    }
    if (process.platform === 'win32') {
      return fs.existsSync(getWindowsCmdPath());
    }
    return false;
  }

  static async install(): Promise<InstallResult> {
    if (process.platform === 'darwin') return CLIInstaller.installMac();
    if (process.platform === 'win32') return CLIInstaller.installWindows();
    return { ok: false, error: `Unsupported platform: ${process.platform}` };
  }

  static async uninstall(): Promise<InstallResult> {
    if (process.platform === 'darwin') return CLIInstaller.uninstallMac();
    if (process.platform === 'win32') return CLIInstaller.uninstallWindows();
    return { ok: false, error: `Unsupported platform: ${process.platform}` };
  }

  private static async installMac(): Promise<InstallResult> {
    const exePath = app.getPath('exe');
    const dir = path.dirname(MAC_SYMLINK_PATH);

    const tryDirect = (): InstallResult => {
      try {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        try {
          fs.unlinkSync(MAC_SYMLINK_PATH);
        } catch {
          /* ignore — file may not exist */
        }
        fs.symlinkSync(exePath, MAC_SYMLINK_PATH);
        return { ok: true, path: MAC_SYMLINK_PATH };
      } catch (err) {
        const e = err as NodeJS.ErrnoException;
        if (e.code === 'EACCES' || e.code === 'EPERM' || e.code === 'EROFS') {
          return { ok: false, error: e.code };
        }
        return { ok: false, error: e.message };
      }
    };

    const result = tryDirect();
    if (result.ok) return result;
    if (result.error !== 'EACCES' && result.error !== 'EPERM' && result.error !== 'EROFS') {
      return result;
    }

    // Re-attempt with admin privileges via osascript.
    const innerCmd = `mkdir -p "${dir}" && ln -sf "${exePath}" "${MAC_SYMLINK_PATH}"`;
    return CLIInstaller.runWithMacAdmin(innerCmd, MAC_SYMLINK_PATH);
  }

  private static async uninstallMac(): Promise<InstallResult> {
    try {
      if (!fs.existsSync(MAC_SYMLINK_PATH)) return { ok: true };
      fs.unlinkSync(MAC_SYMLINK_PATH);
      return { ok: true };
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code !== 'EACCES' && e.code !== 'EPERM') {
        return { ok: false, error: e.message };
      }
    }
    return CLIInstaller.runWithMacAdmin(`rm -f "${MAC_SYMLINK_PATH}"`);
  }

  private static runWithMacAdmin(innerCmd: string, resolvedPath?: string): Promise<InstallResult> {
    const escapedCmd = escapeForAppleScript(innerCmd);
    const prompt = 'Nav0 needs administrator access to install the nav0 command line tool.';
    const escapedPrompt = escapeForAppleScript(prompt);
    const script = `do shell script "${escapedCmd}" with prompt "${escapedPrompt}" with administrator privileges`;
    return new Promise((resolve) => {
      exec(`osascript -e '${script.replace(/'/g, "'\\''")}'`, (err) => {
        if (err) {
          // err.message already includes osascript's stderr (e.g. "User canceled.")
          resolve({ ok: false, error: err.message });
        } else {
          resolve({ ok: true, path: resolvedPath });
        }
      });
    });
  }

  private static async installWindows(): Promise<InstallResult> {
    const cmdPath = getWindowsCmdPath();
    const exePath = app.getPath('exe');
    try {
      const dir = path.dirname(cmdPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(cmdPath, buildWindowsCmdContents(exePath), 'utf8');
      return { ok: true, path: cmdPath };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  private static async uninstallWindows(): Promise<InstallResult> {
    const cmdPath = getWindowsCmdPath();
    try {
      if (fs.existsSync(cmdPath)) fs.unlinkSync(cmdPath);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }
}

function showMessageBox(
  parentWindow: Electron.BrowserWindow | undefined,
  options: Electron.MessageBoxOptions
): Promise<Electron.MessageBoxReturnValue> {
  return parentWindow
    ? dialog.showMessageBox(parentWindow, options)
    : dialog.showMessageBox(options);
}

export async function showInstallCLIDialog(parentWindow?: Electron.BrowserWindow): Promise<void> {
  if (!CLIInstaller.isSupported()) {
    await showMessageBox(parentWindow, {
      type: 'info',
      message: 'Command line tool',
      detail:
        process.platform === 'linux'
          ? 'On Linux, the nav0 command is installed automatically with the deb / rpm package.'
          : `Installing the nav0 command from inside the app isn't supported on ${process.platform}.`,
      buttons: ['OK'],
    });
    return;
  }

  const installPath = CLIInstaller.getInstallPath() ?? '';
  const alreadyInstalled = CLIInstaller.isInstalled();

  const response = await showMessageBox(parentWindow, {
    type: 'question',
    message: alreadyInstalled
      ? "The 'nav0' command is already installed."
      : "Install the 'nav0' command in PATH?",
    detail: alreadyInstalled
      ? `Currently installed at:\n${installPath}\n\nYou can update it (re-point at the current Nav0 binary) or remove it.`
      : `This will install a small shim at:\n${installPath}\n\nAfter that, you can run "nav0 -p -u https://example.com" from any terminal.`,
    buttons: alreadyInstalled ? ['Update', 'Uninstall', 'Cancel'] : ['Install', 'Cancel'],
    defaultId: 0,
    cancelId: alreadyInstalled ? 2 : 1,
  });

  if (alreadyInstalled) {
    if (response.response === 2) return;
    if (response.response === 1) {
      const result = await CLIInstaller.uninstall();
      await reportResult(parentWindow, 'uninstall', result);
      return;
    }
  } else if (response.response === 1) {
    return;
  }

  const result = await CLIInstaller.install();
  await reportResult(parentWindow, 'install', result);
}

async function reportResult(
  parentWindow: Electron.BrowserWindow | undefined,
  action: 'install' | 'uninstall',
  result: InstallResult
): Promise<void> {
  if (result.ok) {
    await showMessageBox(parentWindow, {
      type: 'info',
      message: action === 'install' ? "'nav0' command installed" : "'nav0' command removed",
      detail:
        action === 'install' && result.path
          ? `${result.path} is now on your PATH.\n\nTry: nav0 -p -u https://example.com`
          : undefined,
      buttons: ['OK'],
    });
  } else {
    await showMessageBox(parentWindow, {
      type: 'error',
      message: action === 'install' ? "Couldn't install 'nav0'" : "Couldn't remove 'nav0'",
      detail: result.error,
      buttons: ['OK'],
    });
  }
}
