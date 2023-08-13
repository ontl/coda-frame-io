export function formatTimecode(seconds) {
    if (seconds === null || seconds === undefined) return null;
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
