// gsheets-namedranges-filter
// content.js

(function() {
  let observer;
  let initialized = false;
  let listObserver;

  function getDocumentName() {
    let docName = document.querySelector('.docs-title-input-label-inner');
    if (docName) {
      return docName.textContent.trim();
    } else {
      // fallback to doc title
      let title = document.title;
      // Remove " - Google Sheets"
      return title.replace(' - Google Sheets', '').trim();
    }
  }

// save filter state to local storage
  function saveFilters() {
    const filters = [];
    const filterRows = document.querySelectorAll('.custom-filter-row');
    filterRows.forEach(row => {
      const prefixInput = row.querySelector('.custom-filter-input');
      const activeCheckbox = row.querySelector('.custom-filter-checkbox');
      const suffixCheckbox = row.querySelector('.custom-suffix-checkbox');
      const caseCheckbox = row.querySelector('.custom-case-checkbox');
      const passiveCheckbox = row.querySelector('.custom-passive-checkbox');
      filters.push({
        prefix: prefixInput.value.trim(),
        active: activeCheckbox.checked,
        suffix: suffixCheckbox.checked,
        caseSensitive: caseCheckbox.checked,
        passive: passiveCheckbox.checked
      });
    });
    const docName = getDocumentName();
    const storageKey = 'filters_' + docName;
    chrome.runtime.sendMessage({ action: 'saveFilters', key: storageKey, filters }, response => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
      }
    });
  }

// load filter state from local storage
  function loadFilters(callback) {
    const docName = getDocumentName();
    const storageKey = 'filters_' + docName;
    chrome.runtime.sendMessage({ action: 'loadFilters', key: storageKey }, response => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        callback([]);
      } else {
        callback(response.filters || []);
      }
    });
  }

// filter named ranges based on pre / suf
  function filterNamedRanges() {
    const namedRangeElements = document.querySelectorAll('.waffle-named-ranges-pill');
    const filterRows = document.querySelectorAll('.custom-filter-row');

    let activeFilters = [];
    let passiveFilters = [];

    filterRows.forEach(row => {
      const prefixInput = row.querySelector('.custom-filter-input');
      const activeCheckbox = row.querySelector('.custom-filter-checkbox');
      const suffixCheckbox = row.querySelector('.custom-suffix-checkbox');
      const caseCheckbox = row.querySelector('.custom-case-checkbox');
      const passiveCheckbox = row.querySelector('.custom-passive-checkbox');
      const prefix = prefixInput.value.trim();

      if (prefix !== '') {
        const filter = {
          prefix,
          isSuffix: suffixCheckbox.checked,
          isCaseSensitive: caseCheckbox.checked
        };
        if (activeCheckbox.checked) {
          activeFilters.push(filter);
        }
        if (passiveCheckbox.checked) {
          passiveFilters.push(filter);
        }
      }
    });

    namedRangeElements.forEach(element => {
      const rangeNameElement = element.querySelector('.waffle-named-ranges-range-name-holder');
      if (rangeNameElement) {
        let rangeName = rangeNameElement.textContent.trim();
        let showElement = false;

        // Check if range matches any active filters
        let matchesActiveFilter = false;
        if (activeFilters.length > 0) {
          matchesActiveFilter = activeFilters.some(filter => {
            let prefix = filter.prefix;
            let name = rangeName;
            if (!filter.isCaseSensitive) {
              prefix = prefix.toLowerCase();
              name = name.toLowerCase();
            }
            if (filter.isSuffix) {
              return name.endsWith(prefix);
            } else {
              return name.startsWith(prefix);
            }
          });
          showElement = matchesActiveFilter;
        } else {
          // No active filters; default to showing the range
          showElement = true;
        }

        // Check if range matches any passive filters
        if (passiveFilters.length > 0) {
          const matchesPassiveFilter = passiveFilters.some(filter => {
            let prefix = filter.prefix;
            let name = rangeName;
            if (!filter.isCaseSensitive) {
              prefix = prefix.toLowerCase();
              name = name.toLowerCase();
            }
            if (filter.isSuffix) {
              return name.endsWith(prefix);
            } else {
              return name.startsWith(prefix);
            }
          });
          // Hide the range if it matches a passive filter and does not match any active filter
          if (matchesPassiveFilter && !matchesActiveFilter) {
            showElement = false;
          }
        }

        element.style.display = showElement ? '' : 'none';
      }
    });
  }

  // update the add / del buttons
  function updateButtons() {
    const filterContainer = document.querySelector('.custom-filter-container');
    const filterRows = filterContainer.querySelectorAll('.custom-filter-row');
    filterRows.forEach((row, index) => {
      const isFirstRow = index === 0;
      const isLastRow = index === filterRows.length - 1;
      const buttonContainer = row.querySelector('.button-container');
      buttonContainer.innerHTML = '';

      // delete button
      if (!isFirstRow) {
        const deleteButton = createDeleteButton(row);
        buttonContainer.appendChild(deleteButton);
      }

      // add button
      if (isLastRow) {
        const addButton = createAddButton();
        buttonContainer.appendChild(addButton);
      }
    });
  }

// create add / del

  function createDeleteButton(row) {
    const deleteButton = document.createElement('div');
    deleteButton.style.width = '24px';
    deleteButton.style.height = '24px';
    deleteButton.style.marginLeft = '8px';
    deleteButton.style.cursor = 'pointer';
    deleteButton.title = 'Delete filter';
    deleteButton.innerHTML = '<span style="font-size:18px;">🗑️</span>';
    deleteButton.addEventListener('click', () => {
      if (!deleteButton.clickedOnce) {
        deleteButton.clickedOnce = true;
        deleteButton.innerHTML = '<span style="font-size:18px; color:red;">❌</span>';
        setTimeout(() => {
          deleteButton.clickedOnce = false;
          deleteButton.innerHTML = '<span style="font-size:18px;">🗑️</span>';
        }, 2000);
      } else {
        row.remove();
        updateButtons();
        filterNamedRanges();
        saveFilters();
      }
    });
    return deleteButton;
  }

  function createAddButton() {
    const addButton = document.createElement('div');
    addButton.style.width = '24px';
    addButton.style.height = '24px';
    addButton.style.marginLeft = '8px';
    addButton.style.cursor = 'pointer';
    addButton.title = 'Add filter';
    addButton.innerHTML = '<span style="font-size:24px;">+</span>';
    addButton.addEventListener('click', () => {
      addFilterRow();
      saveFilters();
    });
    return addButton;
  }

// homemade waffle
  function createFilterRow(filter = {}) {
	  
    // copy gsheets style
    const filterRow = document.createElement('div');
    filterRow.classList.add('custom-filter-row');
    filterRow.style.display = 'flex';
    filterRow.style.alignItems = 'center';
    filterRow.style.padding = '8px';
    filterRow.style.cursor = 'pointer';
    filterRow.style.borderBottom = '1px solid #e0e0e0';
    filterRow.style.backgroundColor = '#fff';
    filterRow.addEventListener('mouseover', () => {
      filterRow.style.backgroundColor = '#f1f3f4';
    });
    filterRow.addEventListener('mouseout', () => {
      filterRow.style.backgroundColor = '#fff';
    });

    // ACTIVE BLUE
    const activeCheckbox = document.createElement('input');
    activeCheckbox.type = 'checkbox';
    activeCheckbox.classList.add('custom-filter-checkbox');
    activeCheckbox.style.marginRight = '8px';
    activeCheckbox.style.width = '20px';
    activeCheckbox.style.height = '20px';
    activeCheckbox.style.accentColor = '#1a73e8'; // Google blue
    activeCheckbox.checked = filter.active || false;
    activeCheckbox.title = 'Show filtered ranges ONLY'; // Hover text
    activeCheckbox.addEventListener('change', () => {
      filterNamedRanges();
      saveFilters();
    });

    // PASSIVE YELLOW
    const passiveCheckbox = document.createElement('input');
    passiveCheckbox.type = 'checkbox';
    passiveCheckbox.classList.add('custom-passive-checkbox');
    passiveCheckbox.style.marginRight = '8px';
    passiveCheckbox.style.width = '20px';
    passiveCheckbox.style.height = '20px';
    passiveCheckbox.style.accentColor = '#fbbc04'; // Google yellow
    passiveCheckbox.checked = filter.passive || false; // Default to unchecked
    passiveCheckbox.title = 'Hide from default list'; // Hover text
    passiveCheckbox.addEventListener('change', () => {
      filterNamedRanges();
      saveFilters();
    });

    // input field
    const prefixInput = document.createElement('input');
    prefixInput.type = 'text';
    prefixInput.placeholder = getPlaceholderText(filter);
    prefixInput.classList.add('custom-filter-input');
    prefixInput.value = filter.prefix || '';
    prefixInput.style.width = '80px'; // Fixed width
    prefixInput.style.marginRight = '8px';
    prefixInput.style.padding = '4px';
    prefixInput.style.border = '1px solid #ccc';
    prefixInput.style.borderRadius = '4px';
    prefixInput.style.fontStyle = 'italic';
    prefixInput.addEventListener('input', () => {
      filterNamedRanges();
      saveFilters();
    });

    // SUFFIX ORANGE
    const suffixCheckbox = document.createElement('input');
    suffixCheckbox.type = 'checkbox';
    suffixCheckbox.classList.add('custom-suffix-checkbox');
    suffixCheckbox.style.marginRight = '8px';
    suffixCheckbox.style.width = '20px';
    suffixCheckbox.style.height = '20px';
    suffixCheckbox.style.accentColor = '#ff9800'; // Orange color
    suffixCheckbox.checked = filter.suffix || false;
    suffixCheckbox.title = 'SUFFIX filter'; // Hover text
    suffixCheckbox.addEventListener('change', () => {
      prefixInput.placeholder = getPlaceholderText({
        suffix: suffixCheckbox.checked,
        caseSensitive: caseCheckbox.checked
      });
      filterNamedRanges();
      saveFilters();
    });

    // CASE-SENSE ORANGE
    const caseCheckbox = document.createElement('input');
    caseCheckbox.type = 'checkbox';
    caseCheckbox.classList.add('custom-case-checkbox');
    caseCheckbox.style.marginRight = '8px';
    caseCheckbox.style.width = '20px';
    caseCheckbox.style.height = '20px';
    caseCheckbox.style.accentColor = '#9c27b0'; // Purple color
    caseCheckbox.checked = filter.caseSensitive || false;
    caseCheckbox.title = 'Case sensitive'; // Hover text
    caseCheckbox.addEventListener('change', () => {
      prefixInput.placeholder = getPlaceholderText({
        suffix: suffixCheckbox.checked,
        caseSensitive: caseCheckbox.checked
      });
      filterNamedRanges();
      saveFilters();
    });

    // add / del container
    const buttonContainer = document.createElement('div');
    buttonContainer.classList.add('button-container');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.alignItems = 'center';

    // cook waffle
    filterRow.appendChild(activeCheckbox);
    filterRow.appendChild(passiveCheckbox);
    filterRow.appendChild(prefixInput);
    filterRow.appendChild(suffixCheckbox);
    filterRow.appendChild(caseCheckbox);
    filterRow.appendChild(buttonContainer);

    return filterRow;
  }

  // input field empty
  function getPlaceholderText(filter) {
    const { suffix, caseSensitive } = filter;
    let placeholder = '';
    if (suffix) {
      placeholder = caseSensitive ? 'SufFix' : 'suffix';
    } else {
      placeholder = caseSensitive ? 'PreFix' : 'prefix';
    }
    return placeholder;
  }

  // new filter row
  function addFilterRow(filter = {}) {
    const filterContainer = document.querySelector('.custom-filter-container');
    const newRow = createFilterRow(filter);
    filterContainer.appendChild(newRow);
    updateButtons();
  }

  // filter options
  function addFilterOptions() {
    // check pre exist
    if (document.querySelector('.custom-filter-container')) return;

    const addRangeElement = document.querySelector('#waffle-named-ranges-add-range');
    if (addRangeElement) {
      const filterContainer = document.createElement('div');
      filterContainer.classList.add('custom-filter-container');

      // load filter state
      loadFilters(filters => {
        // create initial row
        if (filters.length === 0) {
          filters.push({});  // default 1 unremoveable filter
        }
        filters.forEach((filter) => {
          const filterRow = createFilterRow(filter);
          filterContainer.appendChild(filterRow);
        });

        // instert after 'Add a range +'
        addRangeElement.parentNode.insertBefore(filterContainer, addRangeElement.nextSibling);

  // first go
        updateButtons();

        filterNamedRanges();
      });
    }
  }

  // observed named ranges container
  function setupNamedRangesObserver() {
    const namedRangesContainer = document.getElementById('waffle-named-ranges-container');
    if (namedRangesContainer) {
      if (listObserver) {
        listObserver.disconnect();
      }
      const observerConfig = { childList: true, subtree: true };
      listObserver = new MutationObserver((mutationsList) => {
        filterNamedRanges();
      });
      listObserver.observe(namedRangesContainer, observerConfig);
    }
  }
  
  
  function initialize() {
    if (initialized) return;
    initialized = true;

    addFilterOptions();
    setupNamedRangesObserver();
  }

  // detect changes
  const observerCallback = function(mutationsList) {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.matches('.waffle-sidebar-container')) {
              initialized = false;
              initialize();
            } else if (node.querySelector && node.querySelector('.waffle-sidebar-container')) {
              initialized = false;
              initialize();
            }
            if (node.matches('#waffle-named-ranges-container') || node.querySelector('#waffle-named-ranges-container')) {
              setupNamedRangesObserver();
            }
          }
        });
        mutation.removedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.matches('.waffle-sidebar-container')) {
              initialized = false;
            }
            if (node.matches('#waffle-named-ranges-container')) {
              if (listObserver) {
                listObserver.disconnect();
              }
            }
          }
        });
      }
    }
  };

  // observ doc body
  function startObserver() {
    const targetNode = document.body;
    const config = { childList: true, subtree: true };

    observer = new MutationObserver(observerCallback);
    observer.observe(targetNode, config);
  }

  // sidebar wellness check ??pointless??
  function checkForSidebar() {
    if (document.querySelector('.waffle-sidebar-container')) {
      initialize();
    } else {
      setTimeout(checkForSidebar, 500);
    }
  }

  // observe and fallback
  startObserver();
  checkForSidebar();

})();
