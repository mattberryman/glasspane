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
