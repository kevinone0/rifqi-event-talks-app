document.addEventListener('DOMContentLoaded', () => {
    // State management
    let allUpdates = [];
    let selectedUpdateId = null;
    let activeFilter = 'all';
    let searchQuery = '';

    // DOM Elements
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = refreshBtn.querySelector('i');
    const lastUpdatedText = document.getElementById('last-updated-text');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const filterChips = document.querySelectorAll('.chip');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const themeToggle = document.getElementById('theme-toggle');
    
    // Stats elements
    const statTotal = document.getElementById('stat-total');
    const statFeatures = document.getElementById('stat-features');
    const statCritical = document.getElementById('stat-critical');
    const statChanges = document.getElementById('stat-changes');

    // States containers
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    const emptyState = document.getElementById('empty-state');
    const updatesList = document.getElementById('updates-list');
    const retryBtn = document.getElementById('retry-btn');

    // Drawer Elements
    const tweetDrawer = document.getElementById('tweet-drawer');
    const drawerOverlay = document.getElementById('drawer-overlay');
    const closeDrawerBtn = document.getElementById('close-drawer-btn');
    const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const previewBadge = document.getElementById('preview-badge');
    const previewDate = document.getElementById('preview-date');
    const charCountText = document.getElementById('char-count');
    const charProgressCircle = document.getElementById('char-progress-circle');
    const limitWarning = document.getElementById('limit-warning');
    const tweetSubmitBtn = document.getElementById('tweet-submit-btn');

    // Progress Ring configurations
    const circleRadius = 14;
    const circleCircumference = 2 * Math.PI * circleRadius; // ~87.96
    charProgressCircle.style.strokeDasharray = `${circleCircumference} ${circleCircumference}`;
    charProgressCircle.style.strokeDashoffset = circleCircumference;

    // ==========================================================================
    // API CALLS & DATA FETCHING
    // ==========================================================================
    
    async function fetchUpdates(forceRefresh = false) {
        showState('loading');
        
        // Spin the refresh icon
        refreshIcon.classList.add('spinning');
        refreshBtn.disabled = true;

        try {
            const response = await fetch(`/api/updates?refresh=${forceRefresh}`);
            if (!response.ok) {
                throw new Error(`Server returned status ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to parse release notes.');
            }

            allUpdates = data.updates;
            
            // Format and show last updated time
            const lastFetchedDate = new Date(data.last_fetched * 1000);
            lastUpdatedText.textContent = `Updated: ${lastFetchedDate.toLocaleTimeString()}`;
            
            updateStats();
            renderFeed();
            
        } catch (error) {
            console.error('Error fetching updates:', error);
            errorMessage.textContent = error.message;
            showState('error');
        } finally {
            refreshIcon.classList.remove('spinning');
            refreshBtn.disabled = false;
        }
    }

    // ==========================================================================
    // CORE UI LOGIC: FILTERING & RENDER
    // ==========================================================================

    function updateStats() {
        statTotal.textContent = allUpdates.length;
        
        const features = allUpdates.filter(u => u.type.toLowerCase() === 'feature').length;
        statFeatures.textContent = features;
        
        const critical = allUpdates.filter(u => 
            u.type.toLowerCase() === 'breaking' || u.type.toLowerCase() === 'issue'
        ).length;
        statCritical.textContent = critical;
        
        const changes = allUpdates.filter(u => u.type.toLowerCase() === 'change').length;
        statChanges.textContent = changes;
    }

    function renderFeed() {
        // Filter elements
        const filtered = allUpdates.filter(update => {
            // Filter by type
            const matchesType = activeFilter === 'all' || update.type.toLowerCase() === activeFilter.toLowerCase();
            
            // Filter by search text
            const textToSearch = `${update.type} ${update.date} ${update.text}`.toLowerCase();
            const matchesSearch = textToSearch.includes(searchQuery.toLowerCase());
            
            return matchesType && matchesSearch;
        });

        // Clear previous updates
        updatesList.innerHTML = '';

        if (filtered.length === 0) {
            showState('empty');
            return;
        }

        showState('feed');

        // Populate cards
        filtered.forEach(update => {
            const card = document.createElement('div');
            card.className = `card update-card ${selectedUpdateId === update.id ? 'selected' : ''}`;
            card.dataset.id = update.id;

            // Map type to class
            const badgeTypeClass = getBadgeClass(update.type);

            card.innerHTML = `
                <div class="card-header">
                    <div class="card-meta">
                        <span class="badge ${badgeTypeClass}">${update.type}</span>
                        <span class="card-date">${update.date}</span>
                    </div>
                    <div class="select-indicator" title="Select to Tweet">
                        <i data-lucide="check"></i>
                    </div>
                </div>
                <div class="card-body">
                    ${update.html}
                </div>
                <div class="card-actions">
                    <button class="copy-action-btn" title="Copy clean text to clipboard">
                        <i data-lucide="copy"></i>
                        <span>Copy</span>
                    </button>
                    <button class="tweet-action-btn" title="Select and compose tweet">
                        <i data-lucide="twitter"></i>
                        <span>Select & Tweet</span>
                    </button>
                </div>
            `;

            // Card click behavior for selecting
            card.addEventListener('click', (e) => {
                // If user clicks on an anchor link inside card, let them navigate instead of selecting
                if (e.target.tagName === 'A') {
                    return;
                }
                selectCard(update.id);
            });

            // Action button click behavior
            const tweetBtn = card.querySelector('.tweet-action-btn');
            tweetBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Avoid double toggle from card click handler
                selectCard(update.id);
            });

            // Copy button click behavior
            const copyBtn = card.querySelector('.copy-action-btn');
            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Avoid selecting card
                navigator.clipboard.writeText(update.text).then(() => {
                    const span = copyBtn.querySelector('span');
                    const originalText = span.textContent;
                    span.textContent = 'Copied!';
                    copyBtn.style.color = '#10b981'; // Green accent
                    setTimeout(() => {
                        span.textContent = originalText;
                        copyBtn.style.color = '';
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy text: ', err);
                });
            });

            updatesList.appendChild(card);
        });

        // Initialize Lucide icons on newly created cards
        lucide.createIcons();
    }

    function selectCard(id) {
        const previousSelected = document.querySelector('.update-card.selected');
        if (previousSelected) {
            previousSelected.classList.remove('selected');
        }

        if (selectedUpdateId === id) {
            // Toggle off if clicking the already selected card
            selectedUpdateId = null;
            closeTweetDrawer();
        } else {
            // Select new card
            selectedUpdateId = id;
            const cardEl = document.querySelector(`.update-card[data-id="${id}"]`);
            if (cardEl) {
                cardEl.classList.add('selected');
            }
            
            const updateObj = allUpdates.find(u => u.id === id);
            if (updateObj) {
                openTweetDrawer(updateObj);
            }
        }
    }

    // Help function to map type string to class modifier
    function getBadgeClass(type) {
        switch(type.toLowerCase()) {
            case 'feature': return 'badge-feature';
            case 'breaking': return 'badge-breaking';
            case 'issue': return 'badge-issue';
            case 'announcement': return 'badge-announcement';
            case 'change': return 'badge-change';
            default: return 'badge-default';
        }
    }

    // Switch visible components on the page
    function showState(state) {
        loadingState.style.display = state === 'loading' ? 'flex' : 'none';
        errorState.style.display = state === 'error' ? 'flex' : 'none';
        emptyState.style.display = state === 'empty' ? 'flex' : 'none';
        updatesList.style.display = state === 'feed' ? 'flex' : 'none';
    }

    // ==========================================================================
    // TWEET COMPOSER DRAWER HANDLERS
    // ==========================================================================

    function openTweetDrawer(update) {
        // Set Preview Badge and Date
        previewBadge.className = `badge ${getBadgeClass(update.type)}`;
        previewBadge.textContent = update.type;
        previewDate.textContent = update.date;

        // Auto-draft tweet content
        const draft = composeTweetDraft(update);
        tweetTextarea.value = draft;

        // Open the drawer
        tweetDrawer.classList.add('open');
        
        // Focus textarea and position cursor at end
        tweetTextarea.focus();
        tweetTextarea.selectionStart = tweetTextarea.selectionEnd = tweetTextarea.value.length;

        // Trigger character counter update
        updateCharCount();
    }

    function closeTweetDrawer() {
        tweetDrawer.classList.remove('open');
        // Deselect current card
        if (selectedUpdateId) {
            const cardEl = document.querySelector(`.update-card[data-id="${selectedUpdateId}"]`);
            if (cardEl) {
                cardEl.classList.remove('selected');
            }
            selectedUpdateId = null;
        }
    }

    function composeTweetDraft(update) {
        const tag = `📢 BigQuery [${update.type}] (${update.date}):\n\n`;
        const link = `\n\nRead more: ${update.link}`;
        
        // Calculate max allowed characters for text body
        const maxTextLen = 280 - tag.length - link.length;
        
        // Clean up whitespace
        let text = update.text.replace(/\s+/g, ' ').trim();
        
        if (text.length > maxTextLen) {
            text = text.substring(0, maxTextLen - 3) + '...';
        }

        return `${tag}${text}${link}`;
    }

    function updateCharCount() {
        const text = tweetTextarea.value;
        const count = text.length;
        const remaining = 280 - count;

        charCountText.textContent = remaining;

        // Update progress ring offset
        const percentage = Math.min(count / 280, 1);
        const offset = circleCircumference - (percentage * circleCircumference);
        charProgressCircle.style.strokeDashoffset = offset;

        // Color and warning styles based on limits
        if (remaining < 0) {
            charProgressCircle.style.stroke = '#ef4444'; // Red
            charCountText.style.color = '#ef4444';
            tweetSubmitBtn.classList.add('disabled');
            tweetSubmitBtn.style.pointerEvents = 'none';
            limitWarning.textContent = "Character limit exceeded";
            limitWarning.style.display = 'block';
        } else if (remaining <= 20) {
            charProgressCircle.style.stroke = '#f97316'; // Orange
            charCountText.style.color = '#f97316';
            tweetSubmitBtn.classList.remove('disabled');
            tweetSubmitBtn.style.pointerEvents = 'auto';
            limitWarning.textContent = `${remaining} characters remaining`;
            limitWarning.style.display = 'block';
        } else {
            charProgressCircle.style.stroke = '#3b82f6'; // Blue
            charCountText.style.color = 'var(--text-primary)';
            tweetSubmitBtn.classList.remove('disabled');
            tweetSubmitBtn.style.pointerEvents = 'auto';
            limitWarning.style.display = 'none';
        }

        // Update Twitter link
        const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        tweetSubmitBtn.setAttribute('href', intentUrl);
    }

    // ==========================================================================
    // EVENT LISTENERS
    // ==========================================================================

    // Refresh button
    refreshBtn.addEventListener('click', () => fetchUpdates(true));
    retryBtn.addEventListener('click', () => fetchUpdates(true));

    // Search input
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
        renderFeed();
    });

    // Clear search
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        renderFeed();
        searchInput.focus();
    });

    // Filter chips
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeFilter = chip.dataset.type;
            renderFeed();
        });
    });

    // Drawer closing
    closeDrawerBtn.addEventListener('click', closeTweetDrawer);
    cancelTweetBtn.addEventListener('click', closeTweetDrawer);
    drawerOverlay.addEventListener('click', closeTweetDrawer);
    
    // Textarea input
    tweetTextarea.addEventListener('input', updateCharCount);

    // Export to CSV
    exportCsvBtn.addEventListener('click', () => {
        if (allUpdates.length === 0) {
            alert('No updates to export!');
            return;
        }
        
        // Helper to escape CSV values
        const escapeCSV = (val) => {
            if (val === null || val === undefined) return '';
            let str = String(val);
            if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
                return '"' + str.replace(/"/g, '""') + '"';
            }
            return str;
        };

        // Build CSV content
        let csvContent = 'ID,Date,Type,Description,Link\n';
        allUpdates.forEach(update => {
            const row = [
                update.id,
                update.date,
                update.type,
                update.text,
                update.link
            ];
            csvContent += row.map(escapeCSV).join(',') + '\n';
        });

        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `bigquery_release_notes_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // Theme Toggle Switch
    themeToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            document.documentElement.classList.add('light-theme');
            localStorage.setItem('theme', 'light');
        } else {
            document.documentElement.classList.remove('light-theme');
            localStorage.setItem('theme', 'dark');
        }
    });

    // Load saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        themeToggle.checked = true;
        document.documentElement.classList.add('light-theme');
    }

    // Initial Load
    fetchUpdates();
});
