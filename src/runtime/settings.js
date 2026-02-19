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
