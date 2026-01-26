const fs = require('fs');
const path = require('path');

// Liste des icônes Lucide utilisées dans le projet (basée sur l'analyse)
const lucideIcons = [
  // Top utilisées
  'FileText', 'Link', 'CheckCircle', 'Download', 'Calendar', 'ArrowLeft',
  'Clock', 'Check', 'AlertCircle', 'Plus', 'Mail', 'Send', 'User', 'Search',
  'AlertTriangle', 'Users', 'Eye', 'CheckCircle2', 'ArrowRight', 'Trash2',
  'Paperclip', 'Phone', 'TrendingUp', 'Building2', 'XCircle', 'Save',
  'ChevronRight', 'Home', 'MapPin', 'Edit', 'Edit2', 'Edit3', 'Pencil',
  'X', 'ChevronDown', 'ChevronUp', 'ChevronLeft', 'Settings', 'Menu',
  'MoreVertical', 'MoreHorizontal', 'Filter', 'Upload', 'EyeOff', 'Star',
  'Heart', 'Info', 'HelpCircle', 'Bell', 'BellOff', 'Loader2', 'RefreshCw',
  'RefreshCcw', 'RotateCcw', 'RotateCw', 'Copy', 'Clipboard', 'ClipboardCheck',
  'ClipboardList', 'ExternalLink', 'ArrowUp', 'ArrowDown', 'ArrowUpRight',
  'ArrowDownRight', 'ChevronsDown', 'ChevronsUp', 'ChevronsLeft', 'ChevronsRight',
  'MinusCircle', 'PlusCircle', 'Minus', 'DollarSign', 'Euro', 'Wallet',
  'CreditCard', 'Receipt', 'Banknote', 'PiggyBank', 'Landmark', 'Calculator',
  'BarChart', 'BarChart2', 'BarChart3', 'PieChart', 'TrendingDown', 'Activity',
  'Target', 'Award', 'Trophy', 'Medal', 'Crown', 'Gem', 'Zap', 'Sparkles',
  'Folder', 'FolderOpen', 'FolderPlus', 'FolderMinus', 'File', 'FilePlus',
  'FileMinus', 'FileCheck', 'FileX', 'FileWarning', 'FileQuestion', 'Files',
  'Archive', 'Package', 'PackageOpen', 'PackageCheck', 'Box', 'Inbox',
  'Truck', 'ShoppingCart', 'ShoppingBag', 'Store', 'Tag', 'Tags', 'Bookmark',
  'BookmarkPlus', 'BookmarkMinus', 'Flag', 'Pin', 'Navigation', 'Compass',
  'Map', 'Globe', 'Earth', 'Building', 'Factory', 'Warehouse', 'Construction',
  'Hammer', 'Wrench', 'Tool', 'Cog', 'Settings2', 'Sliders', 'SlidersHorizontal',
  'ToggleLeft', 'ToggleRight', 'Power', 'PowerOff', 'Plug', 'PlugZap',
  'Wifi', 'WifiOff', 'Signal', 'Bluetooth', 'BluetoothOff', 'Battery',
  'BatteryCharging', 'BatteryFull', 'BatteryLow', 'BatteryMedium', 'BatteryWarning',
  'Sun', 'Moon', 'Cloud', 'CloudRain', 'CloudSnow', 'CloudSun', 'Thermometer',
  'Droplet', 'Wind', 'Umbrella', 'Snowflake', 'Flame', 'Lightbulb', 'LightbulbOff',
  'Lock', 'Unlock', 'Key', 'KeyRound', 'Shield', 'ShieldCheck', 'ShieldAlert',
  'ShieldOff', 'ShieldX', 'Fingerprint', 'ScanFace', 'ScanLine', 'QrCode',
  'LogIn', 'LogOut', 'UserPlus', 'UserMinus', 'UserCheck', 'UserX', 'UserCog',
  'Users2', 'Contact', 'Contact2', 'AtSign', 'MessageCircle', 'MessageSquare',
  'MessagesSquare', 'MessageCircleMore', 'Mic', 'MicOff', 'Video', 'VideoOff',
  'Camera', 'CameraOff', 'Image', 'ImagePlus', 'ImageMinus', 'Images',
  'Monitor', 'Tv', 'Smartphone', 'Tablet', 'Laptop', 'Watch', 'Headphones',
  'Speaker', 'Volume', 'Volume1', 'Volume2', 'VolumeX', 'Music', 'Music2',
  'Play', 'Pause', 'Square', 'Circle', 'Triangle', 'Octagon', 'Hexagon',
  'Pentagon', 'Diamond', 'RectangleHorizontal', 'RectangleVertical',
  'PlayCircle', 'PauseCircle', 'StopCircle', 'SkipBack', 'SkipForward',
  'Rewind', 'FastForward', 'Repeat', 'Shuffle', 'ListMusic', 'Disc',
  'Printer', 'Projector', 'Server', 'Database', 'HardDrive', 'Cpu', 'Chip',
  'Terminal', 'Code', 'Code2', 'Braces', 'Brackets', 'Hash', 'Binary',
  'Bot', 'BrainCircuit', 'BrainCog', 'Workflow', 'GitBranch', 'GitCommit',
  'GitMerge', 'GitPullRequest', 'Github', 'Gitlab', 'Chrome', 'Firefox',
  'Safari', 'Edge', 'Opera', 'Layers', 'Layout', 'LayoutDashboard', 'LayoutGrid',
  'LayoutList', 'LayoutTemplate', 'PanelLeft', 'PanelRight', 'PanelTop',
  'PanelBottom', 'Sidebar', 'SidebarOpen', 'SidebarClose', 'Columns', 'Rows',
  'Grid', 'Grid2x2', 'Grid3x3', 'Table', 'Table2', 'Kanban', 'Trello',
  'List', 'ListOrdered', 'ListTree', 'ListChecks', 'ListFilter', 'ListPlus',
  'ListMinus', 'ListX', 'ListVideo', 'CheckSquare', 'Square', 'SquareCheck',
  'XSquare', 'MinusSquare', 'PlusSquare', 'Shapes', 'Component', 'Puzzle',
  'Blocks', 'Boxes', 'Ungroup', 'Group', 'Merge', 'Split', 'Combine',
  'SplitSquareHorizontal', 'SplitSquareVertical', 'Move', 'MoveHorizontal',
  'MoveVertical', 'MoveDiagonal', 'MoveDiagonal2', 'MoveRight', 'MoveLeft',
  'MoveUp', 'MoveDown', 'Grab', 'Hand', 'Pointer', 'MousePointer', 'MousePointer2',
  'MousePointerClick', 'Maximize', 'Maximize2', 'Minimize', 'Minimize2',
  'Expand', 'Shrink', 'FullScreen', 'ZoomIn', 'ZoomOut', 'Focus', 'Crosshair',
  'Undo', 'Undo2', 'Redo', 'Redo2', 'History', 'Timer', 'TimerOff', 'TimerReset',
  'Hourglass', 'AlarmClock', 'AlarmClockOff', 'CalendarClock', 'CalendarCheck',
  'CalendarX', 'CalendarPlus', 'CalendarMinus', 'CalendarDays', 'CalendarRange',
  'CalendarSearch', 'CalendarHeart', 'CalendarOff', 'FileSearch', 'FileSearch2',
  'FolderSearch', 'FolderSearch2', 'TextSearch', 'SearchX', 'SearchCheck',
  'SearchCode', 'ScanSearch', 'Heading', 'Heading1', 'Heading2', 'Heading3',
  'Heading4', 'Heading5', 'Heading6', 'Type', 'Bold', 'Italic', 'Underline',
  'Strikethrough', 'Subscript', 'Superscript', 'AlignLeft', 'AlignCenter',
  'AlignRight', 'AlignJustify', 'WrapText', 'Pilcrow', 'Quote', 'TextQuote',
  'IndentIncrease', 'IndentDecrease', 'Link2', 'Link2Off', 'Unlink', 'Unlink2',
  'Anchor', 'Bookmark', 'Heart', 'HeartCrack', 'HeartHandshake', 'HeartOff',
  'HeartPulse', 'ThumbsUp', 'ThumbsDown', 'Smile', 'SmilePlus', 'Frown',
  'Meh', 'Angry', 'Laugh', 'PartyPopper', 'Cake', 'Gift', 'Ribbon',
  'Scale', 'Gavel', 'Balance', 'Vote', 'Megaphone', 'Newspaper', 'Rss',
  'Podcast', 'Radio', 'Tv2', 'MonitorPlay', 'Clapperboard', 'Film',
  'Ticket', 'Theater', 'Sofa', 'Armchair', 'Bed', 'BedDouble', 'BedSingle',
  'Bath', 'Shower', 'Toilet', 'Utensils', 'ChefHat', 'CookingPot', 'Microwave',
  'Refrigerator', 'WashingMachine', 'Shirt', 'Footprints', 'Baby', 'Dog',
  'Cat', 'Bird', 'Fish', 'Bug', 'Rabbit', 'Squirrel', 'Leaf', 'TreeDeciduous',
  'TreePine', 'Trees', 'Flower', 'Flower2', 'Clover', 'Sprout', 'Apple',
  'Banana', 'Cherry', 'Citrus', 'Grape', 'Nut', 'Carrot', 'Bean', 'Beef',
  'Cookie', 'Croissant', 'Egg', 'IceCream', 'Milk', 'Pizza', 'Popcorn',
  'Salad', 'Sandwich', 'Soup', 'Wine', 'Coffee', 'CupSoda', 'GlassWater',
  'Beer', 'Martini', 'Cigarette', 'CigaretteOff', 'Pill', 'Stethoscope',
  'Syringe', 'Thermometer', 'HeartPulse', 'Activity', 'Ambulance', 'Cross',
  'Hospital', 'Dna', 'TestTube', 'TestTube2', 'TestTubes', 'Microscope',
  'FlaskConical', 'FlaskRound', 'Atom', 'Orbit', 'Rocket', 'Satellite',
  'Telescope', 'Moon', 'Sun', 'Sunrise', 'Sunset', 'CloudMoon', 'CloudSun',
  'Stars', 'Sparkle', 'Comet', 'Mountain', 'MountainSnow', 'Tent', 'Compass',
  'Flag', 'Signpost', 'Milestone', 'Route', 'Footprints', 'Bike', 'Car',
  'Bus', 'Train', 'Plane', 'Ship', 'Sailboat', 'Anchor', 'Fuel', 'Parking',
  'ParkingCircle', 'ParkingSquare', 'TrafficCone', 'Construction', 'Shovel',
  'Axe', 'Hammer', 'Wrench', 'Screwdriver', 'Drill', 'Paintbrush', 'Palette',
  'Brush', 'PenTool', 'Highlighter', 'Eraser', 'Crop', 'Scissors', 'Slice',
  'Ruler', 'RulerCombined', 'Pipette', 'Stamp', 'Sticker', 'Tag', 'Tags',
  'Wallet2', 'Coins', 'HandCoins', 'CircleDollarSign', 'BadgeEuro', 'BadgeCheck',
  'BadgeAlert', 'BadgeHelp', 'BadgeInfo', 'BadgeMinus', 'BadgePlus', 'BadgeX',
  'ScrollText', 'FileSignature', 'FileClock', 'FileSpreadsheet', 'FileJson',
  'FileCode', 'FileImage', 'FileVideo', 'FileAudio', 'FileArchive', 'FolderCog',
  'FolderLock', 'FolderInput', 'FolderOutput', 'FolderSync', 'SquareArrowOutUpRight',
  'CircleArrowOutUpRight', 'CornerDownRight', 'CornerUpRight', 'CornerDownLeft',
  'CornerUpLeft', 'ArrowUpLeft', 'ArrowDownLeft', 'GripVertical', 'Grip',
  'GripHorizontal', 'CircleSlash', 'Ban', 'OctagonX', 'CircleX', 'SquareX',
  'LockKeyhole', 'Container', 'Forklift', 'ArrowLeftRight', 'Icon'
];

// Fonction pour traiter un fichier
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let changes = 0;

  lucideIcons.forEach(icon => {
    // Pattern 1: <Icon /> - self-closing sans aucune prop
    const pattern1 = new RegExp(`<${icon}\\s*/>`, 'g');
    content = content.replace(pattern1, (match) => {
      if (!match.includes('aria-hidden')) {
        changes++;
        return `<${icon} aria-hidden="true" />`;
      }
      return match;
    });

    // Pattern 2: <Icon size={...} /> - self-closing avec props, sans aria-hidden
    // Match: <Icon suivi de props, terminé par />
    const pattern2 = new RegExp(`<${icon}\\s+([^>]*?)\\s*/>`, 'g');
    content = content.replace(pattern2, (match, props) => {
      if (!match.includes('aria-hidden')) {
        changes++;
        return `<${icon} ${props.trim()} aria-hidden="true" />`;
      }
      return match;
    });

    // Pattern 3: <Icon size={...}> - non self-closing avec props (rare mais possible)
    const pattern3 = new RegExp(`<${icon}\\s+([^/>]*?)>(?!\\s*</)`, 'g');
    content = content.replace(pattern3, (match, props) => {
      if (!match.includes('aria-hidden') && !match.includes('</')) {
        changes++;
        return `<${icon} ${props.trim()} aria-hidden="true">`;
      }
      return match;
    });
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    return changes;
  }
  return 0;
}

// Fonction pour parcourir les fichiers
function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('.next')) {
      walkDir(filePath, callback);
    } else if (file.endsWith('.tsx')) {
      callback(filePath);
    }
  });
}

// Exécution
console.log('🔍 Recherche des icônes Lucide sans aria-hidden...\n');

let totalChanges = 0;
let filesModified = 0;

walkDir('./src', (filePath) => {
  const changes = processFile(filePath);
  if (changes > 0) {
    console.log(`✅ ${filePath} - ${changes} icône(s) corrigée(s)`);
    totalChanges += changes;
    filesModified++;
  }
});

console.log(`\n📊 Résumé:`);
console.log(`   Fichiers modifiés: ${filesModified}`);
console.log(`   Icônes corrigées: ${totalChanges}`);
console.log('\n✨ Terminé! Lancez "npm run build" pour vérifier.');
