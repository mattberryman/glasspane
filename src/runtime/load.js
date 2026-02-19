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
