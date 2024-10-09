/**
 * renderEvents
 * @param {HTMLElement} parent
 * @param {{ time: Number , data: String}} events
 */
function renderEvents(parent, events) {
	console.log("RENDER EVENTS", events.length);
	if (events.length === 0) {
		parent.innerHTML = "";
		return;
	}
	while (parent.children.length > events.length) {
		parent.lastChild.remove();
	}
	events.forEach((eventObject, index) => {
		const { time, data } = eventObject;
		let element;
		if (index < parent.children.length) {
			element = parent.children[index];
		} else {
			element = document.createElement("div");
			parent.appendChild(element);
		}
		element.innerHTML = `${new Date(time).toLocaleTimeString()}: ${data}`;
	});
}
function renderURLSearchParamsAsUL(parentElement, urlSearchParams, keyWhitelist) {
	parentElement.innerHTML = "";
	const ul = document.createElement("ul");
	urlSearchParams.forEach((value, key) => {
		const li = document.createElement("li");
		if (keyWhitelist.includes(key)) {
			li.innerHTML = `<strong>${key}</strong> ${value}`;
			ul.appendChild(li);
		}
	});
	parentElement.appendChild(ul);
	return ul;
}

function toggleVisibility(...elements) {
	const dur = 250;
	elements.forEach((element) => {
		const isHidden = element.hidden;
		element.style.transitionProperty = "opacity, transform";
		element.style.transitionDuration = `${dur}ms`;
		element.style.transitionTimingFunction = "ease";
		let transitionTimeout = setTimeout(() => {}, 0);
		if (isHidden) {
			clearTimeout(transitionTimeout);
			element.style.opacity = 0;
			element.style.transform = "translateY(-1rem)";
			element.hidden = !element.hidden;
			transitionTimeout = setTimeout(() => {
				element.style.opacity = 1;
				element.style.transform = "translateY(0) ";
			}, dur);
		} else if (!isHidden) {
			clearTimeout(transitionTimeout);
			element.style.transform = "translateY(-1rem)";
			element.style.opacity = 0;
			transitionTimeout = setTimeout(() => {
				element.hidden = !element.hidden;
			}, dur + 100);
		} else {
			throw new Error(`toggleVisibility couldn't evaluate isHidden for ${element}`);
		}
	});
}

export { renderEvents, renderURLSearchParamsAsUL, toggleVisibility };
