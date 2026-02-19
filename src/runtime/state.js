// ============================================================
// TELEPROMPTER STATE (outer scope so loadNewBtn can reach them)
// ============================================================

var teleprompterInited = false;

// Mutable DOM collections — refreshed on each script load
var tpLines = [];
var tpSections = [];
var tpPips = [];

// Highlight
var activeIndex = -1;

// Timer
var timerRunning = false;
var timerStart = 0;
var timerInterval = null;

// Auto-scroll
var scrollActive = false;
var scrollLevel = 3; // 1-7, default 3
var scrollRAF = null;
var lastFrameTime = null;
var scrollAccumulator = 0;

var SPEED_LEVELS = [
	{ px: 12, name: "1" },
	{ px: 18, name: "2" },
	{ px: 27, name: "3" },
	{ px: 40, name: "4" },
	{ px: 60, name: "5" },
	{ px: 90, name: "6" },
	{ px: 135, name: "7" },
];

// IntersectionObserver instance — disconnected and recreated per script load
var slideObserver = null;

// Forward-declared functions (assigned in initTeleprompter)
var stopScroll;
var startScroll;
var changeSpeed;
var setActive;
var setProgressPercent;
