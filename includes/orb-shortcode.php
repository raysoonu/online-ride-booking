<?php
if (!defined('ABSPATH')) exit;

add_shortcode('online_ride_booking_form', function($atts) {
    $map_api_key = esc_attr(get_option('orb_map_api_key'));
    $base_fare = floatval(get_option('orb_base_fare', '55'));
    $per_mile = floatval(get_option('orb_per_mile', '3.5'));
    $minimum_fare = floatval(get_option('orb_minimum_fare', '55'));
    $hourly_rate = floatval(get_option('orb_hourly_rate', '75'));
    $min_hours = intval(get_option('orb_min_hours', '4'));
    ob_start();
    ?>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer" />
    <script>
    if (typeof ajaxurl === 'undefined') {
        var ajaxurl = '<?php echo admin_url('admin-ajax.php'); ?>';
    }
    </script>
    <form id="orb-booking-form" aria-label="Ride Booking Form">
        <div class="orb-form-row">
            <div class="orb-input-icon"><label for="orb-name" class="screen-reader-text">Full Name</label><i class="fa fa-user"></i><input type="text" id="orb-name" name="name" placeholder="Full Name" required autocomplete="name"></div>
            <div class="orb-input-icon"><label for="orb-email" class="screen-reader-text">Email</label><i class="fa fa-envelope"></i><input type="email" id="orb-email" name="email" placeholder="Email" required autocomplete="email"></div>
            <div class="orb-input-icon"><label for="orb-phone" class="screen-reader-text">Phone</label><i class="fa fa-phone"></i><input type="text" id="orb-phone" name="phone" placeholder="Phone" required autocomplete="tel"></div>
        </div>
        <div class="orb-form-row">
            <div class="orb-input-icon"><label for="orb-pickup" class="screen-reader-text">Pickup Address</label><i class="fa fa-location-dot"></i><input type="text" name="pickup_address" id="orb-pickup" placeholder="Pickup Address" required autocomplete="off"></div>
            <div class="orb-input-icon"><label for="orb-dropoff" class="screen-reader-text">Dropoff Address</label><i class="fa fa-location-dot"></i><input type="text" name="dropoff_address" id="orb-dropoff" placeholder="Dropoff Address" required autocomplete="off"></div>
        </div>
        <div class="orb-form-row">
            <div class="orb-input-icon"><label for="orb-date" class="screen-reader-text">Pickup Date</label><i class="fa fa-calendar"></i><input type="date" id="orb-date" name="pickup_date" required></div>
            <div class="orb-input-icon"><label for="orb-time" class="screen-reader-text">Pickup Time</label><i class="fa fa-clock"></i><input type="time" id="orb-time" name="pickup_time" required></div>
        </div>
        <div class="orb-form-row">
            <div id="orb-map" style="width:100%;height:180px;border-radius:8px;margin-bottom:1em;"></div>
        </div>
        <div id="orb-summary-card" style="display:none;background:#f8f9fa;border-radius:8px;padding:1em 1.5em;margin-bottom:1em;box-shadow:0 1px 6px rgba(0,0,0,0.04);font-size:1.08em;"></div>
        <input type="hidden" name="calculated_distance" id="orb-distance">
        <input type="hidden" name="calculated_fare" id="orb-fare">
        <button type="submit" id="orb-submit" aria-live="polite"><i class="fa fa-credit-card"></i> Book & Pay</button>
        <div id="orb-message" style="margin-top:1em;" aria-live="polite" aria-atomic="true"></div>
        <div id="orb-spinner" style="display:none;text-align:center;margin-top:1em;"><i class="fa fa-spinner fa-spin fa-2x" style="color:#635bff;"></i></div>
    </form>
    <script src="https://maps.googleapis.com/maps/api/js?key=<?php echo $map_api_key; ?>&libraries=places"></script>
    <script>
    let map, directionsService, directionsRenderer, pickupMarker, dropoffMarker, pickupAutocomplete, dropoffAutocomplete;
    let baseFare = <?php echo $base_fare; ?>;
    let perMile = <?php echo $per_mile; ?>;
    let minFare = <?php echo $minimum_fare; ?>;
    function formatFare(fare) { return '$' + fare.toFixed(2); }
    function initOrbMap() {
        map = new google.maps.Map(document.getElementById('orb-map'), {
            center: { lat: 38.5816, lng: -121.4944 },
            zoom: 12
        });
        directionsService = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer({ suppressMarkers: true });
        directionsRenderer.setMap(map);
        pickupMarker = new google.maps.Marker({ map, draggable: true, label: 'A', position: { lat: 38.5816, lng: -121.4944 } });
        dropoffMarker = new google.maps.Marker({ map, draggable: true, label: 'B', position: { lat: 38.5916, lng: -121.4844 } });
        const geocoder = new google.maps.Geocoder();
        function setAddressFromLatLng(marker, inputId) {
            geocoder.geocode({ location: marker.getPosition() }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    document.getElementById(inputId).value = results[0].formatted_address;
                }
            });
        }
        setAddressFromLatLng(pickupMarker, 'orb-pickup');
        setAddressFromLatLng(dropoffMarker, 'orb-dropoff');
        pickupMarker.addListener('dragend', function() {
            setAddressFromLatLng(pickupMarker, 'orb-pickup');
            updateRouteAndFare();
        });
        dropoffMarker.addListener('dragend', function() {
            setAddressFromLatLng(dropoffMarker, 'orb-dropoff');
            updateRouteAndFare();
        });
        pickupAutocomplete = new google.maps.places.Autocomplete(document.getElementById('orb-pickup'));
        dropoffAutocomplete = new google.maps.places.Autocomplete(document.getElementById('orb-dropoff'));
        pickupAutocomplete.addListener('place_changed', function() {
            const place = pickupAutocomplete.getPlace();
            if (place.geometry) {
                pickupMarker.setPosition(place.geometry.location);
                map.panTo(place.geometry.location);
                document.getElementById('orb-pickup').value = place.formatted_address;
                updateRouteAndFare();
            }
        });
        dropoffAutocomplete.addListener('place_changed', function() {
            const place = dropoffAutocomplete.getPlace();
            if (place.geometry) {
                dropoffMarker.setPosition(place.geometry.location);
                map.panTo(place.geometry.location);
                document.getElementById('orb-dropoff').value = place.formatted_address;
                updateRouteAndFare();
            }
        });
        updateRouteAndFare();
    }
    function updateSummaryCard(leg, fare) {
        var pickup = document.getElementById('orb-pickup').value;
        var dropoff = document.getElementById('orb-dropoff').value;
        var distance = leg ? (leg.distance.text + ' (' + (leg.distance.value/1609.34).toFixed(2) + ' mi)') : '--';
        var duration = leg ? leg.duration.text : '--';
        var price = fare ? ('$' + parseFloat(fare).toFixed(2)) : '--';
        var html = '<b>Ride Summary</b><br>';
        html += '<div style="margin:0.5em 0 0.2em 0;"><b>Pickup:</b> ' + (pickup || '--') + '</div>';
        html += '<div style="margin-bottom:0.2em;"><b>Dropoff:</b> ' + (dropoff || '--') + '</div>';
        html += '<div><b>Distance:</b> ' + distance + '</div>';
        html += '<div><b>Estimated Time:</b> ' + duration + '</div>';
        html += '<div style="margin-top:0.4em;font-size:1.15em;"><b>Total Price:</b> <span style="color:#635bff;">' + price + '</span></div>';
        var card = document.getElementById('orb-summary-card');
        card.innerHTML = html;
        card.style.display = 'block';
    }
    function updateRouteAndFare() {
        const origin = pickupMarker.getPosition();
        const destination = dropoffMarker.getPosition();
        if (!origin || !destination) return;
        directionsService.route({
            origin,
            destination,
            travelMode: google.maps.TravelMode.DRIVING
        }, function(response, status) {
            if (status === 'OK') {
                directionsRenderer.setDirections(response);
                const leg = response.routes[0].legs[0];
                const distanceMeters = leg.distance.value;
                const distanceMi = distanceMeters / 1609.34;
                let fare = 0;
                if (distanceMi <= 10) {
                    fare = baseFare;
                } else {
                    fare = baseFare + ((distanceMi - 10) * perMile);
                }
                fare = Math.max(fare, minFare);
                document.getElementById('orb-distance').value = distanceMeters;
                document.getElementById('orb-fare').value = fare.toFixed(2);
                updateSummaryCard(leg, fare);
            } else {
                document.getElementById('orb-distance').value = '';
                document.getElementById('orb-fare').value = '';
                updateSummaryCard(null, null);
            }
        });
    }
    window.addEventListener('DOMContentLoaded', function() {
        if (typeof google !== 'undefined') {
            initOrbMap();
        } else {
            setTimeout(() => {
                if (typeof google !== 'undefined') initOrbMap();
            }, 1000);
        }
    });
    // Also update summary on address input change and other relevant fields
    ['orb-pickup','orb-dropoff','pickup_date','pickup_time','phone','email','name'].forEach(function(id) {
        document.getElementById(id)?.addEventListener('input', function() {
            updateRouteAndFare();
        });
    });
    // Show spinner and style messages
    document.getElementById('orb-booking-form').addEventListener('submit', function(e) {
        document.getElementById('orb-spinner').style.display = 'block';
    });
    function showOrbMessage(type, msg) {
        var el = document.getElementById('orb-message');
        el.innerHTML = '<span style="display:inline-block;padding:0.5em 1em;border-radius:6px;font-size:1.05em;' +
            (type === 'success' ? 'background:#e6f9e6;color:#207a2b;border:1px solid #b2e2b2;' : 'background:#fff3cd;color:#856404;border:1px solid #ffeeba;') + '">' +
            (type === 'success' ? '<i class="fa fa-check-circle"></i> ' : '<i class="fa fa-exclamation-triangle"></i> ') + msg + '</span>';
    }
    document.getElementById('orb-booking-form').addEventListener('submit', function(e) {
        e.preventDefault();
        var form = this;
        var formData = new FormData(form);
        document.getElementById('orb-submit').disabled = true;
        document.getElementById('orb-message').textContent = 'Processing...';
        fetch(ajaxurl, {
            method: 'POST',
            credentials: 'same-origin',
            body: new URLSearchParams([...formData, ['action', 'orb_process_booking']])
        })
        .then(r => r.json())
        .then(data => {
            document.getElementById('orb-submit').disabled = false;
            document.getElementById('orb-spinner').style.display = 'none';
            if (data.success) {
                showOrbMessage('success', data.message || 'Booking successful!');
                if (data.redirect) {
                    setTimeout(function() {
                        window.location.href = data.redirect;
                    }, 1200);
                } else {
                    form.reset();
                }
            } else {
                showOrbMessage('error', data.message || 'Booking failed.');
            }
        })
        .catch(() => {
            document.getElementById('orb-submit').disabled = false;
            document.getElementById('orb-spinner').style.display = 'none';
            showOrbMessage('error', 'An error occurred.');
        });
    });
    </script>
    <style>
    .screen-reader-text { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
    .orb-input-icon input:focus { outline: 2px solid #635bff; outline-offset: 2px; background: #f3f7ff; }
    #orb-submit:focus { outline: 2px solid #635bff; outline-offset: 2px; }
    #orb-booking-form { max-width: 500px; margin: 0 auto; background: #fff; border-radius: 10px; box-shadow: 0 2px 12px rgba(0,0,0,0.07); padding: 2em; }
    .orb-form-row { display: flex; flex-wrap: wrap; gap: 1em; margin-bottom: 1em; }
    .orb-form-row input { flex: 1 1 180px; padding: 0.7em; border-radius: 6px; border: 1px solid #eee; font-size: 1em; }
    #orb-submit { width: 100%; padding: 1em; background: <?php echo esc_attr(get_option('orb_primary_color', '#635bff')); ?>; color: #fff; border: none; border-radius: 6px; font-size: 1.1em; cursor: pointer; transition: background 0.2s; }
    #orb-submit:hover { background: #5046e5; }
    .orb-input-icon { position:relative; display:flex; align-items:center; }
    .orb-input-icon i { position:absolute; left:12px; color:#bbb; font-size:1.1em; }
    .orb-input-icon input { padding-left:2.2em !important; }
    @media (max-width: 600px) {
        #orb-booking-form { padding: 0.5em; }
        .orb-form-row { flex-direction: column; gap: 0.5em; }
        .orb-input-icon input { font-size: 1em; padding: 0.8em 0.7em 0.8em 2.2em !important; }
        #orb-summary-card { font-size: 1em; padding: 0.7em 0.7em; }
        #orb-submit { font-size: 1em; padding: 0.8em 0; }
    }
    </style>
    <?php
    return ob_get_clean();
});

// AJAX handler for booking and Stripe payment
add_action('wp_ajax_orb_process_booking', 'orb_process_booking');
add_action('wp_ajax_nopriv_orb_process_booking', 'orb_process_booking');
function orb_process_booking() {
    // Validate and sanitize input
    $name = sanitize_text_field($_POST['name'] ?? '');
    $email = sanitize_email($_POST['email'] ?? '');
    $phone = sanitize_text_field($_POST['phone'] ?? '');
    $pickup_address = sanitize_text_field($_POST['pickup_address'] ?? '');
    $dropoff_address = sanitize_text_field($_POST['dropoff_address'] ?? '');
    $pickup_date = sanitize_text_field($_POST['pickup_date'] ?? '');
    $pickup_time = sanitize_text_field($_POST['pickup_time'] ?? '');
    $distance = floatval($_POST['calculated_distance'] ?? 0);
    $fare = floatval($_POST['calculated_fare'] ?? 0);
    if (!$name || !$email || !$phone || !$pickup_address || !$dropoff_address || !$pickup_date || !$pickup_time || $distance <= 0 || $fare <= 0) {
        wp_send_json([ 'success' => false, 'message' => 'Please fill all fields and select valid locations.' ]);
    }
    // Stripe integration
    require_once ORB_PLUGIN_DIR . 'stripe-php/init.php';
    \Stripe\Stripe::setApiKey(get_option('orb_stripe_secret_key'));
    try {
        $session = \Stripe\Checkout\Session::create([
            'payment_method_types' => ['card'],
            'customer_email' => $email,
            'line_items' => [[
                'price_data' => [
                    'currency' => 'usd',
                    'product_data' => [
                        'name' => 'Ride Booking',
                        'description' => 'Pickup: ' . $pickup_address . ' | Dropoff: ' . $dropoff_address,
                    ],
                    'unit_amount' => round($fare * 100),
                ],
                'quantity' => 1,
            ]],
            'mode' => 'payment',
            'success_url' => home_url('/?orb_success=1'),
            'cancel_url' => home_url('/?orb_cancel=1'),
            'metadata' => [
                'name' => $name,
                'email' => $email,
                'phone' => $phone,
                'pickup_address' => $pickup_address,
                'dropoff_address' => $dropoff_address,
                'pickup_date' => $pickup_date,
                'pickup_time' => $pickup_time,
                'distance_meters' => $distance,
                'fare' => $fare,
            ],
        ]);
        wp_send_json([ 'success' => true, 'message' => 'Redirecting to payment...', 'redirect' => $session->url ]);
    } catch (Exception $e) {
        wp_send_json([ 'success' => false, 'message' => 'Stripe error: ' . $e->getMessage() ]);
    }
} 