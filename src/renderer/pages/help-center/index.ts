
import './index.css';

import { createIcons, icons } from 'lucide';
createIcons({ icons });

// Handle FAQ toggle
document.addEventListener('DOMContentLoaded', function() {
  const faqQuestions: NodeListOf<HTMLElement> = document.querySelectorAll('.faq-question');
  
  faqQuestions.forEach(question => {
      question.addEventListener('click', function(this: HTMLElement) {
          const answer = this.nextElementSibling as HTMLElement;
          const icon = this.querySelector('.toggle-icon') as HTMLElement;
          
          if (answer.classList.contains('active')) {
              answer.classList.remove('active');
              icon.textContent = '+';
          } else {
              answer.classList.add('active');
              icon.textContent = '−';
          }
      });
  });
  
  // Handle help card navigation
  const helpCards: NodeListOf<HTMLElement> = document.querySelectorAll('.help-card');
  
  helpCards.forEach(card => {
      card.addEventListener('click', function(this: HTMLElement) {
          const targetId = this.dataset.target;
          if (!targetId) return;
          
          const targetSection = document.getElementById(targetId);
          
          if (targetSection) {
              targetSection.scrollIntoView({ 
                  behavior: 'smooth' 
              });
              
              // Add a highlight effect
              targetSection.style.backgroundColor = 'rgba(230, 240, 235, 0.5)';
              setTimeout(() => {
                  targetSection.style.transition = 'background-color 1s ease';
                  targetSection.style.backgroundColor = 'transparent';
              }, 100);
          }
      });
  });
  
  // Simple search functionality
  const searchInput = document.querySelector('.search-input') as HTMLInputElement;
  const searchButton = document.querySelector('.search-button') as HTMLElement;
  
  const performSearch = (): void => {
      const searchTerm = searchInput.value.toLowerCase();
      if (searchTerm.length < 2) return;
      
      const sections: NodeListOf<HTMLElement> = document.querySelectorAll('.help-section h3, .faq-question');
      let foundMatch = false;
      
      sections.forEach(section => {
          if (section.textContent && section.textContent.toLowerCase().includes(searchTerm)) {
              foundMatch = true;
              section.scrollIntoView({ behavior: 'smooth' });
              
              // Highlight the section
              section.style.backgroundColor = 'rgba(30, 77, 51, 0.2)';
              setTimeout(() => {
                  section.style.transition = 'background-color 1s ease';
                  section.style.backgroundColor = '';
              }, 2000);
              
              // If it's a FAQ question, open it
              if (section.classList.contains('faq-question')) {
                  const answer = section.nextElementSibling as HTMLElement;
                  const icon = section.querySelector('.toggle-icon') as HTMLElement;
                  answer.classList.add('active');
                  icon.textContent = '−';
              }
              
              // Only scroll to the first match
              return;
          }
      });
      
      if (!foundMatch) {
          alert('No results found. Try a different search term.');
      }
  };
  
  searchButton.addEventListener('click', performSearch);
  searchInput.addEventListener('keypress', function(e: KeyboardEvent) {
      if (e.key === 'Enter') {
          performSearch();
      }
  });
});