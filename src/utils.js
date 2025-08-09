export function getBasePath() {
    let path = window.location.pathname;
    // If the path includes a file name (e.g., index.html), remove it.
    const lastSlashIndex = path.lastIndexOf('/');
    // Return the path up to the last slash, ensuring it ends with a slash.
    return path.substring(0, lastSlashIndex + 1);
}
