import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Box, Paper, Typography, Stack, Chip, CircularProgress, IconButton, Tooltip, Drawer, List, ListItem, ListItemText, Divider,
} from "@mui/material";
import {
  MyLocation, ZoomIn, ZoomOut, Fullscreen, FullscreenExit, DirectionsCar, DirectionsWalk, DirectionsBike, SatelliteAlt, Terrain, Map as MapIcon, Close, Person, Storefront, InfoOutlined,
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";

const DEFAULT_ZOOM = 14;
const DEFAULT_CENTER = { lat: 18.5204, lng: 73.8567 };
const DETOUR_FACTOR = 1.35;
const ROUTE_DEBOUNCE = 350;
const OSRM_BASE = "https://router.project-osrm.org/route/v1";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const TILE_LAYERS = {
  street: { label: "Street", icon: MapIcon, url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attr: "© OSM", maxZoom: 19, subdomains: ["a","b","c"] },
  satellite: { label: "Satellite", icon: SatelliteAlt, url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attr: "© Esri", maxZoom: 19 },
  terrain: { label: "Terrain", icon: Terrain, url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", attr: "© OpenTopoMap", maxZoom: 17, subdomains: ["a","b","c"] },
};

const TRAVEL_MODES = {
  driving: { label: "Driving", icon: DirectionsCar, color: "#3b82f6", osrm: "driving", speed: 30 },
  walking: { label: "Walking", icon: DirectionsWalk, color: "#10b981", osrm: "foot", speed: 5 },
  cycling: { label: "Cycling", icon: DirectionsBike, color: "#f59e0b", osrm: "bike", speed: 15 },
};

const pinSvg = (fill) => [STRIPPED 269 bytes];

const createPin = (fill) => L.divIcon({ html: pinSvg(fill), className: "quickks-pin", iconSize: [30,42], iconAnchor: [15,42], popupAnchor: [0,-38] });

const PROVIDER_ICON = createPin("#16a34a");
const CUSTOMER_ICON = createPin("#dc2626");
const USER_ICON = createPin("#2563eb");

const isValidCoord = (p) => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)) && Math.abs(Number(p.lat)) <= 90 && Math.abs(Number(p.lng)) <= 180 && !(Number(p.lat)===0 && Number(p.lng)===0);

const toCoord = (p) => {
  if (!isValidCoord(p)) return null;
  return { lat: Number(p.lat), lng: Number(p.lng), name: p.name || "", address: p.address || "" };
};

const r4 = (n) => Math.round(n*10000)/10000;

const distKm = (a,b,c,d) => {
  const R=6371; const dLa=(c-a)*Math.PI/180; const dLn=(d-b)*Math.PI/180;
  const q=Math.sin(dLa/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dLn/2)**2;
  return R*2*Math.atan2(Math.sqrt(q),Math.sqrt(1-q));
};

const fmtDist = (d) => d<1?`${Math.round(d*1000)} m`:`${d.toFixed(1)} km`;
const fmtDur = (m) => { const t=Math.max(1,Math.round(m)); return t<60?`${t} min`:`${Math.floor(t/60)}h${t%60?` ${t%60}m`:""}`; };

const GEO_ERRORS = { 1:"Permission denied. Allow location.", 2:"Location unavailable.", 3:"Location timeout." };

const useGeolocation = () => {
  const [loc,setLoc]=useState(null); const [err,setErr]=useState(null); const [load,setLoad]=useState(false); const ref=useRef(true);
  useEffect(()=>{ ref.current=true; return()=>{ ref.current=false; }; },[]);
  const get=useCallback(()=>{ if(!navigator.geolocation){ setErr("Geolocation not supported"); return; } setLoad(true); setErr(null); navigator.geolocation.getCurrentPosition((p)=>{ if(!ref.current) return; setLoc({lat:p.coords.latitude,lng:p.coords.longitude}); setLoad(false); },(e)=>{ if(!ref.current) return; setErr(GEO_ERRORS[e.code]||"Location failed"); setLoad(false); },{enableHighAccuracy:true,timeout:10000,maximumAge:30000}); },[]);
  return { loc, err, load, get, clear:()=>setErr(null) };
};

const MapBridge = React.memo(({ mapRef, points, autoFit }) => {
  const map=useMap();
  const key=useMemo(()=>points.map(p=>`${p[0].toFixed(4)},${p[1].toFixed(4)}`).join("|"),[points]);
  useEffect(()=>{ mapRef.current=map; return()=>{ if(mapRef.current===map) mapRef.current=null; }; },[map,mapRef]);
  useEffect(()=>{ if(typeof ResizeObserver==="undefined") return; const o=new ResizeObserver(()=>{ try{ map.invalidateSize(); }catch{} }); o.observe(map.getContainer()); return()=>o.disconnect(); },[map]);
  useEffect(()=>{ if(!autoFit||points.length===0) return; try{ map.invalidateSize(); map.fitBounds(L.latLngBounds(points),{padding:[50,50],maxZoom:16}); }catch{} },[map,key,autoFit]);
  return null;
});

const RoutePath = React.memo(({ start, end, mode, onRoute }) => {
  const [path,setPath]=useState(null); const [direct,setDirect]=useState(false); const cbRef=useRef(onRoute); const cacheRef=useRef(new Map());
  useEffect(()=>{ cbRef.current=onRoute; },[onRoute]);
  const sLa=r4(start.lat); const sLn=r4(start.lng); const eLa=r4(end.lat); const eLn=r4(end.lng);
  const cacheKey=`${sLa},${sLn}-${eLa},${eLn}-${mode}`;

  useEffect(()=>{
    let alive=true; const ctrl=new AbortController(); setPath(null); setDirect(false); cbRef.current?.(null);
    const cached=cacheRef.current.get(cacheKey);
    if(cached){ setPath(cached.path); setDirect(cached.direct); cbRef.current?.(cached.route); return; }
    const timer=setTimeout(async()=>{
      const cfg=TRAVEL_MODES[mode]||TRAVEL_MODES.driving;
      const tryFetch=async(url)=>{
        const r=await fetch(url,{signal:ctrl.signal});
        if(!r.ok) throw new Error(String(r.status));
        const j=await r.json();
        const rt=j?.routes?.[0];
        if(j?.code!=="Ok"||!rt?.geometry?.coordinates?.length) throw new Error("no route");
        return rt;
      };
      try{
        let rt;
        try{ rt=await tryFetch(`${OSRM_BASE}/${cfg.osrm}/${sLn},${sLa};${eLn},${eLa}?overview=full&geometries=geojson`); }
        catch{ rt=await tryFetch(`https://routing.openstreetmap.de/routed-${cfg.osrm==="foot"?"foot":cfg.osrm==="bike"?"bike":"car"}/route/v1/driving/${sLn},${sLa};${eLn},${eLa}?overview=full&geometries=geojson`); }
        if(!alive) return;
        const p=rt.geometry.coordinates.map(([lng,lat])=>[lat,lng]);
        const route={ distance:rt.distance/1000, duration:rt.duration/60, isDirect:false, isEstimate:false, travelMode:mode };
        setPath(p); setDirect(false); cacheRef.current.set(cacheKey,{path:p,direct:false,route});
        cbRef.current?.(route);
      }catch(e){
        if(!alive||e?.name==="AbortError") return;
        const straight=distKm(sLa,sLn,eLa,eLn); const est=straight*DETOUR_FACTOR;
        const route={ distance:est, duration:(est/cfg.speed)*60, isDirect:true, isEstimate:true, travelMode:mode };
        setPath(null); setDirect(true); cacheRef.current.set(cacheKey,{path:null,direct:true,route});
        cbRef.current?.(route);
      }
    },ROUTE_DEBOUNCE);
    return()=>{ alive=false; clearTimeout(timer); ctrl.abort(); };
  },[sLa,sLn,eLa,eLn,mode,cacheKey]);

  const color=(TRAVEL_MODES[mode]||TRAVEL_MODES.driving).color;
  if(path) return <Polyline positions={path} pathOptions={{ color, weight:5, opacity:0.85 }} />;
  if(direct) return <Polyline positions={[[sLa,sLn],[eLa,eLn]]} pathOptions={{ color, weight:4, opacity:0.7, dashArray:"8 10" }} />;
  return null;
});

const MapButton = React.memo(({ title, onClick, active, activeColor, disabled, flat, children }) => (
  <Tooltip title={title}><span><IconButton size="small" onClick={onClick} disabled={disabled} aria-label={title} sx={{ bgcolor: active?activeColor:flat?"transparent":"white", color: active?"white":"text.primary", boxShadow: flat?0:2, "&:hover":{bgcolor:active?activeColor:"grey.100"} }}>{children}</IconButton></span></Tooltip>
));

const getFS=()=>document.fullscreenElement||document.webkitFullscreenElement||null;

const BookingMap = ({ provider, customer, height=400, width="100%", showRouting=true, showControls=true, showEta=true, travelMode="driving", onRouteInfo, zoom=DEFAULT_ZOOM, center, autoFit=true, scrollWheelZoom=true, className="" }) => {
  const safeMode=TRAVEL_MODES[travelMode]?travelMode:"driving";
  const [routeInfo,setRouteInfo]=useState(null); const [curMode,setCurMode]=useState(safeMode); const [drawer,setDrawer]=useState(false); const [tile,setTile]=useState("street"); const [fs,setFs]=useState(false);
  const { loc:userLoc, err:geoErr, load:geoLoad, get:getLoc, clear }=useGeolocation();
  const mapRef=useRef(null); const outerRef=useRef(null); const infoRef=useRef(onRouteInfo);
  useEffect(()=>{ infoRef.current=onRouteInfo; },[onRouteInfo]);
  useEffect(()=>{ setCurMode(safeMode); },[safeMode]);

  const safeProvider=useMemo(()=>toCoord(provider),[provider?.lat,provider?.lng,provider?.name,provider?.address]);
  const safeCustomer=useMemo(()=>toCoord(customer),[customer?.lat,customer?.lng,customer?.address]);
  const safeCenter=useMemo(()=>toCoord(center),[center?.lat,center?.lng]);
  const mapCenter=useMemo(()=>safeCenter||safeProvider||safeCustomer||DEFAULT_CENTER,[safeCenter,safeProvider,safeCustomer]);
  const direct=useMemo(()=>safeProvider&&safeCustomer?distKm(safeProvider.lat,safeProvider.lng,safeCustomer.lat,safeCustomer.lng):null,[safeProvider,safeCustomer]);
  const bounds=useMemo(()=>safeProvider&&safeCustomer?[[r4(safeProvider.lat),r4(safeProvider.lng)],[r4(safeCustomer.lat),r4(safeCustomer.lng)]]:[],[safeProvider,safeCustomer]);

  const handleRoute=useCallback((r)=>{ setRouteInfo(r); if(r) infoRef.current?.(r); },[]);
  useEffect(()=>{ if(userLoc&&mapRef.current) { try{ mapRef.current.flyTo([userLoc.lat,userLoc.lng],15); }catch{} } },[userLoc]);
  useEffect(()=>{ const h=()=>setFs(getFS()===outerRef.current); document.addEventListener("fullscreenchange",h); document.addEventListener("webkitfullscreenchange",h); return()=>{ document.removeEventListener("fullscreenchange",h); document.removeEventListener("webkitfullscreenchange",h); }; },[]);

  const toggleFS=useCallback(async()=>{ const el=outerRef.current; if(!el) return; try{ if(getFS()) await (document.exitFullscreen?document.exitFullscreen():document.webkitExitFullscreen?.()); else await (el.requestFullscreen?el.requestFullscreen():el.webkitRequestFullscreen?.()); }catch{} },[]);

  const focus=useCallback((p)=>{ if(p&&mapRef.current) { try{ mapRef.current.setView([p.lat,p.lng],16); }catch{} } },[]);

  if(!safeProvider||!safeCustomer) return <Paper className={className} sx={{p:3,textAlign:"center",height,width,display:"flex",alignItems:"center",justifyContent:"center"}}><Typography color="text.secondary">Location not available</Typography></Paper>;

  const modeConf=TRAVEL_MODES[curMode]||TRAVEL_MODES.driving; const TravelIcon=modeConf.icon; const tileConf=TILE_LAYERS[tile]||TILE_LAYERS.street; const etaVis=showEta&&showRouting; const approx=routeInfo?.isEstimate?"~":"";

  return (
    <Box ref={outerRef} className={className} sx={{ position:"relative", display:"flex", flexDirection:"column", height, width, borderRadius:3, overflow:"hidden", border:"1px solid #e5e7eb", bgcolor:"#fff", isolation:"isolate", "&:fullscreen":{height:"100vh",width:"100vw",borderRadius:0,border:"none"}, "&:-webkit-full-screen":{height:"100vh",width:"100vw",borderRadius:0,border:"none"} }}>
      <Box sx={{ position:"relative", flex:1, minHeight:0 }}>
        <MapContainer center={mapCenter} zoom={zoom} zoomControl={false} scrollWheelZoom={scrollWheelZoom} style={{height:"100%",width:"100%"}}>
          <MapBridge mapRef={mapRef} points={bounds} autoFit={autoFit} />
          <TileLayer key={tile} url={tileConf.url} attribution={tileConf.attr} subdomains={tileConf.subdomains} maxZoom={tileConf.maxZoom} />
          <Marker position={[safeProvider.lat,safeProvider.lng]} icon={PROVIDER_ICON}><Popup><Box sx={{p:1}}><Typography variant="subtitle2" fontWeight={700}>{safeProvider.name||"Provider"}</Typography><Typography variant="caption">{safeProvider.address||`${safeProvider.lat.toFixed(5)}, ${safeProvider.lng.toFixed(5)}`}</Typography></Box></Popup></Marker>
          <Marker position={[safeCustomer.lat,safeCustomer.lng]} icon={CUSTOMER_ICON}><Popup><Box sx={{p:1}}><Typography variant="subtitle2" fontWeight={700}>Customer</Typography><Typography variant="caption">{safeCustomer.address||`${safeCustomer.lat.toFixed(5)}, ${safeCustomer.lng.toFixed(5)}`}</Typography></Box></Popup></Marker>
          {userLoc&&<Marker position={[userLoc.lat,userLoc.lng]} icon={USER_ICON}><Popup>Your location</Popup></Marker>}
          {showRouting&&<RoutePath start={safeProvider} end={safeCustomer} mode={curMode} onRoute={handleRoute} />}
        </MapContainer>

        <Box sx={{ position:"absolute", top:12, left:12, zIndex:1000, display:"flex", flexDirection:"column", gap:1 }}>
          {showRouting&&<Paper sx={{p:0.5,display:"flex",gap:0.5,boxShadow:2}}>{Object.entries(TRAVEL_MODES).map(([m,cfg])=>{ const I=cfg.icon; return <MapButton key={m} title={cfg.label} flat active={curMode===m} activeColor={cfg.color} onClick={()=>setCurMode(m)}><I fontSize="small"/></MapButton>; })}</Paper>}
          <Paper sx={{p:0.5,display:"flex",gap:0.5,boxShadow:2}}>{Object.entries(TILE_LAYERS).map(([k,cfg])=>{ const I=cfg.icon; return <MapButton key={k} title={cfg.label} flat active={tile===k} onClick={()=>setTile(k)}><I fontSize="small"/></MapButton>; })}</Paper>
        </Box>

        <Box sx={{ position:"absolute", top:12, right:12, zIndex:1000, display:"flex", flexDirection:"column", gap:1 }}>
          <MapButton title="My location" onClick={getLoc} disabled={geoLoad}>{geoLoad?<CircularProgress size={20}/>:<MyLocation fontSize="small"/>}</MapButton>
          <MapButton title="Provider" onClick={()=>focus(safeProvider)}><Storefront fontSize="small"/></MapButton>
          <MapButton title="Customer" onClick={()=>focus(safeCustomer)}><Person fontSize="small"/></MapButton>
          {showControls&&<>
            <MapButton title="Zoom in" onClick={()=>mapRef.current?.zoomIn()}><ZoomIn fontSize="small"/></MapButton>
            <MapButton title="Zoom out" onClick={()=>mapRef.current?.zoomOut()}><ZoomOut fontSize="small"/></MapButton>
            <MapButton title={fs?"Exit fullscreen":"Fullscreen"} onClick={toggleFS}>{fs?<FullscreenExit fontSize="small"/>:<Fullscreen fontSize="small"/>}</MapButton>
          </>}
        </Box>

        {geoErr&&<Box sx={{ position:"absolute", top:12, left:"50%", transform:"translateX(-50%)", zIndex:1000, maxWidth:"70%" }}><Chip color="warning" label={geoErr} onDelete={clear} sx={{ height:"auto", "& .MuiChip-label":{whiteSpace:"normal",py:0.5} }} /></Box>}
      </Box>

      <AnimatePresence initial={false}>
        {etaVis&&(
          <motion.div key="eta" initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} transition={{duration:0.2}} style={{overflow:"hidden",flexShrink:0}}>
            <Box sx={{p:1.5,borderTop:"1px solid #e5e7eb",bgcolor:"#fff"}}>
              {routeInfo?(
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                  <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Chip icon={<TravelIcon/>} label={modeConf.label} size="small" color="primary" variant="outlined"/>
                    <Box><Typography variant="caption" color="text.secondary">Distance</Typography><Typography variant="body2" fontWeight={700}>{approx}{fmtDist(routeInfo.distance)}</Typography></Box>
                    <Box><Typography variant="caption" color="text.secondary">ETA</Typography><Typography variant="body2" fontWeight={700}>{approx}{fmtDur(routeInfo.duration)}</Typography></Box>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {routeInfo.isDirect&&<Chip label="Estimate" size="small" color="warning" variant="outlined"/>}
                    {direct&&<Chip label={`Direct: ${fmtDist(direct)}`} size="small" variant="outlined"/>}
                    <IconButton size="small" onClick={()=>setDrawer(true)}><InfoOutlined fontSize="small"/></IconButton>
                  </Stack>
                </Stack>
              ):(
                <Stack direction="row" spacing={1.5} alignItems="center"><CircularProgress size={18}/><Typography variant="body2" color="text.secondary">Calculating route…</Typography></Stack>
              )}
            </Box>
          </motion.div>
        )}
      </AnimatePresence>

      <Drawer anchor="bottom" open={drawer} onClose={()=>setDrawer(false)} ModalProps={{container: fs?outerRef.current:undefined}} PaperProps={{sx:{borderRadius:"16px 16px 0 0",maxHeight:"70vh"}}}>
        <Box sx={{p:3}}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}><Typography variant="h6" fontWeight={700}>Route details</Typography><IconButton onClick={()=>setDrawer(false)}><Close/></IconButton></Stack>
          <Divider sx={{mb:2}}/>
          <List dense>
            <ListItem><ListItemText primary={safeProvider.name||"Provider"} secondary={`${safeProvider.lat.toFixed(6)}, ${safeProvider.lng.toFixed(6)}`}/></ListItem>
            <ListItem><ListItemText primary="Customer" secondary={safeCustomer.address||`${safeCustomer.lat.toFixed(6)}, ${safeCustomer.lng.toFixed(6)}`}/></ListItem>
            {direct&&<ListItem><ListItemText primary="Direct" secondary={fmtDist(direct)}/></ListItem>}
            {routeInfo&&<><ListItem><ListItemText primary="Route" secondary={`${approx}${fmtDist(routeInfo.distance)}`}/></ListItem><ListItem><ListItemText primary="ETA" secondary={`${approx}${fmtDur(routeInfo.duration)}`}/></ListItem></>}
          </List>
        </Box>
      </Drawer>
    </Box>
  );
};

const coordShape={ lat:PropTypes.oneOfType([PropTypes.number,PropTypes.string]), lng:PropTypes.oneOfType([PropTypes.number,PropTypes.string]) };
BookingMap.propTypes={ provider:PropTypes.shape({...coordShape,name:PropTypes.string,address:PropTypes.string}), customer:PropTypes.shape({...coordShape,address:PropTypes.string}), height:PropTypes.oneOfType([PropTypes.string,PropTypes.number]), width:PropTypes.oneOfType([PropTypes.string,PropTypes.number]), showRouting:PropTypes.bool, showControls:PropTypes.bool, showEta:PropTypes.bool, travelMode:PropTypes.oneOf(["driving","walking","cycling"]), onRouteInfo:PropTypes.func, zoom:PropTypes.number, center:PropTypes.shape(coordShape), autoFit:PropTypes.bool, scrollWheelZoom:PropTypes.bool, className:PropTypes.string };

export default React.memo(BookingMap);