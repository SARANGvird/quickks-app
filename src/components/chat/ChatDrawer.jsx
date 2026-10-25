import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Box, Typography, Stack, TextField, IconButton, Avatar, Drawer, Paper,
  CircularProgress, Tooltip, Badge, Snackbar, Alert, Dialog, DialogTitle,
  DialogContent, DialogContentText, DialogActions, Button
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  FaPaperPlane, FaTimes, FaCircle, FaCheck, FaCheckDouble,
  FaUser, FaRegSmile, FaImage, FaPhone, FaVideo, FaReply, FaTrash
} from "react-icons/fa";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";
import api from "../../api/api";
import { useAuth } from "../../contexts/AuthContext";
import { useWebSocket, useWebSocketSubscription } from "../../contexts/WebSocketProvider";

const ChatContainer = styled(Box)({
  height: "100%",
  display: "flex",
  flexDirection: "column",
  backgroundColor: "#f8fafc",
  position: "relative",
});

const MessageBubble = styled(Paper, { shouldForwardProp: (p) => p !== "isMe" })(({ isMe }) => ({
  padding: "10px 14px",
  maxWidth: "78%",
  wordBreak: "break-word",
  whiteSpace: "pre-wrap",
  backgroundColor: isMe ? "#6366f1" : "#ffffff",
  color: isMe ? "#ffffff" : "#1e293b",
  borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
  boxShadow: isMe ? "0 4px 12px rgba(99,102,241,0.25)" : "0 2px 8px rgba(0,0,0,0.06)",
  border: isMe ? "none" : "1px solid #e2e8f0",
}));

const TimeStamp = styled(Typography, { shouldForwardProp: (p) => p !== "isMe" })(({ isMe }) => ({
  fontSize: "0.65rem",
  color: isMe ? "rgba(255,255,255,0.75)" : "#94a3b8",
  marginTop: "5px",
  display: "flex",
  alignItems: "center",
  gap: "4px",
  justifyContent: isMe ? "flex-end" : "flex-start",
}));

const StatusIndicator = styled(Box, { shouldForwardProp: (p) => p !== "status" })(({ status }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "2px 8px",
  borderRadius: "12px",
  fontSize: "0.7rem",
  backgroundColor: status === "online" ? "#10b98118" : "#64748b18",
  color: status === "online" ? "#059669" : "#64748b",
  fontWeight: 600,
}));

const EMOJIS = ["😀","😊","😂","❤️","👍","🔥","🎉","🙏","😍","🥰","😎","🤔","😢","💯","✨","🙌"];

const normalizeMessage = (raw) => {
  if (!raw) return null;
  return {
    id: raw.id || raw.messageId || raw._id,
    tempId: raw.tempId || null,
    bookingId: String(raw.bookingId || raw.booking_id || ""),
    senderId: String(raw.senderId || raw.sender_id || raw.sender?.id || ""),
    receiverId: String(raw.receiverId || raw.receiver_id || raw.recipientId || ""),
    senderName: raw.senderName || raw.sender?.name || raw.name || "User",
    content: raw.content || raw.message || raw.text || "",
    imageUrl: raw.imageUrl || raw.image_url || null,
    timestamp: raw.timestamp || raw.createdAt || raw.created_at || raw.sentAt || new Date().toISOString(),
    read: Boolean(raw.read || raw.readAt),
    replyTo: raw.replyTo || raw.reply_to || null,
    status: raw.status || "delivered",
  };
};

const SimpleEmojiPicker = ({ onSelect, onClose }) => (
  <Paper sx={{ position: "absolute", bottom: "100%", right: 0, mb: 1, p: 1.2, width: 268, borderRadius: 2.5, boxShadow: "0 12px 32px rgba(0,0,0,0.16)", zIndex: 1300, display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: 0.3 }}>
    {EMOJIS.map((e) => (
      <IconButton key={e} size="small" onClick={() => { onSelect(e); onClose(); }} sx={{ fontSize: 20 }}>{e}</IconButton>
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
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const [onlineStatus, setOnlineStatus] = useState("offline");
  const [lastSeen, setLastSeen] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isAtBottomRef = useRef(true);

  const currentUserId = useMemo(() => String(currentUser?.id || currentUser?.userId || ""), [currentUser]);

  const formatTime = useCallback((ts) => {
    if (!ts) return "";
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return "";
      if (isToday(d)) return format(d, "hh:mm a");
      if (isYesterday(d)) return `Yesterday ${format(d, "hh:mm a")}`;
      return format(d, "MMM dd, hh:mm a");
    } catch { return ""; }
  }, []);

  const scrollToBottom = useCallback((behavior = "smooth") => {
    if (isAtBottomRef.current) messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => { if (!loading && isAtBottomRef.current) scrollToBottom("smooth"); }, [messages, loading, scrollToBottom]);

  const handleNewMessage = useCallback((payload) => {
    const msg = normalizeMessage(payload);
    if (!msg) return;
    if (String(msg.bookingId) !== String(bookingId)) return;
    if (msg.senderId === currentUserId && msg.tempId) {
      setMessages((prev) => prev.map((m) => (m.tempId && m.tempId === msg.tempId) ? { ...m, ...msg, status: "delivered" } : m));
      return;
    }
    setMessages((prev) => {
      if (prev.some((m) => m.id && msg.id && String(m.id) === String(msg.id))) return prev;
      if (msg.tempId && prev.some((m) => m.tempId === msg.tempId)) {
        return prev.map((m) => m.tempId === msg.tempId ? { ...m, ...msg } : m);
      }
      return [...prev, msg];
    });
    if (msg.receiverId === currentUserId || String(msg.receiverId) === "") {
      try { sendMessage(`/app/read/${bookingId}`, { messageId: msg.id, bookingId, userId: currentUserId }); } catch {}
    }
  }, [bookingId, currentUserId, sendMessage]);

  const handleTyping = useCallback((data) => {
    if (!data || String(data.userId) === currentUserId) return;
    if (String(data.bookingId) !== String(bookingId)) return;
    setTypingUsers((p) => ({ ...p, [data.userId]: Boolean(data.typing) }));
    if (data.typing) {
      setTimeout(() => setTypingUsers((p) => ({ ...p, [data.userId]: false })), 3500);
    }
  }, [bookingId, currentUserId]);

  const handleRead = useCallback((data) => {
    if (!data?.messageId) return;
    setMessages((prev) => prev.map((m) => String(m.id) === String(data.messageId) ? { ...m, read: true } : m));
  }, []);

  const handlePresence = useCallback((data) => {
    if (!data) return;
    if (data.userId && String(data.userId) !== String(recipientId)) return;
    setOnlineStatus(data.status || (data.online ? "online" : "offline"));
    setLastSeen(data.lastSeen || data.last_seen || null);
  }, [recipientId]);

  useWebSocketSubscription(open && bookingId ? `/topic/chat/${bookingId}` : null, handleNewMessage);
  useWebSocketSubscription(open && bookingId ? `/topic/typing/${bookingId}` : null, handleTyping);
  useWebSocketSubscription(open && bookingId ? `/topic/read/${bookingId}` : null, handleRead);
  useWebSocketSubscription(open && recipientId ? `/topic/presence/${recipientId}` : null, handlePresence);

  const loadMessages = useCallback(async (pageNum = 0, append = false) => {
    if (!bookingId) return;
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const res = await api.get(`/bookings/${bookingId}/messages`, { params: { page: pageNum, size: 30 } });
      const wrapper = res.data?.data || res.data;
      const rawList = wrapper?.content || wrapper?.messages || wrapper || [];
      const normalized = rawList.map(normalizeMessage).filter(Boolean).reverse();
      const last = wrapper?.last ?? (rawList.length < 30);
      if (append) {
        setMessages((prev) => [...normalized, ...prev]);
      } else {
        setMessages(normalized);
        setTimeout(() => scrollToBottom("auto"), 100);
      }
      setHasMore(!last);
      setPage(pageNum);
    } catch {
      if (!append) setSnackbar({ open: true, message: "Failed to load conversation", severity: "error" });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [bookingId, scrollToBottom]);

  useEffect(() => {
    if (!open || !bookingId) return;
    loadMessages(0, false);
    if (recipientId) {
      api.get(`/users/${recipientId}/presence`).then((r) => {
        const d = r.data?.data || r.data;
        setOnlineStatus(d?.status || (d?.online ? "online" : "offline"));
        setLastSeen(d?.lastSeen || null);
      }).catch(() => {});
    }
    return () => {
      setMessages([]);
      setHasMore(false);
      setPage(0);
      setTypingUsers({});
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [open, bookingId, recipientId, loadMessages]);

  const handleScroll = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    isAtBottomRef.current = nearBottom;
    if (el.scrollTop < 80 && hasMore && !loadingMore && !loading) {
      loadMessages(page + 1, true);
    }
  }, [hasMore, loadingMore, loading, page, loadMessages]);

  const handleSend = useCallback(async () => {
    const content = text.trim();
    if (!content || sending || !bookingId) return;
    if (!isConnected) {
      setSnackbar({ open: true, message: "Reconnecting, please wait...", severity: "warning" });
      return;
    }
    setText("");
    setSending(true);
    const tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
    const optimistic = {
      tempId,
      id: tempId,
      bookingId: String(bookingId),
      senderId: currentUserId,
      receiverId: String(recipientId || ""),
      senderName: currentUser?.name || "You",
      content,
      timestamp: new Date().toISOString(),
      read: false,
      replyTo,
      status: "sending",
    };
    setMessages((p) => [...p, optimistic]);
    isAtBottomRef.current = true;
    setTimeout(() => scrollToBottom("smooth"), 20);

    const payload = {
      bookingId: String(bookingId),
      senderId: currentUserId,
      receiverId: String(recipientId || ""),
      content,
      tempId,
      replyToId: replyTo?.id || null,
    };

    const sentViaSocket = sendMessage(`/app/chat/${bookingId}`, payload);
    if (!sentViaSocket) {
      try {
        const res = await api.post(`/bookings/${bookingId}/messages`, {
          content,
          recipientId: recipientId ? String(recipientId) : undefined,
          replyToId: replyTo?.id || undefined,
        });
        const saved = normalizeMessage(res.data?.data || res.data);
        setMessages((p) => p.map((m) => m.tempId === tempId ? { ...saved, status: "sent" } : m));
      } catch (err) {
        setMessages((p) => p.map((m) => m.tempId === tempId ? { ...m, status: "failed" } : m));
        setSnackbar({ open: true, message: err?.response?.data?.message || "Failed to send", severity: "error" });
        setText(content);
      }
    }
    setSending(false);
    setReplyTo(null);
  }, [text, sending, bookingId, isConnected, currentUserId, recipientId, currentUser, replyTo, sendMessage, scrollToBottom]);

  const onTyping = useCallback(() => {
    if (!isConnected || !bookingId) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    sendMessage(`/app/typing/${bookingId}`, { userId: currentUserId, bookingId: String(bookingId), typing: true });
    typingTimeoutRef.current = setTimeout(() => {
      sendMessage(`/app/typing/${bookingId}`, { userId: currentUserId, bookingId: String(bookingId), typing: false });
    }, 1800);
  }, [isConnected, bookingId, currentUserId, sendMessage]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!messageToDelete?.id) return;
    try {
      await api.delete(`/messages/${messageToDelete.id}`);
      setMessages((p) => p.filter((m) => String(m.id) !== String(messageToDelete.id)));
      setSnackbar({ open: true, message: "Message deleted", severity: "success" });
    } catch {
      setSnackbar({ open: true, message: "Delete failed", severity: "error" });
    } finally {
      setDeleteDialogOpen(false);
      setMessageToDelete(null);
    }
  }, [messageToDelete]);

  const isTyping = useMemo(() => Object.values(typingUsers).some(Boolean), [typingUsers]);

  return (
    <>
      <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: "100%", sm: 440 }, borderRadius: { sm: "20px 0 0 20px" }, overflow: "hidden" } }}>
        <ChatContainer>
          <Paper elevation={0} sx={{ p: 2, borderBottom: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={1.8} alignItems="center">
                <Badge overlap="circular" anchorOrigin={{ vertical: "bottom", horizontal: "right" }} badgeContent={<Box sx={{ width: 13, height: 13, borderRadius: "50%", bgcolor: onlineStatus === "online" ? "#10b981" : "#94a3b8", border: "2.5px solid white" }} />}>
                  <Avatar src={recipientImage} sx={{ width: 46, height: 46, bgcolor: "#6366f1", fontWeight: 700 }}>{!recipientImage && (recipientName?.[0] || <FaUser />)}</Avatar>
                </Badge>
                <Box>
                  <Typography variant="subtitle1" fontWeight={800} lineHeight={1.1}>{recipientName || "Chat"}</Typography>
                  <Stack direction="row" spacing={0.8} alignItems="center" mt={0.4}>
                    <StatusIndicator status={onlineStatus}><FaCircle size={6} />{onlineStatus === "online" ? "Online" : lastSeen ? formatDistanceToNow(new Date(lastSeen), { addSuffix: true }) : "Offline"}</StatusIndicator>
                    <Typography variant="caption" sx={{ color: isConnected ? "#10b981" : "#f59e0b", fontWeight: 700 }}>{isConnected ? "• Live" : `• ${connectionStatus}`}</Typography>
                  </Stack>
                </Box>
              </Stack>
              <Stack direction="row" spacing={0.6}>
                <Tooltip title="Voice call"><IconButton onClick={() => onCallStart?.("audio")} sx={{ bgcolor: "#f1f5f9", width: 38, height: 38 }}><FaPhone size={13} color="#6366f1" /></IconButton></Tooltip>
                <Tooltip title="Video call"><IconButton onClick={() => onCallStart?.("video")} sx={{ bgcolor: "#f1f5f9", width: 38, height: 38 }}><FaVideo size={14} color="#6366f1" /></IconButton></Tooltip>
                <IconButton onClick={onClose} sx={{ bgcolor: "#f1f5f9", width: 38, height: 38 }}><FaTimes size={14} /></IconButton>
              </Stack>
            </Stack>
          </Paper>

          <Box ref={chatContainerRef} onScroll={handleScroll} sx={{ flex: 1, overflowY: "auto", p: 2, display: "flex", flexDirection: "column", gap: 1.2 }}>
            {loadingMore && <Stack alignItems="center" py={1}><CircularProgress size={18} /></Stack>}
            {loading ? (
              <Stack alignItems="center" justifyContent="center" sx={{ height: "100%", gap: 1.5 }}><CircularProgress sx={{ color: "#6366f1" }} /><Typography variant="body2" color="text.secondary">Loading conversation...</Typography></Stack>
            ) : messages.length === 0 ? (
              <Stack alignItems="center" justifyContent="center" sx={{ height: "100%", gap: 1 }}><Box sx={{ width: 72, height: 72, borderRadius: "50%", bgcolor: "#6366f108", display: "grid", placeItems: "center" }}><FaUser size={28} color="#6366f1" /></Box><Typography variant="h6" fontWeight={800}>No messages yet</Typography><Typography variant="body2" color="text.secondary">Say hi to {recipientName || "start chatting"}</Typography></Stack>
            ) : (
              messages.map((msg) => {
                const isMe = String(msg.senderId) === currentUserId;
                const isFailed = msg.status === "failed";
                return (
                  <Box key={msg.id || msg.tempId} sx={{ alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "100%", width: "auto", display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", group: "message" }}>
                    {msg.replyTo && (
                      <Paper sx={{ mb: 0.5, px: 1.2, py: 0.6, bgcolor: "#f1f5f9", borderLeft: "3px solid #6366f1", maxWidth: "85%" }}>
                        <Typography variant="caption" fontWeight={700} color="#6366f1">{msg.replyTo.senderName}</Typography>
                        <Typography variant="caption" display="block" noWrap sx={{ maxWidth: 200 }}>{msg.replyTo.content}</Typography>
                      </Paper>
                    )}
                    <Stack direction="row" spacing={0.6} alignItems="flex-end" sx={{ maxWidth: "100%" }}>
                      <MessageBubble isMe={isMe} elevation={0} sx={{ opacity: isFailed ? 0.7 : 1 }}>
                        {msg.imageUrl && <Box component="img" src={msg.imageUrl} sx={{ maxWidth: 220, borderRadius: 2, mb: msg.content ? 1 : 0, display: "block" }} />}
                        <Typography variant="body2" sx={{ lineHeight: 1.45, wordBreak: "break-word" }}>{msg.content}</Typography>
                        <TimeStamp isMe={isMe}>
                          {formatTime(msg.timestamp)}
                          {isMe && (
                            <Box component="span" sx={{ ml: 0.5, display: "inline-flex" }}>
                              {msg.read ? <FaCheckDouble size={11} color="#4ade80" /> : msg.status === "sending" ? <Box sx={{ width: 10, height: 10, border: "1.5px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", "@keyframes spin": { "0%": { transform: "rotate(0deg)" }, "100%": { transform: "rotate(360deg)" } } }} /> : <FaCheck size={10} />}
                            </Box>
                          )}
                        </TimeStamp>
                      </MessageBubble>
                      <Stack direction="row" sx={{ opacity: 0, ":hover": { opacity: 1 }, transition: "opacity 0.2s" }} spacing={0.3}>
                        <Tooltip title="Reply"><IconButton size="small" onClick={() => setReplyTo(msg)} sx={{ width: 26, height: 26, bgcolor: "#fff", boxShadow: 1 }}><FaReply size={10} /></IconButton></Tooltip>
                        {isMe && <Tooltip title="Delete"><IconButton size="small" onClick={() => { setMessageToDelete(msg); setDeleteDialogOpen(true); }} sx={{ width: 26, height: 26, bgcolor: "#fff", boxShadow: 1 }}><FaTrash size={10} color="#ef4444" /></IconButton></Tooltip>}
                      </Stack>
                    </Stack>
                  </Box>
                );
              })
            )}
            {isTyping && <Box sx={{ alignSelf: "flex-start", bgcolor: "#fff", border: "1px solid #e2e8f0", borderRadius: "18px 18px 18px 4px", px: 1.8, py: 1, display: "inline-flex", gap: 0.6 }}><Box sx={{ width: 6, height: 6, bgcolor: "#6366f1", borderRadius: "50%", animation: "bounce 1s infinite" }} /><Box sx={{ width: 6, height: 6, bgcolor: "#6366f1", borderRadius: "50%", animation: "bounce 1s infinite 0.15s" }} /><Box sx={{ width: 6, height: 6, bgcolor: "#6366f1", borderRadius: "50%", animation: "bounce 1s infinite 0.3s", "@keyframes bounce": { "0%,80%,100%": { transform: "translateY(0)" }, "40%": { transform: "translateY(-4px)" } } }} /></Box>}
            <div ref={messagesEndRef} />
          </Box>

          {replyTo && (
            <Paper sx={{ mx: 2, mb: 1, p: 1.2, bgcolor: "#f1f5f9", borderLeft: "3px solid #6366f1", display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: 1.5 }}>
              <Box sx={{ overflow: "hidden" }}><Typography variant="caption" fontWeight={800} color="#6366f1">Replying to {replyTo.senderName}</Typography><Typography variant="body2" noWrap sx={{ maxWidth: 280 }}>{replyTo.content}</Typography></Box>
              <IconButton size="small" onClick={() => setReplyTo(null)}><FaTimes size={12} /></IconButton>
            </Paper>
          )}

          <Paper elevation={0} sx={{ p: 1.5, borderTop: "1px solid #e2e8f0", bgcolor: "#ffffff", position: "relative" }}>
            {showEmojiPicker && <SimpleEmojiPicker onSelect={(e) => setText((t) => t + e)} onClose={() => setShowEmojiPicker(false)} />}
            <Stack direction="row" spacing={1} alignItems="flex-end">
              <IconButton onClick={() => setShowEmojiPicker((v) => !v)} sx={{ width: 40, height: 40 }}><FaRegSmile size={18} color="#6366f1" /></IconButton>
              <TextField fullWidth size="small" placeholder={isConnected ? `Message ${recipientName || ""}...` : "Connecting..."} value={text} onChange={(e) => { setText(e.target.value); onTyping(); }} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} disabled={!isConnected && messages.length === 0} multiline minRows={1} maxRows={4} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3, bgcolor: "#f8fafc", "& fieldset": { borderColor: "#e2e8f0" }, "&.Mui-focused fieldset": { borderColor: "#6366f1" } } }} />
              <IconButton onClick={handleSend} disabled={!text.trim() || sending} sx={{ bgcolor: text.trim() ? "#6366f1" : "#e2e8f0", color: text.trim() ? "#fff" : "#94a3b8", width: 42, height: 42, "&:hover": { bgcolor: "#4f46e5" }, transition: "all 0.2s" }}>{sending ? <CircularProgress size={18} color="inherit" /> : <FaPaperPlane size={15} />}</IconButton>
            </Stack>
          </Paper>
        </ChatContainer>
      </Drawer>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={800}>Delete message?</DialogTitle>
        <DialogContent><DialogContentText>This action cannot be undone.</DialogContentText></DialogContent>
        <DialogActions><Button onClick={() => setDeleteDialogOpen(false)} sx={{ borderRadius: 2 }}>Cancel</Button><Button onClick={handleDeleteConfirm} color="error" variant="contained" sx={{ borderRadius: 2 }}>Delete</Button></DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2.5 }}>{snackbar.message}</Alert>
      </Snackbar>
    </>
  );
};

export default React.memo(ChatDrawer);
