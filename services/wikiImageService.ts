/**
 * Image service using Wikipedia/Wikimedia APIs for high-quality, free images.
 * 
 * Strategy:
 * 1. Try Wikipedia page image API (best for well-known landmarks)
 * 2. Try Wikimedia Commons direct file lookup
 * 3. Fallback to a reliable placeholder
 */

type ImageResult = {
  url: string;
  title?: string;
  attribution?: string;
};

const cache = new Map<string, ImageResult | null>();
const inflight = new Map<string, Promise<ImageResult | null>>();

const MAX_CONCURRENT = 4;
let active = 0;
const waiters: Array<() => void> = [];

async function withLimit<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) {
    await new Promise<void>(resolve => waiters.push(resolve));
  }
  active++;
  try {
    return await fn();
  } finally {
    active--;
    const next = waiters.shift();
    if (next) next();
  }
}

async function fetchJson<T>(url: string, timeoutMs = 8000): Promise<T | null> {
  return await withLimit(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  });
}

/**
 * Get image from Wikipedia page using pageimages API.
 * This works well for famous landmarks, cities, monuments.
 */
async function getWikipediaImage(title: string): Promise<ImageResult | null> {
  const q = title.trim();
  if (!q) return null;

  try {
    // Use pageimages with thumbnail to get a properly sized image
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(q)}&prop=pageimages&pithumbsize=1200&format=json&origin=*`;
    const data = await fetchJson<any>(url);

    const pages = data?.query?.pages;
    if (!pages) return null;

    const page = Object.values(pages)[0] as any;
    
    // Check for thumbnail (resized) first, then original
    const imageUrl = page?.thumbnail?.source || page?.original?.source;
    if (!imageUrl) return null;

    return {
      url: imageUrl,
      title: q,
      attribution: 'Wikipedia',
    };
  } catch {
    return null;
  }
}

/**
 * Search Wikipedia for a page and get its image.
 * Useful when we don't have the exact page title.
 */
async function searchWikipediaForImage(query: string): Promise<ImageResult | null> {
  const q = query.trim();
  if (!q) return null;

  try {
    // First search for the page with more specific search
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=8&format=json&origin=*`;
    const searchData = await fetchJson<any>(searchUrl);

    const searchResults = searchData?.query?.search;
    if (!searchResults?.length) return null;

    // Filter results to prioritize exact or close matches
    const queryWords = q.toLowerCase().split(/\s+/);
    const scoredResults = searchResults.map((r: any) => {
      const titleLower = r.title.toLowerCase();
      let score = 0;
      // Exact match gets highest score
      if (titleLower === q.toLowerCase()) score += 100;
      // Title contains all query words
      if (queryWords.every(w => titleLower.includes(w))) score += 50;
      // Title starts with query
      if (titleLower.startsWith(q.toLowerCase().split(' ')[0])) score += 25;
      // Each matching word adds score
      queryWords.forEach(w => { if (titleLower.includes(w)) score += 10; });
      return { ...r, score };
    }).sort((a: any, b: any) => b.score - a.score);

    // Try to get image from the top scored results
    for (const result of scoredResults.slice(0, 5)) {
      const pageTitle = result.title;
      const imageResult = await getWikipediaImage(pageTitle);
      if (imageResult) {
        return imageResult;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Search Wikimedia Commons for images related to a query.
 * Good for geographic features, landmarks, and locations.
 */
async function searchWikimediaCommons(query: string): Promise<ImageResult | null> {
  const q = query.trim();
  if (!q) return null;

  try {
    // Search Wikimedia Commons for images
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srnamespace=6&srlimit=5&format=json&origin=*`;
    const searchData = await fetchJson<any>(searchUrl);

    const results = searchData?.query?.search;
    if (!results?.length) return null;

    // Try to get actual image URL from top results
    for (const result of results) {
      const fileName = result.title;
      if (!fileName.startsWith('File:')) continue;
      
      // Get image info
      const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(fileName)}&prop=imageinfo&iiprop=url&iiurlwidth=1200&format=json&origin=*`;
      const infoData = await fetchJson<any>(infoUrl);
      
      const pages = infoData?.query?.pages;
      if (!pages) continue;
      
      const page = Object.values(pages)[0] as any;
      const imageInfo = page?.imageinfo?.[0];
      
      // Prefer thumburl (resized) over original for better performance
      const imageUrl = imageInfo?.thumburl || imageInfo?.url;
      if (imageUrl && !imageUrl.includes('.svg')) {
        return {
          url: imageUrl,
          title: q,
          attribution: 'Wikimedia Commons',
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Get a high-quality fallback image URL.
 * Uses picsum.photos for realistic placeholder images.
 */
function getFallbackImageUrl(query: string): string {
  // Use a hash of the query to get consistent but varied images
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    hash = ((hash << 5) - hash) + query.charCodeAt(i);
    hash = hash & hash;
  }
  const seed = Math.abs(hash) % 1000;
  
  // picsum.photos provides beautiful royalty-free images
  return `https://picsum.photos/seed/${seed}/1600/900`;
}

/**
 * Extract meaningful search terms from activity descriptions.
 * E.g., "Saigon River Cruise" -> tries "Saigon River", "Ho Chi Minh City River", etc.
 */
function extractSearchVariants(query: string, context?: string): string[] {
  const variants: string[] = [];
  const originalQuery = query.trim();
  const words = originalQuery.split(/\s+/).filter(w => w.length > 2);
  
  // Skip common activity words to get the place/landmark name
  const activityWords = ['cruise', 'tour', 'visit', 'explore', 'walk', 'trip', 'excursion', 'adventure', 'experience', 'journey', 'safari', 'hike', 'trek', 'ride', 'boat', 'ferry', 'bus', 'train'];
  const timeWords = ['day', 'morning', 'evening', 'night', 'afternoon', 'full', 'half', 'hour'];
  const mealWords = ['breakfast', 'lunch', 'dinner', 'meal', 'food', 'dining'];
  const stopWords = ['at', 'the', 'and', 'or', 'in', 'on', 'to', 'for', 'with', 'from', 'by', 'a', 'an'];
  const skipWords = [...activityWords, ...timeWords, ...mealWords, ...stopWords];
  
  const placeWords = words.filter(w => !skipWords.includes(w.toLowerCase()));
  
  // Priority 1: Extract place name from query (e.g., "Saigon River" from "Saigon River Cruise")
  if (placeWords.length > 0) {
    variants.push(placeWords.join(' '));
  }
  
  // Priority 2: Try context + key place words (e.g., "Ho Chi Minh City River")
  if (context && placeWords.length > 0) {
    variants.push(`${context} ${placeWords.join(' ')}`);
    // Just the last noun with context (often the main subject)
    variants.push(`${context} ${placeWords[placeWords.length - 1]}`);
  }
  
  // Priority 3: Original query (might work for specific attractions)
  variants.push(originalQuery);
  
  // Priority 4: If the query contains a river/lake/beach, try to find that geographic feature
  const geoFeatures = ['river', 'lake', 'beach', 'mountain', 'valley', 'bay', 'island', 'falls', 'waterfall', 'park', 'garden', 'temple', 'palace', 'tower', 'bridge'];
  const hasGeoFeature = words.some(w => geoFeatures.includes(w.toLowerCase()));
  if (hasGeoFeature && context) {
    const geoWord = words.find(w => geoFeatures.includes(w.toLowerCase()));
    if (geoWord) {
      // Try "Saigon River" pattern
      const beforeGeo = words.slice(0, words.indexOf(geoWord) + 1).filter(w => !skipWords.includes(w.toLowerCase()));
      if (beforeGeo.length > 0) {
        variants.push(beforeGeo.join(' '));
      }
    }
  }
  
  // Priority 5: Just the context (city/destination) as last resort before fallback
  if (context) {
    variants.push(context);
  }
  
  // Remove duplicates while preserving order
  return [...new Set(variants)];
}

export async function resolvePlaceImage(query: string, context?: string): Promise<ImageResult | null> {
  const rawQuery = (query || '').trim();
  const rawContext = (context || '').trim();
  
  if (!rawQuery) return null;
  
  const key = `${rawQuery}|||${rawContext}`.toLowerCase();
  if (cache.has(key)) return cache.get(key) ?? null;

  const existing = inflight.get(key);
  if (existing) return existing;

  const task = (async (): Promise<ImageResult | null> => {
    try {
      // Get search variants for better matching
      const variants = extractSearchVariants(rawQuery, rawContext);
      
      // Strategy 1: Try exact Wikipedia page image for each variant
      for (const variant of variants) {
        const exactResult = await getWikipediaImage(variant);
        if (exactResult) {
          cache.set(key, exactResult);
          return exactResult;
        }
      }

      // Strategy 2: Search Wikipedia for each variant
      for (const variant of variants) {
        const searchResult = await searchWikipediaForImage(variant);
        if (searchResult) {
          cache.set(key, searchResult);
          return searchResult;
        }
      }

      // Strategy 3: Search Wikimedia Commons (good for geographic features)
      for (const variant of variants.slice(0, 3)) { // Limit to top 3 variants
        const commonsResult = await searchWikimediaCommons(variant);
        if (commonsResult) {
          cache.set(key, commonsResult);
          return commonsResult;
        }
      }

      // Fallback: Use a nice placeholder image
      const fallbackUrl = getFallbackImageUrl(rawQuery);
      const fallbackResult: ImageResult = { 
        url: fallbackUrl, 
        title: rawQuery,
        attribution: 'Picsum Photos'
      };
      cache.set(key, fallbackResult);
      return fallbackResult;
    } catch {
      const fallbackUrl = getFallbackImageUrl(rawQuery);
      const fallbackResult: ImageResult = { 
        url: fallbackUrl, 
        title: rawQuery 
      };
      cache.set(key, fallbackResult);
      return fallbackResult;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, task);
  return task;
}
