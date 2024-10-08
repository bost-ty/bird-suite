// Define supported media types for CSV export
var MediaType;
(function (MediaTypeEnum) {
	MediaTypeEnum["csv"] = "text/csv";
	MediaTypeEnum["tsv"] = "text/tab-separated-values";
	MediaTypeEnum["plain"] = "text/plain";
})(MediaType || (MediaType = {}));

// Default configurations for CSV generation
const defaultConfig = {
	fieldSeparator: ",",
	decimalSeparator: ".",
	quoteStrings: true,
	quoteCharacter: '"',
	showTitle: false,
	title: "My Generated Report",
	filename: "generated",
	showColumnHeaders: true,
	useTextFile: false,
	fileExtension: "csv",
	mediaType: MediaType.csv,
	useBom: true,
	columnHeaders: [],
	useKeysAsHeaders: false,
	boolDisplay: { true: "TRUE", false: "FALSE" },
	replaceUndefinedWith: "",
};

// Line break and Byte Order Mark (BOM)
const NEW_LINE = "\r\n";
const BOM = "\uFEFF";

// Create a new config object by merging user options with default settings
const createConfig = (options) => Object.assign({}, defaultConfig, options);

// Custom errors for different scenarios
class CsvGenerationError extends Error {
	constructor(message) {
		super(message);
		this.name = "CsvGenerationError";
	}
}

class EmptyHeadersError extends Error {
	constructor(message) {
		super(message);
		this.name = "EmptyHeadersError";
	}
}

class CsvDownloadEnvironmentError extends Error {
	constructor(message) {
		super(message);
		this.name = "CsvDownloadEnvironmentError";
	}
}

class UnsupportedDataFormatError extends Error {
	constructor(message) {
		super(message);
		this.name = "UnsupportedDataFormatError";
	}
}

// Escape double quotes in a string
const escapeQuotes = (value, quoteChar) =>
	quoteChar === '"' && value.indexOf('"') > -1 ? value.replace(/"/g, '""') : value;

// Utility functions for field processing
const processFieldKey = (field) =>
	typeof field === "object" ? String(field.key) : String(field);
const processFieldLabel = (field) =>
	typeof field === "object" ? String(field.displayLabel) : String(field);

// Compositional functions for building CSV content
const applyTransformations = (initialValue, ...transforms) =>
	transforms.reduce((result, transform) => transform(result), initialValue);

const prependBom = (config) => (content) => config.useBom ? BOM + content : content;

const addTitle = (config) => (content) =>
	config.showTitle ? config.title + NEW_LINE + content : content;

const appendNewLine = (content) => content + NEW_LINE;

const addSeparator = (config) => (content) => content + config.fieldSeparator;

const processColumnHeaders = (config, headers) => (content) => {
	if (!config.showColumnHeaders) return content;

	if (headers.length < 1) {
		throw new EmptyHeadersError(
			"Headers are required when showColumnHeaders is true."
		);
	}

	let headerRow = headers
		.map((header) => processFieldLabel(header))
		.join(config.fieldSeparator);
	return content + headerRow + NEW_LINE;
};

const processDataRows = (config, headers, data) => (content) => {
	let result = content;
	for (let row of data) {
		let rowData = headers
			.map((header) => formatValue(config, row[processFieldKey(header)]))
			.join(config.fieldSeparator);
		result += rowData + NEW_LINE;
	}
	return result;
};

// Format a value based on its type for CSV
const formatNumber = (config, value) => {
	if (isNaN(value)) return String(value);
	if (config.decimalSeparator === "locale") {
		return value.toLocaleString();
	}
	return value.toString().replace(".", config.decimalSeparator);
};

const formatString = (config, value) => {
	let result = value;
	if (
		config.quoteStrings ||
		value.includes(config.fieldSeparator) ||
		value.includes(config.quoteCharacter) ||
		value.includes("\n") ||
		value.includes("\r")
	) {
		result = `${config.quoteCharacter}${escapeQuotes(value, config.quoteCharacter)}${
			config.quoteCharacter
		}`;
	}
	return result;
};

const formatBoolean = (config, value) => config.boolDisplay[value ? "true" : "false"];

const formatNullOrUndefined = (config, value) =>
	value === null || value === undefined
		? formatString(config, config.replaceUndefinedWith)
		: formatString(config, "null");

const formatValue = (config, value) => {
	if (typeof value === "number") return formatNumber(config, value);
	if (typeof value === "string") return formatString(config, value);
	if (typeof value === "boolean") return formatBoolean(config, value);
	if (value === null || value === undefined)
		return formatNullOrUndefined(config, value);
	throw new UnsupportedDataFormatError(`
        Unsupported data type: ${typeof value}. 
        Only number, string, boolean, null, and undefined are supported.
    `);
};

// Generate CSV from data and options
const generateCsv = (options) => (data) => {
	const config = createConfig(options);
	const headers = config.useKeysAsHeaders ? Object.keys(data[0]) : config.columnHeaders;

	let csvContent = applyTransformations(
		"",
		prependBom(config),
		addTitle(config),
		processColumnHeaders(config, headers),
		processDataRows(config, headers, data)
	);

	if (csvContent.length < 1) {
		throw new CsvGenerationError(
			"The generated CSV is empty. Check the data format."
		);
	}

	return csvContent;
};

// Create a Blob from the CSV content for download
const createBlob = (options) => (csvContent) => {
	const config = createConfig(options);
	const mediaType = config.useTextFile ? "text/plain" : config.mediaType;
	return new Blob([csvContent], { type: `${mediaType};charset=utf8;` });
};

// Download the CSV as a file in the browser environment
const downloadCsv = (options) => (csvContent) => {
	if (!window) {
		throw new CsvDownloadEnvironmentError(
			"CSV download is only supported in a browser environment."
		);
	}

	const config = createConfig(options);
	const blob = createBlob(options)(csvContent);
	const fileExtension = config.useTextFile ? "txt" : config.fileExtension;
	const filename = `${config.filename}.${fileExtension}`;

	const link = document.createElement("a");
	link.download = filename;
	link.href = URL.createObjectURL(blob);
	link.setAttribute("visibility", "hidden");

	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
};

// Export functions for use in other modules
export {
	createConfig as makeConfig,
	generateCsv,
	downloadCsv,
	createBlob as asBlob,
	MediaType,
};
