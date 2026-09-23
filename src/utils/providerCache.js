const providerCache = new Map();

export const getCachedProviders = (area, services) => {
  const key = `${area}-${services.sort().join(",")}`;
  return providerCache.get(key);
};

export const setCachedProviders = (area, services, providers) => {
  const key = `${area}-${services.sort().join(",")}`;
  providerCache.set(key, {
    providers,
    cachedAt: Date.now(),
  });
};
