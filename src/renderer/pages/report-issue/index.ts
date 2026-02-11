
import './index.css';

import { createIcons, icons } from 'lucide';
createIcons({ icons });

// Handle tab switching
document.addEventListener('DOMContentLoaded', function() {
  const tabButtons: NodeListOf<HTMLElement> = document.querySelectorAll('.tab-button');
  
  tabButtons.forEach(button => {
      button.addEventListener('click', function(this: HTMLElement) {
          // Remove active class from all buttons
          tabButtons.forEach(btn => {
              btn.classList.remove('active');
          });
          
          // Add active class to clicked button
          this.classList.add('active');
          
          // Hide all tab contents
          const tabContents: NodeListOf<HTMLElement> = document.querySelectorAll('.tab-content');
          tabContents.forEach(content => {
              content.classList.remove('active');
          });
          
          // Show corresponding tab content
          const tabId = this.getAttribute('data-tab');
          if (tabId) {
              const tabElement = document.getElementById(tabId);
              if (tabElement) {
                  tabElement.classList.add('active');
              }
          }
      });
  });
  
  // Copy template to clipboard
  const copyButton = document.getElementById('copyTemplate') as HTMLElement;
  const templateBox = document.querySelector('.template-box') as HTMLElement;
  
  if (copyButton && templateBox) {
      copyButton.addEventListener('click', function(this: HTMLElement) {
          const textArea = document.createElement('textarea');
          if (templateBox.textContent) {
              textArea.value = templateBox.textContent;
          }
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          
          // Change button text temporarily
          const originalText = this.textContent;
          this.textContent = 'Copied!';
          
          setTimeout(() => {
              this.textContent = originalText;
          }, 2000);
      });
  }
  
  // Make checklist interactive
  const checkboxes: NodeListOf<HTMLInputElement> = document.querySelectorAll('.checklist input[type="checkbox"]');
  
  checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', function(this: HTMLInputElement) {
          const label = this.nextElementSibling as HTMLElement;
          
          if (this.checked) {
              label.style.textDecoration = 'line-through';
              label.style.opacity = '0.7';
          } else {
              label.style.textDecoration = 'none';
              label.style.opacity = '1';
          }
      });
  });
});