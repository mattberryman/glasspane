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
