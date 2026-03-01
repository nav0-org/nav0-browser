import type { WebContents } from "electron";
// Imported as raw source strings via webpack asset/source rule
import readabilitySource from "@mozilla/readability/Readability.js";
import readabilityReadableSource from "@mozilla/readability/Readability-readerable.js";

export interface ReaderArticle {
  title: string;
  byline: string;
  content: string;
  siteName: string;
  excerpt: string;
  publishedTime: string;
}

export interface ReaderModeState {
  isEligible: boolean;
  isActive: boolean;
  cachedArticle: ReaderArticle | null;
  insertedCSSKey: string | null;
  savedScrollPosition: number;
}

export class ReaderModeManager {
  static createState(): ReaderModeState {
    return {
      isEligible: false,
      isActive: false,
      cachedArticle: null,
      insertedCSSKey: null,
      savedScrollPosition: 0,
    };
  }

  static async checkEligibility(webContents: WebContents): Promise<boolean> {
    try {
      const script =
        "(function() {" +
        "var module = { exports: {} };" +
        readabilityReadableSource +
        "var isProbablyReaderable = module.exports;" +
        "return isProbablyReaderable(document);" +
        "})()";
      return await webContents.executeJavaScript(script);
    } catch {
      return false;
    }
  }

  static async extractContent(webContents: WebContents): Promise<ReaderArticle | null> {
    try {
      const script =
        "(function() {" +
        "var module = { exports: {} };" +
        readabilitySource +
        "var Readability = module.exports;" +
        "var article = new Readability(document.cloneNode(true)).parse();" +
        "return article ? {" +
        "  title: article.title || ''," +
        "  byline: article.byline || ''," +
        "  content: article.content || ''," +
        "  siteName: article.siteName || ''," +
        "  excerpt: article.excerpt || ''," +
        "  publishedTime: article.publishedTime || ''" +
        "} : null;" +
        "})()";
      return await webContents.executeJavaScript(script);
    } catch {
      return null;
    }
  }

  static async activate(webContents: WebContents, article: ReaderArticle): Promise<string | null> {
    try {
      const cssKey = await webContents.insertCSS(ReaderModeManager.getReaderCSS());
      const articleJSON = JSON.stringify(article);
      await webContents.executeJavaScript(
        "(function() {" +
        "window.__nav0ReaderModeScrollPos = window.scrollY;" +
        "var children = document.body.children;" +
        "for (var i = 0; i < children.length; i++) {" +
        "  children[i].setAttribute('data-nav0-reader-hidden', '');" +
        "  children[i].style.setProperty('display', 'none', 'important');" +
        "}" +
        "var article = " + articleJSON + ";" +
        "var container = document.createElement('div');" +
        "container.id = 'nav0-reader-mode';" +
        "container.style.opacity = '0';" +
        "var meta = '';" +
        "if (article.byline) meta += '<span class=\"nav0-reader-byline\">' + article.byline + '</span>';" +
        "if (article.siteName) meta += '<span class=\"nav0-reader-site\">' + article.siteName + '</span>';" +
        "if (article.publishedTime) {" +
        "  try { var d = new Date(article.publishedTime); if (!isNaN(d.getTime())) meta += '<span class=\"nav0-reader-date\">' + d.toLocaleDateString(undefined, {year:'numeric',month:'long',day:'numeric'}) + '</span>'; }" +
        "  catch(e) {}" +
        "}" +
        "container.innerHTML = " +
        "  '<article class=\"nav0-reader-article\">' +" +
        "  '<header class=\"nav0-reader-header\">' +" +
        "  '<h1 class=\"nav0-reader-title\">' + article.title + '</h1>' +" +
        "  (meta ? '<div class=\"nav0-reader-meta\">' + meta + '</div>' : '') +" +
        "  '</header>' +" +
        "  '<div class=\"nav0-reader-content\">' + article.content + '</div>' +" +
        "  '</article>';" +
        "document.body.appendChild(container);" +
        "window.scrollTo(0, 0);" +
        "requestAnimationFrame(function() {" +
        "  container.style.transition = 'opacity 0.3s ease';" +
        "  container.style.opacity = '1';" +
        "});" +
        "})()"
      );
      return cssKey;
    } catch {
      return null;
    }
  }

  static async deactivate(webContents: WebContents, cssKey: string | null): Promise<void> {
    try {
      await webContents.executeJavaScript(
        "(function() {" +
        "var container = document.getElementById('nav0-reader-mode');" +
        "if (container) container.remove();" +
        "var hidden = document.querySelectorAll('[data-nav0-reader-hidden]');" +
        "for (var i = 0; i < hidden.length; i++) {" +
        "  hidden[i].removeAttribute('data-nav0-reader-hidden');" +
        "  hidden[i].style.removeProperty('display');" +
        "}" +
        "window.scrollTo(0, window.__nav0ReaderModeScrollPos || 0);" +
        "})()"
      );
      if (cssKey) {
        await webContents.removeInsertedCSS(cssKey);
      }
    } catch {
      // Page may have navigated away
    }
  }

  private static getReaderCSS(): string {
    return `
      #nav0-reader-mode {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 2147483647;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }

      /* Light mode (default) */
      #nav0-reader-mode {
        background-color: #faf9f6;
        color: #1a1a1a;
      }
      #nav0-reader-mode a { color: #4f46e5; }
      #nav0-reader-mode a:hover { color: #4338ca; }
      .nav0-reader-content blockquote {
        border-left-color: #d1d5db;
        color: #4b5563;
      }
      .nav0-reader-content pre,
      .nav0-reader-content code {
        background-color: #f3f4f6;
      }
      .nav0-reader-content pre {
        border-color: #e5e7eb;
      }
      .nav0-reader-meta span { color: #6b7280; }
      .nav0-reader-meta span::before { background-color: #9ca3af; }

      /* Dark mode */
      @media (prefers-color-scheme: dark) {
        #nav0-reader-mode {
          background-color: #1a1a2e;
          color: #e0e0e0;
        }
        #nav0-reader-mode a { color: #818cf8; }
        #nav0-reader-mode a:hover { color: #a5b4fc; }
        .nav0-reader-content blockquote {
          border-left-color: #4b5563;
          color: #9ca3af;
        }
        .nav0-reader-content pre,
        .nav0-reader-content code {
          background-color: #16213e;
        }
        .nav0-reader-content pre {
          border-color: #374151;
        }
        .nav0-reader-meta span { color: #9ca3af; }
        .nav0-reader-meta span::before { background-color: #6b7280; }
      }

      .nav0-reader-article {
        max-width: 680px;
        margin: 0 auto;
        padding: 48px 24px 80px;
      }

      .nav0-reader-header {
        margin-bottom: 32px;
        padding-bottom: 24px;
        border-bottom: 1px solid rgba(128, 128, 128, 0.2);
      }

      .nav0-reader-title {
        font-family: Georgia, 'Times New Roman', serif;
        font-size: 32px;
        font-weight: 700;
        line-height: 1.3;
        margin: 0 0 16px 0;
      }

      .nav0-reader-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        align-items: center;
        font-size: 14px;
      }

      .nav0-reader-meta span {
        display: inline-flex;
        align-items: center;
      }

      .nav0-reader-meta span + span::before {
        content: '';
        display: inline-block;
        width: 4px;
        height: 4px;
        border-radius: 50%;
        margin-right: 16px;
      }

      .nav0-reader-content {
        font-family: Georgia, 'Times New Roman', serif;
        font-size: 19px;
        line-height: 1.7;
      }

      .nav0-reader-content p {
        margin: 0 0 1.2em 0;
      }

      .nav0-reader-content h1,
      .nav0-reader-content h2,
      .nav0-reader-content h3,
      .nav0-reader-content h4 {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        font-weight: 600;
        line-height: 1.3;
        margin: 1.5em 0 0.5em 0;
      }
      .nav0-reader-content h1 { font-size: 28px; }
      .nav0-reader-content h2 { font-size: 24px; }
      .nav0-reader-content h3 { font-size: 20px; }
      .nav0-reader-content h4 { font-size: 18px; }

      .nav0-reader-content img {
        max-width: 100%;
        height: auto;
        border-radius: 6px;
        margin: 16px 0;
      }

      .nav0-reader-content figure {
        margin: 24px 0;
      }
      .nav0-reader-content figcaption {
        font-size: 14px;
        text-align: center;
        margin-top: 8px;
        opacity: 0.7;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      }

      .nav0-reader-content blockquote {
        border-left: 3px solid;
        margin: 24px 0;
        padding: 8px 0 8px 20px;
        font-style: italic;
      }

      .nav0-reader-content pre {
        overflow-x: auto;
        padding: 16px;
        border-radius: 6px;
        border: 1px solid;
        font-size: 14px;
        line-height: 1.5;
        margin: 24px 0;
      }

      .nav0-reader-content code {
        font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
        font-size: 0.9em;
        padding: 2px 5px;
        border-radius: 3px;
      }

      .nav0-reader-content pre code {
        padding: 0;
        font-size: inherit;
        background: none;
      }

      .nav0-reader-content ul,
      .nav0-reader-content ol {
        margin: 0 0 1.2em 0;
        padding-left: 28px;
      }

      .nav0-reader-content li {
        margin-bottom: 0.4em;
      }

      .nav0-reader-content table {
        width: 100%;
        border-collapse: collapse;
        margin: 24px 0;
        font-size: 16px;
      }

      .nav0-reader-content th,
      .nav0-reader-content td {
        padding: 10px 14px;
        border: 1px solid rgba(128, 128, 128, 0.3);
        text-align: left;
      }

      .nav0-reader-content th {
        font-weight: 600;
      }

      .nav0-reader-content hr {
        border: none;
        border-top: 1px solid rgba(128, 128, 128, 0.2);
        margin: 32px 0;
      }

      @media (max-width: 720px) {
        .nav0-reader-article {
          padding: 24px 16px 60px;
        }
        .nav0-reader-title {
          font-size: 26px;
        }
        .nav0-reader-content {
          font-size: 17px;
        }
      }
    `;
  }
}
