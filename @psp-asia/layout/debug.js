/**
 * PSP Debug - Visual Debugging Plugin
 * Provides visual debugging for grid layouts with territory lines and spacing indicators
 * Created by Pattaya Upara (everysundays@gmail.com)
 * Part of the PSP (Pattaya Studio Project) plugin ecosystem
 */

(function() {
  // Define VIEWPORTS directly since we can't import in browser
  const VIEWPORTS = {
    sm: {
      viewportWidth: 640,               // Standard Tailwind sm breakpoint
      minWidth: '0',                    // Changed from '40rem' to '0' to include xs range
      containerPadding: 24,
      availableSpace: 592,              // 640px - 48px
      description: 'Small devices (Tailwind sm), includes xs range'
    },
    md: {
      viewportWidth: 768,               // Standard Tailwind md breakpoint
      minWidth: '48rem',                // 48rem = 768px
      containerPadding: 32,
      availableSpace: 704,              // 768px - 64px
      description: 'Medium devices (Tailwind md)'
    },
    lg: {
      viewportWidth: 1024,              // Standard Tailwind lg breakpoint
      minWidth: '64rem',                // 64rem = 1024px
      containerPadding: 32,
      availableSpace: 960,              // 1024px - 64px
      description: 'Desktop and large laptops (Tailwind lg)'
    },
    xl: {
      viewportWidth: 1280,              // Standard Tailwind xl breakpoint
      minWidth: '80rem',                // 80rem = 1280px
      containerPadding: 32,
      availableSpace: 1216,             // 1280px - 64px
      description: 'Large desktop screens (Tailwind xl)'
    }
  };

  try {
    // Function to find the correct path to debug-mode.src
    function findDebugCssPath() {
      // Try to get the script path
      const scripts = document.getElementsByTagName('script');
      for (let i = 0; i < scripts.length; i++) {
        const src = scripts[i].src;
        if (src.includes('/debug-mode.js') || src.includes('/twlayout-plugin/scripts/debug-mode.js')) {
          // Replace the script path with the CSS path
          return src.replace('/scripts/debug-mode.js', '/styles/debug-mode.src');
        }
      }
      
      // Fallback paths
      const possiblePaths = [
        '../twlayout-plugin/styles/debug-mode.src',
        './twlayout-plugin/styles/debug-mode.src',
        '/twlayout-plugin/styles/debug-mode.src'
      ];
      
      return possiblePaths[0]; // Default to the first fallback
    }
    
    // Create a new <link> element
    var linkElement = document.createElement('link');

    // Set the href attribute with correct path
    linkElement.href = findDebugCssPath();

    // Set the rel attribute
    linkElement.rel = 'stylesheet';

    // Append the <link> element to the <head>
    var headElement = document.head || document.getElementsByTagName('head')[0];
    if (headElement) {
      headElement.appendChild(linkElement);
    } else {
      console.error('Could not find the <head> element to append the stylesheet.');
    }
  } catch (error) {
    console.error('Error while adding stylesheet: ', error);
  }

  try {
    // Create the debug container
    var debugContainer = document.createElement('div');
    debugContainer.className = 'debug-container';

    // Create debug toggle
    var divElement = document.createElement('div');
    divElement.className = 'debug-toggle-container';

    var inputElement = document.createElement('input');
    inputElement.type = 'checkbox';
    inputElement.id = 'debug-mode-toggle';

    var labelElement = document.createElement('label');
    labelElement.htmlFor = 'debug-mode-toggle';
    labelElement.className = 'debug-toggle-label';
    labelElement.textContent = 'Debug Mode';

    divElement.appendChild(inputElement);
    divElement.appendChild(labelElement);

    // Create viewport controls (only visible in debug mode)
    var viewportContainer = document.createElement('div');
    viewportContainer.className = 'viewport-container debug-only';

    var viewportInput = document.createElement('input');
    viewportInput.type = 'text';
    viewportInput.id = 'viewport-input';
    viewportInput.className = 'viewport-input';
    viewportInput.placeholder = '1200 × 800 (lg)';
    viewportInput.readOnly = true;

    // Additional input for rem × rem readout
    var viewportRemInput = document.createElement('input');
    viewportRemInput.type = 'text';
    viewportRemInput.id = 'viewport-rem-input';
    viewportRemInput.className = 'viewport-input viewport-input-rem';
    viewportRemInput.placeholder = '75.00 × 50.00 rem';
    viewportRemInput.readOnly = true;

    var dropdownMenu = document.createElement('div');
    dropdownMenu.id = 'viewport-dropdown';
    dropdownMenu.className = 'viewport-dropdown-menu';

    viewportContainer.appendChild(viewportInput);
    viewportContainer.appendChild(viewportRemInput);
    viewportContainer.appendChild(dropdownMenu);

    // Add both containers to the debug container
    debugContainer.appendChild(divElement);
    debugContainer.appendChild(viewportContainer);

    // Append the debug container to the body
    var bodyElement = document.body || document.getElementsByTagName('body')[0];
    if (bodyElement) {
      bodyElement.appendChild(debugContainer);
    } else {
      console.error('Could not find the <body> element to append the debug controls.');
    }
  } catch (error) {
    console.error('Error while adding debug controls: ', error);
  }

  try {
    // Constants for viewport management
    const DEFAULT_VIEWPORTS = [
      { value: 320, label: 'sm: 0-639px', breakpoint: 'sm', description: 'Small devices (0-639px)' },
      { value: 640, label: 'sm: 640px', breakpoint: 'sm', description: '640px (592px available)' },
      { value: 768, label: 'md: 768px', breakpoint: 'md', description: '768px (704px available)' },
      { value: 1024, label: 'lg: 1024px', breakpoint: 'lg', description: '1024px (960px available)' },
      { value: 1280, label: 'xl: 1280px', breakpoint: 'xl', description: '1280px (1216px available)' }
    ];

    // State management
    let currentViewportWidth = window.innerWidth;
    let currentViewportHeight = window.innerHeight;
    let isDropdownOpen = false;
    let inspectorTooltip = null;

    // DOM elements
    const debugToggleCheckbox = document.getElementById('debug-mode-toggle');
    const viewportInput = document.getElementById('viewport-input');
    const viewportRemInput = document.getElementById('viewport-rem-input');
    const dropdownMenu = document.getElementById('viewport-dropdown');
    const body = document.body;

    // Get current breakpoint
    function getCurrentBreakpoint() {
      const width = currentViewportWidth;
      if (width >= VIEWPORTS.xl.viewportWidth) return 'xl';     // ≥ 1280px
      if (width >= VIEWPORTS.lg.viewportWidth) return 'lg';     // ≥ 1024px
      if (width >= VIEWPORTS.md.viewportWidth) return 'md';     // ≥ 768px
      return 'sm';                                              // Includes both xs and sm (0-767px)
    }

    // Update viewport input display with color coding
    function updateViewportDisplay() {
      if (viewportInput) {
        const breakpoint = getCurrentBreakpoint();
        viewportInput.value = `${currentViewportWidth} × ${currentViewportHeight} px (${breakpoint})`;
        
        // Remove previous breakpoint classes
        viewportInput.classList.remove('sm', 'md', 'lg', 'xl');
        // Add current breakpoint class for color coding
        viewportInput.classList.add(breakpoint);
      }

      if (viewportRemInput) {
        var rootFontSizePx = 16;
        try {
          var computedFontSize = window.getComputedStyle(document.documentElement).fontSize;
          var parsed = parseFloat(computedFontSize);
          if (!isNaN(parsed) && parsed > 0) {
            rootFontSizePx = parsed;
          }
        } catch (e) {}
        var widthRem = (currentViewportWidth / rootFontSizePx).toFixed(2);
        var heightRem = (currentViewportHeight / rootFontSizePx).toFixed(2);
        viewportRemInput.value = `${widthRem} × ${heightRem} rem`;
      }
    }

    // Populate dropdown menu with breakpoint legend
    function populateDropdown() {
      if (!dropdownMenu) return;

      dropdownMenu.innerHTML = '';

      // Add header
      const header = document.createElement('div');
      header.className = 'viewport-legend-header';
      header.textContent = 'Breakpoint Reference';
      dropdownMenu.appendChild(header);

      // Add breakpoint items
      DEFAULT_VIEWPORTS.forEach(viewport => {
        const item = document.createElement('div');
        item.className = 'viewport-breakpoint-item';
        
        const badge = document.createElement('span');
        badge.className = `breakpoint-badge ${viewport.breakpoint}`;
        badge.textContent = viewport.breakpoint;
        
        const description = document.createElement('span');
        description.textContent = viewport.description;
        
        item.appendChild(badge);
        item.appendChild(description);
        dropdownMenu.appendChild(item);
      });
    }

    // Open dropdown
    function openDropdown() {
      if (!dropdownMenu) return;
      
      populateDropdown();
      dropdownMenu.classList.add('open');
      isDropdownOpen = true;
    }

    // Close dropdown
    function closeDropdown() {
      if (!dropdownMenu) return;
      
      dropdownMenu.classList.remove('open');
      isDropdownOpen = false;
    }

    // Define debug mode key locally
    const DEBUG_MODE_KEY = 'twlayout-debug-mode';
    
    // Create inspector tooltip
    function createInspectorTooltip() {
      inspectorTooltip = document.createElement('div');
      inspectorTooltip.id = 'debug-inspector-tooltip';
      inspectorTooltip.className = 'debug-inspector-tooltip';
      document.body.appendChild(inspectorTooltip);
    }

    // Update inspector tooltip position and content
    function updateInspectorTooltip(event) {
      if (!inspectorTooltip) return;
      
      const target = event.target;
      
      // Skip showing tooltip for debug mode UI elements
      if (target.closest('.debug-container') || 
          target.closest('.debug-toggle-container') || 
          target.closest('.viewport-container') ||
          target.closest('.debug-inspector-tooltip')) {
        hideInspectorTooltip(event);
        return;
      }
      
      const rect = target.getBoundingClientRect();
      const elementInfo = {
        tag: target.tagName.toLowerCase(),
        classes: target.className,
        id: target.id,
        dimensions: `${Math.round(rect.width)}x${Math.round(rect.height)}`
      };
      
      // Format the tooltip content
      let tooltipContent = `<div class="tooltip-tag">${elementInfo.tag}</div>`;
      
      if (elementInfo.id) {
        tooltipContent += `<div class="tooltip-id">#${elementInfo.id}</div>`;
      }
      
      if (elementInfo.classes && typeof elementInfo.classes === 'string') {
        const classes = elementInfo.classes.split(' ').filter(c => c.trim() !== '');
        tooltipContent += '<div class="tooltip-classes">';
        classes.forEach(className => {
          tooltipContent += `<span class="tooltip-class">${className}</span>`;
        });
        tooltipContent += '</div>';
      }
      
      tooltipContent += `<div class="tooltip-dimensions">${elementInfo.dimensions}</div>`;
      
      // Update tooltip content
      inspectorTooltip.innerHTML = tooltipContent;
      
      // Set display to block so we can measure dimensions
      inspectorTooltip.style.display = 'block';
      
      // Get tooltip dimensions after updating content
      const tooltipHeight = inspectorTooltip.offsetHeight;
      const tooltipWidth = inspectorTooltip.offsetWidth;
      
      // Get viewport dimensions
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const scrollY = window.scrollY;
      
      // Get element position relative to viewport
      const elementCenterX = rect.left + (rect.width / 2);
      const elementCenterY = rect.top + (rect.height / 2);
      
      // Check if element is a full-screen tag
      const elementIsFullScreen = (rect.width > viewportWidth * 0.9);
      
      // Standard gap from element
      const gap = 12; // Increased from 10px to 32px as requested
      
      // Position calculation
      let top, left;
      
      if (elementIsFullScreen) {
        // For full-screen elements, position based on mouse location relative to screen center
        const isMouseLeftOfCenter = event.clientX < viewportWidth / 2;
        
        // Set vertical position at top of the element with gap
        top = rect.top + gap + scrollY;
        
        if (isMouseLeftOfCenter) {
          // When mouse is left of center, place tooltip at top-right corner
          left = rect.right - tooltipWidth - gap;
        } else {
          // When mouse is right of center, place tooltip at top-left corner
          left = rect.left + gap;
        }
      } else {
        // Determine if element is to the left or right of viewport center
        const isLeftOfCenter = elementCenterX < viewportWidth / 2;
        
        // Determine vertical placement (above or below element)
        const placeBelow = elementCenterY < viewportHeight / 2;
        
        if (placeBelow) {
          // Position below the element
          top = rect.bottom + gap + scrollY;
          
          // Check if tooltip would go off bottom of viewport
          if (top + tooltipHeight > scrollY + viewportHeight - gap) {
            // Position above the element instead
            top = rect.top - tooltipHeight - gap + scrollY;
          }
        } else {
          // Position above the element
          top = rect.top - tooltipHeight - gap + scrollY;
          
          // Check if tooltip would go off top of viewport
          if (top < scrollY + gap) {
            // Position below the element instead
            top = rect.bottom + gap + scrollY;
          }
        }
        
        // Horizontal positioning based on element position relative to center
        if (isLeftOfCenter) {
          // For elements on the left side, align tooltip with left edge of element
          left = rect.left;
        } else {
          // For elements on the right side, align tooltip with right edge of element
          left = rect.right - tooltipWidth;
        }
        
        // Final boundary checks to keep tooltip on screen
        if (left < gap) {
          left = gap;
        } else if (left + tooltipWidth > viewportWidth - gap) {
          left = viewportWidth - tooltipWidth - gap;
        }
      }
      
      // Set tooltip position
      inspectorTooltip.style.top = `${top}px`;
      inspectorTooltip.style.left = `${left}px`;
      
      // Highlight the current element
      target.classList.add('debug-inspected-element');
    }
    
    // Hide inspector tooltip
    function hideInspectorTooltip(event) {
      if (!inspectorTooltip) return;
      
      const target = event.target;
      target.classList.remove('debug-inspected-element');
      inspectorTooltip.style.display = 'none';
    }
    
    // Enable inspector
    function enableInspector() {
      if (!inspectorTooltip) {
        createInspectorTooltip();
      }
      document.body.classList.add('debug-inspector-active');
      document.addEventListener('mouseover', updateInspectorTooltip);
      document.addEventListener('mouseout', hideInspectorTooltip);
    }
    
    // Disable inspector
    function disableInspector() {
      document.body.classList.remove('debug-inspector-active');
      document.removeEventListener('mouseover', updateInspectorTooltip);
      document.removeEventListener('mouseout', hideInspectorTooltip);
      if (inspectorTooltip) {
        inspectorTooltip.style.display = 'none';
      }
    }

    // Event listeners
    if (viewportInput) {
      viewportInput.addEventListener('click', () => {
        if (body.classList.contains('debug-mode')) {
          if (isDropdownOpen) {
            closeDropdown();
          } else {
            openDropdown();
          }
        }
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (isDropdownOpen && !e.target.closest('.viewport-container')) {
        closeDropdown();
      }
    });

    // Update viewport on window resize
    window.addEventListener('resize', () => {
      currentViewportWidth = window.innerWidth;
      currentViewportHeight = window.innerHeight;
      updateViewportDisplay();
    });

    // Initialization Function
    function initDebugMode() {
      const savedState = localStorage.getItem(DEBUG_MODE_KEY);
      if (savedState === 'enabled') {
        debugToggleCheckbox.checked = true;
        body.classList.add('debug-mode');
        enableInspector();
      } else {
        debugToggleCheckbox.checked = false;
        body.classList.remove('debug-mode');
        disableInspector();
      }
      updateViewportDisplay();
    }
    
    // Update debug toggle event listener
    if (debugToggleCheckbox) {
      debugToggleCheckbox.addEventListener('change', function() {
        if (this.checked) {
          body.classList.add('debug-mode');
          localStorage.setItem(DEBUG_MODE_KEY, 'enabled');
          updateViewportDisplay();
          enableInspector();
        } else {
          body.classList.remove('debug-mode');
          localStorage.setItem(DEBUG_MODE_KEY, 'disabled');
          closeDropdown();
          disableInspector();
        }
      });
    }

    // Call Initialization
    initDebugMode();

  } catch (error) {
    console.error('Error in debug mode logic: ', error);
  }
})(); 