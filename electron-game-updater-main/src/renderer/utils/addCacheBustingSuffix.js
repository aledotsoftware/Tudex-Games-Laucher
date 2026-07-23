export const addCacheBustingSuffix = (url) => {
    if (!url) return '';
    const randomNumber = Math.floor(Math.random() * 999) + 1;

    const separator = url.includes('?') ? '&' : '?';

    return `${url}${separator}v=${randomNumber}`;
};
