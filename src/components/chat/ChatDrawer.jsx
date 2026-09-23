// src/components/chat/ChatDrawer.jsx - v10.0 PRODUCTION FINAL - Uses WebSocketProvider
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Box, Typography, Stack, TextField, IconButton, Avatar, Drawer, Paper,
  CircularProgress, Divider, Tooltip, Badge, alpha, Fade, Alert, Snackbar,
  Button, Menu, MenuItem, ListItemIcon, ListItemText, Dialog, DialogTitle,
  DialogContent, DialogContentText, DialogActions
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  FaPaperPlane, FaTimes, FaCircle, FaCheck, FaCheckDouble, FaExclamationTriangle,
  FaUser, FaRegSmile, FaImage, FaPhone, FaVideo, FaEllipsisV, FaReply, FaCopy,
  FaTrash, FaRegClock, FaDownload
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";
import api from "../../api/api";
import { useAuth } from "../../contexts/AuthContext";
import { useWebSocket, useWebSocketSubscription } from "../../contexts/WebSocketProvider";

const ChatContainer = styled(Box)(() => ({
  height: "100%", display: "flex", flexDirection: "column", backgroundColor: "#f8fafc", position: "relative",
}));
const MessageBubble = styled(Paper)(({ isMe }) => ({
  padding: "10px 14px", maxWidth: "85%", wordBreak: "break-word", position: "relative",
  backgroundColor: isMe? "#6366f1" : "#ffffff", color: isMe? "#ffffff" : "#1e293b",
  borderRadius: isMe? "18px 18px 4px 18px" : "18px 18px 18px 4px",
  boxShadow: isMe? "0 4px 12px rgba(99, 102, 241, 0.2)" : "0 2px 8px rgba(0, 0, 0, 0.05)",
  border: isMe? "none" : "1px solid #e2e8f0",
}));
const TimeStamp = styled(Typography)(({ isMe }) => ({
  fontSize: "0.65rem", color: isMe? "rgba(255,255,255,0.7)" : "#94a3b8",
  marginTop: "4px", display: "flex", alignItems: "center", gap: "4px",
  justifyContent: isMe? "flex-end" : "flex-start",
}));
const StatusIndicator = styled(Box)(({ status }) => ({
  display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 6px",
  borderRadius: "12px", fontSize: "0.65rem",
  backgroundColor: status === 'online'? '#10b98120' : '#ef444420',
  color: status === 'online'? '#10b981' : '#ef4444',
}));

const EMOJIS = ['😀','😊','😂','❤','👍','🔥','🎉','🙏','😍','🥰','😎','🤔','😢','😡','💯','✨'];
const SimpleEmojiPicker = ({ onSelect, onClose }) => (
  <Paper sx={{ position:'absolute', bottom:'100%', right:0, mb:1, p:1.5, width:280, bgcolor:'#fff', borderRadius:2, boxShadow:'0 4px 12px rgba(0,0,0,0.15)', zIndex:1300, display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:0.5 }}>
    {EMOJIS.map(e=>(
      <IconButton key={e} size="small" onClick={()=>{onSelect(e); onClose();}}><Typography variant="h6">{e}</Typography></IconButton>
    ))}
  </Paper>
);

const ChatDrawer = ({ open, onClose, bookingId, currentUser: propCurrentUser, recipientName, recipientImage, recipientId, onCallStart }) => {
  const { user: authUser } = useAuth();
  const currentUser = propCurrentUser || authUser;
  const { isConnected, sendMessage, connectionStatus } = useWebSocket();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [replyTo, setReplyTo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [snackbar, setSnackbar] = useState({ open:false, message:'', severity:'info' });
  const [onlineStatus, setOnlineStatus] = useState('offline');
  const [lastSeen, setLastSeen] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [messageMenuAnchor, setMessageMenuAnchor] = useState(null);
  const [selectedMessageForMenu, setSelectedMessageForMenu] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const formatTime = useCallback((ts)=>{
    if(!ts) return '';
    const d=new Date(ts);
    if(isToday(d)) return format(d,'hh:mm a');
    if(isYesterday(d)) return `Yesterday ${format(d,'hh:mm a')}`;
    return format(d,'MMM dd, hh:mm a');
  },[]);

  const scrollToBottom = useCallback((b="smooth")=>{
    messagesEndRef.current?.scrollIntoView({ behavior:b });
  },[]);

  useEffect(()=>{ if(!loading) scrollToBottom(); },[messages, loading, scrollToBottom]);

  // ✅ REAL-TIME HANDLERS via WebSocketProvider
  const handleNewMessage = useCallback((data)=>{
    if(!data) return;
    if(data.senderId === currentUser?.id &&!data.id) return;
    setMessages(prev=>{
      const exists = prev.some(m=>m.id===data.id || (data.tempId && m.tempId===data.tempId));
      if(exists) return prev.map(m=> (m.id===data.id || m.tempId===data.tempId)? {...m,...data, status:'delivered'} : m);
      return [...prev, {...data, status:'delivered'}];
    });
  },[currentUser?.id]);

  const handleTyping = useCallback((data)=>{
    if(data.userId === currentUser?.id) return;
    setTypingUsers(p=>({...p, [data.userId]: data.typing}));
    if(data.typing) setTimeout(()=>setTypingUsers(p=>({...p, [data.userId]:false})),3000);
  },[currentUser?.id]);

  const handleRead = useCallback((data)=>{
    setMessages(prev=>prev.map(m=> m.id===data.messageId? {...m, read:true} : m));
  },[]);

  const handlePresence = useCallback((data)=>{
    setOnlineStatus(data.status); setLastSeen(data.lastSeen);
  },[]);

  // ✅ Subscriptions - auto cleanup by hook
  useWebSocketSubscription(open && bookingId? `/topic/chat/${bookingId}` : null, handleNewMessage);
  useWebSocketSubscription(open && bookingId? `/topic/typing/${bookingId}` : null, handleTyping);
  useWebSocketSubscription(open && bookingId? `/topic/read/${bookingId}` : null, handleRead);
  useWebSocketSubscription(open && recipientId? `/topic/presence/${recipientId}` : null, handlePresence);

  // Load history
  useEffect(()=>{
    if(!open ||!bookingId) return;
    const load = async()=>{
      setLoading(true);
      try{
        const res = await api.get(`/api/v1/bookings/${bookingId}/messages`, { params:{ page:0, size:20 } });
        const data = res.data?.data || res.data;
        const content = data?.content || data || [];
        setMessages(content.reverse()||[]); setHasMore(!(data?.last??true)); setPage(0);
        if(recipientId){
          try{
            const pres = await api.get(`/api/v1/users/${recipientId}/presence`);
            setOnlineStatus(pres.data?.status||'offline'); setLastSeen(pres.data?.lastSeen);
          }catch{}
        }
      }catch{ setSnackbar({open:true, message:'Failed to load chat', severity:'error'}); }
      finally{ setLoading(false); }
    };
    load();
    return ()=>{ setMessages([]); };
  },[open, bookingId, recipientId]);

  const showNotification = useCallback((msg, sev='info')=>setSnackbar({open:true, message:msg, severity:sev}),[]);

  const handleSend = useCallback(async()=>{
    if(!text.trim() || sending) return;
    if(!isConnected){ showNotification('Reconnecting...','warning'); return; }
    const content = text.trim(); setText(""); setSending(true);
    const tempId = `temp_${Date.now()}`;
    const msgData = { tempId, bookingId:String(bookingId), senderId:String(currentUser?.id), senderName:currentUser?.name||'User', content, timestamp:new Date().toISOString(), replyTo };
    setMessages(p=>[...p, {...msgData, status:'sending'}]);

    const ok = sendMessage(`/app/chat/${bookingId}`, msgData);
    if(!ok){
      try{
        const res = await api.post(`/api/v1/bookings/${bookingId}/messages`, { content, recipientId, replyTo: replyTo?.id||null });
        const sent = res.data?.data || res.data;
        setMessages(p=>p.map(m=> m.tempId===tempId? {...sent, status:'sent'} : m));
      }catch{
        setMessages(p=>p.map(m=> m.tempId===tempId? {...m, status:'error'} : m));
        showNotification('Failed to send','error');
      }
    }
    setSending(false); setReplyTo(null);
  },[text, sending, isConnected, bookingId, currentUser, replyTo, recipientId, sendMessage, showNotification]);

  const onTyping = useCallback(()=>{
    if(!isConnected) return;
    if(typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    sendMessage(`/app/typing/${bookingId}`, { userId: currentUser?.id, bookingId, typing:true });
    typingTimeoutRef.current = setTimeout(()=>sendMessage(`/app/typing/${bookingId}`, { userId: currentUser?.id, bookingId, typing:false }),2000);
  },[isConnected, bookingId, currentUser?.id, sendMessage]);

  const handleDelete = useCallback(async(id)=>{
    try{ await api.delete(`/api/v1/messages/${id}`); setMessages(p=>p.filter(m=>m.id!==id)); showNotification('Deleted','success'); }catch{ showNotification('Delete failed','error'); }
    setDeleteDialogOpen(false);
  },[showNotification]);

  const isTyping = useMemo(()=>Object.values(typingUsers).some(Boolean),[typingUsers]);

  return (
    <>
      <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx:{ width:{xs:"100%", sm:420}, borderRadius:{sm:"16px 0 0 16px"} } }}>
        <ChatContainer>
          <Paper elevation={0} sx={{ p:2, borderBottom:"1px solid #e2e8f0" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={2} alignItems="center">
                <Badge overlap="circular" badgeContent={<Box sx={{width:12,height:12,borderRadius:'50%',bgcolor:onlineStatus==='online'?'#10b981':'#94a3b8',border:'2px solid white'}}/>}>
                  <Avatar src={recipientImage} sx={{width:48,height:48,border:"2px solid #6366f1"}}>{!recipientImage && <FaUser/>}</Avatar>
                </Badge>
                <Box>
                  <Typography variant="subtitle1" fontWeight={800}>{recipientName||"Provider"}</Typography>
                  <StatusIndicator status={onlineStatus}><FaCircle size={6}/><Typography variant="caption">{onlineStatus==='online'?'Online': lastSeen? formatDistanceToNow(new Date(lastSeen),{addSuffix:true}) : 'Offline'}</Typography></StatusIndicator>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1}>
                <IconButton onClick={()=>onCallStart?.('audio')} sx={{bgcolor:'#f1f5f9'}}><FaPhone size={14} color="#6366f1"/></IconButton>
                <IconButton onClick={()=>onCallStart?.('video')} sx={{bgcolor:'#f1f5f9'}}><FaVideo size={14} color="#6366f1"/></IconButton>
                <IconButton onClick={onClose} sx={{bgcolor:'#f1f5f9'}}><FaTimes size={14}/></IconButton>
              </Stack>
            </Stack>
          </Paper>

          <Box ref={chatContainerRef} sx={{flex:1, overflowY:"auto", p:2, bgcolor:"#f8fafc"}}>
            {loading? (
              <Stack alignItems="center" justifyContent="center" sx={{height:'100%'}}><CircularProgress sx={{color:'#6366f1'}}/></Stack>
            ) : messages.length===0? (
              <Stack alignItems="center" justifyContent="center" sx={{height:'100%'}}><Typography variant="h6">Start a conversation</Typography></Stack>
            ) : (
              <Stack spacing={1}>
                {messages.map(msg=>{
                  const isMe = String(msg.senderId)===String(currentUser?.id);
                  return (
                    <Box key={msg.id||msg.tempId} sx={{alignSelf:isMe?'flex-end':'flex-start', maxWidth:'85%'}}>
                      <MessageBubble isMe={isMe}>
                        <Typography variant="body2" sx={{whiteSpace:'pre-wrap'}}>{msg.content}</Typography>
                        <TimeStamp isMe={isMe}>{formatTime(msg.timestamp)} {isMe && (msg.read?<FaCheckDouble size={10} color="#4ade80"/>:<FaCheck size={10}/>)}</TimeStamp>
                      </MessageBubble>
                    </Box>
                  );
                })}
              </Stack>
            )}
            {isTyping && <Box sx={{mt:1}}><Typography variant="caption">{recipientName} is typing...</Typography></Box>}
            <div ref={messagesEndRef}/>
          </Box>

          {replyTo && (
            <Paper sx={{p:1.5, bgcolor:'#f1f5f9', display:'flex', justifyContent:'space-between'}}>
              <Box><Typography variant="caption" color="primary">Replying to {replyTo.senderName}</Typography><Typography variant="body2" noWrap>{replyTo.content}</Typography></Box>
              <IconButton size="small" onClick={()=>setReplyTo(null)}><FaTimes size={12}/></IconButton>
            </Paper>
          )}

          <Paper elevation={3} sx={{p:2, borderTop:"1px solid #e2e8f0"}}>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton onClick={()=>fileInputRef.current?.click()}><FaImage size={18} color="#6366f1"/></IconButton>
              <IconButton onClick={()=>setShowEmojiPicker(!showEmojiPicker)}><FaRegSmile size={18} color="#6366f1"/></IconButton>
              <input type="file" ref={fileInputRef} style={{display:'none'}} accept="image/*"/>
              {showEmojiPicker && <SimpleEmojiPicker onSelect={(e)=>{setText(t=>t+e); setShowEmojiPicker(false);}} onClose={()=>setShowEmojiPicker(false)}/>}
              <TextField fullWidth size="small" placeholder={isConnected?"Type...":"Connecting..."} value={text} onChange={e=>{setText(e.target.value); onTyping();}} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault(); handleSend();}}} disabled={!isConnected} multiline maxRows={3} sx={{'&.MuiOutlinedInput-root':{borderRadius:3, bgcolor:'#f8fafc'}}}/>
              <IconButton onClick={handleSend} disabled={!text.trim()||!isConnected||sending} sx={{bgcolor:"#6366f1", color:"white", width:40,height:40,'&:hover':{bgcolor:"#4f46e5"}}}>{sending?<CircularProgress size={18} color="inherit"/>:<FaPaperPlane size={14}/>}</IconButton>
            </Stack>
            {!isConnected && <Typography variant="caption" color="warning.main" sx={{display:'block',textAlign:'center',mt:1}}>⚡ {connectionStatus} - Reconnecting...</Typography>}
          </Paper>
        </ChatContainer>
      </Drawer>

      <Dialog open={deleteDialogOpen} onClose={()=>setDeleteDialogOpen(false)}><DialogTitle>Delete?</DialogTitle><DialogContent><DialogContentText>Delete this message?</DialogContentText></DialogContent><DialogActions><Button onClick={()=>setDeleteDialogOpen(false)}>Cancel</Button><Button onClick={()=>messageToDelete&&handleDelete(messageToDelete.id)} color="error">Delete</Button></DialogActions></Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={()=>setSnackbar(s=>({...s,open:false}))}><Alert severity={snackbar.severity} variant="filled">{snackbar.message}</Alert></Snackbar>
    </>
  );
};

export default ChatDrawer;