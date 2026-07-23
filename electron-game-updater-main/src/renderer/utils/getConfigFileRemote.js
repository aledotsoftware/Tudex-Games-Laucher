import { addCacheBustingSuffix } from "./addCacheBustingSuffix";

export const getConfigFileRemote = async (url) => {
    if (!url) return null;
    try {
        const urlWithCacheBusting = addCacheBustingSuffix(url);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
        const response = await fetch(urlWithCacheBusting, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) {
            throw new Error('Failed to fetch JSON');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.warn('Backend unavailable, using local launcher configuration:', error.message);
        return null;
    }
};
