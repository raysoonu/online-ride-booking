'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader } from '@googlemaps/js-api-loader'
import { MapPin, Calendar, Clock, User, Mail, Phone, CheckCircle, Loader2 } from 'lucide-react'
import { BookingFormData, Location, RouteInfo } from '@/types'
import { calculateFare, calculateFareWithSettings, calculateDistance, formatCurrency, isValidEmail, isValidPhone } from '@/lib/utils'

export default function BookingForm() {
  const [formData, setFormData] = useState<BookingFormData>({
    name: '',
    email: '',
    phone: '',
    pickupAddress: '',
    dropoffAddress: '',
    pickupDate: '',
    pickupTime: '',
  })

  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)
  const [fare, setFare] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [bookingConfirmed, setBookingConfirmed] = useState(false)
  const [bookingNumber, setBookingNumber] = useState<string>('')
  const [mapLoaded, setMapLoaded] = useState(false)

  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null)
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null)
  const pickupAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const dropoffAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const pickupMarkerRef = useRef<google.maps.Marker | null>(null)
  const dropoffMarkerRef = useRef<google.maps.Marker | null>(null)
  const geocoderRef = useRef<google.maps.Geocoder | null>(null)

  useEffect(() => {
    initializeMap()
  }, [])

  useEffect(() => {
    if (routeInfo) {
      const distanceInKm = routeInfo.distance.value / 1000 // Convert meters to kilometers
      
      // Use async fare calculation with settings
      calculateFareWithSettings(distanceInKm).then(calculatedFare => {
        setFare(calculatedFare)
        setFormData(prev => ({
          ...prev,
          calculatedDistance: routeInfo.distance.value,
          calculatedFare: calculatedFare
        }))
      }).catch(error => {
        console.warn('Failed to calculate fare with settings, using default:', error)
        const fallbackFare = calculateFare(distanceInKm)
        setFare(fallbackFare)
        setFormData(prev => ({
          ...prev,
          calculatedDistance: routeInfo.distance.value,
          calculatedFare: fallbackFare
        }))
      })
    }
  }, [routeInfo])

  const initializeMap = async () => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      if (!apiKey) {
        console.error('Google Maps API key is not configured')
        setMessage({ type: 'error', text: 'Google Maps is not properly configured. Please contact support.' })
        return
      }

      console.log('Initializing Google Maps with API key:', apiKey.substring(0, 10) + '...')
      
      const loader = new Loader({
        apiKey: apiKey,
        version: 'weekly',
        libraries: ['places']
      })

      await loader.load()
      console.log('Google Maps API loaded successfully')

      if (mapRef.current) {
        const map = new google.maps.Map(mapRef.current, {
          center: { lat: 27.7172, lng: 85.3240 }, // Kathmandu, Nepal
          zoom: 13,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        })

        mapInstanceRef.current = map
        directionsServiceRef.current = new google.maps.DirectionsService()
        directionsRendererRef.current = new google.maps.DirectionsRenderer({
          suppressMarkers: true, // We'll use custom markers
          draggable: false,
        })
        directionsRendererRef.current.setMap(map)
        geocoderRef.current = new google.maps.Geocoder()

        // Create draggable markers
        pickupMarkerRef.current = new google.maps.Marker({
          map: map,
          draggable: true,
          label: 'A',
          position: { lat: 27.7172, lng: 85.3240 }, // Default to Kathmandu
          title: 'Pickup Location'
        })

        dropoffMarkerRef.current = new google.maps.Marker({
          map: map,
          draggable: true,
          label: 'B',
          position: { lat: 27.7272, lng: 85.3340 }, // Slightly offset from pickup
          title: 'Dropoff Location'
        })

        // Set initial addresses from marker positions and calculate initial route
        updateAddressFromMarker(pickupMarkerRef.current, 'pickup')
        updateAddressFromMarker(dropoffMarkerRef.current, 'dropoff')
        
        // Calculate initial route after a short delay to allow addresses to be set
        setTimeout(() => {
          calculateRoute()
        }, 1000)

        // Add drag listeners to markers
        pickupMarkerRef.current.addListener('dragend', () => {
          updateAddressFromMarker(pickupMarkerRef.current!, 'pickup')
          calculateRoute()
        })

        dropoffMarkerRef.current.addListener('dragend', () => {
          updateAddressFromMarker(dropoffMarkerRef.current!, 'dropoff')
          calculateRoute()
        })

        // Initialize autocomplete for pickup
        const pickupInput = document.getElementById('pickup') as HTMLInputElement
        if (pickupInput) {
          pickupAutocompleteRef.current = new google.maps.places.Autocomplete(pickupInput, {
            componentRestrictions: { country: 'np' },
            fields: ['place_id', 'geometry', 'name', 'formatted_address']
          })

          pickupAutocompleteRef.current.addListener('place_changed', () => {
            const place = pickupAutocompleteRef.current?.getPlace()
            if (place && place.formatted_address && place.geometry && place.geometry.location) {
              setFormData(prev => ({ ...prev, pickupAddress: place.formatted_address || '' }))
              // Update marker position
              if (pickupMarkerRef.current) {
                const location = place.geometry.location
                // Handle both LatLng object and LatLngLiteral
                const latLng = typeof location.lat === 'function' 
                  ? new google.maps.LatLng(location.lat(), location.lng())
                  : location
                pickupMarkerRef.current.setPosition(latLng)
                mapInstanceRef.current?.panTo(latLng)
              }
              calculateRoute()
            }
          })
        }

        // Initialize autocomplete for dropoff
        const dropoffInput = document.getElementById('dropoff') as HTMLInputElement
        if (dropoffInput) {
          dropoffAutocompleteRef.current = new google.maps.places.Autocomplete(dropoffInput, {
            componentRestrictions: { country: 'np' },
            fields: ['place_id', 'geometry', 'name', 'formatted_address']
          })

          dropoffAutocompleteRef.current.addListener('place_changed', () => {
            const place = dropoffAutocompleteRef.current?.getPlace()
            if (place && place.formatted_address && place.geometry && place.geometry.location) {
              setFormData(prev => ({ ...prev, dropoffAddress: place.formatted_address || '' }))
              // Update marker position
              if (dropoffMarkerRef.current) {
                const location = place.geometry.location
                // Handle both LatLng object and LatLngLiteral
                const latLng = typeof location.lat === 'function' 
                  ? new google.maps.LatLng(location.lat(), location.lng())
                  : location
                dropoffMarkerRef.current.setPosition(latLng)
                mapInstanceRef.current?.panTo(latLng)
              }
              calculateRoute()
            }
          })
        }

        setMapLoaded(true)
      }
    } catch (error) {
      console.error('Error loading Google Maps:', error)
      setMessage({ type: 'error', text: 'Failed to load Google Maps. Please check your internet connection and refresh the page.' })
      
      // Try to provide more specific error information
      if (error instanceof Error) {
        console.error('Map initialization error details:', error.message)
        if (error.message.includes('API key')) {
          setMessage({ type: 'error', text: 'Google Maps API key is invalid. Please contact support.' })
        }
      }
    }
  }

  const updateAddressFromMarker = (marker: google.maps.Marker, inputType: 'pickup' | 'dropoff') => {
    if (!geocoderRef.current || !marker.getPosition()) return

    geocoderRef.current.geocode(
      { location: marker.getPosition()! },
      (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const address = results[0].formatted_address
          if (inputType === 'pickup') {
            setFormData(prev => ({ ...prev, pickupAddress: address }))
            const pickupInput = document.getElementById('pickup') as HTMLInputElement
            if (pickupInput) pickupInput.value = address
          } else {
            setFormData(prev => ({ ...prev, dropoffAddress: address }))
            const dropoffInput = document.getElementById('dropoff') as HTMLInputElement
            if (dropoffInput) dropoffInput.value = address
          }
        }
      }
    )
  }

  const calculateRoute = async () => {
    // Check if we have either addresses or marker positions
    const hasPickupMarker = pickupMarkerRef.current?.getPosition()
    const hasDropoffMarker = dropoffMarkerRef.current?.getPosition()
    
    if (!formData.pickupAddress && !hasPickupMarker) return
    if (!formData.dropoffAddress && !hasDropoffMarker) return

    console.log('Calculating route from:', formData.pickupAddress, 'to:', formData.dropoffAddress)

    try {
      // Try Google Maps route calculation first
      if (directionsServiceRef.current) {
        console.log('Attempting Google Maps Directions API route calculation...')
        
        // Use marker positions if available, otherwise use addresses
        const origin = hasPickupMarker ? pickupMarkerRef.current!.getPosition()! : formData.pickupAddress
        const destination = hasDropoffMarker ? dropoffMarkerRef.current!.getPosition()! : formData.dropoffAddress
        
        const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
          directionsServiceRef.current!.route({
            origin: origin,
            destination: destination,
            travelMode: google.maps.TravelMode.DRIVING,
          }, (result, status) => {
            if (status === 'OK' && result) {
              resolve(result)
            } else {
              reject(new Error(`Directions API failed with status: ${status}`))
            }
          })
        })

        if (directionsRendererRef.current) {
          directionsRendererRef.current.setDirections(result)
        }

        const route = result.routes[0]
        const leg = route.legs[0]
        let distanceKm = leg.distance!.value / 1000

        console.log('Google Maps route calculated successfully:', {
          distance: leg.distance!.text,
          duration: leg.duration!.text,
          distanceKm
        })

        // Check if Google Maps distance seems unreasonable for Nepal routes
        const pickup = formData.pickupAddress.toLowerCase()
        const dropoff = formData.dropoffAddress.toLowerCase()
        let useIntelligentEstimate = false
        let estimatedDistanceKm = distanceKm

        console.log('DEBUG: Address comparison:', {
          pickup: pickup,
          dropoff: dropoff,
          distanceKm: distanceKm,
          pickupIncludesKathmandu: pickup.includes('kathmandu'),
          dropoffIncludesPokhara: dropoff.includes('pokhara'),
          pickupIncludesPokhara: pickup.includes('pokhara'),
          dropoffIncludesKathmandu: dropoff.includes('kathmandu')
        })

        // Enhanced city detection function
        const detectCity = (address: string): string[] => {
          const cities = []
          const addr = address.toLowerCase()
          if (addr.includes('kathmandu') || addr.includes('ktm')) cities.push('kathmandu')
          if (addr.includes('pokhara')) cities.push('pokhara')
          if (addr.includes('chitwan')) cities.push('chitwan')
          if (addr.includes('bharatpur')) cities.push('chitwan') // Bharatpur is in Chitwan
          if (addr.includes('biratnagar')) cities.push('biratnagar')
          if (addr.includes('birgunj')) cities.push('birgunj')
          return cities
        }

        const pickupCities = detectCity(pickup)
        const dropoffCities = detectCity(dropoff)
        
        console.log('DEBUG: Detected cities:', { pickupCities, dropoffCities })

        // Use intelligent estimation for common Nepal routes if Google Maps gives unreasonable distance
        const isKathmanduPokhara = (pickupCities.includes('kathmandu') && dropoffCities.includes('pokhara')) || 
                                   (pickupCities.includes('pokhara') && dropoffCities.includes('kathmandu'))
        const isKathmanduChitwan = (pickupCities.includes('kathmandu') && dropoffCities.includes('chitwan')) || 
                                   (pickupCities.includes('chitwan') && dropoffCities.includes('kathmandu'))

        if (isKathmanduPokhara) {
          console.log('DEBUG: Detected Kathmandu-Pokhara route, checking distance threshold...')
          // Use estimate if distance is too short (<100km) or too long (>300km)
          // Kathmandu-Pokhara should be around 200km, so anything under 100km is clearly wrong
          if (distanceKm < 100 || distanceKm > 300) {
            estimatedDistanceKm = 200
            useIntelligentEstimate = true
            console.log(`Using intelligent estimate for Kathmandu-Pokhara: ${estimatedDistanceKm}km (Google Maps showed: ${distanceKm}km)`)
          } else {
            console.log(`Google Maps distance ${distanceKm}km seems reasonable for Kathmandu-Pokhara, using it.`)
          }
        } else if (isKathmanduChitwan) {
          console.log('DEBUG: Detected Kathmandu-Chitwan route, checking distance threshold...')
          // Use estimate if distance is too short (<80km) or too long (>250km)
          // Kathmandu-Chitwan should be around 150km, so anything under 80km is clearly wrong
          if (distanceKm < 80 || distanceKm > 250) {
            estimatedDistanceKm = 150
            useIntelligentEstimate = true
            console.log(`Using intelligent estimate for Kathmandu-Chitwan: ${estimatedDistanceKm}km (Google Maps showed: ${distanceKm}km)`)
          } else {
            console.log(`Google Maps distance ${distanceKm}km seems reasonable for Kathmandu-Chitwan, using it.`)
          }
        } else {
          console.log('DEBUG: Route not recognized as a common Nepal intercity route, using Google Maps distance.')
          console.log('DEBUG: Available pickup cities:', pickupCities, 'dropoff cities:', dropoffCities)
        }

        const finalDistance = useIntelligentEstimate ? estimatedDistanceKm : distanceKm
        const displayText = useIntelligentEstimate ? 
          `${estimatedDistanceKm} km (Nepal route estimate)` : 
          leg.distance!.text

        setRouteInfo({
          distance: { text: displayText, value: finalDistance * 1000 },
          duration: leg.duration!,
          startAddress: leg.start_address,
          endAddress: leg.end_address,
        })
        
        // Calculate fare and show success message
        try {
          const fare = await calculateFareWithSettings(finalDistance)
          setMessage({ 
            type: 'success', 
            text: `Route calculated: ${displayText} (NPR ${fare.toFixed(2)})` 
          })
        } catch (fareError) {
          const fallbackFare = calculateFare(finalDistance)
          setMessage({ 
            type: 'success', 
            text: `Route calculated: ${displayText} (NPR ${fallbackFare.toFixed(2)})` 
          })
        }
        
        return
      }
    } catch (error) {
      console.error('Google Maps route calculation failed:', error)
      setMessage({ type: 'error', text: `Route calculation failed: ${error}. Trying alternative method...` })
    }

    // Fallback: Use coordinate-based distance calculation
    try {
      console.log('Attempting geocoding fallback...')
      const geocoder = new google.maps.Geocoder()
      
      const [pickupResult, dropoffResult] = await Promise.all([
        new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
          geocoder.geocode({ address: formData.pickupAddress }, (results, status) => {
            console.log('Pickup geocoding status:', status, 'Results:', results?.length || 0)
            if (status === 'OK' && results && results.length > 0) {
              resolve(results)
            } else {
              reject(new Error(`Pickup geocoding failed with status: ${status}`))
            }
          })
        }),
        new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
          geocoder.geocode({ address: formData.dropoffAddress }, (results, status) => {
            console.log('Dropoff geocoding status:', status, 'Results:', results?.length || 0)
            if (status === 'OK' && results && results.length > 0) {
              resolve(results)
            } else {
              reject(new Error(`Dropoff geocoding failed with status: ${status}`))
            }
          })
        })
      ])

      const pickupLat = pickupResult[0].geometry.location.lat()
      const pickupLng = pickupResult[0].geometry.location.lng()
      const dropoffLat = dropoffResult[0].geometry.location.lat()
      const dropoffLng = dropoffResult[0].geometry.location.lng()
      
      console.log('Geocoding successful:', {
        pickup: { lat: pickupLat, lng: pickupLng, address: pickupResult[0].formatted_address },
        dropoff: { lat: dropoffLat, lng: dropoffLng, address: dropoffResult[0].formatted_address }
      })

      // Add markers for pickup and dropoff locations
      if (mapInstanceRef.current) {
        // Clear existing markers
        if (directionsRendererRef.current) {
          directionsRendererRef.current.setDirections(null as any)
        }

        // Create pickup marker with green pin icon
        new google.maps.Marker({
          position: { lat: pickupLat, lng: pickupLng },
          map: mapInstanceRef.current,
          title: 'Pickup Location',
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="24" height="36" viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24c0-6.6-5.4-12-12-12z" fill="#22c55e" stroke="white" stroke-width="2"/>
                <circle cx="12" cy="12" r="6" fill="white"/>
                <circle cx="12" cy="12" r="3" fill="#22c55e"/>
              </svg>
            `),
            scaledSize: new google.maps.Size(24, 36),
            anchor: new google.maps.Point(12, 36)
          }
        })

        // Create dropoff marker with red pin icon
        new google.maps.Marker({
          position: { lat: dropoffLat, lng: dropoffLng },
          map: mapInstanceRef.current,
          title: 'Dropoff Location',
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="24" height="36" viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24c0-6.6-5.4-12-12-12z" fill="#ef4444" stroke="white" stroke-width="2"/>
                <circle cx="12" cy="12" r="6" fill="white"/>
                <circle cx="12" cy="12" r="3" fill="#ef4444"/>
              </svg>
            `),
            scaledSize: new google.maps.Size(24, 36),
            anchor: new google.maps.Point(12, 36)
          }
        })

        // Adjust map bounds to show both locations
        const bounds = new google.maps.LatLngBounds()
        bounds.extend({ lat: pickupLat, lng: pickupLng })
        bounds.extend({ lat: dropoffLat, lng: dropoffLng })
        mapInstanceRef.current.fitBounds(bounds)
        
        // Add some padding
        mapInstanceRef.current.panToBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 })
      }

      const distanceKm = calculateDistance(pickupLat, pickupLng, dropoffLat, dropoffLng)
      const estimatedDurationMinutes = Math.round(distanceKm * 2) // Rough estimate: 2 minutes per km

      setRouteInfo({
        distance: { text: `${distanceKm.toFixed(2)} km`, value: distanceKm * 1000 }, // Convert to meters
        duration: { text: `${estimatedDurationMinutes} mins`, value: estimatedDurationMinutes * 60 }, // Convert to seconds
        startAddress: formData.pickupAddress,
        endAddress: formData.dropoffAddress,
      })

      // Calculate fare with settings for the success message
      calculateFareWithSettings(distanceKm).then(fare => {
        setMessage({ 
          type: 'success', 
          text: `Route calculated using direct distance: ${distanceKm.toFixed(2)} km (NPR ${fare.toFixed(2)})` 
        })
      }).catch(() => {
        const fallbackFare = calculateFare(distanceKm)
        setMessage({ 
          type: 'success', 
          text: `Route calculated using direct distance: ${distanceKm.toFixed(2)} km (NPR ${fallbackFare.toFixed(2)})` 
        })
      })

    } catch (fallbackError) {
      console.error('Geocoding fallback failed:', fallbackError)
      console.log('Using intelligent distance estimation based on city names...')
      
      // Try to estimate distance based on city names or use a more intelligent fallback
      let estimatedDistanceKm = 5 // Default minimum (increased from 2.5)
      
      // Simple distance estimation based on common Nepal routes
      const pickup = formData.pickupAddress.toLowerCase()
      const dropoff = formData.dropoffAddress.toLowerCase()
      
      if ((pickup.includes('kathmandu') && dropoff.includes('pokhara')) || 
          (pickup.includes('pokhara') && dropoff.includes('kathmandu'))) {
        estimatedDistanceKm = 200 // Kathmandu to Pokhara is approximately 200km
      } else if ((pickup.includes('kathmandu') && dropoff.includes('chitwan')) || 
                 (pickup.includes('chitwan') && dropoff.includes('kathmandu'))) {
        estimatedDistanceKm = 150 // Kathmandu to Chitwan is approximately 150km
      } else if ((pickup.includes('kathmandu') && dropoff.includes('bhaktapur')) || 
                 (pickup.includes('bhaktapur') && dropoff.includes('kathmandu'))) {
        estimatedDistanceKm = 15 // Kathmandu to Bhaktapur is approximately 15km
      } else if ((pickup.includes('kathmandu') && dropoff.includes('lalitpur')) || 
                 (pickup.includes('lalitpur') && dropoff.includes('kathmandu'))) {
        estimatedDistanceKm = 10 // Kathmandu to Lalitpur is approximately 10km
      } else if (pickup !== dropoff) {
        // If different addresses, assume at least 5km
        estimatedDistanceKm = 5
      }
      
      // Calculate fare with settings for estimated route
       calculateFareWithSettings(estimatedDistanceKm).then(estimatedFare => {
         setMessage({ 
           type: 'success', 
           text: `Estimated route: ${estimatedDistanceKm} km (NPR ${estimatedFare.toFixed(2)}) - Exact route calculation unavailable` 
         })
       }).catch(() => {
         const fallbackFare = calculateFare(estimatedDistanceKm)
         setMessage({ 
           type: 'success', 
           text: `Estimated route: ${estimatedDistanceKm} km (NPR ${fallbackFare.toFixed(2)}) - Exact route calculation unavailable` 
         })
       })
      
      // Try to show approximate locations on map even if geocoding failed
      if (mapInstanceRef.current) {
        // Clear existing directions
        if (directionsRendererRef.current) {
          directionsRendererRef.current.setDirections(null as any)
        }

        // Show general area markers (Kathmandu center as fallback)
        const kathmandu = { lat: 27.7172, lng: 85.3240 }
        
        // Create fallback pickup marker
        new google.maps.Marker({
          position: kathmandu,
          map: mapInstanceRef.current,
          title: `Pickup: ${formData.pickupAddress}`,
          label: 'A',
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="12" fill="#6b7280" stroke="white" stroke-width="2"/>
                <text x="16" y="20" text-anchor="middle" fill="white" font-family="Arial" font-size="14" font-weight="bold">A</text>
              </svg>
            `),
            scaledSize: new google.maps.Size(32, 32)
          }
        })

        // Create fallback dropoff marker (slightly offset)
        new google.maps.Marker({
          position: { lat: kathmandu.lat + 0.01, lng: kathmandu.lng + 0.01 },
          map: mapInstanceRef.current,
          title: `Dropoff: ${formData.dropoffAddress}`,
          label: 'B',
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="12" fill="#6b7280" stroke="white" stroke-width="2"/>
                <text x="16" y="20" text-anchor="middle" fill="white" font-family="Arial" font-size="14" font-weight="bold">B</text>
              </svg>
            `),
            scaledSize: new google.maps.Size(32, 32)
          }
        })

        // Center map on Kathmandu
        mapInstanceRef.current.setCenter(kathmandu)
        mapInstanceRef.current.setZoom(13)
      }
      
      // Set estimated route info
      const estimatedDurationMinutes = Math.round(estimatedDistanceKm * 2) // Rough estimate: 2 minutes per km
      setRouteInfo({
        distance: { text: `${estimatedDistanceKm} km`, value: estimatedDistanceKm * 1000 }, // Convert to meters
        duration: { text: `${estimatedDurationMinutes} mins`, value: estimatedDurationMinutes * 60 },
        startAddress: formData.pickupAddress,
        endAddress: formData.dropoffAddress,
      })
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Trigger route calculation when addresses change
    if (name === 'pickupAddress' || name === 'dropoffAddress') {
      setTimeout(calculateRoute, 500) // Debounce
    }
  }

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: 'Please enter your full name.' })
      return false
    }
    if (!isValidEmail(formData.email)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address.' })
      return false
    }
    if (!isValidPhone(formData.phone)) {
      setMessage({ type: 'error', text: 'Please enter a valid phone number.' })
      return false
    }
    if (!formData.pickupAddress.trim()) {
      setMessage({ type: 'error', text: 'Please enter a pickup address.' })
      return false
    }
    if (!formData.dropoffAddress.trim()) {
      setMessage({ type: 'error', text: 'Please enter a dropoff address.' })
      return false
    }
    if (!formData.pickupDate) {
      setMessage({ type: 'error', text: 'Please select a pickup date.' })
      return false
    }
    if (!formData.pickupTime) {
      setMessage({ type: 'error', text: 'Please select a pickup time.' })
      return false
    }
    if (!routeInfo) {
      setMessage({ type: 'error', text: 'Please wait for route calculation to complete.' })
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const bookingData = {
        customerName: formData.name,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        pickupAddress: formData.pickupAddress,
        dropoffAddress: formData.dropoffAddress,
        pickupDate: formData.pickupDate,
        pickupTime: formData.pickupTime,
        distance: routeInfo?.distance.value || 0, // in meters
        duration: routeInfo?.duration.value || 0, // in seconds
      }

      console.log('Sending booking data:', bookingData)

      const response = await fetch('/api/create-booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      })

      if (!response.ok) {
        throw new Error('Failed to create booking')
      }

      const result = await response.json()
      setBookingNumber(result.bookingNumber)
      setBookingConfirmed(true)
      setMessage({ type: 'success', text: 'Booking confirmed successfully!' })
    } catch (error) {
      console.error('Error creating booking:', error)
      setMessage({ type: 'error', text: 'Failed to create booking. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Book Your Ride</h1>
        <p className="text-lg text-gray-600">Professional transportation service with upfront pricing</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Personal Information */}
        <div className="bg-gray-50 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <User className="h-6 w-6 mr-2 text-blue-600" />
            Personal Information
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <User className="absolute left-3 top-11 h-5 w-5 text-gray-400" />
              <input
                type="text"
                name="name"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
                required
              />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <Mail className="absolute left-3 top-11 h-5 w-5 text-gray-400" />
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
                required
              />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <Phone className="absolute left-3 top-11 h-5 w-5 text-gray-400" />
              <input
                type="tel"
                name="phone"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Location Information */}
        <div className="bg-blue-50 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <MapPin className="h-6 w-6 mr-2 text-blue-600" />
            Trip Details
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Location</label>
              <MapPin className="absolute left-3 top-11 h-5 w-5 text-green-500" />
              <input
                type="text"
                id="pickup"
                name="pickupAddress"
                placeholder="Enter pickup address"
                value={formData.pickupAddress}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
                required
              />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Dropoff Location</label>
              <MapPin className="absolute left-3 top-11 h-5 w-5 text-red-500" />
              <input
                type="text"
                id="dropoff"
                name="dropoffAddress"
                placeholder="Enter dropoff address"
                value={formData.dropoffAddress}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Date and Time */}
        <div className="bg-purple-50 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <Calendar className="h-6 w-6 mr-2 text-blue-600" />
            Schedule
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Date</label>
              <Calendar className="absolute left-3 top-11 h-5 w-5 text-gray-400" />
              <input
                type="date"
                name="pickupDate"
                value={formData.pickupDate}
                onChange={handleInputChange}
                min={new Date().toISOString().split('T')[0]}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
                required
              />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Time</label>
              <Clock className="absolute left-3 top-11 h-5 w-5 text-gray-400" />
              <input
                type="time"
                name="pickupTime"
                value={formData.pickupTime}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Map and Route Information */}
        <div className="bg-green-50 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <svg className="h-6 w-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Live Map & Route
          </h2>
          
          {/* Route Summary - Show above map when available */}
          {routeInfo && (
            <div className="bg-white rounded-lg p-6 mb-6 border-2 border-blue-200 shadow-sm">
              <h3 className="font-bold text-xl mb-4 text-gray-900 flex items-center">
                <svg className="h-5 w-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Route Confirmed
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <MapPin className="h-5 w-5 text-green-600 mr-2" />
                    <span className="font-semibold text-gray-700">From</span>
                  </div>
                  <p className="text-sm text-gray-600 truncate" title={formData.pickupAddress}>
                    {formData.pickupAddress}
                  </p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <MapPin className="h-5 w-5 text-red-600 mr-2" />
                    <span className="font-semibold text-gray-700">To</span>
                  </div>
                  <p className="text-sm text-gray-600 truncate" title={formData.dropoffAddress}>
                    {formData.dropoffAddress}
                  </p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <svg className="h-5 w-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span className="font-semibold text-gray-700">Distance</span>
                  </div>
                  <p className="text-lg font-bold text-yellow-700">{routeInfo.distance.text}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Clock className="h-5 w-5 text-purple-600 mr-2" />
                    <span className="font-semibold text-gray-700">Duration</span>
                  </div>
                  <p className="text-lg font-bold text-purple-700">{routeInfo.duration.text}</p>
                </div>
              </div>
              <div className="mt-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg text-center">
                <span className="text-lg font-medium">Total Fare: </span>
                <span className="text-2xl font-bold">{formatCurrency(fare)}</span>
              </div>
            </div>
          )}
          
          {/* Map */}
          <div className="w-full h-96 bg-gray-200 rounded-lg overflow-hidden border-2 border-gray-300 shadow-sm">
            <div ref={mapRef} className="w-full h-full" />
            {!mapLoaded && (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            )}
          </div>
          
          {/* Summary Card - Similar to onlineridebooking */}
          <div className="mt-6 bg-white rounded-lg p-6 border-2 border-gray-200 shadow-lg">
            <h3 className="font-bold text-lg mb-4 text-gray-900">Ride Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Pickup:</span>
                <span className="text-gray-600 text-right max-w-xs truncate" title={formData.pickupAddress}>
                  {formData.pickupAddress || '--'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Dropoff:</span>
                <span className="text-gray-600 text-right max-w-xs truncate" title={formData.dropoffAddress}>
                  {formData.dropoffAddress || '--'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Distance:</span>
                <span className="text-gray-600">
                  {routeInfo ? `${routeInfo.distance.text} (${(routeInfo.distance.value / 1609.34).toFixed(2)} mi)` : '--'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Estimated Time:</span>
                <span className="text-gray-600">{routeInfo?.duration.text || '--'}</span>
              </div>
              <div className="border-t pt-3 mt-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg text-gray-900">Total Price:</span>
                  <span className="font-bold text-xl text-blue-600">
                    {fare > 0 ? formatCurrency(fare) : '--'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {!routeInfo && (
            <div className="mt-4 text-center text-gray-500">
              <p className="text-sm">Enter pickup and dropoff locations or drag markers to see route details</p>
              <p className="text-xs mt-1">💡 Tip: You can drag the markers on the map to adjust locations</p>
            </div>
          )}
        </div>

        {/* Submit Button */}
        {!bookingConfirmed ? (
          <button
            type="submit"
            disabled={isLoading || !routeInfo}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <CheckCircle className="h-5 w-5" />
            )}
            <span>{isLoading ? 'Processing...' : `Confirm Booking - ${formatCurrency(fare)}`}</span>
          </button>
        ) : (
          <div className="text-center py-8">
            <div className="mb-6">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Thanks for Booking!</h2>
              <p className="text-gray-600 mb-4">Your ride has been successfully confirmed.</p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-green-800 font-semibold">Booking Number: {bookingNumber}</p>
                <p className="text-green-700 text-sm mt-1">A confirmation email has been sent to {formData.email}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setBookingConfirmed(false)
                setBookingNumber('')
                setFormData({
                  name: '',
                  email: '',
                  phone: '',
                  pickupAddress: '',
                  dropoffAddress: '',
                  pickupDate: '',
                  pickupTime: '',
                })
                setRouteInfo(null)
                setFare(0)
                setMessage(null)
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
            >
              Book Another Ride
            </button>
          </div>
        )}

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}
      </form>
    </div>
  )
}