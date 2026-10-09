let timer;
self.onmessage = ({ data }) => {
  clearTimeout(timer);
  if (!data.cancel) timer = setTimeout(() => self.postMessage({ id: data.id }), data.ms);
};
