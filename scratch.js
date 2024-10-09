const parameters = [
	{ q: "a", v: 1 },
	{ q: "b", v: 2 },
	{ q: "c", v: 3 },
	{ q: "d", v: 4 },
	{ q: "e", v: 5 },
	{ q: "f", v: 6 },
	{ q: "g", v: 7 },
	{ q: "h", v: 8 },
];

const p = parameters
	.map((x) => Object.values(x))
	.map((y) => y.join("="))
	.join("&");

console.log(p);
