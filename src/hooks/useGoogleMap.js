import { useEffect, useRef, useState, useCallback, useMemo } from "react";

export const PUNE_BOUNDS = {
  north: 18.75,
  south: 18.35,
  west: 73.6,
  east: 74.05,
};

const DEFAULT_CENTER = { lat: 18.5204, lng: 73.8567 };
const DEFAULT_ZOOM = 13;
const DEFAULT_RADIUS_KM = 5;
const MAX_RETRY = 3;
const RETRY_DELAY = 1200;

const SERVICE_ZONES = [
  { name: "Hinjewadi", lat: 18.591, lng: 73.738, code: "HIN", color: "#10b981" },
  { name: "Wakad", lat: 18.599, lng: 73.764, code: "WAK", color: "#3b82f6" },
  { name: "Kothrud", lat: 18.507, lng: 73.807, code: "KOT", color: "#f59e0b" },
  { name: "Hadapsar", lat: 18.508, lng: 73.926, code: "HAD", color: "#ef4444" },
  { name: "Baner", lat: 18.559, lng: 73.778, code: "BAN", color: "#8b5cf6" },
  { name: "Aundh", lat: 18.558, lng: 73.807, code: "AUN", color: "#ec4899" },
  { name: "Koregaon Park", lat: 18.536, lng: 73.893, code: "KOR", color: "#06b6d4" },
];

const isInsidePune = (lat, lng) => lat <= PUNE_BOUNDS.north && lat >= PUNE_BOUNDS.south && lng >= PUNE_BOUNDS.west && lng <= PUNE_BOUNDS.east;

const formatDistance = (m) => {
  const km = m / 1000;
  return km < 1 ? `${Math.round(m)}m` : `${km.toFixed(1)}km`;
};

const getDistanceColor = (km) => {
  if (km < 2) return "#10b981";
  if (km < 5) return "#f59e0b";
  return "#ef4444";
};

const loadGoogleMaps = (() => {
  let promise = null;
  return (apiKey) => {
    if (promise) return promise;
    if (window.google?.maps) {
      promise = Promise.resolve();
      return promise;
    }
    promise = new Promise((resolve, reject) => {
      if (!apiKey) { reject(new Error("Google Maps API key missing")); return; }
      if (document.querySelector(`script[src*="maps.googleapis.com"]`)) {
        const check = setInterval(() => {
          if (window.google?.maps) { clearInterval(check); resolve(); }
        }, 200);
        setTimeout(() => { clearInterval(check); reject(new Error("Maps load timeout")); }, 15000);
        return;
      }
      const s = document.createElement("script");
      s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,drawing`;
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load Google Maps script"));
      document.head.appendChild(s);
    });
    return promise;
  };
})();

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
  onError,
}) {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [currentAddress, setCurrentAddress] = useState("");
  const [currentZone, setCurrentZone] = useState(null);
  const [nearbyJobs, setNearbyJobs] = useState([]);
  const [mapBounds, setMapBounds] = useState(null);
  const [loading, setLoading] = useState(false);

  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const geocoderRef = useRef(null);
  const infoWindowRef = useRef(null);
  const markersRef = useRef([]);
  const searchBoxRef = useRef(null);
  const trafficLayerRef = useRef(null);
  const mountedRef = useRef(true);
  const retryRef = useRef(0);

  const apiKey = useMemo(() => process.env.REACT_APP_GOOGLE_MAPS_API_KEY || process.env.REACT_APP_GOOGLE_MAPS_KEY || process.env.VITE_GOOGLE_MAPS_KEY || "", []);

  const handleError = useCallback((err, ctx) => {
    const msg = err?.message || String(err);
    setMapError({ message: msg, context: ctx });
    onError?.(err, ctx);
  }, [onError]);

  const calculateDistances = useCallback((lat, lng) => {
    if (!window.google?.maps?.geometry) return [];
    const from = new window.google.maps.LatLng(lat, lng);
    return jobs.map((job) => {
      if (typeof job.lat !== "number" || typeof job.lng !== "number") return null;
      const to = new window.google.maps.LatLng(job.lat, job.lng);
      const meters = window.google.maps.geometry.spherical.computeDistanceBetween(from, to);
      const km = meters / 1000;
      return {
        id: job.id,
        distanceMeters: meters,
        distanceKm: Number(km.toFixed(2)),
        distanceFormatted: formatDistance(meters),
        travelTime: Math.ceil(km * 2),
        color: getDistanceColor(km),
        job,
      };
    }).filter(Boolean);
  }, [jobs]);

  const reverseGeocode = useCallback((lat, lng) => {
    if (!geocoderRef.current) return;
    geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        const comps = results[0].address_components || [];
        const area = comps.find((c) => c.types.includes("sublocality") || c.types.includes("locality"));
        const city = comps.find((c) => c.types.includes("administrative_area_level_2") || c.types.includes("locality"));
        const pin = comps.find((c) => c.types.includes("postal_code"));
        const full = results[0].formatted_address;
        setCurrentAddress({ full, area: area?.long_name || "", city: city?.long_name || "", pincode: pin?.long_name || "", components: comps });
        onLocationChange?.(lat, lng, area?.long_name || "", full);
      }
    });
  }, [onLocationChange]);

  const snapToZone = useCallback((lat, lng) => {
    if (!window.google?.maps?.geometry) return;
    const cur = new window.google.maps.LatLng(lat, lng);
    let nearest = null;
    let min = Infinity;
    SERVICE_ZONES.forEach((z) => {
      const d = window.google.maps.geometry.spherical.computeDistanceBetween(cur, new window.google.maps.LatLng(z.lat, z.lng));
      if (d < min) { min = d; nearest = z; }
    });
    if (nearest && min <= 5000) { setCurrentZone(nearest); onZoneSnap?.(nearest); }
    else { setCurrentZone(null); onZoneSnap?.(null); }
  }, [onZoneSnap]);

  const previewDistances = useCallback((lat, lng) => {
    if (!window.google?.maps?.geometry) return;
    const list = calculateDistances(lat, lng);
    setNearbyJobs(list.filter((x) => x.distanceKm < radiusKm));
    onDistanceUpdate?.(list);
  }, [calculateDistances, radiusKm, onDistanceUpdate]);

  const placeMarker = useCallback((lat, lng) => {
    if (!mapRef.current || !window.google?.maps) return;
    if (markerRef.current) markerRef.current.setPosition({ lat, lng });
    else {
      markerRef.current = new window.google.maps.Marker({
        position: { lat, lng },
        map: mapRef.current,
        draggable: true,
        animation: window.google.maps.Animation.DROP,
        title: "Your Location",
      });
      markerRef.current.addListener("dragend", (e) => {
        const la = e.latLng.lat();
        const ln = e.latLng.lng();
        if (!isInsidePune(la, ln)) { handleError(new Error("Outside service area"), "validation"); return; }
        updateLocation(la, ln);
      });
    }
  }, []);

  const drawRadius = useCallback((lat, lng, km) => {
    if (!mapRef.current || !window.google?.maps) return;
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
        editable: false,
        draggable: false,
        clickable: false,
      });
    }
  }, []);

  const updateLocation = useCallback((lat, lng) => {
    if (!isInsidePune(lat, lng)) { handleError(new Error("Location outside service area"), "validation"); return; }
    setCurrentLocation({ lat, lng });
    placeMarker(lat, lng);
    drawRadius(lat, lng, radiusKm);
    reverseGeocode(lat, lng);
    snapToZone(lat, lng);
    previewDistances(lat, lng);
    if (mapRef.current) { try { mapRef.current.panTo({ lat, lng }); } catch {} }
  }, [placeMarker, drawRadius, reverseGeocode, snapToZone, previewDistances, radiusKm, handleError]);

  const createMarker = useCallback((job) => {
    if (!mapRef.current || !window.google?.maps) return null;
    if (typeof job.lat !== "number" || typeof job.lng !== "number") return null;
    const marker = new window.google.maps.Marker({
      position: { lat: job.lat, lng: job.lng },
      map: mapRef.current,
      title: job.title || job.serviceType || "Provider",
      icon: {
        url: job.avatar || `https://maps.google.com/mapfiles/ms/icons/${job.status === "active" ? "green" : "blue"}-dot.png`,
        scaledSize: new window.google.maps.Size(32, 32),
      },
    });
    const content = document.createElement("div");
    content.style.padding = "12px";
    content.style.maxWidth = "200px";
    content.innerHTML = `<h4 style="margin:0 0 6px 0;font-weight:600;">${job.title || job.providerName || "Provider"}</h4><p style="margin:0 0 4px 0;font-size:12px;color:#666;">${job.serviceType || "Service"}</p><p style="margin:0;font-size:11px;color:#999;">⭐ ${job.rating || "New"} (${job.reviewCount || 0})</p>`;
    const btn = document.createElement("button");
    btn.textContent = "Select";
    btn.style.marginTop = "8px";
    btn.style.padding = "4px 12px";
    btn.style.background = "#fbbf24";
    btn.style.border = "none";
    btn.style.borderRadius = "4px";
    btn.style.cursor = "pointer";
    btn.onclick = () => onMarkerClick?.(job);
    content.appendChild(btn);
    marker.addListener("click", () => {
      if (!infoWindowRef.current) infoWindowRef.current = new window.google.maps.InfoWindow();
      infoWindowRef.current.setContent(content);
      infoWindowRef.current.open(mapRef.current, marker);
      onMarkerClick?.(job);
    });
    return marker;
  }, [onMarkerClick]);

  const updateJobMarkers = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) return;
    markersRef.current.forEach((m) => { try { m.setMap(null); } catch {} });
    markersRef.current = [];
    jobs.forEach((j) => {
      const m = createMarker(j);
      if (m) markersRef.current.push(m);
    });
  }, [jobs, createMarker]);

  const setupSearchBox = useCallback(() => {
    if (!searchInputRef?.current || !window.google?.maps?.places) return;
    if (searchBoxRef.current) { try { window.google.maps.event.clearInstanceListeners(searchBoxRef.current); } catch {} }
    searchBoxRef.current = new window.google.maps.places.SearchBox(searchInputRef.current);
    if (mapRef.current?.getBounds) { try { searchBoxRef.current.setBounds(mapRef.current.getBounds()); } catch {} }
    searchBoxRef.current.addListener("places_changed", () => {
      const places = searchBoxRef.current.getPlaces();
      const place = places?.[0];
      if (!place?.geometry?.location) return;
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      if (!isInsidePune(lat, lng)) { handleError(new Error("Place outside service area"), "search"); return; }
      try { mapRef.current.panTo({ lat, lng }); mapRef.current.setZoom(15); } catch {}
      updateLocation(lat, lng);
    });
  }, [searchInputRef, updateLocation, handleError]);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) { handleError(new Error("Geolocation not supported"), "geolocation"); return; }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { updateLocation(p.coords.latitude, p.coords.longitude); setLoading(false); },
      (e) => { handleError(e, "geolocation"); setLoading(false); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [updateLocation, handleError]);

  const setMapType = useCallback((type) => { if (mapRef.current) { try { mapRef.current.setMapTypeId(type); } catch {} } }, []);
  const setZoom = useCallback((z) => { if (mapRef.current) { try { mapRef.current.setZoom(z); } catch {} } }, []);
  const panTo = useCallback((lat, lng) => {
    if (!mapRef.current) return;
    try { mapRef.current.panTo({ lat, lng }); } catch {}
    updateLocation(lat, lng);
  }, [updateLocation]);

  useEffect(() => {
    mountedRef.current = true;
    const init = async () => {
      try {
        if (!apiKey) throw new Error("Google Maps API key missing: Set REACT_APP_GOOGLE_MAPS_API_KEY");
        const el = document.getElementById(mapId);
        if (!el) throw new Error(`Map container #${mapId} not found`);
        await loadGoogleMaps(apiKey);
        if (!mountedRef.current) return;
        if (!window.google?.maps) throw new Error("Google Maps not available");

        const map = new window.google.maps.Map(el, {
          center,
          zoom,
          restriction: { latLngBounds: PUNE_BOUNDS, strictBounds: false },
          zoomControl: enableZoomControl,
          mapTypeControl: enableMapTypeControl,
          fullscreenControl: enableFullscreenControl,
          streetViewControl: enableStreetView,
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
          styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
        });

        mapRef.current = map;
        geocoderRef.current = new window.google.maps.Geocoder();
        infoWindowRef.current = new window.google.maps.InfoWindow();

        if (enableTraffic) {
          trafficLayerRef.current = new window.google.maps.TrafficLayer();
          trafficLayerRef.current.setMap(map);
        }

        map.addListener("click", (e) => {
          if (!e.latLng) return;
          const la = e.latLng.lat();
          const ln = e.latLng.lng();
          if (!isInsidePune(la, ln)) return;
          updateLocation(la, ln);
        });

        map.addListener("bounds_changed", () => {
          try {
            const b = map.getBounds();
            if (!b) return;
            setMapBounds({ north: b.getNorthEast().lat(), south: b.getSouthWest().lat(), east: b.getNorthEast().lng(), west: b.getSouthWest().lng() });
          } catch {}
        });

        map.addListener("idle", () => {
          if (searchBoxRef.current && map.getBounds) {
            try { searchBoxRef.current.setBounds(map.getBounds()); } catch {}
          }
        });

        setupSearchBox();
        setMapLoaded(true);
        setMapError(null);
        retryRef.current = 0;
        onMapLoad?.(map);
      } catch (err) {
        handleError(err, "init");
        if (retryRef.current < MAX_RETRY) {
          retryRef.current += 1;
          setTimeout(() => { if (mountedRef.current) init(); }, RETRY_DELAY * retryRef.current);
        }
      }
    };
    init();
    return () => {
      mountedRef.current = false;
      markersRef.current.forEach((m) => { try { m.setMap(null); } catch {} });
      markersRef.current = [];
      if (markerRef.current) { try { markerRef.current.setMap(null); } catch {} markerRef.current = null; }
      if (circleRef.current) { try { circleRef.current.setMap(null); } catch {} circleRef.current = null; }
      if (trafficLayerRef.current) { try { trafficLayerRef.current.setMap(null); } catch {} trafficLayerRef.current = null; }
      if (searchBoxRef.current) { try { window.google?.maps?.event?.clearInstanceListeners(searchBoxRef.current); } catch {} searchBoxRef.current = null; }
      mapRef.current = null;
    };
  }, [mapId, center.lat, center.lng, zoom, enableZoomControl, enableMapTypeControl, enableFullscreenControl, enableStreetView, enableTraffic, setupSearchBox, handleError, onMapLoad, apiKey]);

  useEffect(() => { if (mapLoaded) updateJobMarkers(); }, [jobs, mapLoaded, updateJobMarkers]);

  useEffect(() => {
    if (!mapRef.current || !trafficLayerRef.current) {
      if (enableTraffic && mapRef.current && window.google?.maps && !trafficLayerRef.current) {
        trafficLayerRef.current = new window.google.maps.TrafficLayer();
        trafficLayerRef.current.setMap(mapRef.current);
      }
      return;
    }
    if (enableTraffic) trafficLayerRef.current.setMap(mapRef.current);
    else trafficLayerRef.current.setMap(null);
  }, [enableTraffic, mapLoaded]);

  return {
    mapLoaded,
    mapError,
    currentLocation,
    currentAddress,
    currentZone,
    nearbyJobs,
    mapBounds,
    loading,
    updateLocation,
    getCurrentLocation,
    setMapType,
    setZoom,
    panTo,
    isInsidePune,
    formatDistance,
    calculateDistances,
    SERVICE_ZONES,
    PUNE_BOUNDS,
  };
}