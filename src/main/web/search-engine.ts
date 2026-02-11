import { DataStoreConstants } from "../../constants/app-constants";
import { DataStoreManager } from "../database/data-store-manager";
import { WebContentsView } from "electron";
import Bluebird from "bluebird";

export abstract class SearchEngine {
  private static getSearchEngine(): string {
    const browserSettings = DataStoreManager.get(DataStoreConstants.BROWSER_SETTINGS) as any;
    return browserSettings?.primarySearchEngine || 'Google';
  }

  public static async getSearchUrl(searchTerm: string): Promise<string> {
    const searchEngine = SearchEngine.getSearchEngine();
    if(searchEngine === 'Google'){
      return `https://www.google.com/search?q=${searchTerm}`;
    } else if(searchEngine === 'Bing'){
      return `https://www.bing.com/search?q=${searchTerm}`;
    } else if(searchEngine === 'DuckDuckGo'){
      return `https://duckduckgo.com/?q=${searchTerm}`;
    } else {
      return `https://www.google.com/search?q=${searchTerm}`;
    }
  }

  public static async getTopResults(searchTerm: string): Promise<Array<string>> {
    const searchEngine = SearchEngine.getSearchEngine();
    const searchUrl = await SearchEngine.getSearchUrl(searchTerm);
    const webContentsView = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        // partition: this.partitionSetting,
      }
    });
    webContentsView.webContents.setAudioMuted(true);
    await webContentsView.webContents.loadURL(searchUrl).catch((error) => {console.error(error);});
    // await new Promise(resolve => setTimeout(resolve, 3000));
    let results: Array<string> = [];
    if(searchEngine === 'Google'){
      results = await SearchEngine.extractTopSearchResultsForGoogle(webContentsView);
    } else if(searchEngine === 'Bing'){
      results = await SearchEngine.extractTopSearchResultsForBing(webContentsView);
    } else if(searchEngine === 'DuckDuckGo'){
      results = await SearchEngine.extractTopSearchResultsForDuckDuckGo(webContentsView);
    } else {
      results = await SearchEngine.extractTopSearchResultsForGoogle(webContentsView);
    }
    webContentsView.webContents.close();
    return results;
  }

  public static async performWebResearch(searchTerm: string): Promise<Array<{source: string, text: string}>> {
    const topResults = await SearchEngine.getTopResults(searchTerm);

    const results: Array<{source: string, text: string}> = [];
    await Bluebird.map(topResults.slice(0, 5), (url) => {
      return SearchEngine.extractTextFromURL(url)
        .then((textContent) => {
          results.push({source: url, text: textContent});
          return Promise.resolve();
        })
        .catch((error) => {
          console.error(`Error loading URL ${url}:`, error);
          return Promise.resolve();
        });
    }, {concurrency: 5}); 

    return results;
  }

  public static async extractTopSearchResultsForGoogle(webContentsView: WebContentsView): Promise<Array<string>> {
    return webContentsView.webContents.executeJavaScript(`
      (function() {
        const results = [];
        
        // Primary selector for organic search results
        // Targets the main search result links (h3 tags with parent a tags)
        const searchResults = document.querySelectorAll('h3:not([class*="ad"]):not([class*="Ad"]) a[href^="https://"]');
        
        // Alternative selector if the primary doesn't work
        const alternativeResults = document.querySelectorAll('a[href^="https://"][data-ved] h3');
        
        // Use primary results or fall back to alternative
        const resultElements = searchResults.length > 0 ? searchResults : alternativeResults;
        
        for (let element of resultElements) {
            if (results.length >= 10) break;
            
            let url;
            let linkElement;
            
            // Handle different DOM structures
            if (element.tagName === 'A') {
                linkElement = element;
            } else {
                linkElement = element.closest('a');
            }
            
            if (!linkElement) continue;
            
            url = linkElement.href;
            
            // Skip if no URL
            if (!url) continue;
            
            // Filter out unwanted URLs
            const unwantedPatterns = [
              new RegExp('google\\.com'),
              new RegExp('youtube\\.com/results'),
              new RegExp('maps\\.google'),
              new RegExp('shopping\\.google'),
              new RegExp('images\\.google'),
              new RegExp('news\\.google'),
              new RegExp('translate\\.google'),
              new RegExp('webcache\\.googleusercontent'),
              new RegExp('/search\\?'),
              new RegExp('/url\\?q=')
            ];
            
            // Check if URL matches any unwanted patterns
            if (unwantedPatterns.some(pattern => pattern.test(url))) {
                continue;
            }
            
            // Check if parent elements indicate sponsored/ad content
            const parentText = linkElement.closest('[data-ved]')?.textContent?.toLowerCase() || '';
            if (parentText.includes('sponsored') || 
                parentText.includes('ad ') || 
                linkElement.closest('[aria-label*="Ad"]') ||
                linkElement.closest('[data-text-ad]') ||
                linkElement.closest('.ads-ad')) {
                continue;
            }
            
            // Check for video indicators
            const isVideo = linkElement.closest('[data-ved]')?.querySelector('[aria-label*="Video"]') ||
                          linkElement.closest('[data-ved]')?.textContent?.includes('Video') ||
                          linkElement.closest('.video-result');
            
            if (isVideo) continue;
            
            // Clean up Google redirect URLs
            if (url.includes('/url?q=')) {
                const urlMatch = url.match(/[?&]q=([^&]+)/);
                if (urlMatch) {
                    url = decodeURIComponent(urlMatch[1]);
                }
            }
            
            // Add to results if it's a valid URL and not already included
            if (url.startsWith('http') && !results.includes(url)) {
                results.push(url);
            }
        }
        
        // If we didn't get enough results, try a more general approach
        if (results.length < 5) {
            console.warn('Primary method found limited results, trying alternative approach...');
            
            const allLinks = document.querySelectorAll('a[href^="http"]:not([href*="google.com"])');
            
            for (let link of allLinks) {
                if (results.length >= 10) break;
                
                const url = link.href;
                const linkText = link.textContent.trim();
                const parentText = link.closest('[data-ved]')?.textContent?.toLowerCase() || '';
                
                // Skip empty links or unwanted content
                if (!linkText || 
                    parentText.includes('ad') || 
                    parentText.includes('sponsored') ||
                    url.includes('youtube.com/results') ||
                    url.includes('maps.google') ||
                    results.includes(url)) {
                    continue;
                }
                
                // Check if it looks like a main search result
                const hasHeading = link.querySelector('h3') || link.closest('h3');
                const isInMainResults = link.closest('[data-ved]') && !link.closest('.ads-ad');
                
                if ((hasHeading || isInMainResults) && linkText.length > 10) {
                    results.push(url);
                }
            }
        }
        
        return results;
    })();
    `);
  }

  public static async extractTopSearchResultsForBing(webContentsView: WebContentsView): Promise<Array<string>> {
    return webContentsView.webContents.executeJavaScript(`
      (function() {
        const results = [];
        
        // Primary selectors for Bing organic search results
        const primarySelectors = [
            '.b_algo h2 a',           // Main organic results
            '.b_title a',             // Alternative title links
            '.b_algo .b_title a',     // Nested structure
            'li[class*="algo"] h2 a'  // Alternative algo class
        ];
        
        let searchResults = [];
        
        // Try each selector until we find results
        for (let selector of primarySelectors) {
            searchResults = document.querySelectorAll(selector);
            if (searchResults.length > 0) {
                break;
            }
        }
        
        for (let link of searchResults) {
            if (results.length >= 10) break;
            
            let url = link.href;
            if (!url || !url.startsWith('http')) continue;
            
            // Filter out Bing services and unwanted URLs
            const unwantedPatterns = [
              new RegExp('bing\\.com'),
              new RegExp('microsoft\\.com/en-us/bing'),
              new RegExp('maps\\.bing\\.com'),
              new RegExp('shopping\\.bing\\.com'),
              new RegExp('images\\.bing\\.com'),
              new RegExp('news\\.bing\\.com'),
              new RegExp('translate\\.bing\\.com'),
              new RegExp('cc\\.bing\\.com'),
              new RegExp('th\\.bing\\.com')
            ];
            
            if (unwantedPatterns.some(pattern => pattern.test(url))) continue;
            
            // Check for ads - Bing has specific ad containers
            if (link.closest('.b_ad') || 
                link.closest('.sb_add') || 
                link.closest('[data-priority="ad"]') ||
                link.closest('.ads') ||
                link.closest('.b_adLastChild') ||
                link.closest('[class*="b_ad"]')) {
                continue;
            }
            
            // Check for video results
            if (link.closest('.b_video') || 
                link.closest('.videoAnswer') ||
                link.closest('[class*="video"]') ||
                link.querySelector('[aria-label*="Video"]')) {
                continue;
            }
            
            // Check for news results (if you want to exclude them)
            if (link.closest('.b_news') || link.closest('[class*="news"]')) {
                continue;
            }
            
            // Check for shopping results
            if (link.closest('.b_shopping') || link.closest('[class*="shopping"]')) {
                continue;
            }
            
            // Ensure it's a meaningful result (has proper title text)
            const linkText = link.textContent.trim();
            if (linkText.length < 3) continue;
            
            // Add to results if not duplicate
            if (!results.includes(url)) {
                results.push(url);
            }
        }
        
        // Fallback method if we don't have enough results
        if (results.length < 5) {
            console.log('Trying fallback method for Bing...');
            
            const fallbackLinks = document.querySelectorAll('ol#b_results a[href^="http"]:not([href*="bing.com"])');
            
            for (let link of fallbackLinks) {
                if (results.length >= 10) break;
                
                const url = link.href;
                const hasHeading = link.querySelector('h2') || link.querySelector('h3') || link.closest('h2') || link.closest('h3');
                const isInMainResults = link.closest('#b_results') && !link.closest('.b_ad');
                const linkText = link.textContent.trim();
                
                if (hasHeading && isInMainResults && linkText.length > 10 && !results.includes(url)) {
                    results.push(url);
                }
            }
        }
        
        
        // Copy to clipboard
        if (navigator.clipboard && results.length > 0) {
            navigator.clipboard.writeText(JSON.stringify(results, null, 2))
                .then(() => console.log('URLs copied to clipboard!'))
                .catch(() => console.log('Could not copy to clipboard'));
        }
        
        return results;
    })();
    `);
  }

  public static async extractTopSearchResultsForDuckDuckGo(webContentsView: WebContentsView): Promise<Array<string>> {
    return webContentsView.webContents.executeJavaScript(`
      (function() {
        const results = [];
        
        // Primary selectors for DuckDuckGo organic search results
        const primarySelectors = [
            '[data-result="result"] h2 a',           // Main results with data-result attribute
            '.result__title a',                      // Classic result title links
            '[data-testid="result-title-a"]',       // Test ID based selector
            '.result h2 a',                         // Alternative result structure
            'article h2 a',                         // Article-based results
            '[data-layout="organic"] h2 a'          // Organic layout results
        ];
        
        let searchResults = [];
        
        // Try each selector until we find results
        for (let selector of primarySelectors) {
            searchResults = document.querySelectorAll(selector);
            if (searchResults.length > 0) {
                break;
            }
        }
        
        for (let link of searchResults) {
            if (results.length >= 10) break;
            
            let url = link.href;
            if (!url || !url.startsWith('http')) continue;
            
            // Filter out DuckDuckGo services and unwanted URLs
            const unwantedPatterns = [
              new RegExp('duckduckgo\\.com'),
              new RegExp('duck\\.co'),
              new RegExp('duckduckgo\\.com/l/\\?uddg='),  // DDG redirect pattern
              new RegExp('start\\.duckduckgo\\.com'),
              new RegExp('help\\.duckduckgo\\.com'),
              new RegExp('spreadprivacy\\.com')
            ];
            
            if (unwantedPatterns.some(pattern => pattern.test(url))) continue;
            
            // DuckDuckGo has minimal ads, but check for any ad indicators
            if (link.closest('[class*="ad"]') || 
                link.closest('[data-ad]') ||
                link.closest('.ad-wrap') ||
                link.getAttribute('data-ad')) {
                continue;
            }
            
            // Check for video results
            if (link.closest('.tile--vid') || 
                link.closest('.video-result') ||
                link.closest('[class*="video"]') ||
                link.closest('[data-module="videos"]') ||
                link.querySelector('[aria-label*="Video"]')) {
                continue;
            }
            
            // Check for image results
            if (link.closest('.tile--img') || 
                link.closest('[data-module="images"]') ||
                link.closest('[class*="image"]')) {
                continue;
            }
            
            // Check for news results (if you want to exclude them)
            if (link.closest('.news-result') || 
                link.closest('[data-module="news"]') ||
                link.closest('[class*="news"]')) {
                continue;
            }
            
            // Check for shopping results
            if (link.closest('[data-module="products"]') || 
                link.closest('[class*="shopping"]') ||
                link.closest('[class*="product"]')) {
                continue;
            }
            
            // Ensure it's a meaningful result
            const linkText = link.textContent.trim();
            if (linkText.length < 3) continue;
            
            // Clean up any DDG redirect URLs (though they're rare)
            if (url.includes('duckduckgo.com/l/?uddg=')) {
                const decodedMatch = url.match(/uddg=([^&]+)/);
                if (decodedMatch) {
                    url = decodeURIComponent(decodedMatch[1]);
                }
            }
            
            // Add to results if not duplicate
            if (!results.includes(url)) {
                results.push(url);
            }
        }
        
        // Fallback method if we don't have enough results
        if (results.length < 5) {
            console.log('Trying fallback method for DuckDuckGo...');
            
            const fallbackLinks = document.querySelectorAll('a[href^="http"]:not([href*="duckduckgo.com"]):not([href*="duck.co"])');
            
            for (let link of fallbackLinks) {
                if (results.length >= 10) break;
                
                const url = link.href;
                const hasHeading = link.querySelector('h2') || link.querySelector('h3') || link.closest('h2') || link.closest('h3');
                const isInMainResults = link.closest('[data-result]') || link.closest('.result') || link.closest('article');
                const linkText = link.textContent.trim();
                
                // DuckDuckGo results should have substantial text
                if (hasHeading && isInMainResults && linkText.length > 15 && !results.includes(url)) {
                    results.push(url);
                }
            }
        }
        
        // Copy to clipboard
        if (navigator.clipboard && results.length > 0) {
            navigator.clipboard.writeText(JSON.stringify(results, null, 2))
                .then(() => console.log('URLs copied to clipboard!'))
                .catch(() => console.log('Could not copy to clipboard'));
        }
        
        return results;
    })();
    `);
  }

  private static async extractTextFromURL(url: string): Promise<string> {
    const webContentsView = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        // partition: this.partitionSetting
      }
    });
    webContentsView.webContents.setAudioMuted(true);
    await webContentsView.webContents.loadURL(url).catch((error) => {console.error(error);});
    await webContentsView.webContents.executeJavaScript(`
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/readability/0.6.0/Readability.min.js';
      document.head.appendChild(script);
    `);

    await new Promise(resolve => setTimeout(resolve, 500));
    let textContent = await webContentsView.webContents.executeJavaScript(`
      (function() {
        const doc = new Readability(document).parse();
        return doc.textContent;
      })();
    `);

    webContentsView.webContents.close();

    textContent = textContent.replaceAll('\n\n', '\n');
    textContent = textContent.replaceAll('\n\n', '\n');
    textContent = textContent.replaceAll('\n\n', '\n');
    textContent = textContent.replaceAll('\n\n', '\n');
    textContent = textContent.replaceAll('\n\n', '\n');

    textContent = textContent.replaceAll('\t\t', '\t');
    textContent = textContent.replaceAll('\t\t', '\t');
    textContent = textContent.replaceAll('\t\t', '\t');
    textContent = textContent.replaceAll('\t\t', '\t');
    textContent = textContent.replaceAll('\t\t', '\t');

    return textContent;
  }

}