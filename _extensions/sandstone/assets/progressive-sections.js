(function () {
  'use strict';

  console.log('[learnr-sections] Script loaded');

  // Store sections globally for TOC handler access
  let globalSections = [];
  let currentRevealedIndex = -1;

  // localStorage key for user preference
  const STORAGE_KEY = 'soles-progressive-enabled';

  // Track if progressive mode is currently active
  let isProgressiveActive = true;

  function getMainEl() {
    return (
      document.querySelector('main.content') ||
      document.querySelector('main') ||
      document.querySelector('#quarto-content') ||
      document.body
    );
  }

  function getLevel1Parents(mainEl) {
    var allLevel1 = Array.from(mainEl.querySelectorAll('section.level1'));
    return allLevel1.filter(function (l1) {
      return l1.querySelector('section.level2') !== null;
    });
  }

  function getTopLevelSections(mainEl) {
    const allLevel2 = Array.from(mainEl.querySelectorAll('section.level2'));
    return allLevel2.filter((section) => {
      const parentLevel2 = section.parentElement
        ? section.parentElement.closest('section.level2')
        : null;
      return parentLevel2 == null;
    });
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function revealUpTo(sections, indexInclusive) {
    console.log('[learnr-sections] Revealing up to index', indexInclusive);
    
    // Update our tracking variable
    currentRevealedIndex = indexInclusive;
    
    sections.forEach((section, idx) => {
      if (idx <= indexInclusive) {
        section.classList.add('lr-visible');
        // Use grid for page-columns sections, block otherwise
        if (section.classList.contains('page-columns')) {
          section.style.display = 'grid';
        } else {
          section.style.display = 'block';
        }
      } else {
        section.classList.remove('lr-visible');
        section.style.display = 'none';
      }
    });

    // Update button states and visibility - only show button on the last revealed section
    sections.forEach((section, idx) => {
      const controls = section.querySelector('.lr-controls');
      if (!controls) return;
      
      const btn = controls.querySelector('.lr-next');
      if (!btn) return;
      
      const isLast = idx === sections.length - 1;
      btn.disabled = isLast;
      btn.setAttribute('aria-disabled', String(isLast));
      
      // Only show the button container on the last revealed section
      if (idx === indexInclusive && !isLast) {
        controls.style.display = 'flex';
      } else {
        controls.style.display = 'none';
      }
    });

    // Show/hide level-1 parent sections based on child visibility
    var level1Parents = getLevel1Parents(getMainEl());
    level1Parents.forEach(function (l1) {
      var childLevel2s = l1.querySelectorAll('section.level2');
      var anyChildVisible = Array.from(childLevel2s).some(function (l2) {
        return l2.classList.contains('lr-visible');
      });
      if (anyChildVisible) {
        l1.classList.add('lr-visible');
        l1.style.display = l1.classList.contains('page-columns') ? 'grid' : 'block';
      } else {
        l1.classList.remove('lr-visible');
        l1.style.display = 'none';
      }
    });

    // Update TOC link states - do this and then force it again after a tiny delay
    // to override any native Quarto TOC highlighting
    updateTocLinkStates(sections, indexInclusive);
    setTimeout(function() {
      updateTocLinkStates(sections, indexInclusive);
    }, 50);
  }

  function updateTocLinkStates(sections, revealedUpToIndex) {
    const tocById = document.getElementById('TOC');
    if (!tocById) return;
    
    // Clear all active states first
    const allLinks = tocById.getElementsByTagName('a');
    for (let i = 0; i < allLinks.length; i++) {
      allLinks[i].classList.remove('active');
    }
    
    // Find the TOC link for the currently revealed section and mark it active
    if (revealedUpToIndex >= 0 && revealedUpToIndex < sections.length) {
      const currentSection = sections[revealedUpToIndex];
      const sectionId = currentSection.id;
      if (sectionId) {
        for (let i = 0; i < allLinks.length; i++) {
          const link = allLinks[i];
          if (link.hash === '#' + sectionId) {
            link.classList.add('active');
            break;
          }
        }
      }
    }
  }

  function addNextButtons(sections) {
    sections.forEach((section, idx) => {
      // Skip the last section - no next button needed
      if (idx === sections.length - 1) return;

      // Avoid duplicates if Quarto rehydrates content
      if (section.querySelector('.lr-controls')) return;

      const controls = document.createElement('div');
      controls.className = 'lr-controls';

      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'btn btn-primary lr-next';
      nextBtn.textContent = 'Next';
      nextBtn.addEventListener('click', function() {
        const nextIndex = clamp(idx + 1, 0, sections.length - 1);
        revealUpTo(sections, nextIndex);
        sections[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      // Add descriptive text beside the button
      const helperText = document.createElement('span');
      helperText.className = 'lr-helper-text';
      helperText.textContent = 'Continue →';
      helperText.setAttribute('aria-label', 'Click to continue');

      controls.appendChild(helperText);
      controls.appendChild(nextBtn);
      section.appendChild(controls);
    });
  }

  function disableProgressiveMode(sections) {
    console.log('[learnr-sections] Disabling progressive mode');
    isProgressiveActive = false;

    // Show all sections
    sections.forEach(function (section) {
      section.classList.add('lr-disabled');
      section.classList.remove('lr-visible');
      if (section.classList.contains('page-columns')) {
        section.style.display = 'grid';
      } else {
        section.style.display = 'block';
      }

      // Hide the Next button controls
      const controls = section.querySelector('.lr-controls');
      if (controls) {
        controls.style.display = 'none';
      }
    });

    // Show level-1 parent sections
    var level1Parents = getLevel1Parents(getMainEl());
    level1Parents.forEach(function (l1) {
      l1.classList.add('lr-disabled');
      l1.classList.remove('lr-visible');
      l1.style.display = l1.classList.contains('page-columns') ? 'grid' : 'block';
    });

    // Save preference
    try {
      localStorage.setItem(STORAGE_KEY, 'false');
    } catch (e) {
      console.log('[learnr-sections] Could not save preference:', e);
    }
  }

  function enableProgressiveMode(sections) {
    console.log('[learnr-sections] Enabling progressive mode');
    isProgressiveActive = true;

    // Remove disabled class from all sections
    sections.forEach(function (section) {
      section.classList.remove('lr-disabled');
    });

    // Reset level-1 parents so CSS can hide them again
    var level1Parents = getLevel1Parents(getMainEl());
    level1Parents.forEach(function (l1) {
      l1.classList.remove('lr-disabled');
    });

    // Reset to first section only
    revealUpTo(sections, 0);

    // Scroll to first section
    if (sections.length > 0) {
      sections[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Save preference
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch (e) {
      console.log('[learnr-sections] Could not save preference:', e);
    }
  }

  function createToggleControl(sections, initialState) {
    const toc = document.getElementById('TOC');
    if (!toc) {
      console.log('[learnr-sections] No TOC found, skipping toggle creation');
      return;
    }

    // Avoid duplicate toggle
    if (toc.querySelector('.lr-toc-toggle')) {
      return;
    }

    // Create toggle container
    const toggleContainer = document.createElement('div');
    toggleContainer.className = 'lr-toc-toggle';

    // Create label
    const label = document.createElement('label');
    label.className = 'lr-toggle-label';

    // Create checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'lr-progressive-toggle';
    checkbox.checked = initialState;

    // Create label text
    const labelText = document.createElement('span');
    labelText.className = 'lr-toggle-text';
    labelText.textContent = 'Guided mode';

    // Assemble
    label.appendChild(checkbox);
    label.appendChild(labelText);
    toggleContainer.appendChild(label);

    // Insert at top of TOC
    toc.insertBefore(toggleContainer, toc.firstChild);

    // Add event listener
    checkbox.addEventListener('change', function () {
      if (checkbox.checked) {
        enableProgressiveMode(sections);
      } else {
        disableProgressiveMode(sections);
      }
    });

    console.log('[learnr-sections] Toggle control created');
  }

  function getUserPreference() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'true') return true;
      if (stored === 'false') return false;
      return null; // No preference stored
    } catch (e) {
      return null;
    }
  }

  function findSectionIndexForTarget(sections, targetId) {
    const targetEl = document.getElementById(targetId);
    if (!targetEl) {
      console.log('[learnr-sections] Target not found:', targetId);
      return -1;
    }
    
    // Check if target itself is a level2 section
    for (let i = 0; i < sections.length; i++) {
      if (sections[i].id === targetId) {
        return i;
      }
    }
    
    // Check if target is inside a level2 section
    const parentSection = targetEl.closest('section.level2');
    if (parentSection) {
      for (let i = 0; i < sections.length; i++) {
        if (sections[i] === parentSection || sections[i].contains(parentSection)) {
          return i;
        }
      }
    }
    
    return -1;
  }

  function setupTocNavigation(sections) {
    // Debug: check what's in the document
    const tocById = document.getElementById('TOC');
    
    if (!tocById) {
      console.log('[learnr-sections] No TOC found');
      return;
    }
    
    // Use getElementsByTagName and filter by link.hash property (the URL fragment)
    const allLinks = tocById.getElementsByTagName('a');
    const tocLinks = [];
    
    for (let i = 0; i < allLinks.length; i++) {
      const link = allLinks[i];
      // Use the .hash property which gives us "#section-id" directly
      if (link.hash && link.hash.length > 1) {
        tocLinks.push(link);
      }
    }
    
    console.log('[learnr-sections] Found', tocLinks.length, 'TOC links with hash fragments');
    
    if (!tocLinks.length) {
      return;
    }
    
    tocLinks.forEach(function(link) {
      // Use capture phase to intercept before Quarto's handlers
      link.addEventListener('click', function(e) {
        // If progressive mode is disabled, let normal navigation happen
        if (!isProgressiveActive) {
          return;
        }
        
        // Use link.hash which gives "#section-id"
        const hash = link.hash;
        if (!hash || hash.length < 2) return;
        
        const targetId = hash.slice(1); // Remove the leading #
        console.log('[learnr-sections] TOC click:', targetId);
        
        const sectionIndex = findSectionIndexForTarget(sections, targetId);
        console.log('[learnr-sections] Section index:', sectionIndex);
        
        if (sectionIndex === -1) return;
        
        // Stop the event from propagating
        e.preventDefault();
        e.stopPropagation();
        
        // Reveal all sections up to and including this one
        revealUpTo(sections, sectionIndex);
        
        // Scroll to the target
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          setTimeout(function() {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
        
        return false;
      }, true); // Use capture phase
    });
  }

  function init() {
    console.log('[learnr-sections] Initializing...');

    // Check if progressive sections is enabled via YAML
    let yamlEnabled = true; // default

    // Method 1: Check window variable set by inline script
    if (typeof window.QUARTO_PROGRESSIVE_SECTIONS !== 'undefined') {
      yamlEnabled = window.QUARTO_PROGRESSIVE_SECTIONS !== false;
    }

    // Method 2: Check for data attribute on body
    if (document.body.dataset.progressiveSections) {
      yamlEnabled = document.body.dataset.progressiveSections !== 'false';
    }

    console.log('[learnr-sections] YAML progressive sections:', yamlEnabled);

    // If YAML disables progressive sections entirely, don't show the toggle
    if (!yamlEnabled) {
      console.log('[learnr-sections] Progressive sections disabled via YAML - no toggle');
      const mainEl = getMainEl();
      const sections = getTopLevelSections(mainEl);
      sections.forEach(function (section) {
        section.classList.add('lr-disabled');
        if (section.classList.contains('page-columns')) {
          section.style.display = 'grid';
        } else {
          section.style.display = 'block';
        }
      });
      // Also show level-1 parents
      var level1Parents = getLevel1Parents(mainEl);
      level1Parents.forEach(function (l1) {
        l1.classList.add('lr-disabled');
        l1.style.display = l1.classList.contains('page-columns') ? 'grid' : 'block';
      });
      return;
    }

    // YAML allows progressive sections - check user preference
    const userPref = getUserPreference();
    let shouldEnableProgressive = userPref !== null ? userPref : false;

    console.log('[learnr-sections] User preference:', userPref, '-> Enable progressive:', shouldEnableProgressive);

    const mainEl = getMainEl();
    const sections = getTopLevelSections(mainEl);
    globalSections = sections;

    console.log('[learnr-sections] Found', sections.length, 'level-2 sections');
    sections.forEach(function (s, i) {
      console.log('[learnr-sections]   Section', i, ':', s.id);
    });

    // If the page has no level-2 sections, do nothing.
    if (!sections.length) {
      console.log('[learnr-sections] No sections found, exiting');
      return;
    }

    // Always add Next buttons (they'll be hidden when disabled)
    addNextButtons(sections);

    // Handle TOC link clicks - try immediately, then retry after delays
    // (Quarto may be processing the TOC asynchronously)
    setupTocNavigation(sections);
    setTimeout(function () { setupTocNavigation(sections); }, 100);
    setTimeout(function () { setupTocNavigation(sections); }, 500);
    setTimeout(function () { setupTocNavigation(sections); }, 1000);

    // Create the toggle control in TOC (retry for TOC availability)
    createToggleControl(sections, shouldEnableProgressive);
    setTimeout(function () { createToggleControl(sections, shouldEnableProgressive); }, 100);
    setTimeout(function () { createToggleControl(sections, shouldEnableProgressive); }, 500);

    // Initialize in appropriate state
    if (shouldEnableProgressive) {
      isProgressiveActive = true;
      // Hide all sections first, then reveal first one
      sections.forEach(function (section) {
        section.style.display = 'none';
      });
      var level1Parents = getLevel1Parents(mainEl);
      level1Parents.forEach(function (l1) {
        l1.style.display = 'none';
      });
      revealUpTo(sections, 0);
    } else {
      // User prefers all sections visible
      disableProgressiveMode(sections);
    }

    // Disable Quarto's native TOC scroll highlighting and use our own
    // This prevents Quarto from highlighting other sections based on scroll
    document.addEventListener('scroll', function () {
      // Only enforce our highlighting when in progressive mode
      if (isProgressiveActive && currentRevealedIndex >= 0) {
        updateTocLinkStates(sections, currentRevealedIndex);
      }
    }, true);

    console.log('[learnr-sections] Done - initialized in', shouldEnableProgressive ? 'progressive' : 'show-all', 'mode');
  }

  // Run immediately if DOM already loaded, otherwise wait
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already loaded, run now
    init();
  }
})();
