import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Divider,
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
  SatelliteAlt,
  Map as MapIcon,
  Close,
  Person,
  Storefront,
  InfoOutlined,
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";

const DEFAULT_ZOOM = 14;
const DEFAULT_CENTER = { lat: 18.5204, lng: 73.8567 };

const TILE_LAYERS = {
  street: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; OpenStreetMap',
  },
  satellite: {
    url: "https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
    attribution: '&copy; Google',
    subdomains: ["mt0", "mt1", "mt2", "mt3"],
  },
  terrain: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: '&copy; OpenTopoMap',
  },
};

const TRAVEL_MODES = {
  driving: { label: "Driving", icon: DirectionsCar, color: "#3b82f6", profile: "driving" },
  walking: { label: "Walking", icon: DirectionsWalk, color: "#10b981", profile: "foot" },
  cycling: { label: "Cycling", icon: DirectionsBike, color: "#f59e0b", profile: "bike" },
};

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const formatDistance = (d) => (d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`);
const formatDuration = (m) => {
  if (m < 60) return `${Math.round(m)} min`;
  const h = Math.floor(m / 60);
  const mm = Math.round(m % 60);
  return `${h}h${mm > 0 ? ` ${mm}m` : ""}`;
};

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
      (p) => {
        setLocation({ lat: p.coords.latitude, lng: p.coords.longitude });
        setError(null);
        setLoading(false);
      },
      (e) => {
        setError(e.message);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);
  return { location, error, loading, getCurrentLocation };
};

const MapControlsInternal = () => {
  const map = useMap();
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);
  if (!map) return null;
  return (
    <Box sx={{ position: "absolute", bottom: 20, right: 20, zIndex: 1000, display: "flex", flexDirection: "column", gap: 1 }}>
      <Tooltip title="Zoom In"><IconButton size="small" onClick={() => map.zoomIn()} sx={{ bgcolor: "white", boxShadow: 2 }}><ZoomIn fontSize="small" /></IconButton></Tooltip>
      <Tooltip title="Zoom Out"><IconButton size="small" onClick={() => map.zoomOut()} sx={{ bgcolor: "white", boxShadow: 2 }}><ZoomOut fontSize="small" /></IconButton></Tooltip>
      <Tooltip title="Fullscreen">
        <IconButton size="small" onClick={() => {
          const c = map.getContainer();
          if (!isFullscreen) c?.requestFullscreen();
          else document.exitFullscreen();
        }} sx={{ bgcolor: "white", boxShadow: 2 }}>
          {isFullscreen ? <FullscreenExit fontSize="small" /> : <Fullscreen fontSize="small" />}
        </IconButton>
      </Tooltip>
    </Box>
  );
};

const RoutingMachine = ({ start, end, travelMode = "driving", onRouteFound }) => {
  const map = useMap();
  const routingRef = useRef(null);
  useEffect(() => {
    if (!map || !start || !end) return;
    if (!L.Routing || !L.Routing.control) return;
    const sLat = Number(start.lat);
    const sLng = Number(start.lng);
    const eLat = Number(end.lat);
    const eLng = Number(end.lng);
    if (Number.isNaN(sLat) || Number.isNaN(sLng) || Number.isNaN(eLat) || Number.isNaN(eLng)) return;

    try {
      if (routingRef.current) {
        try { map.removeControl(routingRef.current); } catch {}
        routingRef.current = null;
      }
      const profile = TRAVEL_MODES[travelMode]?.profile || "driving";
      const control = L.Routing.control({
        waypoints: [L.latLng(sLat, sLng), L.latLng(eLat, eLng)],
        routeWhileDragging: false,
        showAlternatives: false,
        fitSelectedRoutes: true,
        addWaypoints: false,
        draggableWaypoints: false,
        createMarker: () => null,
        lineOptions: { styles: [{ color: "#6366f1", weight: 5, opacity: 0.85 }], extendToWaypoints: true, missingRouteTolerance: 0 },
        router: L.Routing.osrmv1({ serviceUrl: "https://router.project-osrm.org/route/v1", profile }),
        show: false,
      }).addTo(map);

      control.on("routesfound", (e) => {
        const r = e.routes?.[0];
        if (!r) return;
        onRouteFound?.({ distance: r.summary.totalDistance / 1000, duration: r.summary.totalTime / 60 });
      });
      control.on("routingerror", () => {
        onRouteFound?.({ distance: calculateDistance(sLat, sLng, eLat, eLng), duration: 0, isDirect: true });
      });
      routingRef.current = control;
    } catch {
      onRouteFound?.({ distance: calculateDistance(sLat, sLng, eLat, eLng), duration: 0, isDirect: true });
    }
    return () => {
      if (routingRef.current) {
        try { map.removeControl(routingRef.current); } catch {}
        routingRef.current = null;
      }
    };
  }, [map, start, end, travelMode, onRouteFound]);
  return null;
};

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
  className = "",
}) => {
  const [routeInfo, setRouteInfo] = useState(null);
  const [currentTravelMode, setCurrentTravelMode] = useState(travelMode);
  const [showInfoDrawer, setShowInfoDrawer] = useState(false);
  const [tileLayer, setTileLayer] = useState("street");
  const { location: userLocation, getCurrentLocation } = useGeolocation();
  const mapInstanceRef = useRef(null);

  useEffect(() => { setCurrentTravelMode(travelMode); }, [travelMode]);

  const isValidCoord = (p) => p && typeof p.lat === "number" && typeof p.lng === "number" && !Number.isNaN(p.lat) && !Number.isNaN(p.lng);

  const directDistance = useMemo(() => {
    if (!isValidCoord(provider) || !isValidCoord(customer)) return null;
    return calculateDistance(provider.lat, provider.lng, customer.lat, customer.lng);
  }, [provider, customer]);

  const mapCenter = useMemo(() => {
    if (center && isValidCoord(center)) return center;
    if (isValidCoord(provider)) return provider;
    if (isValidCoord(customer)) return customer;
    return DEFAULT_CENTER;
  }, [center, provider, customer]);

  const handleRouteFound = useCallback((route) => {
    setRouteInfo(route);
    onRouteInfo?.(route);
  }, [onRouteInfo]);

  const fitBounds = useCallback(() => {
    if (mapInstanceRef.current && isValidCoord(provider) && isValidCoord(customer)) {
      try {
        const bounds = L.latLngBounds([provider.lat, provider.lng], [customer.lat, customer.lng]);
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
      } catch {}
    }
  }, [provider, customer]);

  useEffect(() => { const t = setTimeout(() => fitBounds(), 300); return () => clearTimeout(t); }, [fitBounds]);

  const providerIcon = useMemo(() => new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
  }), []);

  const customerIcon = useMemo(() => new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
  }), []);

  const userIcon = useMemo(() => new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
  }), []);

  if (!isValidCoord(provider) || !isValidCoord(customer)) {
    return <Paper sx={{ p: 3, textAlign: "center", height, width, display: "flex", alignItems: "center", justifyContent: "center" }}><Typography color="text.secondary">Location information not available</Typography></Paper>;
  }

  const TravelIcon = TRAVEL_MODES[currentTravelMode]?.icon || DirectionsCar;
  const tileConfig = TILE_LAYERS[tileLayer] || TILE_LAYERS.street;

  return (
    <Box className={className} sx={{ position: "relative", height, width, borderRadius: 3, overflow: "hidden", border: "1px solid #e5e7eb" }}>
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        ref={mapInstanceRef}
        whenReady={() => { try { setTimeout(() => fitBounds(), 200); } catch {} }}
      >
        <TileLayer url={tileConfig.url} attribution={tileConfig.attribution} subdomains={tileConfig.subdomains} />
        <Marker position={provider} icon={providerIcon}><Popup><Box sx={{ p: 1 }}><Typography variant="subtitle2" fontWeight={700}>Provider</Typography><Typography variant="caption">{provider.lat.toFixed(5)}, {provider.lng.toFixed(5)}</Typography></Box></Popup></Marker>
        <Marker position={customer} icon={customerIcon}><Popup><Box sx={{ p: 1 }}><Typography variant="subtitle2" fontWeight={700}>Customer</Typography><Typography variant="caption">{customer.address || `${customer.lat.toFixed(5)}, ${customer.lng.toFixed(5)}`}</Typography></Box></Popup></Marker>
        {isValidCoord(userLocation) && <Marker position={userLocation} icon={userIcon}><Popup>Your Location</Popup></Marker>}
        {showRouting && isValidCoord(provider) && isValidCoord(customer) && <RoutingMachine start={provider} end={customer} travelMode={currentTravelMode} onRouteFound={handleRouteFound} />}
        {showControls && <MapControlsInternal />}
      </MapContainer>

      <AnimatePresence>
        {showEta && routeInfo && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} style={{ position: "absolute", bottom: 16, left: 16, right: 16, zIndex: 1000 }}>
            <Paper sx={{ p: 1.5, borderRadius: 2, boxShadow: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Chip icon={<TravelIcon />} label={TRAVEL_MODES[currentTravelMode]?.label} size="small" color="primary" variant="outlined" />
                  <Box><Typography variant="caption" color="text.secondary">Distance</Typography><Typography variant="body2" fontWeight={700}>{formatDistance(routeInfo.distance)}</Typography></Box>
                  <Box><Typography variant="caption" color="text.secondary">ETA</Typography><Typography variant="body2" fontWeight={700}>{formatDuration(routeInfo.duration)}</Typography></Box>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  {directDistance && <Chip label={`Direct: ${formatDistance(directDistance)}`} size="small" variant="outlined" />}
                  <IconButton size="small" onClick={() => setShowInfoDrawer(true)}><InfoOutlined fontSize="small" /></IconButton>
                </Stack>
              </Stack>
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>

      <Box sx={{ position: "absolute", top: 16, right: 16, zIndex: 1000, display: "flex", flexDirection: "column", gap: 1 }}>
        <Tooltip title="My Location"><IconButton size="small" onClick={getCurrentLocation} sx={{ bgcolor: "white", boxShadow: 2 }}><MyLocation fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="Provider"><IconButton size="small" onClick={() => mapInstanceRef.current?.setView(provider, 16)} sx={{ bgcolor: "white", boxShadow: 2 }}><Storefront fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="Customer"><IconButton size="small" onClick={() => mapInstanceRef.current?.setView(customer, 16)} sx={{ bgcolor: "white", boxShadow: 2 }}><Person fontSize="small" /></IconButton></Tooltip>
      </Box>

      <Box sx={{ position: "absolute", bottom: 80, left: 16, zIndex: 1000 }}>
        <Paper sx={{ p: 0.5, display: "flex", gap: 0.5, boxShadow: 2 }}>
          <Tooltip title="Street"><IconButton size="small" onClick={() => setTileLayer("street")} sx={{ bgcolor: tileLayer === "street" ? "primary.main" : "transparent", color: tileLayer === "street" ? "white" : "inherit" }}><MapIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Satellite"><IconButton size="small" onClick={() => setTileLayer("satellite")} sx={{ bgcolor: tileLayer === "satellite" ? "primary.main" : "transparent", color: tileLayer === "satellite" ? "white" : "inherit" }}><SatelliteAlt fontSize="small" /></IconButton></Tooltip>
        </Paper>
      </Box>

      {showRouting && (
        <Box sx={{ position: "absolute", top: 16, left: 16, zIndex: 1000 }}>
          <Paper sx={{ p: 0.5, display: "flex", gap: 0.5, boxShadow: 2 }}>
            {Object.entries(TRAVEL_MODES).map(([mode, cfg]) => {
              const Icon = cfg.icon;
              return <Tooltip key={mode} title={cfg.label}><IconButton size="small" onClick={() => setCurrentTravelMode(mode)} sx={{ bgcolor: currentTravelMode === mode ? cfg.color : "transparent", color: currentTravelMode === mode ? "white" : "inherit" }}><Icon fontSize="small" /></IconButton></Tooltip>;
            })}
          </Paper>
        </Box>
      )}

      <Drawer anchor="bottom" open={showInfoDrawer} onClose={() => setShowInfoDrawer(false)} PaperProps={{ sx: { borderRadius: "16px 16px 0 0", maxHeight: "70vh" } }}>
        <Box sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}><Typography variant="h6" fontWeight={700}>Route Details</Typography><IconButton onClick={() => setShowInfoDrawer(false)}><Close /></IconButton></Stack>
          <Divider sx={{ mb: 2 }} />
          <List dense>
            <ListItem><ListItemText primary="Provider" secondary={`${provider.lat.toFixed(6)}, ${provider.lng.toFixed(6)}`} /></ListItem>
            <ListItem><ListItemText primary="Customer" secondary={`${customer.lat.toFixed(6)}, ${customer.lng.toFixed(6)}`} /></ListItem>
            {directDistance && <ListItem><ListItemText primary="Direct Distance" secondary={formatDistance(directDistance)} /></ListItem>}
            {routeInfo && <><ListItem><ListItemText primary="Route Distance" secondary={formatDistance(routeInfo.distance)} /></ListItem><ListItem><ListItemText primary="ETA" secondary={formatDuration(routeInfo.duration)} /></ListItem></>}
          </List>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: "block" }}>* Approximate, varies with traffic</Typography>
        </Box>
      </Drawer>
    </Box>
  );
};

BookingMap.propTypes = {
  provider: PropTypes.shape({ lat: PropTypes.number.isRequired, lng: PropTypes.number.isRequired, name: PropTypes.string, address: PropTypes.string }),
  customer: PropTypes.shape({ lat: PropTypes.number.isRequired, lng: PropTypes.number.isRequired, address: PropTypes.string }),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  showRouting: PropTypes.bool,
  showControls: PropTypes.bool,
  showEta: PropTypes.bool,
  travelMode: PropTypes.oneOf(["driving", "walking", "cycling"]),
  onRouteInfo: PropTypes.func,
  zoom: PropTypes.number,
  center: PropTypes.shape({ lat: PropTypes.number, lng: PropTypes.number }),
  className: PropTypes.string,
};

export default React.memo(BookingMap);