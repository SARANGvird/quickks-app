// src/components/chat/ChatMessage.jsx
// COMPLETE PRODUCTION-READY CHAT MESSAGE COMPONENT

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Paper,
  Avatar,
  Stack,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Chip,
  alpha,
  Collapse,
  Skeleton,
  Popover,
  TextField,
  ClickAwayListener
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  FaReply,
  FaCopy,
  FaTrash,
  FaEdit,
  FaFlag,
  FaStar,
  FaRegStar,
  FaShare,
  FaDownload,
  FaCheck,
  FaCheckDouble,
  FaClock,
  FaExclamationTriangle,
  FaUser,
  FaRobot,
  FaInfoCircle,
  FaThumbsUp,
  FaThumbsDown,
  FaPaperclip,
  FaImage,
  FaFile,
  FaPlay,
  FaPause,
  FaVolumeUp,
  FaVolumeMute,
  FaExpand,
  FaCompress,
  FaLink,
  FaExternalLinkAlt,
  FaUserCircle,
  FaSmile,
  FaSmileWink,
  FaGrinHearts,
  FaGrinStars,
  FaGrinSquint,
  FaGrinTongue,
  FaKissWinkHeart
} from 'react-icons/fa';
import { format, formatDistanceToNow, isToday, isYesterday, differenceInMinutes } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api/api';
import { useAuth } from '../../contexts/AuthContext';

// ==========================================================
// ✅ STYLED COMPONENTS
// ==========================================================
const MessageBubble = styled(Paper)(({ isOwn, hasReply, isSelected, theme }) => ({
  padding: '10px 14px',
  position: 'relative',
  backgroundColor: isOwn ? '#6366f1' : '#ffffff',
  color: isOwn ? '#ffffff' : '#1e293b',
  borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
  boxShadow: isSelected
    ? '0 0 0 2px #6366f1, 0 4px 12px rgba(99, 102, 241, 0.3)'
    : isOwn
    ? '0 2px 8px rgba(99, 102, 241, 0.2)'
    : '0 1px 2px rgba(0, 0, 0, 0.05)',
  transition: 'all 0.2s ease',
  border: isOwn ? 'none' : '1px solid #e2e8f0',
  maxWidth: '100%',
  wordBreak: 'break-word',
  whiteSpace: 'pre-wrap',
  cursor: 'default',
  '&:hover': {
    transform: 'scale(1.01)',
    boxShadow: isOwn
      ? '0 4px 12px rgba(99, 102, 241, 0.3)'
      : '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
}));

const ReplyPreview = styled(Paper)(({ theme }) => ({
  padding: '8px 12px',
  marginBottom: '8px',
  backgroundColor: alpha(theme.palette.primary.main, 0.05),
  borderRadius: '12px',
  borderLeft: `3px solid ${theme.palette.primary.main}`,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
  },
}));

const MediaContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  borderRadius: '12px',
  overflow: 'hidden',
  cursor: 'pointer',
  marginBottom: '8px',
  '&:hover .media-overlay': {
    opacity: 1,
  },
}));

const MediaOverlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  opacity: 0,
  transition: 'opacity 0.2s ease',
}));

const StatusIcon = styled(Box)(({ status }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  marginLeft: '4px',
  fontSize: '0.65rem',
  color: status === 'read' ? '#4ade80' : status === 'error' ? '#ef4444' : '#94a3b8',
}));

const EditedIndicator = styled(Typography)(({ theme }) => ({
  fontSize: '0.6rem',
  color: theme.palette.text.secondary,
  opacity: 0.7,
  marginLeft: '4px',
}));

// ==========================================================
// ✅ REACTION EMOJIS
// ==========================================================
const REACTION_EMOJIS = [
  { emoji: '👍', label: 'Thumbs Up' },
  { emoji: '👎', label: 'Thumbs Down' },
  { emoji: '❤️', label: 'Heart' },
  { emoji: '😂', label: 'Laughing' },
  { emoji: '😮', label: 'Surprised' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '🎉', label: 'Celebrate' },
  { emoji: '⭐', label: 'Star' },
  { emoji: '💯', label: '100' },
];

// ==========================================================
// ✅ MESSAGE ACTIONS MENU
// ==========================================================
const MessageActionsMenu = ({
  anchorEl,
  open,
  onClose,
  onReply,
  onCopy,
  onEdit,
  onDelete,
  onReport,
  onShare,
  onForward,
  onPin,
  onMute,
  onUnmute,
  isOwn,
  canEdit,
  isPinned,
  isMuted
}) => {
  const handleCopy = () => {
    onCopy();
    onClose();
  };

  const handleReply = () => {
    onReply();
    onClose();
  };

  const handleEdit = () => {
    onEdit();
    onClose();
  };

  const handleDelete = () => {
    onDelete();
    onClose();
  };

  const handleReport = () => {
    onReport();
    onClose();
  };

  const handleShare = () => {
    onShare();
    onClose();
  };

  const handleForward = () => {
    onForward?.();
    onClose();
  };

  const handlePin = () => {
    onPin?.();
    onClose();
  };

  const handleMute = () => {
    if (isMuted) {
      onUnmute?.();
    } else {
      onMute?.();
    }
    onClose();
  };

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      PaperProps={{
        sx: {
          minWidth: 200,
          borderRadius: 2,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }
      }}
    >
      <MenuItem onClick={handleReply}>
        <ListItemIcon><FaReply size={14} /></ListItemIcon>
        <ListItemText>Reply</ListItemText>
      </MenuItem>

      <MenuItem onClick={handleForward}>
        <ListItemIcon><FaShare size={14} /></ListItemIcon>
        <ListItemText>Forward</ListItemText>
      </MenuItem>

      <MenuItem onClick={handleCopy}>
        <ListItemIcon><FaCopy size={14} /></ListItemIcon>
        <ListItemText>Copy</ListItemText>
      </MenuItem>

      {canEdit && isOwn && (
        <MenuItem onClick={handleEdit}>
          <ListItemIcon><FaEdit size={14} /></ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
      )}

      <MenuItem onClick={handlePin}>
        <ListItemIcon>{isPinned ? <FaStar size={14} color="#f59e0b" /> : <FaRegStar size={14} />}</ListItemIcon>
        <ListItemText>{isPinned ? 'Unpin' : 'Pin'}</ListItemText>
      </MenuItem>

      <MenuItem onClick={handleMute}>
        <ListItemIcon>{isMuted ? <FaVolumeUp size={14} /> : <FaVolumeMute size={14} />}</ListItemIcon>
        <ListItemText>{isMuted ? 'Unmute' : 'Mute'}</ListItemText>
      </MenuItem>

      <MenuItem onClick={handleReport}>
        <ListItemIcon><FaFlag size={14} /></ListItemIcon>
        <ListItemText>Report</ListItemText>
      </MenuItem>

      {isOwn && (
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon><FaTrash size={14} color="#ef4444" /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      )}
    </Menu>
  );
};

MessageActionsMenu.propTypes = {
  anchorEl: PropTypes.object,
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onReply: PropTypes.func.isRequired,
  onCopy: PropTypes.func.isRequired,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func.isRequired,
  onReport: PropTypes.func.isRequired,
  onShare: PropTypes.func.isRequired,
  onForward: PropTypes.func,
  onPin: PropTypes.func,
  onMute: PropTypes.func,
  onUnmute: PropTypes.func,
  isOwn: PropTypes.bool.isRequired,
  canEdit: PropTypes.bool,
  isPinned: PropTypes.bool,
  isMuted: PropTypes.bool
};

// ==========================================================
// ✅ MEDIA PREVIEW COMPONENT
// ==========================================================
const MediaPreview = ({ url, type, onDownload, onView, onFullscreen }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);
  const videoRef = useRef(null);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleFullscreen = () => {
    if (onFullscreen) {
      onFullscreen(url);
    } else {
      setIsFullscreen(!isFullscreen);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(progress);
    }
  };

  if (type === 'image') {
    return (
      <MediaContainer onClick={() => onView?.(url)}>
        <img
          src={url}
          alt="Media content"
          style={{
            maxWidth: '100%',
            maxHeight: 300,
            borderRadius: '8px',
            display: 'block',
            objectFit: 'cover'
          }}
          loading="lazy"
        />
        <MediaOverlay className="media-overlay">
          <Stack direction="row" spacing={1}>
            <IconButton sx={{ color: 'white' }} onClick={(e) => { e.stopPropagation(); onView?.(url); }}>
              <FaExpand size={20} />
            </IconButton>
            <IconButton sx={{ color: 'white' }} onClick={(e) => { e.stopPropagation(); onDownload?.(url); }}>
              <FaDownload size={20} />
            </IconButton>
          </Stack>
        </MediaOverlay>
      </MediaContainer>
    );
  }

  if (type === 'audio') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, bgcolor: 'grey.50', borderRadius: 2 }}>
        <IconButton size="small" onClick={handlePlayPause}>
          {isPlaying ? <FaPause size={16} /> : <FaPlay size={16} />}
        </IconButton>
        <IconButton size="small" onClick={handleMute}>
          {isMuted ? <FaVolumeMute size={16} /> : <FaVolumeUp size={16} />}
        </IconButton>
        <audio
          ref={audioRef}
          src={url}
          style={{ flex: 1, height: '30px' }}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
        <Box sx={{ flex: 1, height: 4, bgcolor: '#e2e8f0', borderRadius: 2, mx: 1 }}>
          <Box sx={{ width: `${progress}%`, height: '100%', bgcolor: '#6366f1', borderRadius: 2, transition: 'width 0.2s' }} />
        </Box>
        <Typography variant="caption" color="text.secondary">
          Audio message
        </Typography>
      </Box>
    );
  }

  if (type === 'video') {
    return (
      <MediaContainer>
        <video
          ref={videoRef}
          src={url}
          style={{
            maxWidth: '100%',
            maxHeight: 300,
            borderRadius: '8px',
            display: 'block'
          }}
          controls
        />
      </MediaContainer>
    );
  }

  if (type === 'pdf') {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 2,
          bgcolor: '#fef2f2',
          borderRadius: 2,
          border: '1px solid #fecaca',
          cursor: 'pointer'
        }}
        onClick={() => onView?.(url)}
      >
        <Box sx={{ fontSize: 32 }}>📄</Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" fontWeight={500}>
            {url.split('/').pop() || 'PDF Document'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Click to view PDF
          </Typography>
        </Box>
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDownload?.(url); }}>
          <FaDownload size={14} />
        </IconButton>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 1.5,
        bgcolor: 'grey.50',
        borderRadius: 2,
        cursor: 'pointer'
      }}
      onClick={() => onDownload?.(url)}
    >
      <FaFile size={24} color="#6366f1" />
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" noWrap>
          {url.split('/').pop() || 'Download file'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Click to download
        </Typography>
      </Box>
      <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDownload?.(url); }}>
        <FaDownload size={14} />
      </IconButton>
    </Box>
  );
};

MediaPreview.propTypes = {
  url: PropTypes.string.isRequired,
  type: PropTypes.string,
  onDownload: PropTypes.func,
  onView: PropTypes.func,
  onFullscreen: PropTypes.func
};

MediaPreview.defaultProps = {
  type: 'file'
};

// ==========================================================
// ✅ REACTION PICKER COMPONENT
// ==========================================================
const ReactionPicker = ({ open, anchorEl, onClose, onSelect, onRemove }) => {
  const handleSelect = (emoji) => {
    onSelect(emoji);
    onClose();
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      PaperProps={{
        sx: {
          p: 1.5,
          borderRadius: 2,
          maxWidth: 300,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }
      }}
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 0.5 }}>
        {REACTION_EMOJIS.map(({ emoji, label }) => (
          <Tooltip key={emoji} title={label} arrow>
            <Button
              size="small"
              sx={{
                minWidth: 36,
                height: 36,
                fontSize: 20,
                borderRadius: 1,
                '&:hover': {
                  bgcolor: alpha('#6366f1', 0.1)
                }
              }}
              onClick={() => handleSelect(emoji)}
            >
              {emoji}
            </Button>
          </Tooltip>
        ))}
      </Box>
      <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #e2e8f0' }}>
        <Button
          size="small"
          fullWidth
          variant="text"
          color="error"
          onClick={() => { onRemove?.(); onClose(); }}
        >
          Remove Reaction
        </Button>
      </Box>
    </Popover>
  );
};

ReactionPicker.propTypes = {
  open: PropTypes.bool.isRequired,
  anchorEl: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
  onRemove: PropTypes.func
};

// ==========================================================
// ✅ MAIN CHAT MESSAGE COMPONENT
// ==========================================================
const ChatMessage = ({
  message,
  isOwn,
  onReply,
  onDelete,
  onEdit,
  onCopy,
  onReport,
  onShare,
  onForward,
  onStar,
  onPin,
  onReact,
  onRetry,
  onSelect,
  onUserClick,
  onMentionClick,
  onMediaView,
  onMediaDownload,
  showAvatar = true,
  showName = true,
  showActions = true,
  showReactions = true,
  showStatus = true,
  compact = false,
  isSelected = false,
  isPinned = false,
  isMuted = false,
  enableEditing = true,
  enableDeletion = true,
  enableReporting = true,
  enableReactions = true,
  enableForwarding = true,
  maxMessageLength = 280,
  onReactionUpdate,
  onMessageUpdate,
}) => {
  const { user } = useAuth();
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [showFullMessage, setShowFullMessage] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const [reactionAnchor, setReactionAnchor] = useState(null);
  const [showReplyPreview, setShowReplyPreview] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [hasImageError, setHasImageError] = useState(false);

  const messageRef = useRef(null);

  // ==========================================================
  // ✅ MEMOIZED VALUES
  // ==========================================================
  const isSystemMessage = message.senderId === 'system' || message.type === 'system';
  const isError = message.status === 'error' || message.error;
  const isSending = message.status === 'sending';
  const isRead = message.status === 'read';
  const isDelivered = message.status === 'delivered';
  const hasMedia = message.mediaUrl || message.mediaType;
  const mediaType = message.mediaType ||
    (message.mediaUrl?.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? 'image' :
     message.mediaUrl?.match(/\.(mp3|wav|ogg|m4a)$/i) ? 'audio' :
     message.mediaUrl?.match(/\.(mp4|webm|mov|avi)$/i) ? 'video' :
     message.mediaUrl?.match(/\.(pdf)$/i) ? 'pdf' : 'file');
  const hasReply = message.replyTo;
  const hasReactions = message.reactions && Object.keys(message.reactions).length > 0;
  const isLongMessage = message.content?.length > maxMessageLength;
  const isEdited = message.editedAt || message.isEdited;
  const isDeleting = message.isDeleting;

  // Format timestamp
  const formattedTime = useMemo(() => {
    if (!message.timestamp) return '';
    const date = new Date(message.timestamp);
    if (isToday(date)) return format(date, 'hh:mm a');
    if (isYesterday(date)) return `Yesterday ${format(date, 'hh:mm a')}`;
    return format(date, 'MMM dd, hh:mm a');
  }, [message.timestamp]);

  // Format relative time for tooltip
  const relativeTime = useMemo(() => {
    if (!message.timestamp) return '';
    return formatDistanceToNow(new Date(message.timestamp), { addSuffix: true });
  }, [message.timestamp]);

  // Get sender display name
  const senderName = useMemo(() => {
    if (message.senderName) return message.senderName;
    if (message.sender?.name) return message.sender.name;
    if (message.sender?.fullName) return message.sender.fullName;
    if (message.sender?.username) return message.sender.username;
    if (message.sender?.email) return message.sender.email.split('@')[0];
    return 'Unknown User';
  }, [message]);

  // Get sender avatar
  const senderAvatar = useMemo(() => {
    if (message.sender?.avatar) return message.sender.avatar;
    if (message.sender?.image) return message.sender.image;
    if (message.sender?.photoURL) return message.sender.photoURL;
    return null;
  }, [message]);

  // Get sender role
  const senderRole = useMemo(() => {
    if (message.sender?.role) return message.sender.role;
    if (message.role) return message.role;
    return null;
  }, [message]);

  // Get message status icon
  const StatusIconComponent = useMemo(() => {
    if (isSending) return <FaClock size={10} />;
    if (isError) return <FaExclamationTriangle size={10} />;
    if (isRead) return <FaCheckDouble size={10} color="#4ade80" />;
    if (isDelivered) return <FaCheckDouble size={10} />;
    return <FaCheck size={10} />;
  }, [isSending, isError, isRead, isDelivered]);

  // Get user's reaction to this message
  const userReaction = useMemo(() => {
    if (!user?.id || !message.reactions) return null;
    for (const [emoji, users] of Object.entries(message.reactions)) {
      if (users.includes(user.id)) {
        return emoji;
      }
    }
    return null;
  }, [message.reactions, user]);

  // ==========================================================
  // ✅ EFFECTS
  // ==========================================================
  // Reset edit state when message changes
  useEffect(() => {
    if (isEditing) {
      setEditedContent(message.content);
    }
  }, [message.content, isEditing]);

  // ==========================================================
  // ✅ HANDLERS
  // ==========================================================
  const handleMenuOpen = (event) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleCopy = useCallback(() => {
    if (onCopy) {
      onCopy(message.content);
    } else {
      navigator.clipboard.writeText(message.content);
    }
    toast.success('Message copied to clipboard');
  }, [message.content, onCopy]);

  const handleReply = useCallback(() => {
    if (onReply) {
      onReply(message);
    }
  }, [message, onReply]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setEditedContent(message.content);
  }, [message.content]);

  const handleEditSave = useCallback(() => {
    if (editedContent.trim() && editedContent !== message.content) {
      if (onEdit) {
        onEdit(message.id, editedContent);
      }
      if (onMessageUpdate) {
        onMessageUpdate(message.id, { content: editedContent, isEdited: true });
      }
    }
    setIsEditing(false);
  }, [editedContent, message.id, message.content, onEdit, onMessageUpdate]);

  const handleEditCancel = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleDelete = useCallback(() => {
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (onDelete) {
      onDelete(message.id);
    }
    setDeleteDialogOpen(false);
  }, [message.id, onDelete]);

  const handleReport = useCallback(() => {
    if (onReport) {
      onReport(message);
    }
  }, [message, onReport]);

  const handleShare = useCallback(async () => {
    if (onShare) {
      onShare(message);
    } else if (navigator.share) {
      try {
        await navigator.share({
          title: 'Message',
          text: message.content,
          url: window.location.href,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      handleCopy();
    }
  }, [message, onShare, handleCopy]);

  const handleForward = useCallback(() => {
    if (onForward) {
      onForward(message);
    }
  }, [message, onForward]);

  const handleRetry = useCallback(() => {
    if (onRetry) {
      onRetry(message);
    }
  }, [message, onRetry]);

  const handleStar = useCallback(() => {
    if (onStar) {
      onStar(message.id);
    }
  }, [message.id, onStar]);

  const handlePin = useCallback(() => {
    if (onPin) {
      onPin(message.id);
    }
  }, [message.id, onPin]);

  const handleReactionClick = (event) => {
    if (!enableReactions) return;
    if (userReaction) {
      // Remove reaction if already reacted
      if (onReact) {
        onReact(message.id, userReaction, 'remove');
      }
    } else {
      setReactionAnchor(event.currentTarget);
      setReactionPickerOpen(true);
    }
  };

  const handleReactionSelect = useCallback((emoji) => {
    if (onReact) {
      onReact(message.id, emoji, 'add');
    }
    if (onReactionUpdate) {
      onReactionUpdate(message.id, emoji);
    }
    setReactionPickerOpen(false);
  }, [message.id, onReact, onReactionUpdate]);

  const handleReactionRemove = useCallback(() => {
    if (onReact && userReaction) {
      onReact(message.id, userReaction, 'remove');
    }
    setReactionPickerOpen(false);
  }, [message.id, userReaction, onReact]);

  const handleUserClick = useCallback(() => {
    if (onUserClick && !isOwn && message.senderId) {
      onUserClick(message.senderId);
    }
  }, [message.senderId, onUserClick, isOwn]);

  const handleMentionClick = useCallback((mentionedUser) => {
    if (onMentionClick) {
      onMentionClick(mentionedUser);
    }
  }, [onMentionClick]);

  const handleMediaView = useCallback(() => {
    if (onMediaView && message.mediaUrl) {
      onMediaView(message.mediaUrl, mediaType);
    } else if (message.mediaUrl) {
      window.open(message.mediaUrl, '_blank');
    }
  }, [message.mediaUrl, mediaType, onMediaView]);

  const handleMediaDownload = useCallback(() => {
    if (onMediaDownload && message.mediaUrl) {
      onMediaDownload(message.mediaUrl);
    } else if (message.mediaUrl) {
      const link = document.createElement('a');
      link.href = message.mediaUrl;
      link.download = message.mediaUrl.split('/').pop() || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [message.mediaUrl, onMediaDownload]);

  const handleMessageSelect = useCallback(() => {
    if (onSelect) {
      onSelect(message.id);
    }
  }, [message.id, onSelect]);

  const handleImageError = useCallback(() => {
    setHasImageError(true);
  }, []);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      handleEditCancel();
    }
    if (e.key === 'Enter' && e.shiftKey) {
      // Allow new line with Shift+Enter
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEditSave();
    }
  }, [handleEditCancel, handleEditSave]);

  // ==========================================================
  // ✅ RENDER HELPERS
  // ==========================================================
  const renderReactions = () => {
    if (!hasReactions) return null;

    return (
      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
        {Object.entries(message.reactions).map(([emoji, users]) => (
          <Tooltip key={emoji} title={`${users.length} ${users.length === 1 ? 'person' : 'people'}`}>
            <Chip
              size="small"
              label={`${emoji} ${users.length}`}
              sx={{
                height: 20,
                fontSize: '0.7rem',
                bgcolor: alpha('#6366f1', 0.1),
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: alpha('#6366f1', 0.2),
                }
              }}
              onClick={() => handleReactionSelect(emoji)}
            />
          </Tooltip>
        ))}
      </Box>
    );
  };

  const renderReplyPreview = () => {
    if (!hasReply) return null;

    return (
      <ReplyPreview onClick={() => setShowReplyPreview(!showReplyPreview)}>
        <Typography variant="caption" color="primary" sx={{ fontWeight: 500, display: 'block' }}>
          Replying to {message.replyTo.senderName || 'message'}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap={!showReplyPreview}>
          {message.replyTo.content}
        </Typography>
        <Collapse in={showReplyPreview}>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {message.replyTo.content}
          </Typography>
        </Collapse>
      </ReplyPreview>
    );
  };

  const renderMedia = () => {
    if (!hasMedia) return null;

    // Show loading for images
    if (mediaType === 'image' && !imageLoaded && !hasImageError) {
      return <Skeleton variant="rounded" width={200} height={150} sx={{ mb: 1, borderRadius: 2 }} />;
    }

    return (
      <MediaPreview
        url={message.mediaUrl}
        type={mediaType}
        onView={handleMediaView}
        onDownload={handleMediaDownload}
      />
    );
  };

  const renderSenderBadge = () => {
    if (!senderRole) return null;

    const roleColors = {
      admin: '#ef4444',
      moderator: '#f59e0b',
      premium: '#8b5cf6',
      verified: '#3b82f6'
    };

    return (
      <Chip
        size="small"
        label={senderRole}
        sx={{
          height: 16,
          fontSize: '0.6rem',
          bgcolor: alpha(roleColors[senderRole?.toLowerCase()] || '#6366f1', 0.1),
          color: roleColors[senderRole?.toLowerCase()] || '#6366f1',
          ml: 0.5,
          '& .MuiChip-label': { px: 0.5 }
        }}
      />
    );
  };

  // ==========================================================
  // ✅ SYSTEM MESSAGE RENDER
  // ==========================================================
  if (isSystemMessage) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <Paper
            sx={{
              px: 3,
              py: 1.5,
              bgcolor: alpha('#94a3b8', 0.1),
              borderRadius: 4,
              maxWidth: '80%',
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <FaRobot size={14} color="#94a3b8" />
              <Typography variant="body2" color="text.secondary" align="center">
                {message.content}
              </Typography>
            </Stack>
          </Paper>
        </Box>
      </motion.div>
    );
  }

  // ==========================================================
  // ✅ MAIN MESSAGE RENDER
  // ==========================================================
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        style={{ width: '100%' }}
        ref={messageRef}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: isOwn ? 'flex-end' : 'flex-start',
            mb: compact ? 1 : 2,
            width: '100%',
            opacity: isDeleting ? 0.5 : 1,
          }}
          onClick={handleMessageSelect}
        >
          <Stack
            direction="row"
            spacing={1}
            alignItems="flex-start"
            sx={{
              maxWidth: compact ? '90%' : '80%',
              flexDirection: isOwn ? 'row-reverse' : 'row',
            }}
          >
            {/* Avatar */}
            {showAvatar && !isOwn && (
              <Tooltip title={`${senderName}${senderRole ? ` (${senderRole})` : ''}`}>
                <Avatar
                  src={senderAvatar}
                  sx={{
                    width: compact ? 28 : 36,
                    height: compact ? 28 : 36,
                    cursor: onUserClick ? 'pointer' : 'default',
                    bgcolor: 'primary.main',
                    flexShrink: 0,
                  }}
                  onClick={handleUserClick}
                >
                  {!senderAvatar && <FaUser size={14} />}
                </Avatar>
              </Tooltip>
            )}

            {/* Message Content */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {/* Sender Name */}
              {showName && !isOwn && !compact && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, ml: 1 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#64748b',
                      fontWeight: 600,
                      cursor: onUserClick ? 'pointer' : 'default',
                    }}
                    onClick={handleUserClick}
                  >
                    {senderName}
                  </Typography>
                  {renderSenderBadge()}
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                    {formattedTime}
                  </Typography>
                </Box>
              )}

              {/* Reply Preview */}
              {renderReplyPreview()}

              {/* Media Content */}
              {renderMedia()}

              {/* Image Error State */}
              {mediaType === 'image' && hasImageError && (
                <Box sx={{ p: 2, bgcolor: '#fef2f2', borderRadius: 2, mb: 1 }}>
                  <Typography variant="caption" color="error">
                    Failed to load image
                  </Typography>
                </Box>
              )}

              {/* Message Bubble */}
              <MessageBubble
                isOwn={isOwn}
                hasReply={hasReply}
                isSelected={isSelected}
                sx={{
                  backgroundColor: isSending ? (isOwn ? '#818cf8' : '#f1f5f9') : undefined,
                }}
              >
                {/* Edit Mode */}
                {isEditing ? (
                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    size="small"
                    sx={{
                      '& .MuiInputBase-root': {
                        bgcolor: isOwn ? 'rgba(255,255,255,0.1)' : 'white',
                        color: isOwn ? 'white' : 'inherit',
                        borderRadius: 1,
                      }
                    }}
                  />
                ) : (
                  <>
                    {/* Message Content */}
                    <Typography
                      variant="body2"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontSize: compact ? '0.8125rem' : '0.875rem',
                        '& a': {
                          color: isOwn ? '#dbeafe' : '#6366f1',
                          textDecoration: 'underline',
                        },
                      }}
                    >
                      {isLongMessage && !showFullMessage
                        ? `${message.content.slice(0, maxMessageLength)}... `
                        : message.content}
                      {isLongMessage && (
                        <span
                          onClick={() => setShowFullMessage(!showFullMessage)}
                          style={{
                            color: isOwn ? '#dbeafe' : '#6366f1',
                            cursor: 'pointer',
                            fontWeight: 500,
                            fontSize: '0.75rem',
                            marginLeft: '4px',
                          }}
                        >
                          {showFullMessage ? 'Show less' : 'Show more'}
                        </span>
                      )}
                    </Typography>

                    {/* Edited Indicator */}
                    {isEdited && (
                      <EditedIndicator variant="caption">
                        (edited)
                      </EditedIndicator>
                    )}
                  </>
                )}

                {/* Timestamp and Status */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isOwn ? 'flex-end' : 'flex-start',
                    gap: 0.5,
                    mt: 0.5,
                  }}
                >
                  {!isEditing && (
                    <>
                      <Tooltip title={relativeTime}>
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: '0.6rem',
                            color: isOwn ? 'rgba(255,255,255,0.7)' : '#94a3b8',
                          }}
                        >
                          {formattedTime}
                        </Typography>
                      </Tooltip>

                      {showStatus && isOwn && (
                        <StatusIcon status={isRead ? 'read' : isError ? 'error' : 'sent'}>
                          {StatusIconComponent}
                        </StatusIcon>
                      )}
                    </>
                  )}

                  {/* Edit Actions */}
                  {isEditing && (
                    <Box sx={{ display: 'flex', gap: 0.5, ml: 'auto' }}>
                      <Button
                        size="small"
                        variant="text"
                        onClick={handleEditCancel}
                        sx={{ color: isOwn ? 'rgba(255,255,255,0.7)' : '#64748b' }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={handleEditSave}
                        disabled={!editedContent.trim() || editedContent === message.content}
                        sx={{ bgcolor: isOwn ? 'white' : '#6366f1', color: isOwn ? '#6366f1' : 'white' }}
                      >
                        Save
                      </Button>
                    </Box>
                  )}
                </Box>
              </MessageBubble>

              {/* Reactions */}
              {showReactions && renderReactions()}

              {/* Error State with Retry */}
              {isError && !isDeleting && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, ml: 1 }}>
                  <Typography variant="caption" color="error">
                    Failed to send
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    color="error"
                    onClick={handleRetry}
                    sx={{ fontSize: '0.65rem', p: 0, minWidth: 'auto', textTransform: 'none' }}
                  >
                    Retry
                  </Button>
                </Box>
              )}
            </Box>
          </Stack>
        </Box>

        {/* Action Buttons (on hover) */}
        {showActions && !isSystemMessage && !isEditing && !isDeleting && (
          <Box
            className="message-actions"
            sx={{
              position: 'relative',
              display: 'flex',
              justifyContent: isOwn ? 'flex-end' : 'flex-start',
              opacity: 0,
              transition: 'opacity 0.2s',
              mt: 0.5,
              mb: 0.5,
              '&:hover': {
                opacity: 1,
              },
            }}
          >
            <Paper
              elevation={0}
              sx={{
                display: 'inline-flex',
                gap: 0.5,
                p: 0.5,
                bgcolor: 'background.paper',
                borderRadius: 3,
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              }}
            >
              <Tooltip title="Reply">
                <IconButton size="small" onClick={handleReply}>
                  <FaReply size={12} />
                </IconButton>
              </Tooltip>

              {enableReactions && (
                <Tooltip title={userReaction ? 'Remove reaction' : 'React'}>
                  <IconButton
                    size="small"
                    onClick={handleReactionClick}
                    sx={{ color: userReaction ? '#f59e0b' : 'inherit' }}
                  >
                    {userReaction || <FaSmile size={12} />}
                  </IconButton>
                </Tooltip>
              )}

              <Tooltip title={isPinned ? 'Unpin' : 'Pin'}>
                <IconButton size="small" onClick={handlePin}>
                  {isPinned ? <FaStar size={12} color="#f59e0b" /> : <FaRegStar size={12} />}
                </IconButton>
              </Tooltip>

              <Tooltip title="More options">
                <IconButton size="small" onClick={handleMenuOpen}>
                  <FaInfoCircle size={12} />
                </IconButton>
              </Tooltip>
            </Paper>
          </Box>
        )}
      </motion.div>

      {/* Message Actions Menu */}
      <MessageActionsMenu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        onReply={handleReply}
        onCopy={handleCopy}
        onEdit={enableEditing && isOwn ? handleEdit : undefined}
        onDelete={enableDeletion && isOwn ? handleDelete : undefined}
        onReport={enableReporting ? handleReport : undefined}
        onShare={handleShare}
        onForward={enableForwarding ? handleForward : undefined}
        onPin={handlePin}
        onMute={() => {}}
        onUnmute={() => {}}
        isOwn={isOwn}
        canEdit={enableEditing && isOwn && !isSending}
        isPinned={isPinned}
        isMuted={isMuted}
      />

      {/* Reaction Picker */}
      <ReactionPicker
        open={reactionPickerOpen}
        anchorEl={reactionAnchor}
        onClose={() => setReactionPickerOpen(false)}
        onSelect={handleReactionSelect}
        onRemove={userReaction ? handleReactionRemove : undefined}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Message</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this message? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            startIcon={<FaTrash size={14} />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// ==========================================================
// ✅ PROP TYPES
// ==========================================================
ChatMessage.propTypes = {
  // Required
  message: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    content: PropTypes.string.isRequired,
    senderId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    senderName: PropTypes.string,
    timestamp: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    status: PropTypes.oneOf(['sending', 'sent', 'delivered', 'read', 'error']),
    error: PropTypes.bool,
    mediaUrl: PropTypes.string,
    mediaType: PropTypes.string,
    replyTo: PropTypes.object,
    reactions: PropTypes.object,
    isStarred: PropTypes.bool,
    isEdited: PropTypes.bool,
    editedAt: PropTypes.string,
    sender: PropTypes.object,
    role: PropTypes.string,
    type: PropTypes.string,
    isDeleting: PropTypes.bool,
  }).isRequired,
  isOwn: PropTypes.bool.isRequired,

  // Optional callbacks
  onReply: PropTypes.func,
  onDelete: PropTypes.func,
  onEdit: PropTypes.func,
  onCopy: PropTypes.func,
  onReport: PropTypes.func,
  onShare: PropTypes.func,
  onForward: PropTypes.func,
  onStar: PropTypes.func,
  onPin: PropTypes.func,
  onReact: PropTypes.func,
  onRetry: PropTypes.func,
  onSelect: PropTypes.func,
  onUserClick: PropTypes.func,
  onMentionClick: PropTypes.func,
  onMediaView: PropTypes.func,
  onMediaDownload: PropTypes.func,
  onReactionUpdate: PropTypes.func,
  onMessageUpdate: PropTypes.func,

  // Display options
  showAvatar: PropTypes.bool,
  showName: PropTypes.bool,
  showActions: PropTypes.bool,
  showReactions: PropTypes.bool,
  showStatus: PropTypes.bool,
  compact: PropTypes.bool,
  isSelected: PropTypes.bool,
  isPinned: PropTypes.bool,
  isMuted: PropTypes.bool,

  // Feature flags
  enableEditing: PropTypes.bool,
  enableDeletion: PropTypes.bool,
  enableReporting: PropTypes.bool,
  enableReactions: PropTypes.bool,
  enableForwarding: PropTypes.bool,

  // Max message length for truncation
  maxMessageLength: PropTypes.number,
};

// ==========================================================
// ✅ DEFAULT PROPS
// ==========================================================
ChatMessage.defaultProps = {
  showAvatar: true,
  showName: true,
  showActions: true,
  showReactions: true,
  showStatus: true,
  compact: false,
  isSelected: false,
  isPinned: false,
  isMuted: false,
  enableEditing: true,
  enableDeletion: true,
  enableReporting: true,
  enableReactions: true,
  enableForwarding: true,
  maxMessageLength: 280,
};

// ==========================================================
// ✅ MEMOIZED EXPORT
// ==========================================================
export default React.memo(ChatMessage);