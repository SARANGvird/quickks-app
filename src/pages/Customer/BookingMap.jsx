import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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
  Terrain,
  Map as MapIcon,
  Close,
  Person,
  Storefront,
  InfoOutlined,
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";

const DEFAULT_ZOOM = 14;
const DEFAULT_CENTER = { lat: 18.5204, lng: 73.8567 };
const DETOUR_FACTOR = 1.3;
const ROUTE_DEBOUNCE_MS = 400;

const TILE_LAYERS = {
  street: {
    label: "Street",
    icon: MapIcon,
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  satellite: {
    label: "Satellite",
    icon: SatelliteAlt,
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    maxZoom: 19,
  },
  terrain: {
    label: "Terrain",
    icon: Terrain,
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="https://opentopomap.org">OpenTopoMap</a>',
    subdomains: "abc",
    maxZoom: 17,
  },
};

const TRAVEL_MODES = {
  driving: {
    label: "Driving",
    icon: DirectionsCar,
    color: "#3b82f6",
    router: "https://routing.openstreetmap.de/routed-car/route/v1/driving",
    speedKmh: 30,
  },
  walking: {
    label: "Walking",
    icon: DirectionsWalk,
    color: "#10b981",
    router: "https://routing.openstreetmap.de/routed-foot/route/v1/driving",
    speedKmh: 5,
  },
  cycling: {
    label: "Cycling",
    icon: DirectionsBike,
    color: "#f59e0b",
    router: "https://routing.openstreetmap.de/routed-bike/route/v1/driving",
    speedKmh: 15,
  },
};

const pinSvg = (fill) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42"><path d="M15 1C7.3 1 1 7.3 1 15c0 10.5 14 26 14 26s14-15.5 14-26C29 7.3 22.7 1 15 1z" fill="${fill}" stroke="#ffffff" stroke-width="2"/><circle cx="15" cy="15" r="5.5" fill="#ffffff"/></svg>`;

const createPin = (fill) =>
  L.divIcon({
    html: pinSvg(fill),
    className: "",
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -38],
  });

const PROVIDER_ICON = createPin("#16a34a");
const CUSTOMER_ICON = createPin("#dc2626");
const USER_ICON = createPin("#2563eb");

const toCoord = (p) => {
  if (!p || p.lat === null || p.lng === null || p.lat === "" || p.lng === "") return null;
  const lat = Number(p.lat);
  const lng = Number(p.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  if (lat === 0 && lng === 0) return null;
  return { ...p, lat, lng };
};

const round4 = (n) => Math.round(n * 10000) / 10000;

const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const formatDistance = (d) => {
  const meters = Math.round(d * 1000);
  return meters < 1000 ? `${meters} m` : `${d.toFixed(1)} km`;
};

const formatDuration = (minutes) => {
  const total = Math.max(1, Math.round(minutes));
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const GEO_ERRORS = {
  1: "Location permission was denied. Allow location access in your browser settings.",
  2: "Your location is currently unavailable.",
  3: "Finding your location took too long. Try again.",
};

const useGeolocation = () => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Your browser does not support location services.");
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (!mountedRef.current) return;
        setLocation({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLoading(false);
      },
      (e) => {
        if (!mountedRef.current) return;
        setError(GEO_ERRORS[e.code] || "Could not get your location.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { location, error, loading, getCurrentLocation, clearError };
};

const MapBridge = ({ mapRef, boundsPoints, autoFit }) => {
  const map = useMap();

  useEffect(() => {
    mapRef.current = map;
    return () => {
      if (mapRef.current === map) mapRef.current = null;
    };
  }, [map, mapRef]);

  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);

  const boundsKey = boundsPoints.map((p) => `${p[0]},${p[1]}`).join("|");

  useEffect(() => {
    if (!autoFit || boundsPoints.length === 0) return;
    try {
      map.invalidateSize();
      map.fitBounds(L.latLngBounds(boundsPoints), { padding: [50, 50], maxZoom: 16 });
    } catch {
      return;
    }
  }, [map, boundsKey, autoFit]);

  return null;
};

const RoutePath = ({ start, end, mode, onRoute }) => {
  const [path, setPath] = useState(null);
  const [isDirect, setIsDirect] = useState(false);
  const callbackRef = useRef(onRoute);

  useEffect(() => {
    callbackRef.current = onRoute;
  }, [onRoute]);

  const sLat = round4(start.lat);
  const sLng = round4(start.lng);
  const eLat = round4(end.lat);
  const eLng = round4(end.lng);

  useEffect(() => {
    const controller = new AbortController();
    const config = TRAVEL_MODES[mode] || TRAVEL_MODES.driving;
    let active = true;

    setPath(null);
    setIsDirect(false);
    callbackRef.current?.(null);

    const timer = setTimeout(async () => {
      try {
        const url = `${config.router}/${sLng},${sLat};${eLng},${eLat}?overview=full&geometries=geojson&alternatives=false&steps=false`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`routing failed: ${res.status}`);
        const data = await res.json();
        const route = data?.routes?.[0];
        if (data?.code !== "Ok" || !route?.geometry?.coordinates?.length) throw new Error("no route");
        if (!active) return;
        setPath(route.geometry.coordinates.map(([lng, lat]) => [lat, lng]));
        setIsDirect(false);
        callbackRef.current?.({
          distance: route.distance / 1000,
          duration: route.duration / 60,
          isDirect: false,
          isEstimate: false,
          travelMode: mode,
        });
      } catch (err) {
        if (!active || err?.name === "AbortError") return;
        const straight = calculateDistance(sLat, sLng, eLat, eLng);
        const estimated = straight * DETOUR_FACTOR;
        setPath(null);
        setIsDirect(true);
        callbackRef.current?.({
          distance: estimated,
          duration: (estimated / config.speedKmh) * 60,
          isDirect: true,
          isEstimate: true,
          travelMode: mode,
        });
      }
    }, ROUTE_DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [sLat, sLng, eLat, eLng, mode]);

  const color = (TRAVEL_MODES[mode] || TRAVEL_MODES.driving).color;

  return (
    <>
      {path && <Polyline positions={path} pathOptions={{ color, weight: 5, opacity: 0.85 }} />}
      {isDirect && (
        <Polyline
          positions={[
            [sLat, sLng],
            [eLat, eLng],
          ]}
          pathOptions={{ color, weight: 4, opacity: 0.7, dashArray: "8 10" }}
        />
      )}
    </>
  );
};

const MapButton = ({ title, onClick, active = false, activeColor = "primary.main", disabled = false, flat = false, children }) => (
  <Tooltip title={title}>
    <span>
      <IconButton
        size="small"
        onClick={onClick}
        disabled={disabled}
        aria-label={title}
        aria-pressed={active || undefined}
        sx={{
          bgcolor: active ? activeColor : flat ? "transparent" : "white",
          color: active ? "white" : "text.primary",
          boxShadow: flat ? 0 : 2,
          "&:hover": { bgcolor: active ? activeColor : "grey.100" },
        }}
      >
        {children}
      </IconButton>
    </span>
  </Tooltip>
);

const getFullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;

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
  autoFit = true,
  scrollWheelZoom = true,
  className = "",
}) => {
  const safeMode = TRAVEL_MODES[travelMode] ? travelMode : "driving";
  const [routeInfo, setRouteInfo] = useState(null);
  const [currentTravelMode, setCurrentTravelMode] = useState(safeMode);
  const [showInfoDrawer, setShowInfoDrawer] = useState(false);
  const [tileLayer, setTileLayer] = useState("street");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { location: userLocation, error: geoError, loading: geoLoading, getCurrentLocation, clearError } = useGeolocation();
  const mapRef = useRef(null);
  const outerRef = useRef(null);
  const onRouteInfoRef = useRef(onRouteInfo);

  useEffect(() => {
    onRouteInfoRef.current = onRouteInfo;
  }, [onRouteInfo]);

  useEffect(() => {
    setCurrentTravelMode(safeMode);
  }, [safeMode]);

  const safeProvider = useMemo(() => toCoord(provider), [provider?.lat, provider?.lng, provider?.name, provider?.address]);
  const safeCustomer = useMemo(() => toCoord(customer), [customer?.lat, customer?.lng, customer?.address]);
  const safeCenter = useMemo(() => toCoord(center), [center?.lat, center?.lng]);

  const directDistance = useMemo(() => {
    if (!safeProvider || !safeCustomer) return null;
    return calculateDistance(safeProvider.lat, safeProvider.lng, safeCustomer.lat, safeCustomer.lng);
  }, [safeProvider, safeCustomer]);

  const mapCenter = useMemo(() => safeCenter || safeProvider || safeCustomer || DEFAULT_CENTER, [safeCenter, safeProvider, safeCustomer]);

  const boundsPoints = useMemo(() => {
    if (!safeProvider || !safeCustomer) return [];
    return [
      [round4(safeProvider.lat), round4(safeProvider.lng)],
      [round4(safeCustomer.lat), round4(safeCustomer.lng)],
    ];
  }, [safeProvider, safeCustomer]);

  const handleRouteFound = useCallback((route) => {
    setRouteInfo(route);
    if (route) onRouteInfoRef.current?.(route);
  }, []);

  useEffect(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.flyTo([userLocation.lat, userLocation.lng], 15);
    }
  }, [userLocation]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(getFullscreenElement() === outerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  const fullscreenSupported = typeof document !== "undefined" && Boolean(document.fullscreenEnabled || document.webkitFullscreenEnabled);

  const toggleFullscreen = useCallback(async () => {
    const el = outerRef.current;
    if (!el) return;
    try {
      if (getFullscreenElement()) {
        await (document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen?.());
      } else {
        await (el.requestFullscreen ? el.requestFullscreen() : el.webkitRequestFullscreen?.());
      }
    } catch {
      return;
    }
  }, []);

  const focusOn = useCallback((point) => {
    if (point && mapRef.current) mapRef.current.setView([point.lat, point.lng], 16);
  }, []);

  if (!safeProvider || !safeCustomer) {
    return (
      <Paper className={className} sx={{ p: 3, textAlign: "center", height, width, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Typography color="text.secondary">Location information not available</Typography>
      </Paper>
    );
  }

  const modeConfig = TRAVEL_MODES[currentTravelMode] || TRAVEL_MODES.driving;
  const TravelIcon = modeConfig.icon;
  const tileConfig = TILE_LAYERS[tileLayer] || TILE_LAYERS.street;
  const etaVisible = showEta && showRouting;
  const approx = routeInfo?.isEstimate ? "~" : "";

  return (
    <Box
      ref={outerRef}
      className={className}
      sx={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height,
        width,
        borderRadius: 3,
        overflow: "hidden",
        border: "1px solid #e5e7eb",
        bgcolor: "#fff",
        isolation: "isolate",
        "&:fullscreen": { height: "100vh", width: "100vw", borderRadius: 0, border: "none" },
        "&:-webkit-full-screen": { height: "100vh", width: "100vw", borderRadius: 0, border: "none" },
      }}
    >
      <Box sx={{ position: "relative", flex: 1, minHeight: 0 }}>
        <MapContainer
          center={mapCenter}
          zoom={zoom}
          zoomControl={false}
          scrollWheelZoom={scrollWheelZoom}
          style={{ height: "100%", width: "100%" }}
        >
          <MapBridge mapRef={mapRef} boundsPoints={boundsPoints} autoFit={autoFit} />
          <TileLayer
            key={tileLayer}
            url={tileConfig.url}
            attribution={tileConfig.attribution}
            subdomains={tileConfig.subdomains || "abc"}
            maxZoom={tileConfig.maxZoom}
          />
          <Marker position={[safeProvider.lat, safeProvider.lng]} icon={PROVIDER_ICON}>
            <Popup>
              <Box sx={{ p: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>{safeProvider.name || "Provider"}</Typography>
                <Typography variant="caption">{safeProvider.address || `${safeProvider.lat.toFixed(5)}, ${safeProvider.lng.toFixed(5)}`}</Typography>
              </Box>
            </Popup>
          </Marker>
          <Marker position={[safeCustomer.lat, safeCustomer.lng]} icon={CUSTOMER_ICON}>
            <Popup>
              <Box sx={{ p: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>Customer</Typography>
                <Typography variant="caption">{safeCustomer.address || `${safeCustomer.lat.toFixed(5)}, ${safeCustomer.lng.toFixed(5)}`}</Typography>
              </Box>
            </Popup>
          </Marker>
          {userLocation && (
            <Marker position={[userLocation.lat, userLocation.lng]} icon={USER_ICON}>
              <Popup>Your location</Popup>
            </Marker>
          )}
          {showRouting && <RoutePath start={safeProvider} end={safeCustomer} mode={currentTravelMode} onRoute={handleRouteFound} />}
        </MapContainer>

        <Box sx={{ position: "absolute", top: 12, left: 12, zIndex: 1000, display: "flex", flexDirection: "column", gap: 1 }}>
          {showRouting && (
            <Paper sx={{ p: 0.5, display: "flex", gap: 0.5, boxShadow: 2 }}>
              {Object.entries(TRAVEL_MODES).map(([mode, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <MapButton key={mode} title={cfg.label} flat active={currentTravelMode === mode} activeColor={cfg.color} onClick={() => setCurrentTravelMode(mode)}>
                    <Icon fontSize="small" />
                  </MapButton>
                );
              })}
            </Paper>
          )}
          <Paper sx={{ p: 0.5, display: "flex", gap: 0.5, boxShadow: 2 }}>
            {Object.entries(TILE_LAYERS).map(([key, cfg]) => {
              const Icon = cfg.icon;
              return (
                <MapButton key={key} title={cfg.label} flat active={tileLayer === key} onClick={() => setTileLayer(key)}>
                  <Icon fontSize="small" />
                </MapButton>
              );
            })}
          </Paper>
        </Box>

        <Box sx={{ position: "absolute", top: 12, right: 12, zIndex: 1000, display: "flex", flexDirection: "column", gap: 1 }}>
          <MapButton title="My location" onClick={getCurrentLocation} disabled={geoLoading}>
            {geoLoading ? <CircularProgress size={20} /> : <MyLocation fontSize="small" />}
          </MapButton>
          <MapButton title="Go to provider" onClick={() => focusOn(safeProvider)}>
            <Storefront fontSize="small" />
          </MapButton>
          <MapButton title="Go to customer" onClick={() => focusOn(safeCustomer)}>
            <Person fontSize="small" />
          </MapButton>
          {showControls && (
            <>
              <MapButton title="Zoom in" onClick={() => mapRef.current?.zoomIn()}>
                <ZoomIn fontSize="small" />
              </MapButton>
              <MapButton title="Zoom out" onClick={() => mapRef.current?.zoomOut()}>
                <ZoomOut fontSize="small" />
              </MapButton>
              {fullscreenSupported && (
                <MapButton title={isFullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={toggleFullscreen}>
                  {isFullscreen ? <FullscreenExit fontSize="small" /> : <Fullscreen fontSize="small" />}
                </MapButton>
              )}
            </>
          )}
        </Box>

        {geoError && (
          <Box sx={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 1000, maxWidth: "70%" }}>
            <Chip color="warning" label={geoError} onDelete={clearError} sx={{ height: "auto", "& .MuiChip-label": { whiteSpace: "normal", py: 0.5 } }} />
          </Box>
        )}
      </Box>

      <AnimatePresence initial={false}>
        {etaVisible && (
          <motion.div
            key="eta"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden", flexShrink: 0 }}
          >
            <Box sx={{ p: 1.5, borderTop: "1px solid #e5e7eb", bgcolor: "#fff" }}>
              {routeInfo ? (
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                  <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Chip icon={<TravelIcon />} label={modeConfig.label} size="small" color="primary" variant="outlined" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">Distance</Typography>
                      <Typography variant="body2" fontWeight={700}>{approx}{formatDistance(routeInfo.distance)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">ETA</Typography>
                      <Typography variant="body2" fontWeight={700}>{approx}{formatDuration(routeInfo.duration)}</Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {routeInfo.isDirect && <Chip label="Route unavailable, estimate shown" size="small" color="warning" variant="outlined" />}
                    {directDistance !== null && <Chip label={`Direct: ${formatDistance(directDistance)}`} size="small" variant="outlined" />}
                    <IconButton size="small" onClick={() => setShowInfoDrawer(true)} aria-label="Route details">
                      <InfoOutlined fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
              ) : (
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <CircularProgress size={18} />
                  <Typography variant="body2" color="text.secondary">Calculating route…</Typography>
                </Stack>
              )}
            </Box>
          </motion.div>
        )}
      </AnimatePresence>

      <Drawer
        anchor="bottom"
        open={showInfoDrawer}
        onClose={() => setShowInfoDrawer(false)}
        ModalProps={{ container: isFullscreen ? outerRef.current : undefined }}
        PaperProps={{ sx: { borderRadius: "16px 16px 0 0", maxHeight: "70vh" } }}
      >
        <Box sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight={700}>Route details</Typography>
            <IconButton onClick={() => setShowInfoDrawer(false)} aria-label="Close"><Close /></IconButton>
          </Stack>
          <Divider sx={{ mb: 2 }} />
          <List dense>
            <ListItem><ListItemText primary={safeProvider.name || "Provider"} secondary={`${safeProvider.lat.toFixed(6)}, ${safeProvider.lng.toFixed(6)}`} /></ListItem>
            <ListItem><ListItemText primary="Customer" secondary={safeCustomer.address || `${safeCustomer.lat.toFixed(6)}, ${safeCustomer.lng.toFixed(6)}`} /></ListItem>
            {directDistance !== null && <ListItem><ListItemText primary="Direct distance" secondary={formatDistance(directDistance)} /></ListItem>}
            {routeInfo && (
              <>
                <ListItem><ListItemText primary="Route distance" secondary={`${approx}${formatDistance(routeInfo.distance)}`} /></ListItem>
                <ListItem><ListItemText primary="ETA" secondary={`${approx}${formatDuration(routeInfo.duration)}`} /></ListItem>
              </>
            )}
          </List>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: "block" }}>
            {routeInfo?.isEstimate
              ? "Estimated from the straight-line distance because a road route could not be loaded."
              : "Approximate. Actual time varies with traffic and conditions."}
          </Typography>
        </Box>
      </Drawer>
    </Box>
  );
};

const coordShape = {
  lat: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  lng: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};

BookingMap.propTypes = {
  provider: PropTypes.shape({ ...coordShape, name: PropTypes.string, address: PropTypes.string }),
  customer: PropTypes.shape({ ...coordShape, address: PropTypes.string }),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  showRouting: PropTypes.bool,
  showControls: PropTypes.bool,
  showEta: PropTypes.bool,
  travelMode: PropTypes.oneOf(["driving", "walking", "cycling"]),
  onRouteInfo: PropTypes.func,
  zoom: PropTypes.number,
  center: PropTypes.shape(coordShape),
  autoFit: PropTypes.bool,
  scrollWheelZoom: PropTypes.bool,
  className: PropTypes.string,
};

export default React.memo(BookingMap);