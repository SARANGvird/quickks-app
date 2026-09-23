// src/components/maps/BookingMap.jsx
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { MapContainer, TileLayer, Marker, Polyline, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import "leaflet-routing-machine";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Chip,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Slider,
  FormControlLabel,
  Switch,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Divider
} from "@mui/material";
import {
  MyLocation,
  ZoomIn,
  ZoomOut,
  Fullscreen,
  FullscreenExit,
  DirectionsCar,
  DirectionsWalk,
  DirectionsBike,
  Layers,
  SatelliteAlt,
  Map as MapIcon,
  Close,
  Timeline,
  AccessTime,
  LocationOn,
  Person,
  Storefront,
  Navigation
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";

// ==========================================================
// CONSTANTS
// ==========================================================
const DEFAULT_ZOOM = 14;
const DEFAULT_CENTER = { lat: 18.5204, lng: 73.8567 }; // Pune center
const TILE_LAYERS = {
  street: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  satellite: "https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
  terrain: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
};

const TRAVEL_MODES = {
  driving: { label: "Driving", icon: DirectionsCar, color: "#3b82f6" },
  walking: { label: "Walking", icon: DirectionsWalk, color: "#10b981" },
  cycling: { label: "Cycling", icon: DirectionsBike, color: "#f59e0b" }
};

// ==========================================================
// HELPER FUNCTIONS
// ==========================================================
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const formatDistance = (distanceKm) => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} meters`;
  }
  return `${distanceKm.toFixed(1)} km`;
};

const formatDuration = (minutes) => {
  if (minutes < 60) {
    return `${Math.round(minutes)} minutes`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours} hour${hours > 1 ? 's' : ''}${mins > 0 ? ` ${mins} min` : ''}`;
};

// ==========================================================
// CUSTOM HOOKS
// ==========================================================
const useGeolocation = () => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return { location, error, loading, getCurrentLocation };
};

// ==========================================================
// MAP CONTROLS COMPONENT
// ==========================================================
const MapControls = ({ map }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleZoomIn = () => map?.zoomIn();
  const handleZoomOut = () => map?.zoomOut();
  const handleFullscreen = () => {
    const container = map?.getContainer();
    if (!isFullscreen) {
      container?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  return (
    <Box
      sx={{
        position: "absolute",
        bottom: 20,
        right: 20,
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        gap: 1
      }}
    >
      <Tooltip title="Zoom In">
        <IconButton
          size="small"
          onClick={handleZoomIn}
          sx={{ bgcolor: "white", boxShadow: 1, '&:hover': { bgcolor: "#f5f5f5" } }}
        >
          <ZoomIn fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Zoom Out">
        <IconButton
          size="small"
          onClick={handleZoomOut}
          sx={{ bgcolor: "white", boxShadow: 1, '&:hover': { bgcolor: "#f5f5f5" } }}
        >
          <ZoomOut fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Fullscreen">
        <IconButton
          size="small"
          onClick={handleFullscreen}
          sx={{ bgcolor: "white", boxShadow: 1, '&:hover': { bgcolor: "#f5f5f5" } }}
        >
          {isFullscreen ? <FullscreenExit fontSize="small" /> : <Fullscreen fontSize="small" />}
        </IconButton>
      </Tooltip>
    </Box>
  );
};

// ==========================================================
// ROUTING MACHINE COMPONENT
// ==========================================================
const RoutingMachine = ({ start, end, travelMode = "driving", onRouteFound }) => {
  const map = useMap();
  const routingControlRef = useRef(null);

  useEffect(() => {
    if (!map || !start || !end) return;

    if (routingControlRef.current) {
      map.removeControl(routingControlRef.current);
    }

    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(start.lat, start.lng),
        L.latLng(end.lat, end.lng)
      ],
      routeWhileDragging: true,
      showAlternatives: true,
      fitSelectedRoutes: true,
      lineOptions: {
        styles: [{ color: "#6366f1", weight: 4, opacity: 0.8 }],
        extendToWaypoints: true,
        missingRouteTolerance: 0
      },
      router: L.Routing.osrmv1({
        serviceUrl: "https://router.project-osrm.org/route/v1",
        profile: travelMode === "driving" ? "driving" : travelMode === "walking" ? "walking" : "cycling"
      }),
      show: false
    }).addTo(map);

    routingControl.on("routesfound", (e) => {
      const route = e.routes[0];
      const distance = route.summary.totalDistance / 1000;
      const duration = route.summary.totalTime / 60;
      onRouteFound?.({ distance, duration });
    });

    routingControlRef.current = routingControl;

    return () => {
      if (routingControlRef.current) {
        map.removeControl(routingControlRef.current);
      }
    };
  }, [map, start, end, travelMode, onRouteFound]);

  return null;
};

// ==========================================================
// MAIN COMPONENT
// ==========================================================
const BookingMap = ({ 
  provider, 
  customer, 
  height = 400,
  width = "100%",
  showRouting = true,
  showControls = true,
  showEta = true,
  travelMode = "driving",
  onRouteInfo,
  zoom = DEFAULT_ZOOM,
  center,
  className = ""
}) => {
  const mapRef = useRef(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTravelMode, setCurrentTravelMode] = useState(travelMode);
  const [showInfoDrawer, setShowInfoDrawer] = useState(false);
  const [tileLayer, setTileLayer] = useState("street");
  const { location: userLocation, getCurrentLocation } = useGeolocation();

  // Calculate distance between provider and customer
  const directDistance = useMemo(() => {
    if (!provider || !customer) return null;
    return calculateDistance(provider.lat, provider.lng, customer.lat, customer.lng);
  }, [provider, customer]);

  // Get map center
  const mapCenter = useMemo(() => {
    if (center) return center;
    if (provider) return provider;
    if (customer) return customer;
    return DEFAULT_CENTER;
  }, [center, provider, customer]);

  // Fit bounds to show both markers
  const fitBounds = useCallback(() => {
    if (mapRef.current && provider && customer) {
      const bounds = L.latLngBounds(
        [provider.lat, provider.lng],
        [customer.lat, customer.lng]
      );
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [provider, customer]);

  useEffect(() => {
    if (mapRef.current && provider && customer) {
      setTimeout(() => fitBounds(), 100);
    }
  }, [provider, customer, fitBounds]);

  const handleRouteFound = useCallback((route) => {
    setRouteInfo(route);
    onRouteInfo?.(route);
  }, [onRouteInfo]);

  const handleMapLoad = useCallback((map) => {
    mapRef.current = map;
    setLoading(false);
  }, []);

  const handleMyLocation = () => {
    getCurrentLocation();
    if (userLocation && mapRef.current) {
      mapRef.current.setView(userLocation, 15);
    }
  };

  const handleCenterProvider = () => {
    if (provider && mapRef.current) {
      mapRef.current.setView(provider, 16);
    }
  };

  const handleCenterCustomer = () => {
    if (customer && mapRef.current) {
      mapRef.current.setView(customer, 16);
    }
  };

  // Get marker icon with custom styling
  const providerIcon = useMemo(() => {
    return new L.Icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
  }, []);

  const customerIcon = useMemo(() => {
    return new L.Icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
  }, []);

  const userIcon = useMemo(() => {
    return new L.Icon({
      iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
  }, []);

  if (!provider || !customer) {
    return (
      <Paper sx={{ p: 3, textAlign: "center", height, width }}>
        <Typography color="text.secondary">
          Location information not available
        </Typography>
      </Paper>
    );
  }

  const TravelModeIcon = TRAVEL_MODES[currentTravelMode]?.icon || DirectionsCar;

  return (
    <Box className={className} sx={{ position: "relative", height, width }}>
      {/* Map Container */}
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        style={{ height: "100%", width: "100%", borderRadius: 12 }}
        whenCreated={handleMapLoad}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={TILE_LAYERS[tileLayer] || TILE_LAYERS.street}
        />
        
        {/* Provider Marker */}
        <Marker position={provider} icon={providerIcon}>
          <Popup>
            <Box sx={{ p: 1, minWidth: 150 }}>
              <Typography variant="subtitle2" fontWeight="bold">Provider Location</Typography>
              <Typography variant="caption" color="text.secondary">
                Lat: {provider.lat.toFixed(6)}, Lng: {provider.lng.toFixed(6)}
              </Typography>
            </Box>
          </Popup>
        </Marker>

        {/* Customer Marker */}
        <Marker position={customer} icon={customerIcon}>
          <Popup>
            <Box sx={{ p: 1, minWidth: 150 }}>
              <Typography variant="subtitle2" fontWeight="bold">Customer Location</Typography>
              <Typography variant="caption" color="text.secondary">
                {customer.address || `Lat: ${customer.lat.toFixed(6)}, Lng: ${customer.lng.toFixed(6)}`}
              </Typography>
            </Box>
          </Popup>
        </Marker>

        {/* User Location Marker */}
        {userLocation && (
          <Marker position={userLocation} icon={userIcon}>
            <Popup>Your Location</Popup>
          </Marker>
        )}

        {/* Routing */}
        {showRouting && (
          <RoutingMachine
            start={provider}
            end={customer}
            travelMode={currentTravelMode}
            onRouteFound={handleRouteFound}
          />
        )}

        {/* Map Controls */}
        {showControls && <MapControls map={mapRef.current} />}
      </MapContainer>

      {/* Loading Overlay */}
      {loading && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: "rgba(255,255,255,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 2,
            zIndex: 1000
          }}
        >
          <CircularProgress />
        </Box>
      )}

      {/* Info Panel */}
      <AnimatePresence>
        {showEta && routeInfo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: "absolute",
              bottom: 20,
              left: 20,
              right: 20,
              zIndex: 1000
            }}
          >
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Chip
                    icon={<TravelModeIcon />}
                    label={TRAVEL_MODES[currentTravelMode]?.label}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Distance</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {formatDistance(routeInfo.distance)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Est. Time</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {formatDuration(routeInfo.duration)}
                    </Typography>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Tooltip title="Direct Distance">
                    <Chip
                      label={`Direct: ${formatDistance(directDistance)}`}
                      size="small"
                      variant="outlined"
                    />
                  </Tooltip>
                  <IconButton size="small" onClick={() => setShowInfoDrawer(true)}>
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Buttons */}
      <Box sx={{ position: "absolute", top: 20, right: 20, zIndex: 1000, display: "flex", gap: 1 }}>
        <Tooltip title="My Location">
          <IconButton
            size="small"
            onClick={handleMyLocation}
            sx={{ bgcolor: "white", boxShadow: 1 }}
          >
            <MyLocation fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Center on Provider">
          <IconButton
            size="small"
            onClick={handleCenterProvider}
            sx={{ bgcolor: "white", boxShadow: 1 }}
          >
            <Storefront fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Center on Customer">
          <IconButton
            size="small"
            onClick={handleCenterCustomer}
            sx={{ bgcolor: "white", boxShadow: 1 }}
          >
            <Person fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Info Drawer */}
      <Drawer
        anchor="bottom"
        open={showInfoDrawer}
        onClose={() => setShowInfoDrawer(false)}
        PaperProps={{ sx: { borderRadius: "16px 16px 0 0" } }}
      >
        <Box sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight="bold">Route Information</Typography>
            <IconButton onClick={() => setShowInfoDrawer(false)}>
              <Close />
            </IconButton>
          </Stack>
          <Divider sx={{ mb: 2 }} />
          
          <List>
            <ListItem>
              <ListItemText
                primary="Provider Location"
                secondary={`Lat: ${provider.lat.toFixed(6)}, Lng: ${provider.lng.toFixed(6)}`}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Customer Location"
                secondary={`Lat: ${customer.lat.toFixed(6)}, Lng: ${customer.lng.toFixed(6)}`}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Direct Distance"
                secondary={formatDistance(directDistance)}
              />
            </ListItem>
            {routeInfo && (
              <>
                <ListItem>
                  <ListItemText
                    primary="Route Distance"
                    secondary={formatDistance(routeInfo.distance)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Estimated Travel Time"
                    secondary={formatDuration(routeInfo.duration)}
                  />
                </ListItem>
              </>
            )}
          </List>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: "block" }}>
            * Route calculations are approximate and may vary based on traffic conditions
          </Typography>
        </Box>
      </Drawer>

      {/* Layer Control - Bottom Left */}
      <Box sx={{ position: "absolute", bottom: 20, left: 20, zIndex: 1000 }}>
        <Paper sx={{ p: 0.5, display: "flex", gap: 0.5 }}>
          <Tooltip title="Street Map">
            <IconButton
              size="small"
              onClick={() => setTileLayer("street")}
              sx={{ bgcolor: tileLayer === "street" ? "primary.main" : "transparent", color: tileLayer === "street" ? "white" : "inherit" }}
            >
              <MapIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Satellite">
            <IconButton
              size="small"
              onClick={() => setTileLayer("satellite")}
              sx={{ bgcolor: tileLayer === "satellite" ? "primary.main" : "transparent", color: tileLayer === "satellite" ? "white" : "inherit" }}
            >
              <SatelliteAlt fontSize="small" />
            </IconButton>
          </Tooltip>
        </Paper>
      </Box>

      {/* Travel Mode Selector */}
      {showRouting && (
        <Box sx={{ position: "absolute", top: 20, left: 20, zIndex: 1000 }}>
          <Paper sx={{ p: 0.5, display: "flex", gap: 0.5 }}>
            {Object.entries(TRAVEL_MODES).map(([mode, config]) => {
              const Icon = config.icon;
              return (
                <Tooltip key={mode} title={config.label}>
                  <IconButton
                    size="small"
                    onClick={() => setCurrentTravelMode(mode)}
                    sx={{
                      bgcolor: currentTravelMode === mode ? config.color : "transparent",
                      color: currentTravelMode === mode ? "white" : "inherit",
                      '&:hover': { bgcolor: currentTravelMode === mode ? config.color : "rgba(0,0,0,0.05)" }
                    }}
                  >
                    <Icon fontSize="small" />
                  </IconButton>
                </Tooltip>
              );
            })}
          </Paper>
        </Box>
      )}
    </Box>
  );
};

// ==========================================================
// PROP TYPES
// ==========================================================
BookingMap.propTypes = {
  provider: PropTypes.shape({
    lat: PropTypes.number.isRequired,
    lng: PropTypes.number.isRequired,
    name: PropTypes.string,
    address: PropTypes.string
  }),
  customer: PropTypes.shape({
    lat: PropTypes.number.isRequired,
    lng: PropTypes.number.isRequired,
    address: PropTypes.string
  }),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  showRouting: PropTypes.bool,
  showControls: PropTypes.bool,
  showEta: PropTypes.bool,
  travelMode: PropTypes.oneOf(["driving", "walking", "cycling"]),
  onRouteInfo: PropTypes.func,
  zoom: PropTypes.number,
  center: PropTypes.shape({
    lat: PropTypes.number,
    lng: PropTypes.number
  }),
  className: PropTypes.string
};

BookingMap.defaultProps = {
  height: 400,
  width: "100%",
  showRouting: true,
  showControls: true,
  showEta: true,
  travelMode: "driving",
  onRouteInfo: null,
  zoom: DEFAULT_ZOOM,
  center: null,
  className: ""
};

// Helper component for InfoIcon
const InfoIcon = ({ fontSize }) => (
  <svg width={fontSize === "small" ? 20 : 24} height={fontSize === "small" ? 20 : 24} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default React.memo(BookingMap);