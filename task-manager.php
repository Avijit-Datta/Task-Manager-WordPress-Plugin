<?php
/**
 * Plugin Name: Task Manager
 * Description: A draggable Task list popup for admins with instant saving via admin-ajax.php.
 * Version: 2.3.0
 * Author: Avijit Datta
 */

if (!defined('ABSPATH')) exit;

class AdminToDoManager {
    public function __construct() {
        add_action('admin_bar_menu', [$this, 'add_admin_bar_item'], 100);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_assets']);
        add_action('admin_footer', [$this, 'render_popup']);
        add_action('wp_ajax_atdm_get_lists', [$this, 'get_lists']);
        add_action('wp_ajax_atdm_add_list', [$this, 'add_list']);
        add_action('wp_ajax_atdm_delete_list', [$this, 'delete_list']);
        add_action('wp_ajax_atdm_add_item', [$this, 'add_item']);
        add_action('wp_ajax_atdm_delete_item', [$this, 'delete_item']);
        add_action('wp_ajax_atdm_update_items', [$this, 'update_items']);
    }

    public function add_admin_bar_item($wp_admin_bar) {
        if (!current_user_can('manage_options')) return;
        $wp_admin_bar->add_node([
            'id' => 'admin_to_do_manager',
            'title' => '<span class="ab-icon dashicons dashicons-portfolio"></span> Task Manager',
        ]);
    }

    public function enqueue_assets() {
        wp_enqueue_style('atdm-style', plugin_dir_url(__FILE__) . 'css/style.css');
        wp_enqueue_script('jquery-ui-draggable');
        wp_enqueue_script('jquery-ui-sortable');
        wp_enqueue_script('jquery-ui-resizable');
        wp_enqueue_script('atdm-script', plugin_dir_url(__FILE__) . 'js/script.js', ['jquery'], null, true);
        wp_localize_script('atdm-script', 'ATDM_AJAX', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('atdm_nonce'),
        ]);
    }

    public function render_popup() {
        if (!current_user_can('manage_options')) return;
        echo '<div id="admin-todo-popup" class="hidden"><div id="todo-content"></div></div>';
    }

    // AJAX Handlers (remain exactly the same as before)
    public function get_lists() {
        check_ajax_referer('atdm_nonce', 'nonce');
        $lists = get_option('atdm_todo_lists', []);
        wp_send_json_success($lists);
    }

    public function add_list() {
        check_ajax_referer('atdm_nonce', 'nonce');
        $name = sanitize_text_field($_POST['name']);
        $lists = get_option('atdm_todo_lists', []);
        if (!isset($lists[$name])) {
            $lists[$name] = [];
            update_option('atdm_todo_lists', $lists);
        }
        wp_send_json_success();
    }

    public function delete_list() {
        check_ajax_referer('atdm_nonce', 'nonce');
        $name = sanitize_text_field($_POST['name']);
        $lists = get_option('atdm_todo_lists', []);
        if (isset($lists[$name])) {
            unset($lists[$name]);
            update_option('atdm_todo_lists', $lists);
        }
        wp_send_json_success();
    }

    public function add_item() {
        check_ajax_referer('atdm_nonce', 'nonce');
        $list = sanitize_text_field($_POST['list']);
        $text = sanitize_text_field($_POST['text']);
        $lists = get_option('atdm_todo_lists', []);
        if (isset($lists[$list])) {
            $lists[$list][] = ['text' => $text, 'checked' => false];
            update_option('atdm_todo_lists', $lists);
        }
        wp_send_json_success();
    }

    public function delete_item() {
        check_ajax_referer('atdm_nonce', 'nonce');
        $list = sanitize_text_field($_POST['list']);
        $index = intval($_POST['index']);
        $lists = get_option('atdm_todo_lists', []);
        if (isset($lists[$list][$index])) {
            array_splice($lists[$list], $index, 1);
            update_option('atdm_todo_lists', $lists);
        }
        wp_send_json_success();
    }

    public function update_items() {
        check_ajax_referer('atdm_nonce', 'nonce');
        $list = sanitize_text_field($_POST['list']);
        $items = json_decode(stripslashes($_POST['items']), true);
        if (!is_array($items)) wp_send_json_error('Invalid data');
        $lists = get_option('atdm_todo_lists', []);
        $lists[$list] = $items;
        update_option('atdm_todo_lists', $lists);
        wp_send_json_success();
    }
}

new AdminToDoManager();
