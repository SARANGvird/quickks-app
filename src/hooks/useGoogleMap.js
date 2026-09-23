// src/hooks/useGoogleMap.js
import { useEffect, useRef, useState, useCallback, useMemo } from "react";

// ==========================================================
// CONSTANTS
// ==========================================================
export const PUNE_BOUNDS = {
  north: 18.75,
  south: 18.35,
  west: 73.6,
  east: 74.05,
};

const DEFAULT_CENTER = { lat: 18.5204, lng: 73.8567 };
const DEFAULT_ZOOM = 13;
const DEFAULT_RADIUS_KM = 5;
const SEARCH_DEBOUNCE_DELAY = 500;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;

const SERVICE_ZONES = [
  { name: "Hinjewadi", lat: 18.591, lng: 73.738, code: "HIN", color: "#10b981" },
  { name: "Wakad", lat: 18.599, lng: 73.764, code: "WAK", color: "#3b82f6" },
  { name: "Kothrud", lat: 18.507, lng: 73.807, code: "KOT", color: "#f59e0b" },
  { name: "Hadapsar", lat: 18.508, lng: 73.926, code: "HAD", color: "#ef4444" },
  { name: "Baner", lat: 18.559, lng: 73.778, code: "BAN", color: "#8b5cf6" },
  { name: "Aundh", lat: 18.558, lng: 73.807, code: "AUN", color: "#ec4899" },
  { name: "Koregaon Park", lat: 18.536, lng: 73.893, code: "KOR", color: "#06b6d4" },
];

// ==========================================================
// HELPER FUNCTIONS
// ==========================================================
const isInsidePune = (lat, lng) => {
  return lat <= PUNE_BOUNDS.north &&
    lat >= PUNE_BOUNDS.south &&
    lng >= PUNE_BOUNDS.west &&
    lng <= PUNE_BOUNDS.east;
};

const formatDistance = (distanceMeters) => {
  const km = distanceMeters / 1000;
  if (km < 1) {
    return `${Math.round(distanceMeters)}m`;
  }
  return `${km.toFixed(1)}km`;
};

const getDistanceColor = (distanceKm) => {
  if (distanceKm < 2) return "#10b981";
  if (distanceKm < 5) return "#f59e0b";
  return "#ef4444";
};

// ==========================================================
// CUSTOM HOOK
// ==========================================================
export default function useGoogleMap({
  mapId,
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  radiusKm = DEFAULT_RADIUS_KM,
  searchInputRef,
  jobs = [],
  enableClustering = false,
  enableTraffic = false,
  enableStreetView = false,
  enableZoomControl = true,
  enableMapTypeControl = true,
  enableFullscreenControl = true,
  onLocationChange,
  onZoneSnap,
  onDistanceUpdate,
  onMarkerClick,
  onMapLoad,
  onError
}) {
  // ==========================================================
  // STATE MANAGEMENT
  // ==========================================================
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [currentAddress, setCurrentAddress] = useState("");
  const [currentZone, setCurrentZone] = useState(null);
  const [nearbyJobs, setNearbyJobs] = useState([]);
  const [mapBounds, setMapBounds] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Refs
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const geocoderRef = useRef(null);
  const infoWindowRef = useRef(null);
  const markersRef = useRef([]);
  const clustererRef = useRef(null);
  const searchBoxRef = useRef(null);
  const retryCountRef = useRef(0);
  const mountedRef = useRef(true);

  // ==========================================================
  // HELPER FUNCTIONS
  // ==========================================================
  const handleError = useCallback((error, context) => {
    console.error(`❌ Google Map Error [${context}]:`, error);
    setMapError({ message: error.message, context });
    if (onError) onError(error, context);
  }, [onError]);

  const loadGoogleMapsScript = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        reject(new Error('Google Maps API key is missing'));
        return;
      }

      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,drawing&callback=initMap`;
      script.async = true;
      script.defer = true;
      
      window.initMap = () => {
        resolve();
        delete window.initMap;
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Google Maps script'));
      };
      
      document.head.appendChild(script);
    });
  }, []);

  // ==========================================================
  // MARKER MANAGEMENT
  // ==========================================================
  const createMarker = useCallback((job, position) => {
    const marker = new window.google.maps.Marker({
      position: position || { lat: job.lat, lng: job.lng },
      map: mapRef.current,
      title: job.title || job.serviceType,
      animation: window.google.maps.Animation.DROP,
      icon: {
        url: job.avatar || `https://maps.google.com/mapfiles/ms/icons/${job.status === 'active' ? 'green' : 'blue'}-dot.png`,
        scaledSize: new window.google.maps.Size(32, 32)
      }
    });

    // Create info window content
    const infoContent = `
      <div style="padding: 12px; max-width: 200px;">
        <h4 style="margin: 0 0 8px 0; font-weight: 600;">${job.title || job.providerName}</h4>
        <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">${job.serviceType || 'Service Provider'}</p>
        <p style="margin: 0; font-size: 11px; color: #999;">⭐ ${job.rating || 'New'} (${job.reviewCount || 0} reviews)</p>
        <button onclick="window.selectProvider('${job.id}')" style="margin-top: 8px; padding: 4px 12px; background: #fbbf24; border: none; border-radius: 4px; cursor: pointer;">
          Select Provider
        </button>
      </div>
    `;

    const infoWindow = new window.google.maps.InfoWindow({
      content: infoContent
    });

    marker.addListener('click', () => {
      infoWindow.open(mapRef.current, marker);
      if (onMarkerClick) onMarkerClick(job);
    });

    return marker;
  }, [onMarkerClick]);

  const updateJobMarkers = useCallback(() => {
    if (!mapRef.current || !window.google) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Create new markers
    jobs.forEach(job => {
      const marker = createMarker(job);
      markersRef.current.push(marker);
    });

    // Apply clustering if enabled
    if (enableClustering && window.MarkerClusterer) {
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
      }
      clustererRef.current = new window.MarkerClusterer(mapRef.current, markersRef.current, {
        imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m',
        maxZoom: 12,
        gridSize: 60
      });
    }
  }, [jobs, createMarker, enableClustering]);

  // ==========================================================
  // LOCATION FUNCTIONS
  // ==========================================================
  const placeMarker = useCallback((lat, lng) => {
    if (!mapRef.current || !window.google) return;

    if (markerRef.current) {
      markerRef.current.setPosition({ lat, lng });
    } else {
      markerRef.current = new window.google.maps.Marker({
        position: { lat, lng },
        map: mapRef.current,
        draggable: true,
        animation: window.google.maps.Animation.DROP,
        title: "Your Location"
      });

      markerRef.current.addListener("dragend", (e) => {
        updateLocation(e.latLng.lat(), e.latLng.lng());
      });
    }
  }, []);

  const drawRadius = useCallback((lat, lng, km) => {
    if (!mapRef.current || !window.google) return;

    if (circleRef.current) {
      circleRef.current.setCenter({ lat, lng });
      circleRef.current.setRadius(km * 1000);
    } else {
      circleRef.current = new window.google.maps.Circle({
        map: mapRef.current,
        center: { lat, lng },
        radius: km * 1000,
        fillColor: "#fbbf24",
        fillOpacity: 0.15,
        strokeColor: "#f59e0b",
        strokeWeight: 2,
        strokeOpacity: 0.8,
        editable: true,
        draggable: true
      });

      // Make radius editable
      circleRef.current.addListener("radius_changed", () => {
        const newRadius = circleRef.current.getRadius() / 1000;
        if (onDistanceUpdate) {
          const updatedDistances = calculateDistances(lat, lng);
          onDistanceUpdate(updatedDistances);
        }
      });

      circleRef.current.addListener("center_changed", () => {
        const center = circleRef.current.getCenter();
        updateLocation(center.lat(), center.lng());
      });
    }
  }, [onDistanceUpdate]);

  const reverseGeocode = useCallback((lat, lng) => {
    if (!geocoderRef.current) return;

    geocoderRef.current.geocode(
      { location: { lat, lng } },
      (results, status) => {
        if (status === "OK" && results?.[0]) {
          const components = results[0].address_components;
          
          // Extract address components
          const area = components.find(c => 
            c.types.includes("sublocality") || 
            c.types.includes("locality")
          );
          
          const city = components.find(c => 
            c.types.includes("administrative_area_level_2")
          );
          
          const pincode = components.find(c => 
            c.types.includes("postal_code")
          );
          
          const formattedAddress = results[0].formatted_address;
          
          setCurrentAddress({
            full: formattedAddress,
            area: area?.long_name || "",
            city: city?.long_name || "",
            pincode: pincode?.long_name || "",
            components
          });
          
          if (onLocationChange) {
            onLocationChange(lat, lng, area?.long_name, formattedAddress);
          }
        }
      }
    );
  }, [onLocationChange]);

  const snapToZone = useCallback((lat, lng) => {
    if (!window.google) return;

    let nearest = null;
    let minDistance = Infinity;

    SERVICE_ZONES.forEach((zone) => {
      const distance = window.google.maps.geometry.spherical.computeDistanceBetween(
        new window.google.maps.LatLng(lat, lng),
        new window.google.maps.LatLng(zone.lat, zone.lng)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearest = zone;
      }
    });

    if (nearest && minDistance <= 5000) { // Within 5km of zone center
      setCurrentZone(nearest);
      if (onZoneSnap) onZoneSnap(nearest);
    } else {
      setCurrentZone(null);
      if (onZoneSnap) onZoneSnap(null);
    }
  }, [onZoneSnap]);

  const calculateDistances = useCallback((lat, lng) => {
    if (!window.google) return [];

    return jobs.map((job) => {
      const distanceMeters = window.google.maps.geometry.spherical.computeDistanceBetween(
        new window.google.maps.LatLng(lat, lng),
        new window.google.maps.LatLng(job.lat, job.lng)
      );
      
      const distanceKm = distanceMeters / 1000;
      const travelTime = Math.ceil(distanceKm * 2); // Rough estimate: 2 minutes per km
      
      return {
        id: job.id,
        distanceMeters,
        distanceKm: distanceKm.toFixed(2),
        distanceFormatted: formatDistance(distanceMeters),
        travelTime,
        travelTimeFormatted: travelTime < 60 ? `${travelTime} min` : `${Math.floor(travelTime / 60)}h ${travelTime % 60}min`,
        color: getDistanceColor(distanceKm)
      };
    });
  }, [jobs]);

  const previewDistances = useCallback((lat, lng) => {
    if (!window.google) return;
    
    const distances = calculateDistances(lat, lng);
    setNearbyJobs(distances.filter(d => d.distanceKm < radiusKm));
    
    if (onDistanceUpdate) {
      onDistanceUpdate(distances);
    }
  }, [calculateDistances, radiusKm, onDistanceUpdate]);

  const updateLocation = useCallback((lat, lng) => {
    if (!isInsidePune(lat, lng)) {
      handleError(new Error("Location outside service area"), "location_validation");
      return;
    }

    setLoading(true);
    setCurrentLocation({ lat, lng });
    
    placeMarker(lat, lng);
    drawRadius(lat, lng, radiusKm);
    reverseGeocode(lat, lng);
    snapToZone(lat, lng);
    previewDistances(lat, lng);
    
    if (mapRef.current) {
      mapRef.current.panTo({ lat, lng });
    }
    
    setLoading(false);
  }, [placeMarker, drawRadius, reverseGeocode, snapToZone, previewDistances, radiusKm, handleError]);

  // ==========================================================
  // SEARCH FUNCTIONALITY
  // ==========================================================
  const setupSearchBox = useCallback(() => {
    if (!searchInputRef?.current || !window.google || !window.google.maps.places) return;

    searchBoxRef.current = new window.google.maps.places.SearchBox(searchInputRef.current);
    
    // Bias search results to current map view
    searchBoxRef.current.setBounds(mapRef.current.getBounds());

    searchBoxRef.current.addListener("places_changed", () => {
      const places = searchBoxRef.current.getPlaces();
      if (!places || places.length === 0) return;
      
      const place = places[0];
      if (!place.geometry || !place.geometry.location) return;
      
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      
      mapRef.current.panTo({ lat, lng });
      mapRef.current.setZoom(15);
      updateLocation(lat, lng);
    });
  }, [searchInputRef, updateLocation]);

  // ==========================================================
  // GET CURRENT LOCATION
  // ==========================================================
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      handleError(new Error("Geolocation not supported"), "geolocation");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        updateLocation(latitude, longitude);
        setLoading(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        handleError(error, "geolocation");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [updateLocation, handleError]);

  // ==========================================================
  // MAP CONTROLS
  // ==========================================================
  const setMapType = useCallback((type) => {
    if (!mapRef.current) return;
    mapRef.current.setMapTypeId(type);
  }, []);

  const setZoom = useCallback((level) => {
    if (!mapRef.current) return;
    mapRef.current.setZoom(level);
  }, []);

  const panTo = useCallback((lat, lng) => {
    if (!mapRef.current) return;
    mapRef.current.panTo({ lat, lng });
    updateLocation(lat, lng);
  }, [updateLocation]);

  // ==========================================================
  // INITIALIZATION
  // ==========================================================
  useEffect(() => {
    mountedRef.current = true;
    
    const initMap = async () => {
      try {
        await loadGoogleMapsScript();
        
        if (!mountedRef.current) return;
        
        const map = new window.google.maps.Map(
          document.getElementById(mapId),
          {
            center,
            zoom,
            restriction: {
              latLngBounds: PUNE_BOUNDS,
              strictBounds: false
            },
            zoomControl: enableZoomControl,
            mapTypeControl: enableMapTypeControl,
            fullscreenControl: enableFullscreenControl,
            streetViewControl: enableStreetView,
            mapTypeId: enableTraffic ? window.google.maps.MapTypeId.TRAFFIC : window.google.maps.MapTypeId.ROADMAP,
            styles: [
              {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }]
              }
            ]
          }
        );

        mapRef.current = map;
        geocoderRef.current = new window.google.maps.Geocoder();
        infoWindowRef.current = new window.google.maps.InfoWindow();
        
        // Add map event listeners
        map.addListener("click", (e) => {
          updateLocation(e.latLng.lat(), e.latLng.lng());
        });
        
        map.addListener("bounds_changed", () => {
          const bounds = map.getBounds();
          if (bounds) {
            setMapBounds({
              north: bounds.getNorthEast().lat(),
              south: bounds.getSouthWest().lat(),
              east: bounds.getNorthEast().lng(),
              west: bounds.getSouthWest().lng()
            });
          }
        });
        
        map.addListener("idle", () => {
          if (searchBoxRef.current) {
            searchBoxRef.current.setBounds(map.getBounds());
          }
        });
        
        // Setup search box
        setupSearchBox();
        
        // Update job markers
        updateJobMarkers();
        
        setMapLoaded(true);
        setMapError(null);
        
        if (onMapLoad) {
          onMapLoad(map);
        }
        
        console.log("✅ Google Map initialized successfully");
        
      } catch (error) {
        console.error("Failed to initialize Google Map:", error);
        handleError(error, "initialization");
        
        if (retryCountRef.current < MAX_RETRY_ATTEMPTS) {
          retryCountRef.current++;
          setTimeout(initMap, RETRY_DELAY * retryCountRef.current);
        }
      }
    };
    
    initMap();
    
    return () => {
      mountedRef.current = false;
      
      // Cleanup markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
      }
      
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
      
      if (circleRef.current) {
        circleRef.current.setMap(null);
      }
      
      if (mapRef.current) {
        mapRef.current = null;
      }
    };
  }, [mapId, center, zoom, enableZoomControl, enableMapTypeControl, enableFullscreenControl, enableStreetView, enableTraffic, setupSearchBox, updateJobMarkers, loadGoogleMapsScript, handleError, onMapLoad]);

  // ==========================================================
  // UPDATE JOBS WHEN CHANGED
  // ==========================================================
  useEffect(() => {
    if (mapLoaded && jobs.length > 0) {
      updateJobMarkers();
    }
  }, [jobs, mapLoaded, updateJobMarkers]);

  // ==========================================================
  // RETURN VALUE
  // ==========================================================
  return {
    // State
    mapLoaded,
    mapError,
    currentLocation,
    currentAddress,
    currentZone,
    nearbyJobs,
    mapBounds,
    loading,
    
    // Actions
    updateLocation,
    getCurrentLocation,
    setMapType,
    setZoom,
    panTo,
    
    // Utility
    isInsidePune,
    formatDistance,
    calculateDistances,
    
    // Constants
    SERVICE_ZONES,
    PUNE_BOUNDS
  };
}