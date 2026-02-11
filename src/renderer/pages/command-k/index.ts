
import './index.css';
import { createIcons, icons } from 'lucide';

let selectedAction: 'search' | 'deepResearch' | 'talkToGPT' | 'browserAgent' = 'search';
const init = () => {
  document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.querySelector('.search-input') as HTMLInputElement;
    const resultItems = document.querySelectorAll<HTMLElement>('.result-item');
    const actionButtons = document.querySelectorAll<HTMLButtonElement>('.action-btn');
    
    // Initialize Lucide icons
    createIcons({ icons });
    
    // Focus the search input automatically
    searchInput?.focus();
    
    // const handleResultItemClick = (item: HTMLElement, index: number) => (event: Event) => {
    //   // Remove active class from all items
    //   resultItems.forEach(result => {
    //     result.classList.remove('active');
    //   });
      
    //   // Add active class to clicked item
    //   item.classList.add('active');
      
    //   // In a real application, this would navigate to the selected item
    //   console.log(`Selected item: ${index + 1}`);
    // };
    
    // // Handle result item selection
    // resultItems.forEach((item, index) => {
    //   item.addEventListener('click', handleResultItemClick(item, index));
    // });
    
    const handleActionButtonClick = (button: HTMLButtonElement, index: number) => (event: Event) => {
      actionButtons.forEach(record => {
        record.classList.remove('primary');
      });

      button.classList.add('primary');
      selectedAction = button.getAttribute('selected-action') as 'search' | 'deepResearch' | 'talkToGPT' | 'browserAgent';
    };
    
    // Handle action button click
    actionButtons.forEach((button, index) => {
      button.addEventListener('click', handleActionButtonClick(button, index));
    });
    
    // Function to navigate results with keyboard
    const navigateResults = (direction: number) => {
      // Remove active class from current item
      resultItems.forEach(item => item.classList.remove('active'));
      
      // Calculate new active index
      activeIndex = (activeIndex + direction) % resultItems.length;
      if (activeIndex < 0) activeIndex = resultItems.length - 1;
      
      // Add active class to new active item
      resultItems[activeIndex].classList.add('active');
      
      // Scroll the item into view if needed
      resultItems[activeIndex].scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest' 
      });
    };
    
    // Handle keyboard navigation
    let activeIndex = 0;
    
    const handleKeydown = (e: KeyboardEvent) => {
      if(e.metaKey){
        window.BrowserAPI.hideCommandKOverlay(window.BrowserAPI.appWindowId);
        return;
      }
      switch(e.key) {
        case 'ArrowDown':
          e.preventDefault();
          navigateResults(1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          navigateResults(-1);
          break;
        case 'Enter':{
          e.preventDefault();
          const searchInputElement = document.getElementById('search-input') as HTMLInputElement;
          if(searchInputElement?.value){
            switch (selectedAction) {
              case 'search':
                window.BrowserAPI.createTab(window.BrowserAPI.appWindowId, searchInputElement.value, true);
                window.BrowserAPI.hideCommandKOverlay(window.BrowserAPI.appWindowId);
                break;
              case 'deepResearch':
                window.BrowserAPI.hideCommandKOverlay(window.BrowserAPI.appWindowId);
                break;
              case 'talkToGPT':
                window.BrowserAPI.hideCommandKOverlay(window.BrowserAPI.appWindowId);
                break;
              case 'browserAgent':
                window.BrowserAPI.assignTaskToBrowserAgent(window.BrowserAPI.appWindowId, searchInputElement.value);
                window.BrowserAPI.hideCommandKOverlay(window.BrowserAPI.appWindowId);
                break;
            }
          }
          // const activeItem = document.querySelector<HTMLElement>('.result-item.active');
          // if (activeItem) {
          //   activeItem.click();
          // } else {
          //   // Default to first action if no result is selected
          //   actionButtons[0]?.click();
          // }
          break;
        }
        case 'Escape':
          e.preventDefault();
          window.BrowserAPI.hideCommandKOverlay(window.BrowserAPI.appWindowId);
          break;
        default:
          // For number keys 1-9, select the corresponding result
          if (e.key >= '1' && e.key <= '9') {
            const index = parseInt(e.key) - 1;
            if (index < resultItems.length) {
              e.preventDefault();
              resultItems[index].click();
            }
          }
          break;
      }
    };
    
    searchInput?.addEventListener('keydown', handleKeydown);
    
    // // Function to highlight matching text
    // const highlightText = (element: HTMLElement, query: string) => {
    //   const text = element.textContent || '';
    //   const lowerText = text.toLowerCase();
    //   const index = lowerText.indexOf(query.toLowerCase());
      
    //   if (index !== -1) {
    //     const before = text.substring(0, index);
    //     const match = text.substring(index, index + query.length);
    //     const after = text.substring(index + query.length);
        
    //     element.innerHTML = `${before}<span class="highlight">${match}</span>${after}`;
    //   }
    // };
    
    // // Function to update section visibility
    // const updateSections = () => {
    //   const sectionTitles = document.querySelectorAll<HTMLElement>('.section-title');
      
    //   sectionTitles.forEach(title => {
    //     // Get all visible result items following this section title
    //     // until the next section title
    //     let hasVisibleItems = false;
    //     let current = title.nextElementSibling as HTMLElement | null;
        
    //     while (current && !current.classList.contains('section-title')) {
    //       if (current.style.display !== 'none' && current.classList.contains('result-item')) {
    //         hasVisibleItems = true;
    //         break;
    //       }
    //       current = current.nextElementSibling as HTMLElement | null;
    //     }
        
    //     // Show/hide section title based on whether it has visible items
    //     title.style.display = hasVisibleItems ? 'block' : 'none';
    //   });
    // };
    
    // // Function to filter results based on search query
    // const filterResults = (query: string) => {
    //   let hasResults = false;
      
    //   resultItems.forEach(item => {
    //     const titleElement = item.querySelector<HTMLElement>('.result-title');
    //     const urlElement = item.querySelector<HTMLElement>('.result-url');
        
    //     const title = titleElement?.textContent?.toLowerCase() || '';
    //     const url = urlElement?.textContent?.toLowerCase() || '';
        
    //     if (title.includes(query) || url.includes(query)) {
    //       item.style.display = 'flex';
    //       hasResults = true;
          
    //       // Highlight matching text
    //       if (titleElement) {
    //         highlightText(titleElement, query);
    //       }
    //       if (urlElement) {
    //         highlightText(urlElement, query);
    //       }
    //     } else {
    //       item.style.display = 'none';
    //     }
    //   });
      
    //   // Update section visibility
    //   updateSections();
      
    //   // If no results found, show the primary action button
    //   if (actionButtons[0]) {
    //     actionButtons[0].style.display = hasResults ? '' : 'flex';
    //   }
    // };
    
    // // Function to reset results
    // const resetResults = () => {
    //   resultItems.forEach(item => {
    //     item.style.display = 'flex';
        
    //     // Remove highlights
    //     const title = item.querySelector<HTMLElement>('.result-title');
    //     if (title) {
    //       title.textContent = title.textContent;
    //     }
        
    //     const url = item.querySelector<HTMLElement>('.result-url');
    //     if (url) {
    //       url.textContent = url.textContent;
    //     }
    //   });
      
    //   // Reset section visibility
    //   updateSections();
    // };
    
    // Live search functionality
    const handleInput = (e: Event) => {
      const input = e.target as HTMLInputElement;
      const query = input.value.toLowerCase();
      
      // if (query.length > 0) {
      //   // Filter and highlight results
      //   filterResults(query);
      // } else {
      //   // Reset all results
      //   resetResults();
      // }
    };
    
    searchInput?.addEventListener('input', handleInput);
    
    // // Function to toggle loading indicator
    // const toggleLoading = (show: boolean) => {
    //   const loadingElement = document.querySelector<HTMLElement>('.loading');
    //   if (loadingElement) {
    //     loadingElement.style.display = show ? 'block' : 'none';
    //   }
    // };
    
    // Click outside to close (in a real application)
    const handleDocumentClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.command-container')) {
        window.BrowserAPI.hideCommandKOverlay(window.BrowserAPI.appWindowId);
      }
    };
    
    document.addEventListener('click', handleDocumentClick);
  });
};

// Initialize the module
init();