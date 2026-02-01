// Loading and Polish Utilities
const LoadingUtils = {
  /**
   * Add fade-in animation to element
   */
  addFadeIn(element, delay = 0) {
    element.classList.add('fade-in');
    if (delay > 0) {
      element.style.animation = `fadeIn 0.4s ease-out ${delay}s forwards`;
      element.style.opacity = '0';
    }
  },

  /**
   * Add stagger animation to multiple elements
   */
  addStaggerAnimation(container, elementSelector = '*', baseDelay = 0) {
    const elements = container.querySelectorAll(elementSelector);
    elements.forEach((el, index) => {
      el.style.animation = `fadeIn 0.4s ease-out ${baseDelay + index * 0.1}s forwards`;
      el.style.opacity = '0';
    });
  },

  /**
   * Show loading spinner
   */
  showSpinner(element, size = 'md') {
    const spinner = document.createElement('div');
    spinner.className = `spinner ${size === 'lg' ? 'lg' : ''}`;
    element.appendChild(spinner);
    return spinner;
  },

  /**
   * Hide loading spinner
   */
  hideSpinner(element) {
    const spinner = element.querySelector('.spinner');
    if (spinner) spinner.remove();
  },

  /**
   * Create skeleton loader
   */
  createSkeleton(type = 'text', count = 1) {
    const container = document.createElement('div');
    for (let i = 0; i < count; i++) {
      const skeleton = document.createElement('div');
      skeleton.className = `skeleton-loader ${type}`;
      if (type === 'card') {
        skeleton.style.height = '120px';
        skeleton.style.marginBottom = '1rem';
      }
      container.appendChild(skeleton);
    }
    return container;
  },

  /**
   * Fade in element
   */
  fadeIn(element, duration = 400) {
    return new Promise((resolve) => {
      element.style.opacity = '0';
      element.style.transform = 'translateY(10px)';
      element.style.transition = `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`;
      
      setTimeout(() => {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
      }, 10);

      setTimeout(() => {
        element.style.transition = '';
        resolve();
      }, duration);
    });
  },

  /**
   * Fade out element
   */
  fadeOut(element, duration = 400) {
    return new Promise((resolve) => {
      element.style.opacity = '1';
      element.style.transition = `opacity ${duration}ms ease-out`;
      
      setTimeout(() => {
        element.style.opacity = '0';
      }, 10);

      setTimeout(() => {
        element.style.transition = '';
        resolve();
      }, duration);
    });
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LoadingUtils;
}
