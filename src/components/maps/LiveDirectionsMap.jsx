import { GoogleMap, DirectionsRenderer, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Box, CircularProgress, Typography, Paper, Stack, Chip, Button, Alert, Snackbar } from "@mui/material";
import { styled } from "@mui/material/styles";

const StyledMapWrapper = styled(Box)(() => ({
  position: "relative",
  width: "100%",
  height: "300px",
  borderRadius: "12px",
  overflow: "hidden",
  backgroundColor: "#f0f2f5",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  transition: "all 0.3s ease",
  "&:hover": { boxShadow: "0 4px 12px rgba(0,0,0,0.15)" },
}));

const LoadingOverlay = styled(Box)({
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(255,255,255,0.9)",
  zIndex: 10,
  backdropFilter: "blur(4px)",
});

const InfoCard = styled(Paper)({
  position: "absolute",
  bottom: 16,
  left: 16,
  right: 16,
  padding: "12px 16px",
  backgroundColor: "rgba(255,255,255,0.95)",
  backdropFilter: "blur(8px)",
  borderRadius: "12px",
  zIndex: 5,
  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
});

const LIBRARIES = ["places", "geometry"];
const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };
const DEFAULT_ZOOM = 12;

const TRAVEL_MODE_MAP = {
  DRIVING: "DRIVING",
  WALKING: "WALKING",
  BICYCLING: "BICYCLING",
  TRANSIT: "TRANSIT",
  driving: "DRIVING",
  walking: "WALKING",
  cycling: "BICYCLING",
  bicycling: "BICYCLING",
  transit: "TRANSIT",
};

const parseLocation = (loc) => {
  if (!loc) return null;
  if (typeof loc === "object" && typeof loc.lat === "number" && typeof loc.lng === "number") {
    if (Number.isNaN(loc.lat) || Number.isNaN(loc.lng)) return null;
    return { lat: loc.lat, lng: loc.lng };
  }
  if (typeof loc === "object" && loc.lat && loc.lng) {
    const lat = Number(loc.lat);
    const lng = Number(loc.lng);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
  }
  if (typeof loc === "string" && loc.includes(",")) {
    const [a, b] = loc.split(",").map((v) => Number(v.trim()));
    if (!Number.isNaN(a) && !Number.isNaN(b) && Math.abs(a) <= 90 && Math.abs(b) <= 180) return { lat: a, lng: b };
  }
  if (typeof loc === "string" && loc.trim().length > 3) return loc.trim();
  return null;
};

const formatDistance = (m) => {
  if (!m || Number.isNaN(m)) return "N/A";
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
};

const formatDuration = (s) => {
  if (!s || Number.isNaN(s)) return "N/A";
  const h = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${mm}m` : `${mm} min`;
};

const LiveDirectionsMap = ({
  providerLocation,
  customerLocation,
  travelMode = "DRIVING",
  showTraffic = false,
  onRouteCalculated,
  onError,
  height = "300px",
  width = "100%",
  showInfoCard = true,
  autoFitBounds = true,
  className = "",
  refreshInterval = null,
}) => {
  const [directions, setDirections] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "info" });

  const mapRef = useRef(null);
  const directionsServiceRef = useRef(null);
  const geocoderRef = useRef(null);
  const timerRef = useRef(null);

  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_KEY || process.env.VITE_GOOGLE_MAPS_KEY || "";

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
    id: "google-map-script-v50",
  });

  const parsedProvider = useMemo(() => parseLocation(providerLocation), [providerLocation]);
  const parsedCustomer = useMemo(() => parseLocation(customerLocation), [customerLocation]);

  const isCoord = (v) => v && typeof v === "object" && typeof v.lat === "number" && typeof v.lng === "number";

  const geocodeAddress = useCallback(async (addr) => {
    if (!isLoaded || !geocoderRef.current || !addr || typeof addr !== "string") return null;
    setIsGeocoding(true);
    try {
      const res = await new Promise((resolve, reject) => {
        geocoderRef.current.geocode({ address: addr }, (r, s) => {
          if (s === "OK" && r?.[0]) resolve(r[0].geometry.location);
          else reject(new Error(s));
        });
      });
      return { lat: res.lat(), lng: res.lng() };
    } catch {
      return null;
    } finally {
      setIsGeocoding(false);
    }
  }, [isLoaded]);

  const calculateDirections = useCallback(async () => {
    if (!isLoaded || !directionsServiceRef.current || !window.google?.maps) return;
    if (!parsedProvider || !parsedCustomer) return;

    let origin = parsedProvider;
    let dest = parsedCustomer;

    if (typeof origin === "string") {
      const g = await geocodeAddress(origin);
      if (!g) { setError(`Provider location not found: ${origin}`); return; }
      origin = g;
    }
    if (typeof dest === "string") {
      const g = await geocodeAddress(dest);
      if (!g) { setError(`Customer location not found: ${dest}`); return; }
      dest = g;
    }

    if (!isCoord(origin) || !isCoord(dest)) {
      const msg = "Invalid coordinates";
      setError(msg);
      onError?.(msg);
      return;
    }

    setMapCenter({ lat: (origin.lat + dest.lat) / 2, lng: (origin.lng + dest.lng) / 2 });

    const modeKey = TRAVEL_MODE_MAP[travelMode] || "DRIVING";
    const travelModeValue = window.google.maps.TravelMode[modeKey] || window.google.maps.TravelMode.DRIVING;

    const req = {
      origin,
      destination: dest,
      travelMode: travelModeValue,
      provideRouteAlternatives: false,
      unitSystem: window.google.maps.UnitSystem.METRIC,
    };

    if (showTraffic && modeKey === "DRIVING") {
      req.drivingOptions = { departureTime: new Date(), trafficModel: window.google.maps.TrafficModel.BEST_GUESS };
    }

    try {
      const result = await new Promise((resolve, reject) => {
        directionsServiceRef.current.route(req, (r, s) => {
          if (s === "OK") resolve(r);
          else reject(new Error(s));
        });
      });

      setDirections(result);
      setError(null);

      const leg = result.routes?.[0]?.legs?.[0];
      if (!leg) return;

      const info = {
        distance: leg.distance?.text || formatDistance(leg.distance?.value),
        distanceMeters: leg.distance?.value,
        duration: leg.duration?.text || formatDuration(leg.duration?.value),
        durationSeconds: leg.duration?.value,
        durationInTraffic: leg.duration_in_traffic?.text || null,
        startAddress: leg.start_address,
        endAddress: leg.end_address,
        steps: leg.steps?.length || 0,
      };

      setRouteInfo(info);
      onRouteCalculated?.(info);

      if (autoFitBounds && mapRef.current && window.google.maps.LatLngBounds) {
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(origin);
        bounds.extend(dest);
        mapRef.current.fitBounds(bounds, 80);
      }
    } catch (e) {
      const msg = e.message?.includes("ZERO_RESULTS") ? "No route found between locations" : `Route failed: ${e.message}`;
      setError(msg);
      onError?.(msg);
      setSnack({ open: true, msg, severity: "error" });
    }
  }, [isLoaded, parsedProvider, parsedCustomer, travelMode, showTraffic, autoFitBounds, onRouteCalculated, onError, geocodeAddress]);

  useEffect(() => {
    if (!isLoaded || loadError || !window.google?.maps) return;
    if (!directionsServiceRef.current) directionsServiceRef.current = new window.google.maps.DirectionsService();
    if (!geocoderRef.current) geocoderRef.current = new window.google.maps.Geocoder();
  }, [isLoaded, loadError]);

  useEffect(() => {
    if (isLoaded && parsedProvider && parsedCustomer) calculateDirections();
  }, [isLoaded, parsedProvider, parsedCustomer, calculateDirections]);

  useEffect(() => {
    if (refreshInterval && refreshInterval > 5000) {
      timerRef.current = setInterval(() => calculateDirections(), refreshInterval);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [refreshInterval, calculateDirections]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const onMapLoad = useCallback((m) => { mapRef.current = m; }, []);

  const mapOptions = useMemo(() => ({
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
  }), []);

  const providerCoords = isCoord(parsedProvider) ? parsedProvider : null;
  const customerCoords = isCoord(parsedCustomer) ? parsedCustomer : null;

  if (loadError || !apiKey) {
    return (
      <StyledMapWrapper sx={{ height, width }} className={className}>
        <LoadingOverlay><Alert severity="error" variant="filled" sx={{ maxWidth: "90%" }}>{!apiKey ? "Google Maps API key missing. Set REACT_APP_GOOGLE_MAPS_KEY" : "Failed to load Google Maps. Check API key and billing."}</Alert></LoadingOverlay>
      </StyledMapWrapper>
    );
  }

  if (!isLoaded || isGeocoding) {
    return (
      <StyledMapWrapper sx={{ height, width }} className={className}>
        <LoadingOverlay><Stack alignItems="center" spacing={2}><CircularProgress /><Typography variant="body2" color="text.secondary">{isGeocoding ? "Finding locations..." : "Loading map..."}</Typography></Stack></LoadingOverlay>
      </StyledMapWrapper>
    );
  }

  return (
    <>
      <StyledMapWrapper className={className} sx={{ height, width }}>
        <GoogleMap mapContainerStyle={{ width: "100%", height: "100%" }} center={mapCenter} zoom={DEFAULT_ZOOM} options={mapOptions} onLoad={onMapLoad}>
          {providerCoords && <Marker position={providerCoords} label={{ text: "P", color: "white", fontWeight: "700" }} onClick={() => setSelectedMarker("provider")} />}
          {customerCoords && <Marker position={customerCoords} label={{ text: "C", color: "white", fontWeight: "700" }} onClick={() => setSelectedMarker("customer")} />}
          {selectedMarker === "provider" && providerCoords && (
            <InfoWindow position={providerCoords} onCloseClick={() => setSelectedMarker(null)}><Box sx={{ p: 1 }}><Typography variant="subtitle2" fontWeight={700}>Provider</Typography><Typography variant="caption">{typeof providerLocation === "string" ? providerLocation : `${providerCoords.lat.toFixed(5)}, ${providerCoords.lng.toFixed(5)}`}</Typography></Box></InfoWindow>
          )}
          {selectedMarker === "customer" && customerCoords && (
            <InfoWindow position={customerCoords} onCloseClick={() => setSelectedMarker(null)}><Box sx={{ p: 1 }}><Typography variant="subtitle2" fontWeight={700}>Customer</Typography><Typography variant="caption">{typeof customerLocation === "string" ? customerLocation : `${customerCoords.lat.toFixed(5)}, ${customerCoords.lng.toFixed(5)}`}</Typography></Box></InfoWindow>
          )}
          {directions && <DirectionsRenderer directions={directions} options={{ polylineOptions: { strokeColor: "#4285F4", strokeWeight: 5, strokeOpacity: 0.85 }, suppressMarkers: true, preserveViewport: !autoFitBounds }} />}
        </GoogleMap>

        {showInfoCard && routeInfo && (
          <InfoCard elevation={3}>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="body2" fontWeight={700}>Route</Typography><Chip label={TRAVEL_MODE_MAP[travelMode] || travelMode} size="small" color="primary" variant="outlined" /></Stack>
              <Stack direction="row" spacing={2}><Box><Typography variant="caption" color="text.secondary">Distance</Typography><Typography variant="body2" fontWeight={600}>{routeInfo.distance}</Typography></Box><Box><Typography variant="caption" color="text.secondary">Duration</Typography><Typography variant="body2" fontWeight={600}>{routeInfo.duration}</Typography></Box>{routeInfo.durationInTraffic && <Box><Typography variant="caption" color="text.secondary">Traffic</Typography><Typography variant="body2" fontWeight={600} color="warning.main">{routeInfo.durationInTraffic}</Typography></Box>}</Stack>
            </Stack>
          </InfoCard>
        )}

        {error && (
          <LoadingOverlay><Alert severity="error" variant="filled" sx={{ maxWidth: "85%" }} action={<Button size="small" color="inherit" onClick={() => { setError(null); calculateDirections(); }}>Retry</Button>}>{error}</Alert></LoadingOverlay>
        )}
      </StyledMapWrapper>

      <Snackbar open={snack.open} autoHideDuration={5000} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert onClose={() => setSnack((s) => ({ ...s, open: false }))} severity={snack.severity} variant="filled">{snack.msg}</Alert>
      </Snackbar>
    </>
  );
};

export default LiveDirectionsMap;