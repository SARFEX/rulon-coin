export function load({ setHeaders }) {
	setHeaders({
		"Cache-Control": "no-store, must-revalidate",
		"Pragma": "no-cache",
		"Expires": "0"
	});
}
