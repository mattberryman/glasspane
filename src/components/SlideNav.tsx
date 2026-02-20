import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { activeIndex, scrollActive, slides } from "../state.js";

export function SlideNav() {
	const activePip = useSignal(0);

	useEffect(() => {
		const sections = document.querySelectorAll(".slide-section");
		if (sections.length === 0) {
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						const id = entry.target.id; // "slide-0", "slide-1", etc.
						const idx = Number.parseInt(id.replace("slide-", ""), 10);
						if (!Number.isNaN(idx)) {
							activePip.value = idx;
						}
					}
				}
			},
			{ threshold: 0.3 },
		);

		for (const s of sections) {
			observer.observe(s);
		}
		return () => observer.disconnect();
	}, [slides.value]); // re-run when slides change

	function onPipClick(e: MouseEvent, slideIndex: number) {
		e.stopPropagation();
		if (scrollActive.value) {
			scrollActive.value = false;
		}
		const section = document.getElementById(`slide-${slideIndex}`);
		if (section) {
			section.scrollIntoView({ behavior: "smooth", block: "start" });
			// Set activeIndex to first line of this slide
			const allLineDivs = document.querySelectorAll(".line");
			const firstLineInSection = section.querySelector(".line");
			if (firstLineInSection) {
				const idx = Array.from(allLineDivs).indexOf(
					firstLineInSection as HTMLElement,
				);
				if (idx >= 0) {
					activeIndex.value = idx;
				}
			}
		}
	}

	return (
		<div class="slide-nav" id="slideNav">
			{slides.value.map((slide, i) => (
				// biome-ignore lint/a11y/noStaticElementInteractions: pip navigation; global keyboard (j/k) handles arrow-style nav
				// biome-ignore lint/a11y/useKeyWithClickEvents: pip navigation; global keyboard (j/k) handles arrow-style nav
				<div
					key={i}
					class={`slide-pip${activePip.value === i ? " active" : ""}`}
					title={slide.title || `Slide ${i + 1}`}
					onClick={(e) => onPipClick(e as MouseEvent, i)}
				/>
			))}
		</div>
	);
}
