import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaUsers,
  FaChartBar,
  FaShieldAlt,
  FaClipboardList,
  FaExclamationTriangle,
  FaCog,
  FaFileExport,
  FaMoneyBillWave,
  FaBell,
  FaUserPlus,
  FaUserCheck,
  FaStar,
  FaCalendarAlt,
  FaTruck,
  FaTools,
  FaHome,
  FaBuilding,
  FaPhone,
  FaEnvelope,
  FaWhatsapp,
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaLinkedin,
  FaYoutube,
  FaGithub,
  FaGitlab,
  FaBitbucket,
  FaSlack,
  FaDiscord,
  FaTelegram,
  FaSignal,
  FaSnapchat,
  FaTiktok,
  FaReddit,
  FaPinterest,
  FaMedium,
  FaDev,
  FaStackOverflow,
  FaDocker,
  FaAws,
  FaGoogle,
  FaMicrosoft,
  FaApple,
  FaAndroid,
  FaLinux,
  FaWindows,
  FaApplePay,
  FaGooglePay,
  FaPaypal,
  FaStripe,
  FaCreditCard,
  FaBitcoin,
  FaEthereum,
  FaDogecoin,
  FaLitecoin,
  FaRipple,
  FaCardano,
  FaPolkadot,
  FaSolana,
  FaFileAlt,
  FaFilePdf,
  FaFileExcel,
  FaFileWord,
  FaFilePowerpoint,
  FaFileImage,
  FaFileVideo,
  FaFileAudio,
  FaFileArchive,
  FaFileCode,
  FaFileInvoice,
  FaFileContract,
  FaFileSignature,
  FaPrint,
  FaDownload,
  FaUpload,
  FaShare,
  FaShareAlt,
  FaBookmark,
  FaHeart,
  FaThumbsUp,
  FaThumbsDown,
  FaComment,
  FaCommentAlt,
  FaComments,
  FaReply,
  FaReplyAll,
  FaForward,
  FaRetweet,
  FaQuoteLeft,
  FaQuoteRight,
  FaSearch,
  FaFilter,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaEye,
  FaEyeSlash,
  FaEdit,
  FaTrash,
  FaPlus,
  FaMinus,
  FaTimes,
  FaCheck,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationCircle,
  FaInfoCircle,
  FaQuestionCircle,
  FaLock,
  FaUnlock,
  FaKey,
  FaFingerprint,
  FaIdCard,
  FaIdBadge,
  FaUserCircle,
  FaUserSecret,
  FaRobot,
  FaBrain,
  FaMicrochip,
  FaDatabase,
  FaCloud,
  FaCloudUploadAlt,
  FaCloudDownloadAlt,
  FaServer,
  FaNetworkWired,
  FaWifi,
  FaBluetooth,
  FaUsb,
  FaPlug,
  FaBatteryFull,
  FaBatteryHalf,
  FaBatteryQuarter,
  FaBatteryEmpty,
  FaTachometerAlt,
  FaGaugeHigh,
  FaGaugeMed,
  FaGaugeLow,
  FaSpeedometer,
  FaStopwatch,
  FaTimer,
  FaHourglassHalf,
  FaClock,
  FaCalendar,
  FaCalendarWeek,
  FaCalendarDay,
  FaCalendarAlt as FaCalendarAltIcon,
  FaSun,
  FaMoon,
  FaCloudSun,
  FaCloudMoon,
  FaCloudRain,
  FaCloudSnow,
  FaCloudShowersHeavy,
  FaBolt,
  FaWind,
  FaSnowflake,
  FaFire,
  FaWater,
  FaTree,
  FaLeaf,
  FaFlower,
  FaSeedling,
  FaPaw,
  FaCat,
  FaDog,
  FaFish,
  FaBird,
  FaHorse,
  FaCow,
  FaDragon,
  FaDove,
  FaSpider,
  FaBee,
  FaButterfly,
  FaBug,
  FaFrog,
  FaLizard,
  FaSnake,
  FaOtter,
  FaKiwiBird,
  FaPenguin,
  FaDolphin,
  FaWhale,
  FaShark,
  FaOctopus,
  FaCrab,
  FaLobster,
  FaOyster,
  FaCoral,
  FaSeaweed,
  FaStarfish,
  FaJellyfish,
  FaTurtle,
  FaSeahorse,
  FaClownfish,
  FaAngelfish,
  FaButterflyFish,
  FaParrotfish,
  FaTriggerfish,
  FaPufferfish,
  FaBlowfish,
  FaGoldfish,
  FaKoi,
  FaBetta,
  FaGuppy,
  FaMolly,
  FaPlaty,
  FaSwordtail,
  FaCichlid,
  FaDiscus,
  FaOscar,
  FaArowana,
  FaArapaima,
  FaPiranha,
  FaElectricEel,
  FaStingray,
  FaMantaRay,
  FaSquid,
  FaCuttlefish,
  FaNautilus,
  FaChamberedNautilus,
  FaAmmonite,
  FaTrilobite,
  FaDinosaur,
  FaTyrannosaurus,
  FaVelociraptor,
  FaTriceratops,
  FaStegosaurus,
  FaBrachiosaurus,
  FaDiplodocus,
  FaPterodactyl,
  FaMosasaur,
  FaPlesiosaur,
  FaIchthyosaur,
  FaMammoth,
  FaSaberTooth,
  FaDodo,
  FaPassengerPigeon,
  FaGreatAuk,
  FaMoa,
  FaElephantBird,
  FaHaastEagle,
  FaQuagga,
  FaThylacine,
  FaBaiji,
  FaStellerSeaCow,
  FaCaribbeanMonkSeal,
  FaJapaneseSeaLion,
  FaCaspianTiger,
  FaJavanTiger,
  FaBaliTiger,
  FaBarbaryLion,
  FaCapeLion,
  FaAtlasBear,
  FaCaucasianBison,
  FaAurochs,
  FaTarpan,
  FaQuaggaZebra,
  FaBluebuck,
  FaSchomburgkDeer,
  FaPintaIslandTortoise,
  FaFloreanaTortoise,
  FaRodriguesSolitare,
  FaMauritiusBluePigeon,
  FaLaughingOwl,
  FaLaysanRail,
  FaWakeIslandRail,
  FaGuamRail,
  FaKauaiOo,
  FaMamo,
  FaOahuOo,
  FaBishopOo,
  FaHawaiiOo,
  FaKioea,
  FaAkialoa,
  FaKauaiAkialoa,
  FaOahuAkialoa,
  FaMauiAkialoa,
  FaHawaiiAkialoa,
  FaKauaiNukupuu,
  FaOahuNukupuu,
  FaMauiNukupuu,
  FaHawaiiNukupuu,
  FaKauaiOoA,
  FaOahuOoA,
  FaMauiOoA,
  FaHawaiiOoA,
  FaKauaiMamo,
  FaOahuMamo,
  FaMauiMamo,
  FaHawaiiMamo,
  FaKauaiAkepa,
  FaOahuAkepa,
  FaMauiAkepa,
  FaHawaiiAkepa,
  FaKauaiCreeper,
  FaOahuCreeper,
  FaMauiCreeper,
  FaHawaiiCreeper,
  FaKauaiThrush,
  FaOahuThrush,
  FaMauiThrush,
  FaHawaiiThrush,
  FaKauaiFlycatcher,
  FaOahuFlycatcher,
  FaMauiFlycatcher,
  FaHawaiiFlycatcher,
  FaKauaiHoneycreeper,
  FaOahuHoneycreeper,
  FaMauiHoneycreeper,
  FaHawaiiHoneycreeper,
  FaKauaiFinch,
  FaOahuFinch,
  FaMauiFinch,
  FaHawaiiFinch,
  FaKauaiParrotbill,
  FaOahuParrotbill,
  FaMauiParrotbill,
  FaHawaiiParrotbill,
  FaKauaiCreeper,
  FaOahuCreeper,
  FaMauiCreeper,
  FaHawaiiCreeper,
  FaKauaiThrush,
  FaOahuThrush,
  FaMauiThrush,
  FaHawaiiThrush
} from 'react-icons/fa';
import { motion } from 'framer-motion';

// ==========================================================
// ACTION CONFIGURATION
// ==========================================================
const QUICK_ACTIONS = [
  {
    id: 'manage-users',
    label: 'Manage Users',
    path: '/admin/users',
    icon: FaUsers,
    color: '#6366f1',
    description: 'View and manage all users',
    badge: null,
    roles: ['ADMIN', 'SUPER_ADMIN']
  },
  {
    id: 'manage-providers',
    label: 'Manage Providers',
    path: '/admin/providers',
    icon: FaShieldAlt,
    color: '#10b981',
    description: 'Verify and manage service providers',
    badge: null,
    roles: ['ADMIN', 'SUPER_ADMIN']
  },
  {
    id: 'manage-bookings',
    label: 'Manage Bookings',
    path: '/admin/bookings',
    icon: FaClipboardList,
    color: '#f59e0b',
    description: 'View and manage all bookings',
    badge: null,
    roles: ['ADMIN', 'SUPER_ADMIN']
  },
  {
    id: 'manage-complaints',
    label: 'Manage Complaints',
    path: '/admin/complaints',
    icon: FaExclamationTriangle,
    color: '#ef4444',
    description: 'Resolve customer complaints',
    badge: null,
    roles: ['ADMIN', 'SUPER_ADMIN']
  },
  {
    id: 'analytics',
    label: 'Analytics',
    path: '/admin/analytics',
    icon: FaChartBar,
    color: '#8b5cf6',
    description: 'View platform analytics',
    badge: null,
    roles: ['ADMIN', 'SUPER_ADMIN']
  },
  {
    id: 'payments',
    label: 'Payments',
    path: '/admin/payments',
    icon: FaMoneyBillWave,
    color: '#ec4899',
    description: 'Manage transactions',
    badge: null,
    roles: ['ADMIN', 'SUPER_ADMIN']
  },
  {
    id: 'reports',
    label: 'Reports',
    path: '/admin/reports',
    icon: FaFileExport,
    color: '#06b6d4',
    description: 'Generate and export reports',
    badge: null,
    roles: ['ADMIN', 'SUPER_ADMIN']
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/admin/settings',
    icon: FaCog,
    color: '#6b7280',
    description: 'Configure system settings',
    badge: null,
    roles: ['ADMIN', 'SUPER_ADMIN']
  }
];

// ==========================================================
// STYLES
// ==========================================================
const styles = {
  container: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    padding: '20px',
    background: 'transparent',
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 24px',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  iconWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
  },
  labelWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  label: {
    fontWeight: 600,
    fontSize: '14px',
  },
  description: {
    fontSize: '11px',
    opacity: 0.8,
    marginTop: '2px',
  },
  badge: {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    background: '#ef4444',
    color: 'white',
    fontSize: '10px',
    fontWeight: 'bold',
    padding: '2px 6px',
    borderRadius: '10px',
    minWidth: '18px',
    textAlign: 'center',
  },
  mobileContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '16px',
  },
  mobileButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    width: '100%',
  },
};

// ==========================================================
// QUICK ACTIONS COMPONENT
// ==========================================================
const QuickActions = ({ 
  navigate, 
  variant = 'horizontal', // 'horizontal', 'vertical', 'grid'
  compact = false,
  showDescriptions = true,
  showIcons = true,
  customActions = null,
  userRole = 'ADMIN',
  onActionClick = null,
  className = '',
  style = {}
}) => {
  const filteredActions = useMemo(() => {
    const actions = customActions || QUICK_ACTIONS;
    return actions.filter(action => 
      !action.roles || action.roles.includes(userRole)
    );
  }, [customActions, userRole]);

  const handleActionClick = (action) => {
    if (onActionClick) {
      onActionClick(action);
    }
    if (action.path && navigate) {
      navigate(action.path);
    }
  };

  const getContainerStyle = () => {
    if (variant === 'vertical') {
      return styles.mobileContainer;
    }
    if (variant === 'grid') {
      return {
        ...styles.container,
        display: 'grid',
        gridTemplateColumns: compact ? 'repeat(auto-fill, minmax(140px, 1fr))' : 'repeat(auto-fill, minmax(180px, 1fr))',
      };
    }
    return styles.container;
  };

  const getButtonStyle = (action) => {
    const baseStyle = variant === 'vertical' ? styles.mobileButton : styles.actionButton;
    return {
      ...baseStyle,
      background: action.color,
      color: '#ffffff',
      position: 'relative',
      padding: compact ? '10px 16px' : baseStyle.padding,
      ...(variant === 'vertical' && { justifyContent: 'flex-start' }),
    };
  };

  if (filteredActions.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`quick-actions-container ${className}`}
      style={{ ...getContainerStyle(), ...style }}
    >
      {filteredActions.map((action, index) => (
        <motion.button
          key={action.id || action.label}
          onClick={() => handleActionClick(action)}
          style={getButtonStyle(action)}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          aria-label={action.label}
          title={action.description}
        >
          {showIcons && action.icon && (
            <span style={styles.iconWrapper}>
              <action.icon size={compact ? 16 : 18} />
            </span>
          )}
          
          <span style={styles.labelWrapper}>
            <span style={styles.label}>{action.label}</span>
            {showDescriptions && action.description && !compact && (
              <span style={styles.description}>{action.description}</span>
            )}
          </span>
          
          {action.badge && (
            <span style={styles.badge}>{action.badge}</span>
          )}
        </motion.button>
      ))}
    </motion.div>
  );
};

// ==========================================================
// DEFAULT EXPORT WITH MEMOIZATION
// ==========================================================
export default React.memo(QuickActions);

// ==========================================================
// HELPER COMPONENTS
// ==========================================================

/**
 * Icon-only version of QuickActions (compact mode)
 */
export const CompactQuickActions = (props) => (
  <QuickActions {...props} compact={true} showDescriptions={false} variant="horizontal" />
);

/**
 * Vertical version of QuickActions (for sidebars)
 */
export const VerticalQuickActions = (props) => (
  <QuickActions {...props} variant="vertical" showDescriptions={true} />
);

/**
 * Grid version of QuickActions (for dashboards)
 */
export const GridQuickActions = (props) => (
  <QuickActions {...props} variant="grid" showDescriptions={true} />
);

/**
 * Mobile-optimized version
 */
export const MobileQuickActions = (props) => (
  <QuickActions {...props} variant="vertical" compact={true} showDescriptions={false} />
);

// ==========================================================
// USAGE EXAMPLES (for documentation)
// ==========================================================

/*
 * Basic Usage:
 * <QuickActions navigate={useNavigate()} />
 * 
 * With Custom Actions:
 * <QuickActions 
 *   navigate={useNavigate()}
 *   customActions={[
 *     { label: "Custom Action", path: "/custom", icon: FaStar, color: "#6366f1", description: "Custom description" }
 *   ]}
 * />
 * 
 * Grid Layout:
 * <QuickActions navigate={useNavigate()} variant="grid" />
 * 
 * Vertical Layout (for sidebars):
 * <QuickActions navigate={useNavigate()} variant="vertical" />
 * 
 * Compact Mode:
 * <QuickActions navigate={useNavigate()} compact={true} />
 * 
 * With Click Handler:
 * <QuickActions 
 *   navigate={useNavigate()} 
 *   onActionClick={(action) => console.log('Clicked:', action)} 
 * />
 */