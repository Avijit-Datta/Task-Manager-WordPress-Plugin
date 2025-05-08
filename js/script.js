jQuery(document).ready(function($) {
    let currentList = null;
    let allLists = {};

    // Initialize popup with draggable and resizable
    function initPopup() {
        $("#admin-todo-popup")
            .draggable({
                handle: ".todo-header",
                containment: "window"
            })
            .resizable({
                minWidth: 300,
                minHeight: 200,
                resize: function() {
                    adjustContentHeight();
                }
            });
    }

    // Adjust content height when popup is resized
    function adjustContentHeight() {
        const headerHeight = $('.todo-header').outerHeight();
        const formHeight = $('.add-list-form, .add-item-form').outerHeight();
        const availableHeight = $('#admin-todo-popup').height() - headerHeight - formHeight - 30;
        
        $('.todo-lists-container, .todo-items-container').css({
            'max-height': availableHeight + 'px'
        });
    }

    // Toggle popup
    $('#wp-admin-bar-admin_to_do_manager').on('click', function(e) {
        e.preventDefault();
        $('#admin-todo-popup').toggleClass('visible');
        if ($('#admin-todo-popup').hasClass('visible')) {
            initPopup();
            loadLists();
        }
    });

    // Load existing lists
    function loadLists() {
        $.post(ATDM_AJAX.ajax_url, {
            action: 'atdm_get_lists',
            nonce: ATDM_AJAX.nonce
        }, function(response) {
            if (response.success) {
                allLists = response.data || {};
                renderListOverview();
            }
        });
    }

    // Render all lists
    function renderListOverview() {
        let html = `
            <div class="todo-header">
                <h2>Your Task Manager</h2>
                <button class="close-popup">&times;</button>
            </div>
            <div class="todo-lists-container">
                <ul class="todo-lists">`;

        for (let listName in allLists) {
            html += `
                <li class="todo-list-item" data-list="${listName}">
                    <span class="list-name">
                        <i class="dashicons dashicons-portfolio"></i>
                        ${listName}
                    </span>
                    <button class="delete-list" data-list="${listName}">
                        <i class="dashicons dashicons-trash"></i>
                    </button>
                </li>`;
        }

        html += `</ul>
            </div>
            <div class="add-list-form">
                <div class="form-row">
                    <input type="text" id="new-list-name" placeholder="New list name">
                    <button id="create-list" class="button-primary">
                        <i class="dashicons dashicons-plus"></i> Add
                    </button>
                </div>
            </div>`;

        $('#todo-content').html(html);
        adjustContentHeight();
    }

    // Render individual list
    function renderListItems(listName) {
        const items = allLists[listName] || [];
        currentList = listName;

        let html = `
            <div class="todo-header">
                <button id="back-to-lists" class="back-button">
                    <i class="dashicons dashicons-arrow-left-alt"></i> Back
                </button>
                <h2>${listName}</h2>
                <button class="close-popup">&times;</button>
            </div>
            <div class="todo-items-container">
                <ul class="todo-items" id="todo-items">`;

        items.forEach((item, index) => {
            html += `
                <li class="todo-item ${item.checked ? 'completed' : ''}" data-index="${index}">
                    <div class="item-content">
                        <input type="checkbox" class="item-check" ${item.checked ? 'checked' : ''}>
                        <span class="item-text">${item.text}</span>
                    </div>
                    <button class="delete-item">
                        <i class="dashicons dashicons-trash"></i>
                    </button>
                </li>`;
        });

        html += `</ul>
            </div>
            <div class="add-item-form">
                <div class="form-row">
                    <input type="text" id="new-item-text" placeholder="Add new task">
                    <button id="add-item" class="button-primary">
                        <i class="dashicons dashicons-plus"></i> Add
                    </button>
                </div>
            </div>`;

        $('#todo-content').html(html);
        adjustContentHeight();

        // Enable sorting
        $("#todo-items").sortable({
            update: function() {
                updateCurrentList(true);
            }
        });
    }

    // Update list items and optionally save
    function updateCurrentList(save = false) {
        const items = [];
        $('#todo-items .todo-item').each(function() {
            const checked = $(this).find('.item-check').is(':checked');
            const text = $(this).find('.item-text').text();
            $(this).toggleClass('completed', checked);
            items.push({ text: text, checked: checked });
        });
        allLists[currentList] = items;

        if (save) {
            $.post(ATDM_AJAX.ajax_url, {
                action: 'atdm_update_items',
                nonce: ATDM_AJAX.nonce,
                list: currentList,
                items: JSON.stringify(items)
            });
        }
    }

    // Handle Enter key press
    function handleEnterKey(e, inputSelector, buttonSelector) {
        if (e.key === 'Enter') {
            e.preventDefault();
            $(buttonSelector).click();
        }
    }

    // Event Delegation
    $(document)
        .on('click', '.close-popup', function() {
            $('#admin-todo-popup').removeClass('visible');
        })
        .on('click', '#create-list', function() {
            const name = $('#new-list-name').val().trim();
            if (name && !allLists[name]) {
                $.post(ATDM_AJAX.ajax_url, {
                    action: 'atdm_add_list',
                    nonce: ATDM_AJAX.nonce,
                    name: name
                }, function() {
                    allLists[name] = [];
                    $('#new-list-name').val('');
                    renderListOverview();
                });
            }
        })
        .on('keypress', '#new-list-name', function(e) {
            handleEnterKey(e, '#new-list-name', '#create-list');
        })
        .on('click', '.todo-list-item', function() {
            const listName = $(this).data('list');
            renderListItems(listName);
        })
        .on('click', '#back-to-lists', function() {
            currentList = null;
            renderListOverview();
        })
        .on('click', '#add-item', function() {
            const text = $('#new-item-text').val().trim();
            if (text) {
                $.post(ATDM_AJAX.ajax_url, {
                    action: 'atdm_add_item',
                    nonce: ATDM_AJAX.nonce,
                    list: currentList,
                    text: text
                }, function() {
                    allLists[currentList].push({ text: text, checked: false });
                    $('#new-item-text').val('');
                    renderListItems(currentList);
                });
            }
        })
        .on('keypress', '#new-item-text', function(e) {
            handleEnterKey(e, '#new-item-text', '#add-item');
        })
        .on('click', '.delete-item', function(e) {
            e.stopPropagation();
            const index = $(this).closest('.todo-item').data('index');
            $.post(ATDM_AJAX.ajax_url, {
                action: 'atdm_delete_item',
                nonce: ATDM_AJAX.nonce,
                list: currentList,
                index: index
            }, function() {
                allLists[currentList].splice(index, 1);
                renderListItems(currentList);
            });
        })
        .on('click', '.delete-list', function(e) {
            e.stopPropagation();
            const listName = $(this).data('list');
            if (confirm(`Delete the list "${listName}"?`)) {
                $.post(ATDM_AJAX.ajax_url, {
                    action: 'atdm_delete_list',
                    nonce: ATDM_AJAX.nonce,
                    name: listName
                }, function() {
                    delete allLists[listName];
                    renderListOverview();
                });
            }
        })
        .on('change', '.item-check', function() {
            updateCurrentList(true);
        });
});