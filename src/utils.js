export function getBasePath() {
    // Detect if running on GitHub Pages
    const isGitHubPages = window.location.hostname.endsWith('github.io') || window.location.hostname.includes('localhost') && window.location.pathname.includes('/iyilikZinciri/');

    if (isGitHubPages) {
        // For GitHub Pages, the base path is typically the repository name
        return '/iyilikZinciri/';
    } else {
        // For local development or other deployments, derive from current path
        let path = window.location.pathname;
        const lastSlashIndex = path.lastIndexOf('/');
        return path.substring(0, lastSlashIndex + 1);
    }
}
