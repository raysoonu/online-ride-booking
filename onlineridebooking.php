<?php
/*
Plugin Name: Online Ride Booking
Description: A flexible ride booking and payment system with Stripe and Google Maps integration. Admins can set API keys and pricing from the WP admin panel. Use the [online_ride_booking_form] shortcode to display the booking form.
Version: 1.0.0
Author: Your Name
*/

if (!defined('ABSPATH')) exit;

// Define plugin path
if (!defined('ORB_PLUGIN_DIR')) {
    define('ORB_PLUGIN_DIR', plugin_dir_path(__FILE__));
}

// Include admin settings and frontend form
require_once ORB_PLUGIN_DIR . 'includes/orb-admin.php';
require_once ORB_PLUGIN_DIR . 'includes/orb-shortcode.php';

// Activation hook for default options
register_activation_hook(__FILE__, function() {
    add_option('orb_map_api_key', '');
    add_option('orb_stripe_publishable_key', '');
    add_option('orb_stripe_secret_key', '');
    add_option('orb_base_fare', '55');
    add_option('orb_per_mile', '3.5');
    add_option('orb_minimum_fare', '55');
    add_option('orb_hourly_rate', '75');
    add_option('orb_min_hours', '4');
}); 