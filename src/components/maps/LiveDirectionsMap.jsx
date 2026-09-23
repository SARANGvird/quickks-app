import { GoogleMap, DirectionsRenderer, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Box, CircularProgress, Typography, Paper, Stack, Chip, Button, Alert, Snackbar } from "@mui/material";
import { styled, alpha } from "@mui/material/styles";

// Styled Components
const MapContainer = styled(Box)(({ theme }) => ({
  position: "relative",
  width: "100%",
  height: "300px",
  borderRadius: "12px",
  overflow: "hidden",
  backgroundColor: "#f0f2f5",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  transition: "all 0.3s ease",
  "&:hover": {
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
  }
}));

const LoadingOverlay = styled(Box)({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(255,255,255,0.9)",
  zIndex: 10,
  backdropFilter: "blur(4px)"
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
  boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
});

const LocationChip = styled(Chip)(({ theme }) => ({
  margin: "4px",
  fontWeight: 500,
  "& .MuiChip-icon": {
    fontSize: "16px"
  }
}));

// Constants
const MAP_LIBRARIES = ["places", "geometry", "directions"];
const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 }; // Center of India
const DEFAULT_ZOOM = 12;
const TRAVEL_MODES = {
  DRIVING: window.google?.maps?.TravelMode?.DRIVING,
  WALKING: window.google?.maps?.TravelMode?.WALKING,
  BICYCLING: window.google?.maps?.TravelMode?.BICYCLING,
  TRANSIT: window.google?.maps?.TravelMode?.TRANSIT
};

// Helper function to parse location strings
const parseLocation = (location) => {
  if (!location) return null;
  
  // If it's already an object with lat/lng
  if (typeof location === "object" && location.lat && location.lng) {
    return location;
  }
  
  // If it's a string with coordinates "lat,lng"
  if (typeof location === "string" && location.includes(",")) {
    const [lat, lng] = location.split(",").map(Number);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }
  
  // If it's a place string (will be geocoded)
  return location;
};

// Helper to format distance
const formatDistance = (meters) => {
  if (!meters) return "N/A";
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
};

// Helper to format duration
const formatDuration = (seconds) => {
  if (!seconds) return "N/A";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
};

// Map Options
const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  styles: [
    {
      featureType: "poi",
      elementType: "labels",
      stylers: [{ visibility: "off" }]
    }
  ]
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
  refreshInterval = null // For live updates (in milliseconds)
}) => {
  const [directions, setDirections] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("info");
  
  const mapRef = useRef(null);
  const directionsServiceRef = useRef(null);
  const geocoderRef = useRef(null);
  const refreshTimerRef = useRef(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_KEY,
    libraries: MAP_LIBRARIES,
    id: "google-map-script"
  });

  // Parse and validate locations
  const parsedProviderLocation = useMemo(() => {
    if (!providerLocation) return null;
    try {
      return parseLocation(providerLocation);
    } catch (err) {
      console.error("Error parsing provider location:", err);
      return null;
    }
  }, [providerLocation]);

  const parsedCustomerLocation = useMemo(() => {
    if (!customerLocation) return null;
    try {
      return parseLocation(customerLocation);
    } catch (err) {
      console.error("Error parsing customer location:", err);
      return null;
    }
  }, [customerLocation]);

  // Geocode address strings to coordinates
  const geocodeAddress = useCallback(async (address) => {
    if (!isLoaded || !geocoderRef.current) return null;
    
    setIsGeocoding(true);
    setGeocodeError(null);
    
    try {
      const result = await new Promise((resolve, reject) => {
        geocoderRef.current.geocode({ address }, (results, status) => {
          if (status === "OK" && results && results[0]) {
            resolve(results[0].geometry.location);
          } else {
            reject(new Error(`Geocoding failed: ${status}`));
          }
        });
      });
      
      return { lat: result.lat(), lng: result.lng() };
    } catch (err) {
      console.error("Geocoding error:", err);
      setGeocodeError(`Could not find location: ${address}`);
      return null;
    } finally {
      setIsGeocoding(false);
    }
  }, [isLoaded]);

  // Calculate directions
  const calculateDirections = useCallback(async () => {
    if (!isLoaded || !directionsServiceRef.current) return;
    
    // Get coordinates for both locations
    let originCoords = parsedProviderLocation;
    let destCoords = parsedCustomerLocation;
    
    // Geocode if needed
    if (originCoords && typeof originCoords === "string") {
      originCoords = await geocodeAddress(originCoords);
    }
    if (destCoords && typeof destCoords === "string") {
      destCoords = await geocodeAddress(destCoords);
    }
    
    if (!originCoords || !destCoords) {
      const errorMsg = "Invalid locations provided";
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }
    
    // Set map center to midpoint
    const midpoint = {
      lat: (originCoords.lat + destCoords.lat) / 2,
      lng: (originCoords.lng + destCoords.lng) / 2
    };
    setMapCenter(midpoint);
    
    const travelModeValue = TRAVEL_MODES[travelMode] || TRAVEL_MODES.DRIVING;
    
    const request = {
      origin: originCoords,
      destination: destCoords,
      travelMode: travelModeValue,
      provideRouteAlternatives: true,
      unitSystem: window.google.maps.UnitSystem.METRIC
    };
    
    if (showTraffic) {
      request.drivingOptions = {
        departureTime: new Date(),
        trafficModel: "bestguess"
      };
    }
    
    try {
      const result = await new Promise((resolve, reject) => {
        directionsServiceRef.current.route(request, (result, status) => {
          if (status === "OK") {
            resolve(result);
          } else {
            reject(new Error(`Directions request failed: ${status}`));
          }
        });
      });
      
      setDirections(result);
      
      // Extract route information
      const route = result.routes[0];
      const leg = route.legs[0];
      const routeInfoData = {
        distance: leg.distance?.text || formatDistance(leg.distance?.value),
        distanceMeters: leg.distance?.value,
        duration: leg.duration?.text || formatDuration(leg.duration?.value),
        durationSeconds: leg.duration?.value,
        durationInTraffic: leg.duration_in_traffic?.text,
        startAddress: leg.start_address,
        endAddress: leg.end_address,
        steps: leg.steps?.length,
        polyline: route.overview_polyline
      };
      
      setRouteInfo(routeInfoData);
      onRouteCalculated?.(routeInfoData);
      
      // Auto-fit bounds if enabled
      if (autoFitBounds && mapRef.current) {
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(originCoords);
        bounds.extend(destCoords);
        mapRef.current.fitBounds(bounds);
        setMapZoom(undefined); // Let map auto-calculate zoom
      }
      
    } catch (err) {
      console.error("Directions calculation error:", err);
      const errorMsg = err.message || "Failed to calculate route";
      setError(errorMsg);
      onError?.(errorMsg);
      setSnackbarMessage(errorMsg);
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  }, [isLoaded, parsedProviderLocation, parsedCustomerLocation, travelMode, showTraffic, autoFitBounds, onRouteCalculated, onError, geocodeAddress]);

  // Initialize services
  useEffect(() => {
    if (!isLoaded || loadError) return;
    
    if (!directionsServiceRef.current) {
      directionsServiceRef.current = new window.google.maps.DirectionsService();
    }
    if (!geocoderRef.current) {
      geocoderRef.current = new window.google.maps.Geocoder();
    }
  }, [isLoaded, loadError]);

  // Calculate route when locations change
  useEffect(() => {
    if (isLoaded && parsedProviderLocation && parsedCustomerLocation) {
      calculateDirections();
    }
  }, [isLoaded, parsedProviderLocation, parsedCustomerLocation, travelMode, showTraffic, calculateDirections]);

  // Set up refresh interval for live updates
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      refreshTimerRef.current = setInterval(() => {
        calculateDirections();
      }, refreshInterval);
      
      return () => {
        if (refreshTimerRef.current) {
          clearInterval(refreshTimerRef.current);
        }
      };
    }
  }, [refreshInterval, calculateDirections]);

  // Handle map load
  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // Custom markers icons
  const providerMarkerIcon = useMemo(() => {
    if (!isLoaded) return null;
    return {
      url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
      scaledSize: new window.google.maps.Size(40, 40),
      labelOrigin: new window.google.maps.Point(20, 10)
    };
  }, [isLoaded]);

  const customerMarkerIcon = useMemo(() => {
    if (!isLoaded) return null;
    return {
      url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
      scaledSize: new window.google.maps.Size(40, 40),
      labelOrigin: new window.google.maps.Point(20, 10)
    };
  }, [isLoaded]);

  // Loading state
  if (loadError) {
    return (
      <MapContainer sx={{ height, width }}>
        <LoadingOverlay>
          <Alert severity="error" variant="filled">
            Failed to load Google Maps. Please check your API key.
          </Alert>
        </LoadingOverlay>
      </MapContainer>
    );
  }

  if (!isLoaded || isGeocoding) {
    return (
      <MapContainer sx={{ height, width }}>
        <LoadingOverlay>
          <Stack alignItems="center" spacing={2}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
              {isGeocoding ? "Finding locations..." : "Loading map..."}
            </Typography>
          </Stack>
        </LoadingOverlay>
      </MapContainer>
    );
  }

  // Get coordinates for markers
  const providerCoords = parsedProviderLocation && typeof parsedProviderLocation === "object" 
    ? parsedProviderLocation 
    : null;
  const customerCoords = parsedCustomerLocation && typeof parsedCustomerLocation === "object"
    ? parsedCustomerLocation
    : null;

  return (
    <>
      <MapContainer className={className} sx={{ height, width }}>
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={mapCenter}
          zoom={mapZoom}
          options={mapOptions}
          onLoad={onMapLoad}
        >
          {/* Provider Marker */}
          {providerCoords && (
            <Marker
              position={providerCoords}
              icon={providerMarkerIcon}
              label="P"
              onClick={() => setSelectedMarker("provider")}
            />
          )}
          
          {/* Customer Marker */}
          {customerCoords && (
            <Marker
              position={customerCoords}
              icon={customerMarkerIcon}
              label="C"
              onClick={() => setSelectedMarker("customer")}
            />
          )}
          
          {/* Info Window for selected marker */}
          {selectedMarker === "provider" && providerCoords && (
            <InfoWindow
              position={providerCoords}
              onCloseClick={() => setSelectedMarker(null)}
            >
              <Box sx={{ p: 1 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  Provider Location
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {typeof providerLocation === "string" 
                    ? providerLocation 
                    : `${providerCoords.lat.toFixed(6)}, ${providerCoords.lng.toFixed(6)}`}
                </Typography>
              </Box>
            </InfoWindow>
          )}
          
          {selectedMarker === "customer" && customerCoords && (
            <InfoWindow
              position={customerCoords}
              onCloseClick={() => setSelectedMarker(null)}
            >
              <Box sx={{ p: 1 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  Customer Location
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {typeof customerLocation === "string"
                    ? customerLocation
                    : `${customerCoords.lat.toFixed(6)}, ${customerCoords.lng.toFixed(6)}`}
                </Typography>
              </Box>
            </InfoWindow>
          )}
          
          {/* Directions */}
          {directions && (
            <DirectionsRenderer
              directions={directions}
              options={{
                polylineOptions: {
                  strokeColor: "#4285F4",
                  strokeWeight: 4,
                  strokeOpacity: 0.8
                },
                suppressMarkers: true, // Use custom markers
                preserveViewport: !autoFitBounds
              }}
            />
          )}
        </GoogleMap>
        
        {/* Info Card */}
        {showInfoCard && routeInfo && (
          <InfoCard elevation={2}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={2} justifyContent="space-between">
                <Typography variant="body2" fontWeight={600}>
                  Route Information
                </Typography>
                <Chip 
                  label={travelMode} 
                  size="small" 
                  sx={{ bgcolor: alpha("#4285F4", 0.1), color: "#4285F4" }}
                />
              </Stack>
              <Stack direction="row" spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Distance
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {routeInfo.distance}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Duration
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {routeInfo.duration}
                  </Typography>
                </Box>
                {routeInfo.durationInTraffic && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      In Traffic
                    </Typography>
                    <Typography variant="body2" fontWeight={500} color="warning.main">
                      {routeInfo.durationInTraffic}
                    </Typography>
                  </Box>
                )}
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <LocationChip
                  size="small"
                  icon={<Box sx={{ width: 8, height: 8, bgcolor: "green", borderRadius: "50%" }} />}
                  label={routeInfo.startAddress?.split(",")[0] || "Provider"}
                  variant="outlined"
                />
                <LocationChip
                  size="small"
                  icon={<Box sx={{ width: 8, height: 8, bgcolor: "red", borderRadius: "50%" }} />}
                  label={routeInfo.endAddress?.split(",")[0] || "Customer"}
                  variant="outlined"
                />
              </Stack>
            </Stack>
          </InfoCard>
        )}
        
        {/* Error Overlay */}
        {error && (
          <LoadingOverlay>
            <Alert severity="error" variant="filled" sx={{ maxWidth: "80%" }}>
              {error}
              <Button 
                size="small" 
                color="inherit" 
                onClick={calculateDirections}
                sx={{ mt: 1 }}
              >
                Retry
              </Button>
            </Alert>
          </LoadingOverlay>
        )}
      </MapContainer>
      
      {/* Snackbar for errors */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbarSeverity}
          variant="filled"
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

// PropTypes for better documentation
LiveDirectionsMap.propTypes = {
  providerLocation: PropTypes.oneOfType([
    PropTypes.shape({ lat: PropTypes.number, lng: PropTypes.number }),
    PropTypes.string
  ]).isRequired,
  customerLocation: PropTypes.oneOfType([
    PropTypes.shape({ lat: PropTypes.number, lng: PropTypes.number }),
    PropTypes.string
  ]).isRequired,
  travelMode: PropTypes.oneOf(["DRIVING", "WALKING", "BICYCLING", "TRANSIT"]),
  showTraffic: PropTypes.bool,
  onRouteCalculated: PropTypes.func,
  onError: PropTypes.func,
  height: PropTypes.string,
  width: PropTypes.string,
  showInfoCard: PropTypes.bool,
  autoFitBounds: PropTypes.bool,
  className: PropTypes.string,
  refreshInterval: PropTypes.number
};

LiveDirectionsMap.defaultProps = {
  travelMode: "DRIVING",
  showTraffic: false,
  height: "300px",
  width: "100%",
  showInfoCard: true,
  autoFitBounds: true,
  className: ""
};

export default LiveDirectionsMap;