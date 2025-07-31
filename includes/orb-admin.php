<?php
if (!defined('ABSPATH')) exit;

// Register settings menu
add_action('admin_menu', function() {
    add_menu_page(
        'Online Ride Booking',
        'Online Ride Booking',
        'manage_options',
        'orb-settings',
        'orb_render_settings_page',
        'dashicons-location-alt',
        56
    );
});

// Register settings
add_action('admin_init', function() {
    register_setting('orb_settings_group', 'orb_map_api_key');
    register_setting('orb_settings_group', 'orb_stripe_publishable_key');
    register_setting('orb_settings_group', 'orb_stripe_secret_key');
    register_setting('orb_settings_group', 'orb_base_fare');
    register_setting('orb_settings_group', 'orb_per_mile');
    register_setting('orb_settings_group', 'orb_minimum_fare');
    register_setting('orb_settings_group', 'orb_hourly_rate');
    register_setting('orb_settings_group', 'orb_min_hours');
});

// Register new settings
add_action('admin_init', function() {
    register_setting('orb_settings_group', 'orb_form_title');
    register_setting('orb_settings_group', 'orb_label_name');
    register_setting('orb_settings_group', 'orb_label_email');
    register_setting('orb_settings_group', 'orb_label_phone');
    register_setting('orb_settings_group', 'orb_label_pickup');
    register_setting('orb_settings_group', 'orb_label_dropoff');
    register_setting('orb_settings_group', 'orb_label_date');
    register_setting('orb_settings_group', 'orb_label_time');
    register_setting('orb_settings_group', 'orb_button_text');
    register_setting('orb_settings_group', 'orb_success_message');
    register_setting('orb_settings_group', 'orb_cancel_message');
});

// Register new appearance settings
add_action('admin_init', function() {
    register_setting('orb_settings_group', 'orb_primary_color');
    register_setting('orb_settings_group', 'orb_button_style');
    register_setting('orb_settings_group', 'orb_logo');
});
// Enqueue media uploader for logo
add_action('admin_enqueue_scripts', function($hook) {
    if ($hook === 'toplevel_page_orb-settings') {
        wp_enqueue_media();
        $script = '
        jQuery(document).ready(function($){
            $("#orb_logo_upload").on("click", function(e){
                e.preventDefault();
                var custom_uploader = wp.media({
                    title: "Select Logo",
                    button: { text: "Use this logo" },
                    multiple: false
                })
                .on("select", function() {
                    var attachment = custom_uploader.state().get("selection").first().toJSON();
                    $("#orb_logo").val(attachment.url);
                    $("#orb_logo_preview").html("<img src=\"" + attachment.url + "\" style=\"max-width:120px;max-height:60px;\">");
                })
                .open();
            });
        });
        ';
        wp_add_inline_script('jquery-core', $script);
    }
});

function orb_render_settings_page() {
    $missing = [];
    if (!get_option('orb_map_api_key')) $missing[] = 'Google Maps API Key';
    if (!get_option('orb_stripe_publishable_key')) $missing[] = 'Stripe Publishable Key';
    if (!get_option('orb_stripe_secret_key')) $missing[] = 'Stripe Secret Key';
    if (!get_option('orb_base_fare')) $missing[] = 'Base Fare';
    if (!get_option('orb_per_mile')) $missing[] = 'Per Mile Rate';
    if (!get_option('orb_minimum_fare')) $missing[] = 'Minimum Fare';
    ?>
    <div class="wrap">
        <h1>Online Ride Booking Settings</h1>
        <?php if (!empty($missing)) : ?>
            <div style="background:#fff3cd;border:1px solid #ffeeba;color:#856404;padding:1em 2em;border-radius:7px;margin-bottom:2em;font-size:1.08em;">
                <b>Warning:</b> The following required fields are missing or empty:<br>
                <ul style="margin:0.5em 0 0 1.5em;">
                    <?php foreach ($missing as $field) echo '<li>' . esc_html($field) . '</li>'; ?>
                </ul>
                Please fill in all required fields for the plugin to work correctly.
            </div>
        <?php endif; ?>
        <form method="post" action="options.php" style="max-width: 700px;">
            <?php settings_fields('orb_settings_group'); ?>
            <div style="background:#fff;border-radius:10px;padding:2em 2em 1em 2em;box-shadow:0 2px 12px rgba(0,0,0,0.07);margin-bottom:2em;">
                <h2 style="margin-top:0;color:#635bff;">API Keys</h2>
                <table class="form-table">
                    <tr><th><label for="orb_map_api_key">Google Maps API Key</label></th><td><input type="text" id="orb_map_api_key" name="orb_map_api_key" value="<?php echo esc_attr(get_option('orb_map_api_key')); ?>" size="50"><br><small>Get your API key from <a href='https://console.cloud.google.com/' target='_blank'>Google Cloud Console</a>.</small></td></tr>
                    <tr><th><label for="orb_stripe_publishable_key">Stripe Publishable Key</label></th><td><input type="text" id="orb_stripe_publishable_key" name="orb_stripe_publishable_key" value="<?php echo esc_attr(get_option('orb_stripe_publishable_key')); ?>" size="50"><br><small>Find this in your Stripe dashboard (starts with <code>pk_</code>).</small></td></tr>
                    <tr><th><label for="orb_stripe_secret_key">Stripe Secret Key</label></th><td><input type="text" id="orb_stripe_secret_key" name="orb_stripe_secret_key" value="<?php echo esc_attr(get_option('orb_stripe_secret_key')); ?>" size="50"><br><small>Find this in your Stripe dashboard (starts with <code>sk_</code>). <b>Keep this secret!</b></small></td></tr>
                </table>
            </div>
            <div style="background:#fff;border-radius:10px;padding:2em 2em 1em 2em;box-shadow:0 2px 12px rgba(0,0,0,0.07);margin-bottom:2em;">
                <h2 style="margin-top:0;color:#635bff;">Pricing</h2>
                <table class="form-table">
                    <tr><th><label for="orb_base_fare">Base Fare (USD)</label></th><td><input type="number" step="0.01" id="orb_base_fare" name="orb_base_fare" value="<?php echo esc_attr(get_option('orb_base_fare', '55')); ?>"><br><small>Minimum fare for the first 10 miles.</small></td></tr>
                    <tr><th><label for="orb_per_mile">Per Mile Rate (USD)</label></th><td><input type="number" step="0.01" id="orb_per_mile" name="orb_per_mile" value="<?php echo esc_attr(get_option('orb_per_mile', '3.5')); ?>"><br><small>Rate for each mile after the first 10 miles.</small></td></tr>
                    <tr><th><label for="orb_minimum_fare">Minimum Fare (USD)</label></th><td><input type="number" step="0.01" id="orb_minimum_fare" name="orb_minimum_fare" value="<?php echo esc_attr(get_option('orb_minimum_fare', '55')); ?>"><br><small>The lowest fare a customer can be charged.</small></td></tr>
                    <tr><th><label for="orb_hourly_rate">Hourly Rate (USD)</label></th><td><input type="number" step="0.01" id="orb_hourly_rate" name="orb_hourly_rate" value="<?php echo esc_attr(get_option('orb_hourly_rate', '75')); ?>"><br><small>For hourly bookings (e.g., tours).</small></td></tr>
                    <tr><th><label for="orb_min_hours">Minimum Hours (for Hourly)</label></th><td><input type="number" step="1" id="orb_min_hours" name="orb_min_hours" value="<?php echo esc_attr(get_option('orb_min_hours', '4')); ?>"><br><small>Minimum hours required for hourly bookings.</small></td></tr>
                </table>
            </div>
            <div style="background:#fff;border-radius:10px;padding:2em 2em 1em 2em;box-shadow:0 2px 12px rgba(0,0,0,0.07);margin-bottom:2em;">
                <h2 style="margin-top:0;color:#635bff;">Form Customization</h2>
                <table class="form-table">
                    <tr><th><label for="orb_form_title">Form Title</label></th><td><input type="text" id="orb_form_title" name="orb_form_title" value="<?php echo esc_attr(get_option('orb_form_title', 'Book Your Ride')); ?>" size="50"><br><small>Heading shown at the top of the booking form.</small></td></tr>
                    <tr><th><label for="orb_label_name">Name Label</label></th><td><input type="text" id="orb_label_name" name="orb_label_name" value="<?php echo esc_attr(get_option('orb_label_name', 'Full Name')); ?>"><br><small>Label for the name field.</small></td></tr>
                    <tr><th><label for="orb_label_email">Email Label</label></th><td><input type="text" id="orb_label_email" name="orb_label_email" value="<?php echo esc_attr(get_option('orb_label_email', 'Email')); ?>"><br><small>Label for the email field.</small></td></tr>
                    <tr><th><label for="orb_label_phone">Phone Label</label></th><td><input type="text" id="orb_label_phone" name="orb_label_phone" value="<?php echo esc_attr(get_option('orb_label_phone', 'Phone')); ?>"><br><small>Label for the phone field.</small></td></tr>
                    <tr><th><label for="orb_label_pickup">Pickup Address Label</label></th><td><input type="text" id="orb_label_pickup" name="orb_label_pickup" value="<?php echo esc_attr(get_option('orb_label_pickup', 'Pickup Address')); ?>"><br><small>Label for the pickup address field.</small></td></tr>
                    <tr><th><label for="orb_label_dropoff">Dropoff Address Label</label></th><td><input type="text" id="orb_label_dropoff" name="orb_label_dropoff" value="<?php echo esc_attr(get_option('orb_label_dropoff', 'Dropoff Address')); ?>"><br><small>Label for the dropoff address field.</small></td></tr>
                    <tr><th><label for="orb_label_date">Date Label</label></th><td><input type="text" id="orb_label_date" name="orb_label_date" value="<?php echo esc_attr(get_option('orb_label_date', 'Pickup Date')); ?>"><br><small>Label for the date field.</small></td></tr>
                    <tr><th><label for="orb_label_time">Time Label</label></th><td><input type="text" id="orb_label_time" name="orb_label_time" value="<?php echo esc_attr(get_option('orb_label_time', 'Pickup Time')); ?>"><br><small>Label for the time field.</small></td></tr>
                    <tr><th><label for="orb_button_text">Button Text</label></th><td><input type="text" id="orb_button_text" name="orb_button_text" value="<?php echo esc_attr(get_option('orb_button_text', 'Book & Pay')); ?>"><br><small>Text for the submit button.</small></td></tr>
                    <tr><th><label for="orb_success_message">Success Message</label></th><td><input type="text" id="orb_success_message" name="orb_success_message" value="<?php echo esc_attr(get_option('orb_success_message', 'Booking successful! Redirecting to payment...')); ?>" size="50"><br><small>Message shown after successful booking/payment.</small></td></tr>
                    <tr><th><label for="orb_cancel_message">Cancel Message</label></th><td><input type="text" id="orb_cancel_message" name="orb_cancel_message" value="<?php echo esc_attr(get_option('orb_cancel_message', 'Booking canceled. Please try again.')); ?>" size="50"><br><small>Message shown if the booking/payment is canceled.</small></td></tr>
                </table>
            </div>
            <div style="background:#fff;border-radius:10px;padding:2em 2em 1em 2em;box-shadow:0 2px 12px rgba(0,0,0,0.07);margin-bottom:2em;">
                <h2 style="margin-top:0;color:#635bff;">Appearance</h2>
                <table class="form-table">
                    <tr><th><label for="orb_primary_color">Primary Color</label></th><td><input type="color" id="orb_primary_color" name="orb_primary_color" value="<?php echo esc_attr(get_option('orb_primary_color', '#635bff')); ?>" style="width: 50px; height: 32px; padding: 0; border: none;"><br><small>Primary color for buttons and highlights.</small></td></tr>
                    <tr><th><label for="orb_button_style">Button Style</label></th><td><select id="orb_button_style" name="orb_button_style">
                        <?php $styles = ['solid' => 'Solid', 'outline' => 'Outline', 'rounded' => 'Rounded'];
                        $current = get_option('orb_button_style', 'solid');
                        foreach ($styles as $val => $label) echo '<option value="' . esc_attr($val) . '"' . selected($current, $val, false) . '>' . esc_html($label) . '</option>'; ?>
                    </select><br><small>Choose the style for the main button.</small></td></tr>
                    <tr><th><label for="orb_logo">Logo</label></th><td>
                        <input type="text" id="orb_logo" name="orb_logo" value="<?php echo esc_attr(get_option('orb_logo', '')); ?>" style="width:60%;">
                        <button type="button" class="button" id="orb_logo_upload">Upload</button><br>
                        <small>Upload a logo to display above the booking form (optional).</small>
                        <div id="orb_logo_preview" style="margin-top:0.5em;"><?php if ($logo = get_option('orb_logo')) echo '<img src="' . esc_url($logo) . '" style="max-width:120px;max-height:60px;">'; ?></div>
                    </td></tr>
                </table>
            </div>
            <div style="background:#f8f9fa;border-radius:10px;padding:1.5em 2em 1.5em 2em;box-shadow:0 1px 6px rgba(0,0,0,0.04);margin-bottom:2em;">
                <h2 style="margin-top:0;color:#635bff;font-size:1.1em;">Example Fare Calculation</h2>
                <?php
                $base = floatval(get_option('orb_base_fare', '55'));
                $per_mile = floatval(get_option('orb_per_mile', '3.5'));
                $min_fare = floatval(get_option('orb_minimum_fare', '55'));
                function orb_calc_fare($miles, $base, $per_mile, $min_fare) {
                    if ($miles <= 10) return max($base, $min_fare);
                    return max($base + ($miles - 10) * $per_mile, $min_fare);
                }
                $examples = [5, 10, 15, 20];
                echo '<table style="width:auto;font-size:1.05em;">';
                echo '<tr><th style="text-align:left;padding-right:2em;">Distance</th><th style="text-align:left;">Fare</th></tr>';
                foreach ($examples as $miles) {
                    $fare = orb_calc_fare($miles, $base, $per_mile, $min_fare);
                    echo '<tr><td>' . $miles . ' miles</td><td><b>$' . number_format($fare, 2) . '</b></td></tr>';
                }
                echo '</table>';
                ?>
                <div style="color:#666;font-size:0.98em;margin-top:0.7em;">Fares are calculated using your current settings. Update pricing above and save to see new examples.</div>
            </div>
            <?php submit_button('Save Changes', 'primary', '', false, ['style' => 'padding:0.7em 2.5em;font-size:1.1em;border-radius:6px;background:#635bff;border:none;']); ?>
        </form>
    </div>
    <style>
    .form-table th { text-align:left; font-weight:600; color:#222; }
    .form-table td { padding-bottom:1em; }
    .form-table input[type="text"], .form-table input[type="number"] { width: 100%; max-width: 400px; }
    .form-table small { color:#666; }
    </style>
    <?php
}