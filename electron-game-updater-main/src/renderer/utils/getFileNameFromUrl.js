export const getFileNameFromUrl = (url) => {
  if (!url) return "";
  try {
    const myURL = new URL(url);
    return myURL.pathname.split("/").pop();
  } catch (e) {
    return String(url).split("/").pop().split("?")[0];
  }
};
