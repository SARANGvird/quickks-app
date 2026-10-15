// src/components/admin/AdminDashboard.jsx - v12 PROD SENIOR FINAL
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { formatDistanceToNow, subDays, format } from "date-fns";
import api from "../../api/api";
import LoadingSpinner from "../LoadingSpinner";
import ErrorBoundary from "../ErrorBoundary";
import useAdminDashboardSocket from "../../hooks/useAdminDashboardSocket";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Box, Container, Grid, Stack, Paper, Typography, Button, IconButton, ButtonBase,
  TextField, InputAdornment, Switch, FormControlLabel, Avatar, Badge, Chip, Divider,
  Skeleton, Alert, LinearProgress, CircularProgress, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Select, FormControl, Drawer, Dialog, DialogTitle,
  DialogContent, DialogActions, Menu, Tooltip, useMediaQuery, useTheme, Radio, RadioGroup, MenuItem
} from '@mui/material';
import { styled, alpha, keyframes } from "@mui/material/styles";
import {
  FaUsers, FaClipboardList, FaRupeeSign, FaCog, FaChartBar, FaBolt, FaSync, FaShieldAlt,
  FaBell, FaSearch, FaCheckCircle, FaExclamationTriangle, FaArrowUp, FaArrowDown,
  FaChartLine, FaChartArea, FaPercent, FaFileExport, FaTimes, FaMoneyBillWave, FaUserCheck
} from "react-icons/fa";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

const float = keyframes`0%{transform:translateY(0)}50%{transform:translateY(-6px)}100%{transform:translateY(0)}`;
const pulseGlow = keyframes`0%{box-shadow:0 0 0 0 rgba(99,102,241,0.4)}70%{box-shadow:0 0 0 14px rgba(99,102,241,0)}100%{box-shadow:0 0 0 0 rgba(99,102,241,0)}`;
const COLORS = {
  primary: '#6366f1', success: '#10b981', warning: '#f59e0b', danger: '#ef4444', info: '#3b82f6',
  purple: '#8b5cf6', pink: '#ec4899',
  text: { primary: '#0f172a', secondary: '#475569', muted: '#64748b' },
  bg: { main: '#f8fafc', light: '#fff' }, border: '#e2e8f0', borderLight: '#f1f5f9',
  chart: { blue: '#6366f1', green: '#10b981', yellow: '#f59e0b', red: '#ef4444', purple: '#8b5cf6', pink: '#ec4899' }
};
const CHART_COLORS = Object.values(COLORS.chart);
const isProd = import.meta.env.PROD;
const logger = { error: (...a) => { if (!isProd) console.error(...a); } };

const GlassCard = styled(Paper)(({ theme }) => ({
  background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', border: `1px solid ${COLORS.border}`,
  borderRadius: 20, padding: 20, transition: 'all 0.25s', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  [theme.breakpoints.down('sm')]: { backdropFilter: 'none', background: '#fff', padding: 14, borderRadius: 14 }
}));
const GradientText = styled(Typography)({ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' });

const AnimatedNumber = React.memo(({ value }) => {
  const [display, setDisplay] = useState(0); const raf = useRef(0); const start = useRef(0);
  useEffect(() => {
    const s = start.current, e = value||0, t0 = performance.now(), dur=600;
    const tick = (now) => {
      const p = Math.min((now-t0)/dur,1), ease=1-Math.pow(1-p,3);
      setDisplay(s+(e-s)*ease);
      if(p<1) raf.current=requestAnimationFrame(tick); else start.current=e;
    };
    cancelAnimationFrame(raf.current); raf.current=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf.current);
  }, [value]);
  return <>{new Intl.NumberFormat('en-IN').format(Math.round(display))}</>;
});

const StatCard = React.memo(({ title, value, icon: Icon, trend, loading, prefix="", suffix="", color="primary", onClick, badge, subtitle }) => {
  const mainColor = COLORS[color]||COLORS.primary;
  return (
    <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} whileHover={onClick?{y:-3}:{}} onClick={onClick} style={{cursor:onClick?'pointer':'default', height:'100%'}}>
      <GlassCard>
        <Stack direction="row" justifyContent="space-between" mb={1}>
          <Box sx={{ p:1.2, borderRadius:2, bgcolor:alpha(mainColor,0.1), border:`1px solid ${alpha(mainColor,0.15)}` }}>{Icon&&<Icon size={18} color={mainColor}/>}</Box>
          {trend!=null&&!loading&&<Chip icon={trend>=0?<FaArrowUp size={8}/>:<FaArrowDown size={8}/>} label={`${trend>=0?'+':''}${trend.toFixed(1)}%`} size="small" sx={{ height:22, fontSize:10, bgcolor:alpha(trend>=0?COLORS.success:COLORS.danger,0.1), color:trend>=0?COLORS.success:COLORS.danger }}/>}
        </Stack>
        <Typography sx={{ color:COLORS.text.muted, fontSize:12, fontWeight:500 }}>{title} {badge&&<Chip label={badge} size="small" sx={{ height:18, fontSize:9, ml:1 }}/>}</Typography>
        {loading?<Skeleton width="60%" height={28}/>:<Typography variant="h5" sx={{ fontWeight:700 }}>{prefix}<AnimatedNumber value={value}/>{suffix} {subtitle&&<Typography component="span" variant="caption" color={COLORS.text.muted}>{subtitle}</Typography>}</Typography>}
      </GlassCard>
    </motion.div>
  );
});

const MetricChart = React.memo(({ data, type="area", height=280, loading, color=COLORS.chart.blue }) => {
  if(loading) return <Box sx={{display:'flex',justifyContent:'center',alignItems:'center',height}}><CircularProgress size={24}/></Box>;
  if(!data?.length) return <Box sx={{display:'flex',justifyContent:'center',alignItems:'center',height}}><Typography variant="caption" color={COLORS.text.muted}>No data</Typography></Box>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      {type==="area"?(
        <AreaChart data={data}><defs><linearGradient id={`g-${color}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={color} stopOpacity={0.25}/><stop offset="95%" stopColor={color} stopOpacity={0}/></linearGradient></defs>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.borderLight} vertical={false}/><XAxis dataKey="name" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/><RechartsTooltip/>
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#g-${color})`}/></AreaChart>
      ):(
        <BarChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/><RechartsTooltip/><Bar dataKey="value" fill={color} radius={[6,6,0,0]}/></BarChart>
      )}
    </ResponsiveContainer>
  );
});

// API - FIXED: no /api/v1 double prefix - api instance already has base
const dashApi = {
  stats: async () => (await api.get('/admin/dashboard/stats')).data,
  revenue: async (d=7) => (await api.get(`/admin/dashboard/revenue-trend?days=${d}`)).data,
  providers: async () => (await api.get('/admin/dashboard/provider-distribution')).data,
  activities: async (l=20) => (await api.get(`/admin/dashboard/recent-activities?limit=${l}`)).data,
  topProviders: async (l=5) => (await api.get(`/admin/dashboard/top-providers?limit=${l}`)).data,
  bookings: async (l=10) => (await api.get(`/admin/dashboard/recent-bookings?limit=${l}`)).data,
  serviceDemand: async () => (await api.get('/admin/dashboard/service-demand')).data,
};

export default function AdminDashboard() {
  const { loading: authLoading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate(); const isMobile = useMediaQuery(useTheme().breakpoints.down('sm'));
  const [searchQuery, setSearchQuery] = useState(''); const [selectedTab, setSelectedTab] = useState(0);
  const [exportDialog, setExportDialog] = useState(false); const [settingsDrawer, setSettingsDrawer] = useState(false);
  const [chartType, setChartType] = useState('area'); const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState(null); const [lastUpdateTime, setLastUpdateTime] = useState(new Date());
  const [roleCheckDone, setRoleCheckDone] = useState(false);
  const [stats, setStats] = useState(null); const [providerData, setProviderData] = useState([]); const [revenueTrend, setRevenueTrend] = useState([]);
  const [activities, setActivities] = useState([]); const [topProviders, setTopProviders] = useState([]); const [recentBookings, setRecentBookings] = useState([]);
  const [alerts, setAlerts] = useState([]); const [serviceDemand, setServiceDemand] = useState([]); const [readAlertIds, setReadAlertIds] = useState(()=>new Set());
  const [loading, setLoading] = useState({ stats:true, provider:true, revenue:true, activities:true, top:true, bookings:true, demand:true });
  const [anchorNotif, setAnchorNotif] = useState(null); const [anchorUser, setAnchorUser] = useState(null);

  const { connected, alerts: socketAlerts, lastUpdated, markAlertAsRead, markAllAlertsAsRead, reconnect } = useAdminDashboardSocket({
    enableRealTime:true, autoConnect:true,
    onStatsUpdate: useCallback((d)=>{ if(d?.dashboardStats) setStats(d.dashboardStats); if(d?.revenueTrend) setRevenueTrend(d.revenueTrend); if(d?.providerDistribution) setProviderData(d.providerDistribution); setLastUpdateTime(new Date()); }, []),
    onAlert: useCallback((a)=>{ setAlerts(p=>[a,...p].slice(0,50)); toast.info(a.message||a.title||'New alert', { position:'bottom-right' }); }, [])
  });

  const mountedRef = useRef(true); const timerRef = useRef(null); const fetchingRef = useRef(false); const initRef = useRef(false);
  useEffect(()=>{ mountedRef.current=true; return()=>{ mountedRef.current=false; if(timerRef.current) clearInterval(timerRef.current); }; }, []);

  useEffect(()=>{
    if(authLoading) return;
    if(!isAuthenticated){ navigate('/login', { state:{ from:'/admin/dashboard' } }); return; }
    const role = user?.role?.toUpperCase()||''; if(!['ADMIN','SUPER_ADMIN'].includes(role)){ toast.error(`Access Denied: ${role}. Admin only.`); navigate('/'); return; }
    setRoleCheckDone(true);
  }, [authLoading, isAuthenticated, user, navigate]);

  const handleErr = useCallback((e, ep)=>{ logger.error(ep, e); if(e.response?.status!==404 && mountedRef.current) toast.error(`${ep} failed`); return null; }, []);

  const fetchStats = useCallback(async()=>{ try{ setLoading(p=>({...p,stats:true})); const d=await dashApi.stats(); if(mountedRef.current&&d){ setStats(d); setLastUpdateTime(new Date()); } } catch(e){ handleErr(e,'stats'); } finally{ if(mountedRef.current) setLoading(p=>({...p,stats:false})); } }, [handleErr]);
  const fetchProviders = useCallback(async()=>{ try{ setLoading(p=>({...p,provider:true})); const d=await dashApi.providers(); if(mountedRef.current&&d) setProviderData(d.map(i=>({ name:i.name||'Unknown', value:i.value||0, color:i.color||CHART_COLORS[Math.floor(Math.random()*CHART_COLORS.length)] }))); } catch(e){ handleErr(e,'providers'); } finally{ if(mountedRef.current) setLoading(p=>({...p,provider:false})); } }, [handleErr]);
  const fetchRevenue = useCallback(async()=>{ try{ setLoading(p=>({...p,revenue:true})); const d=await dashApi.revenue(7); if(mountedRef.current){ const cd=(d||[]).map((it,i)=>({ name:it.name||format(subDays(new Date(),6-i),'EEE'), value:it.value||0 })); setRevenueTrend(cd.length?cd:Array.from({length:7},(_,i)=>({ name:format(subDays(new Date(),6-i),'EEE'), value:0 }))); } } catch(e){ handleErr(e,'revenue'); } finally{ if(mountedRef.current) setLoading(p=>({...p,revenue:false})); } }, [handleErr]);
  const fetchActivities = useCallback(async()=>{ try{ setLoading(p=>({...p,activities:true})); const d=await dashApi.activities(20); if(mountedRef.current) setActivities(d||[]); } catch(e){ handleErr(e,'activities'); } finally{ if(mountedRef.current) setLoading(p=>({...p,activities:false})); } }, [handleErr]);
  const fetchTop = useCallback(async()=>{ try{ setLoading(p=>({...p,top:true})); const d=await dashApi.topProviders(5); if(mountedRef.current) setTopProviders(d||[]); } catch(e){ handleErr(e,'top'); } finally{ if(mountedRef.current) setLoading(p=>({...p,top:false})); } }, [handleErr]);
  const fetchBookings = useCallback(async()=>{ try{ setLoading(p=>({...p,bookings:true})); const d=await dashApi.bookings(10); if(mountedRef.current) setRecentBookings(d||[]); } catch(e){ handleErr(e,'bookings'); } finally{ if(mountedRef.current) setLoading(p=>({...p,bookings:false})); } }, [handleErr]);
  const fetchDemand = useCallback(async()=>{ try{ setLoading(p=>({...p,demand:true})); const d=await dashApi.serviceDemand(); if(mountedRef.current) setServiceDemand(d||[]); } catch(e){ handleErr(e,'demand'); } finally{ if(mountedRef.current) setLoading(p=>({...p,demand:false})); } }, [handleErr]);

  const fetchAll = useCallback(async(showLoad=true)=>{
    if(!mountedRef.current||fetchingRef.current) return; fetchingRef.current=true;
    if(showLoad) setLoading({ stats:true, provider:true, revenue:true, activities:true, top:true, bookings:true, demand:true });
    setApiError(null);
    const res = await Promise.allSettled([fetchStats(), fetchProviders(), fetchRevenue(), fetchActivities(), fetchTop(), fetchBookings(), fetchDemand()]);
    if(res.filter(r=>r.status==='rejected').length===res.length) setApiError('Failed to load. Retry.');
    fetchingRef.current=false;
  }, [fetchStats, fetchProviders, fetchRevenue, fetchActivities, fetchTop, fetchBookings, fetchDemand]);

  useEffect(()=>{ if(!roleCheckDone) return; if(!initRef.current){ fetchAll(true); initRef.current=true; } }, [fetchAll, roleCheckDone]);
  useEffect(()=>{
    if(timerRef.current) clearInterval(timerRef.current);
    if(roleCheckDone &&!connected && autoRefresh) timerRef.current=setInterval(()=>{ if(mountedRef.current&&!fetchingRef.current) fetchAll(false); }, refreshInterval*1000);
    return()=>{ if(timerRef.current) clearInterval(timerRef.current); };
  }, [connected, autoRefresh, refreshInterval, roleCheckDone, fetchAll]);
  useEffect(()=>{ if(!socketAlerts?.length) return; setAlerts(prev=>{ const ids=new Set(prev.map(a=>a.id).filter(Boolean)); const fresh=socketAlerts.filter(a=>!a.id||!ids.has(a.id)); return fresh.length?[...fresh,...prev].slice(0,50):prev; }); }, [socketAlerts]);

  const handleRefresh = useCallback(async()=>{ if(fetchingRef.current) return; setRefreshing(true); try{ if(connected) reconnect?.(); await fetchAll(true); toast.success('Refreshed'); } catch{ toast.error('Refresh failed'); } finally{ setRefreshing(false); } }, [fetchAll, connected, reconnect]);

  const safeStats = useMemo(()=>{ const d=stats||{}; return { totalUsers:d.totalUsers||0, activeUsers:d.activeUsers||0, newUsersToday:d.newUsersToday||0, userGrowthRate:d.userGrowthRate||0, totalProviders:d.totalProviders||0, pendingProviders:d.pendingProviders||0, verifiedProviders:d.verifiedProviders||0, totalBookings:d.totalBookings||0, activeBookings:d.activeBookings||0, completedBookings:d.completedBookings||0, bookingGrowthRate:d.bookingGrowthRate||0, totalRevenue:d.totalRevenue||0, revenueToday:d.revenueToday||0, revenueGrowthRate:d.revenueGrowthRate||0, totalComplaints:d.totalComplaints||0 }; }, [stats]);
  const filteredBookings = useMemo(()=>{ const q=searchQuery.trim().toLowerCase(); if(!q) return recentBookings; return recentBookings.filter(b=>[b.customerName,b.serviceType,String(b.id)].some(v=>String(v||'').toLowerCase().includes(q))); }, [recentBookings, searchQuery]);
  const unreadCount = useMemo(()=>alerts.filter(a=>!a.id||!readAlertIds.has(a.id)).length, [alerts, readAlertIds]);

  if(authLoading||!roleCheckDone) return <Box sx={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh'}}><LoadingSpinner size="large" text="Loading admin..." /></Box>;

  return (
    <ErrorBoundary>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Box sx={{ minHeight:"100vh", bgcolor:COLORS.bg.main }}>
          {refreshing&&<LinearProgress sx={{ position:'fixed', top:0, left:0, right:0, zIndex:9999, height:3 }} />}
          <Container maxWidth="xl" sx={{ py:2 }}>
            <GlassCard sx={{ mb:2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                <Stack direction="row" spacing={1.5} alignItems="center"><Avatar sx={{ background:`linear-gradient(135deg, #6366f1, #8b5cf6)`, width:40, height:40 }}><FaBolt size={16} color="white"/></Avatar><Box><Typography variant="h6" sx={{ fontWeight:800, fontSize:'1.1rem' }}><GradientText>Quickks Admin</GradientText></Typography><Typography variant="caption" color={COLORS.text.muted}>{lastUpdated?`Updated ${formatDistanceToNow(new Date(lastUpdated),{addSuffix:true})}`:`Updated ${formatDistanceToNow(lastUpdateTime,{addSuffix:true})}`} • {connected?'LIVE':'POLLING'}</Typography></Box></Stack>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <TextField size="small" placeholder="Search..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} sx={{ minWidth:isMobile?110:180 }} InputProps={{ startAdornment:<InputAdornment position="start"><FaSearch size={12}/></InputAdornment> }}/>
                  <Tooltip title="Refresh"><IconButton size="small" onClick={handleRefresh}><FaSync size={14}/></IconButton></Tooltip>
                  <IconButton size="small" onClick={e=>setAnchorNotif(e.currentTarget)}><Badge badgeContent={unreadCount} color="error"><FaBell size={14}/></Badge></IconButton>
                  <IconButton size="small" onClick={()=>setSettingsDrawer(true)}><FaCog size={14}/></IconButton>
                  <IconButton size="small" onClick={()=>setExportDialog(true)}><FaFileExport size={14}/></IconButton>
                  <Avatar sx={{ width:28, height:28, bgcolor:COLORS.primary, fontSize:12, fontWeight:700, cursor:'pointer' }} onClick={e=>setAnchorUser(e.currentTarget)}>{user?.fullName?.[0]||'A'}</Avatar>
                </Stack>
              </Stack>
            </GlassCard>

            <Paper sx={{ p:1.2, mb:2, bgcolor:alpha(connected?COLORS.success:COLORS.warning,0.06), borderRadius:2, border:`1px solid ${alpha(connected?COLORS.success:COLORS.warning,0.12)}` }}>
              <Stack direction="row" justifyContent="space-between"><Typography variant="caption" color={COLORS.text.secondary}>{connected?'✅ Realtime active':`🔄 Auto-refresh ${refreshInterval}s`}</Typography><Chip label={connected?'LIVE':'POLLING'} size="small" sx={{ height:20, fontSize:9, fontWeight:700 }}/></Stack>
            </Paper>

            {apiError&&<Alert severity="error" sx={{ mb:2, borderRadius:2 }} action={<Button size="small" onClick={()=>fetchAll(true)}>Retry</Button>}>{apiError}</Alert>}

            <Grid container spacing={2} sx={{ mb:2 }}>
              <Grid item xs={12} sm={6} md={3}><StatCard title="Total Users" value={safeStats.totalUsers} icon={FaUsers} trend={safeStats.userGrowthRate} loading={loading.stats} color="primary" onClick={()=>navigate('/admin/users')} badge={safeStats.newUsersToday?`+${safeStats.newUsersToday}`:null} subtitle={`${safeStats.activeUsers} active`}/></Grid>
              <Grid item xs={12} sm={6} md={3}><StatCard title="Providers" value={safeStats.totalProviders} icon={FaShieldAlt} loading={loading.provider} color="success" onClick={()=>navigate('/admin/providers')} badge={safeStats.pendingProviders?`${safeStats.pendingProviders} pending`:null}/></Grid>
              <Grid item xs={12} sm={6} md={3}><StatCard title="Bookings" value={safeStats.totalBookings} icon={FaClipboardList} trend={safeStats.bookingGrowthRate} loading={loading.bookings} color="warning" onClick={()=>navigate('/admin/bookings')} badge={safeStats.activeBookings?`${safeStats.activeBookings} active`:null}/></Grid>
              <Grid item xs={12} sm={6} md={3}><StatCard title="Revenue" value={safeStats.totalRevenue} prefix="₹" icon={FaRupeeSign} trend={safeStats.revenueGrowthRate} loading={loading.revenue} color="info"/></Grid>
            </Grid>

            <Grid container spacing={2} sx={{ mb:2 }}>
              <Grid item xs={12} lg={8}><GlassCard><Stack direction="row" justifyContent="space-between" mb={2}><Box><Typography variant="subtitle2" fontWeight={700}>Revenue - 7 Days</Typography><Typography variant="caption" color={COLORS.text.muted}>Trend</Typography></Box><Stack direction="row" spacing={0.5}><IconButton size="small" onClick={()=>setChartType('area')}><FaChartArea size={12}/></IconButton><IconButton size="small" onClick={()=>setChartType('bar')}><FaChartBar size={12}/></IconButton></Stack></Stack><Box sx={{ height:280 }}><MetricChart data={revenueTrend} type={chartType} height={280} loading={loading.revenue} color={COLORS.chart.blue}/></Box></GlassCard></Grid>
              <Grid item xs={12} lg={4}><GlassCard sx={{ height:'100%' }}><Typography variant="subtitle2" fontWeight={700} gutterBottom>Provider Distribution</Typography><Box sx={{ height:240 }}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={providerData.filter(d=>d.value>0)} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value">{providerData.map((e,i)=><Cell key={i} fill={e.color||CHART_COLORS[i%CHART_COLORS.length]}/>)}</Pie><RechartsTooltip/></PieChart></ResponsiveContainer></Box></GlassCard></Grid>
            </Grid>

            <GlassCard sx={{ mb:2 }}><Stack direction="row" justifyContent="space-between" mb={2}><Typography variant="subtitle2" fontWeight={700}>Recent Bookings</Typography><Button size="small" variant="outlined" onClick={()=>navigate('/admin/bookings')} sx={{ textTransform:'none', fontSize:11 }}>View All</Button></Stack>
              {filteredBookings.length?<TableContainer><Table size="small"><TableHead><TableRow><TableCell sx={{fontWeight:600,fontSize:11}}>ID</TableCell><TableCell sx={{fontWeight:600,fontSize:11}}>Customer</TableCell><TableCell sx={{fontWeight:600,fontSize:11}}>Service</TableCell><TableCell sx={{fontWeight:600,fontSize:11}}>Amount</TableCell><TableCell sx={{fontWeight:600,fontSize:11}}>Status</TableCell></TableRow></TableHead><TableBody>{filteredBookings.slice(0,6).map((b,i)=><TableRow key={i} hover onClick={()=>navigate(`/admin/bookings/${b.id||b.bookingId}`)} sx={{cursor:'pointer'}}><TableCell sx={{fontSize:11}}>#{b.id||b.bookingId}</TableCell><TableCell sx={{fontSize:11}}>{b.customerName||'Unknown'}</TableCell><TableCell sx={{fontSize:11}}>{b.serviceType||b.service}</TableCell><TableCell sx={{fontWeight:600,fontSize:11}}>₹{b.totalAmount||b.amount||0}</TableCell><TableCell><Chip label={b.status||'PENDING'} size="small" sx={{height:20,fontSize:9}}/></TableCell></TableRow>)}</TableBody></Table></TableContainer>:<Typography variant="caption" color={COLORS.text.muted} align="center" sx={{py:3,display:'block'}}>No bookings</Typography>}
            </GlassCard>

            <Box sx={{ mt:4, textAlign:'center' }}><Typography variant="caption" color={COLORS.text.muted}>© {new Date().getFullYear()} Quickks Admin v12 • {connected?'🟢 Live':'⚪ Offline'}</Typography></Box>
          </Container>

          <Menu anchorEl={anchorNotif} open={Boolean(anchorNotif)} onClose={()=>setAnchorNotif(null)} PaperProps={{ sx:{ width:360, maxHeight:400, borderRadius:2 } }}>
            <Box sx={{ p:1.5, borderBottom:`1px solid ${COLORS.border}`, display:'flex', justifyContent:'space-between' }}><Typography variant="caption" fontWeight={700}>Notifications ({unreadCount})</Typography>{alerts.length>0&&<Button size="small" onClick={()=>{ setReadAlertIds(new Set(alerts.map((a,i)=>a.id??`idx-${i}`))); markAllAlertsAsRead?.(); }} sx={{fontSize:10}}>Mark read</Button>}</Box>
            <Box sx={{ maxHeight:320, overflowY:'auto' }}>{alerts.length?alerts.slice(0,10).map((al,idx)=>{ const id=al.id??`idx-${idx}`; const read=readAlertIds.has(id); return <MenuItem key={id} sx={{ opacity:read?0.6:1 }} onClick={()=>{ setReadAlertIds(p=>new Set(p).add(id)); markAlertAsRead?.(al.id); }}><Box><Typography variant="caption" fontWeight={600}>{al.title||al.message}</Typography><Typography variant="caption" sx={{display:'block',color:COLORS.text.muted,fontSize:9}}>{al.timestamp?formatDistanceToNow(new Date(al.timestamp),{addSuffix:true}):'Just now'}</Typography></Box></MenuItem>; }):<Box sx={{p:3,textAlign:'center'}}><Typography variant="caption" color={COLORS.text.muted}>No notifications</Typography></Box>}</Box>
          </Menu>

          <Menu anchorEl={anchorUser} open={Boolean(anchorUser)} onClose={()=>setAnchorUser(null)}><MenuItem onClick={()=>{ setAnchorUser(null); navigate('/profile'); }}><FaUserCheck style={{marginRight:8}}/>Profile</MenuItem><MenuItem onClick={()=>{ setAnchorUser(null); setSettingsDrawer(true); }}><FaCog style={{marginRight:8}}/>Settings</MenuItem></Menu>

          <Drawer anchor="right" open={settingsDrawer} onClose={()=>setSettingsDrawer(false)} PaperProps={{ sx:{ width:320, p:2.5 } }}>
            <Stack direction="row" justifyContent="space-between" mb={2}><Typography variant="subtitle2" fontWeight={700}>Settings</Typography><IconButton size="small" onClick={()=>setSettingsDrawer(false)}><FaTimes size={14}/></IconButton></Stack>
            <FormControlLabel control={<Switch checked={autoRefresh} onChange={e=>setAutoRefresh(e.target.checked)} size="small"/>} label={<Typography variant="caption">Auto-refresh when WS off</Typography>}/>
          </Drawer>

          <Dialog open={exportDialog} onClose={()=>setExportDialog(false)}><DialogTitle sx={{fontSize:14,fontWeight:700}}>Export</DialogTitle><DialogContent><Typography variant="caption">Export dashboard data as CSV/Excel</Typography></DialogContent><DialogActions><Button size="small" onClick={()=>setExportDialog(false)}>Cancel</Button><Button size="small" variant="contained" onClick={()=>{ toast.success('Export queued'); setExportDialog(false); }}>Export</Button></DialogActions></Dialog>

          <ToastContainer position="bottom-right" autoClose={3000} />
        </Box>
      </LocalizationProvider>
    </ErrorBoundary>
  );
}