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

// ============================================================
// RENDERER
// ============================================================

function renderScript(slides) {
	var frag = document.createDocumentFragment();

	slides.forEach(function (slide, slideIndex) {
		// Divider before non-first slides
		if (slideIndex > 0) {
			var hr = document.createElement("hr");
			hr.className = "slide-divider";
			frag.appendChild(hr);
		}

		var section = document.createElement("div");
		section.className = "slide-section";
		section.id = "slide-" + slideIndex;

		// Slide header
		if (slide.title) {
			var header = document.createElement("div");
			header.className = "slide-header";
			header.textContent = slide.title;
			section.appendChild(header);
		}

		// Blocks
		slide.blocks.forEach(function (block) {
			var el = document.createElement("div");
			if (block.type === "click") {
				el.className = "d-click";
				el.textContent = "CLICK";
			} else if (block.type === "pause") {
				el.className = "d-pause";
				el.textContent = "[PAUSE" + (block.note ? " " + block.note : "") + "]";
			} else if (block.type === "note") {
				el.className = "d-note";
				el.textContent = "[NOTE" + (block.text ? " " + block.text : "") + "]";
			} else if (block.type === "line") {
				el.className = "line";
				// DOMPurify sanitises the pre-processed HTML before DOM insertion
				var clean = DOMPurify.sanitize(block.html, {
					ALLOWED_TAGS: ["span"],
					ALLOWED_ATTR: ["class"],
				});
				el.appendChild(createSanitisedFragment(clean));
			}
			section.appendChild(el);
		});

		frag.appendChild(section);
	});

	// Replace content atomically
	var scriptContent = document.getElementById("scriptContent");
	while (scriptContent.firstChild) {
		scriptContent.removeChild(scriptContent.firstChild);
	}
	scriptContent.appendChild(frag);

	// Populate slide pips
	var slideNav = document.getElementById("slideNav");
	while (slideNav.firstChild) {
		slideNav.removeChild(slideNav.firstChild);
	}
	slides.forEach(function (slide, index) {
		var pip = document.createElement("div");
		pip.className = "slide-pip";
		pip.dataset.slide = index;
		pip.title = slide.title || "Slide " + (index + 1);
		slideNav.appendChild(pip);
	});
}

/**
 * createSanitisedFragment — converts a DOMPurify-sanitised HTML string
 * into a DocumentFragment for safe insertion.
 */
function createSanitisedFragment(sanitisedHtml) {
	var template = document.createElement("template");
	template.innerHTML = sanitisedHtml;
	return template.content;
}

// ============================================================
// SCRIPT LOADING
// ============================================================

function loadScript(text) {
	var slides = parseScript(text);
	renderScript(slides);
	document.getElementById("drop-zone").style.display = "none";
	document.getElementById("fileInput").disabled = true;
	document.getElementById("teleprompter").style.display = "";
	window.scrollTo(0, 0);

	if (!teleprompterInited) {
		initTeleprompter();
		teleprompterInited = true;
	} else {
		refreshTeleprompter();
	}
}

function handleFile(file) {
	var reader = new FileReader();
	reader.onload = function () {
		loadScript(reader.result);
	};
	reader.onerror = function () {
		alert("Could not read file.");
	};
	reader.readAsText(file);
}

// Drag and drop
var dropTarget = document.getElementById("dropTarget");

dropTarget.addEventListener("dragover", function (e) {
	e.preventDefault();
	dropTarget.classList.add("drag-over");
});

dropTarget.addEventListener("dragleave", function () {
	dropTarget.classList.remove("drag-over");
});

dropTarget.addEventListener("drop", function (e) {
	e.preventDefault();
	dropTarget.classList.remove("drag-over");
	var files = e.dataTransfer.files;
	if (files.length > 0) {
		handleFile(files[0]);
	}
});

// File input fallback
document.getElementById("fileInput").addEventListener("change", function (e) {
	if (e.target.files.length > 0) {
		handleFile(e.target.files[0]);
	}
});

// Demo link
document.getElementById("demoLink").addEventListener("click", function (e) {
	e.preventDefault();
	fetch("./scripts/jfk-inaugural.md")
		.then(function (r) {
			if (!r.ok) throw new Error("Demo script not found (" + r.status + ")");
			return r.text();
		})
		.then(function (text) {
			loadScript(text);
		})
		.catch(function (err) {
			alert("Could not load demo: " + err.message);
		});
});

// Load new script button
document.getElementById("loadNewBtn").addEventListener("click", function () {
	// Stop auto-scroll if active
	if (scrollActive && stopScroll) stopScroll();
	// Stop timer if running
	if (timerRunning) {
		clearInterval(timerInterval);
		timerInterval = null;
		timerRunning = false;
	}

	document.getElementById("teleprompter").style.display = "none";
	document.getElementById("drop-zone").style.display = "";
	document.getElementById("fileInput").disabled = false;
	var scriptContent = document.getElementById("scriptContent");
	while (scriptContent.firstChild) {
		scriptContent.removeChild(scriptContent.firstChild);
	}
	var slideNav = document.getElementById("slideNav");
	while (slideNav.firstChild) {
		slideNav.removeChild(slideNav.firstChild);
	}
	document.getElementById("settingsPanel").classList.remove("visible");
	// Reset progress
	document.getElementById("progressFill").style.width = "0%";
	// Reset timer display
	document.getElementById("timerDisplay").textContent = "00:00";
	document.getElementById("timer").classList.remove("running");
});

// On page load: check for shared script ID
var scriptId = document.body.dataset.scriptId;
if (scriptId) {
	fetch("/script/" + scriptId)
		.then(function (r) {
			if (!r.ok) throw new Error("Script not found");
			return r.text();
		})
		.then(function (text) {
			loadScript(text);
		})
		.catch(function () {
			var dropTarget = document.getElementById("dropTarget");
			var errMsg = document.createElement("div");
			errMsg.style.cssText =
				"color: var(--click); margin-top: 12px; font-size: 14px;";
			errMsg.textContent =
				"The shared script could not be found. It may have expired or been removed.";
			dropTarget.parentNode.insertBefore(errMsg, dropTarget.nextSibling);
		});
}

// ============================================================
// TELEPROMPTER INTERACTIONS
// (Adapted from psd3-teleprompter.html — re-queries DOM after render)
// ============================================================

/**
 * refreshTeleprompter — re-queries DOM collections that change on each
 * script load (lines, sections, pips) and reconnects the
 * IntersectionObserver. Resets highlight and scroll state.
 */
function refreshTeleprompter() {
	tpLines = document.querySelectorAll(".line");
	tpSections = document.querySelectorAll(".slide-section");
	tpPips = document.querySelectorAll(".slide-pip");

	// Reset state
	activeIndex = -1;
	if (scrollActive && stopScroll) stopScroll();

	// Reconnect IntersectionObserver for new sections
	if (slideObserver) slideObserver.disconnect();
	slideObserver = new IntersectionObserver(
		function (entries) {
			entries.forEach(function (entry) {
				if (entry.isIntersecting) {
					var slideId = entry.target.id;
					tpPips.forEach(function (p) {
						p.classList.toggle(
							"active",
							"slide-" + p.dataset.slide === slideId,
						);
					});
				}
			});
		},
		{ threshold: 0.3 },
	);
	tpSections.forEach(function (s) {
		slideObserver.observe(s);
	});

	// Re-attach pip click listeners (pips are new DOM elements)
	tpPips.forEach(function (pip) {
		pip.addEventListener("click", function (e) {
			e.stopPropagation();
			if (scrollActive) stopScroll();
			var section = document.getElementById("slide-" + pip.dataset.slide);
			if (section) {
				section.scrollIntoView({ behavior: "smooth", block: "start" });
				var firstLine = section.querySelector(".line");
				if (firstLine) {
					var idx = Array.from(tpLines).indexOf(firstLine);
					if (idx >= 0) setActive(idx);
				}
			}
		});
	});
}

/**
 * initTeleprompter — called exactly once on the first script load.
 * Registers all global event listeners and performs the initial
 * DOM query via refreshTeleprompter().
 */
function initTeleprompter() {
	var htmlEl = document.documentElement;
	var timerEl = document.getElementById("timer");
	var timerDisplay = document.getElementById("timerDisplay");
	var progressFill = document.getElementById("progressFill");
	var scrollIndicator = document.getElementById("scrollIndicator");
	var scrollDots = document.querySelectorAll("#scrollDots .dot");
	var scrollSpeedName = document.getElementById("scrollSpeedName");
	var scrollGlow = document.getElementById("scrollGlow");
	var mainContainer = document.getElementById("mainContainer");

	// HIGHLIGHT
	setActive = function (index) {
		tpLines.forEach(function (l) {
			l.classList.remove("active");
		});
		if (index >= 0 && index < tpLines.length) {
			activeIndex = index;
			tpLines[index].classList.add("active");
			updateProgress();
			updateSlidePips();
		}
	};

	function updateProgress() {
		var pct = ((activeIndex + 1) / tpLines.length) * 100;
		progressFill.style.width = pct + "%";
	}

	function updateSlidePips() {
		if (activeIndex < 0) return;
		var section = tpLines[activeIndex].closest(".slide-section");
		if (!section) return;
		var slideId = section.id;
		tpPips.forEach(function (p) {
			p.classList.toggle("active", "slide-" + p.dataset.slide === slideId);
		});
	}

	// AUTO-SCROLL
	function updateSpeedDisplay() {
		scrollDots.forEach(function (dot, i) {
			dot.classList.toggle("filled", i < scrollLevel);
		});
		scrollSpeedName.textContent = SPEED_LEVELS[scrollLevel - 1].name;
	}

	startScroll = function () {
		if (scrollActive) return;
		scrollActive = true;
		lastFrameTime = null;
		scrollAccumulator = 0;
		htmlEl.style.scrollBehavior = "auto";
		scrollIndicator.classList.add("visible");
		scrollGlow.classList.add("visible");
		updateSpeedDisplay();
		scrollRAF = requestAnimationFrame(scrollTick);
	};

	stopScroll = function () {
		if (!scrollActive) return;
		scrollActive = false;
		htmlEl.style.scrollBehavior = "smooth";
		scrollIndicator.classList.remove("visible");
		scrollGlow.classList.remove("visible");
		if (scrollRAF) {
			cancelAnimationFrame(scrollRAF);
			scrollRAF = null;
		}
		lastFrameTime = null;
	};

	function scrollTick(timestamp) {
		if (!scrollActive) return;

		if (lastFrameTime === null) {
			lastFrameTime = timestamp;
			scrollRAF = requestAnimationFrame(scrollTick);
			return;
		}

		var delta = (timestamp - lastFrameTime) / 1000;
		lastFrameTime = timestamp;

		var clampedDelta = Math.min(delta, 0.1);

		var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
		if (window.scrollY >= maxScroll - 1) {
			stopScroll();
			return;
		}

		var speed = SPEED_LEVELS[scrollLevel - 1].px;
		scrollAccumulator += speed * clampedDelta;

		var pixels = Math.floor(scrollAccumulator);
		if (pixels > 0) {
			scrollAccumulator -= pixels;
			window.scrollBy(0, pixels);
		}

		scrollRAF = requestAnimationFrame(scrollTick);
	}

	changeSpeed = function (delta) {
		var newLevel = scrollLevel + delta;
		if (newLevel < 1 || newLevel > SPEED_LEVELS.length) return;
		scrollLevel = newLevel;
		updateSpeedDisplay();
	};

	// KEYBOARD (registered once)
	document.addEventListener("keydown", function (e) {
		// Only respond when teleprompter is visible
		if (document.getElementById("teleprompter").style.display === "none")
			return;

		if (e.key === "Escape") {
			if (scrollActive) {
				e.preventDefault();
				stopScroll();
			}
			var panel = document.getElementById("settingsPanel");
			if (panel.classList.contains("visible")) {
				panel.classList.remove("visible");
			}
			return;
		}

		if (e.key === "ArrowDown") {
			e.preventDefault();
			if (!scrollActive) {
				startScroll();
			} else {
				changeSpeed(1);
			}
			return;
		}

		if (e.key === "ArrowUp") {
			e.preventDefault();
			if (scrollActive) {
				changeSpeed(-1);
			}
			return;
		}

		if (e.key === "j") {
			e.preventDefault();
			var next = Math.min(activeIndex + 1, tpLines.length - 1);
			setActive(next);
			if (!scrollActive) {
				tpLines[next].scrollIntoView({ behavior: "smooth", block: "center" });
			}
			return;
		}
		if (e.key === "k") {
			e.preventDefault();
			var prev = Math.max(activeIndex - 1, 0);
			setActive(prev);
			if (!scrollActive) {
				tpLines[prev].scrollIntoView({ behavior: "smooth", block: "center" });
			}
			return;
		}
	});

	// CLICK — stop scroll OR highlight paragraph (registered once on mainContainer)
	mainContainer.addEventListener("click", function (e) {
		if (scrollActive) {
			stopScroll();
			return;
		}

		var line = e.target.closest(".line");
		if (line) {
			var idx = Array.from(tpLines).indexOf(line);
			if (idx >= 0) setActive(idx);
		}
	});

	// Also stop on click outside container (registered once)
	document.body.addEventListener(
		"click",
		function (e) {
			if (
				scrollActive &&
				!timerEl.contains(e.target) &&
				!document.getElementById("slideNav").contains(e.target)
			) {
				stopScroll();
			}
		},
		true,
	);

	// SCROLL WHEEL (registered once)
	window.addEventListener(
		"wheel",
		function () {
			if (scrollActive) stopScroll();
		},
		{ passive: true },
	);

	// WINDOW BLUR (registered once)
	window.addEventListener("blur", function () {
		if (scrollActive) stopScroll();
	});

	// TIMER (registered once)
	timerEl.addEventListener("click", function (e) {
		e.stopPropagation();
		if (timerRunning) {
			clearInterval(timerInterval);
			timerInterval = null;
			timerRunning = false;
			timerEl.classList.remove("running");
		} else {
			if (timerDisplay.textContent === "00:00") {
				timerStart = Date.now();
			} else {
				var parts = timerDisplay.textContent.split(":");
				var elapsed = parseInt(parts[0]) * 60000 + parseInt(parts[1]) * 1000;
				timerStart = Date.now() - elapsed;
			}
			timerRunning = true;
			timerEl.classList.add("running");
			timerInterval = setInterval(function () {
				var elapsed = Date.now() - timerStart;
				var mins = Math.floor(elapsed / 60000);
				var secs = Math.floor((elapsed % 60000) / 1000);
				timerDisplay.textContent =
					String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
			}, 250);
		}
	});

	timerEl.addEventListener("dblclick", function () {
		clearInterval(timerInterval);
		timerInterval = null;
		timerRunning = false;
		timerEl.classList.remove("running");
		timerDisplay.textContent = "00:00";
	});

	// SCROLL-BASED PROGRESS (registered once)
	window.addEventListener(
		"scroll",
		function () {
			var maxScroll =
				document.documentElement.scrollHeight - window.innerHeight;
			if (maxScroll > 0) {
				var pct = (window.scrollY / maxScroll) * 100;
				progressFill.style.width = pct + "%";
			}
		},
		{ passive: true },
	);

	// Initial DOM query + IntersectionObserver setup
	refreshTeleprompter();
}

// ============================================================
// SETTINGS PANEL
// ============================================================

(function initSettings() {
	var savedTheme = localStorage.getItem("gp-theme") || "night";
	var savedAccent = localStorage.getItem("gp-accent") || "gold";

	document.documentElement.dataset.theme = savedTheme;
	document.documentElement.dataset.accent = savedAccent;

	// Check matching radio inputs
	var themeRadio = document.querySelector(
		'input[name="theme"][value="' + savedTheme + '"]',
	);
	if (themeRadio) themeRadio.checked = true;

	var accentRadio = document.querySelector(
		'input[name="accent"][value="' + savedAccent + '"]',
	);
	if (accentRadio) accentRadio.checked = true;

	// Theme radio change
	document.querySelectorAll('input[name="theme"]').forEach(function (radio) {
		radio.addEventListener("change", function () {
			document.documentElement.dataset.theme = radio.value;
			localStorage.setItem("gp-theme", radio.value);
		});
	});

	// Accent radio change
	document.querySelectorAll('input[name="accent"]').forEach(function (radio) {
		radio.addEventListener("change", function () {
			document.documentElement.dataset.accent = radio.value;
			localStorage.setItem("gp-accent", radio.value);
		});
	});

	// Toggle settings panel
	var settingsBtn = document.getElementById("settingsBtn");
	var settingsPanel = document.getElementById("settingsPanel");

	settingsBtn.addEventListener("click", function (e) {
		e.stopPropagation();
		settingsPanel.classList.toggle("visible");
	});

	// Click outside panel -> close
	document.addEventListener("click", function (e) {
		if (!settingsPanel.contains(e.target) && e.target !== settingsBtn) {
			settingsPanel.classList.remove("visible");
		}
	});
})();
