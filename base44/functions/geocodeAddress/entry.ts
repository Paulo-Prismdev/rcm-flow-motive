import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Simple in-memory cache to avoid repeated requests
const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Rate limiting - Nominatim requires 1 request per second
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1100; // 1.1 seconds to be safe

async function waitForRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
}

async function tryGeocode(queryString, withCountry = true) {
  await waitForRateLimit();
  
  const baseUrl = 'https://nominatim.openstreetmap.org/search';
  const params = new URLSearchParams({
    q: queryString,
    format: 'json',
    limit: '1',
    ...(withCountry && { countrycodes: 'gb' })
  });
  
  const url = `${baseUrl}?${params.toString()}`;
  console.log(`Trying geocode: "${queryString}" (UK only: ${withCountry})`);
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'ART-TEC-One-App/1.0'
    },
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (data.length > 0) {
    console.log(`✓ Found location: ${data[0].display_name}`);
  } else {
    console.log(`✗ No results for: "${queryString}"`);
  }
  
  return data;
}

async function geocodeWithStrategies(address) {
  const originalAddress = address;
  
  // Clean and normalize the address
  const cleanAddress = address
    .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
    .trim();
  
  console.log(`\n=== Geocoding Address ===`);
  console.log(`Original: "${originalAddress}"`);
  console.log(`Cleaned: "${cleanAddress}"`);
  
  // Split into parts
  const parts = cleanAddress.split(',').map(p => p.trim()).filter(Boolean);
  console.log(`Parts:`, parts);
  
  // Try to identify postcode - UK postcode has various formats
  // Examples: SW1A 1AA, M1 1AE, B33 8TH, CR2 6XH, DN55 1PT
  const postcodeRegex = /\b[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}\b/i;
  let postcode = '';
  let remainingParts = [...parts];
  
  for (const part of parts) {
    if (postcodeRegex.test(part)) {
      postcode = part.toUpperCase();
      remainingParts = remainingParts.filter(p => p !== part);
      console.log(`Found postcode: "${postcode}"`);
      break;
    }
  }
  
  // Extract potential street and town
  const street = remainingParts[0] || '';
  const town = remainingParts[remainingParts.length - 1] || '';
  
  console.log(`Street: "${street}"`);
  console.log(`Town: "${town}"`);
  console.log(`Postcode: "${postcode}"`);
  
  // Build search strategies in order of reliability
  const strategies = [];
  
  // Strategy 1: Exact postcode (most reliable for UK)
  if (postcode) {
    strategies.push({ 
      query: postcode, 
      description: 'Postcode only',
      withCountry: true 
    });
  }
  
  // Strategy 2: Postcode + UK (without other parts that might confuse)
  if (postcode) {
    strategies.push({ 
      query: `${postcode}, United Kingdom`, 
      description: 'Postcode + UK',
      withCountry: false // Already specified UK in query
    });
  }
  
  // Strategy 3: Town + Postcode
  if (town && postcode) {
    strategies.push({ 
      query: `${town}, ${postcode}`, 
      description: 'Town + Postcode',
      withCountry: true 
    });
  }
  
  // Strategy 4: Full address as provided
  strategies.push({ 
    query: cleanAddress, 
    description: 'Full address',
    withCountry: true 
    });
  
  // Strategy 5: Full address without country restriction
  strategies.push({ 
    query: cleanAddress, 
    description: 'Full address (worldwide)',
    withCountry: false 
  });
  
  // Strategy 6: Street + Town + Postcode (if all available)
  if (street && town && postcode) {
    strategies.push({ 
      query: `${street}, ${town}, ${postcode}, UK`, 
      description: 'Street + Town + Postcode',
      withCountry: false 
    });
  }
  
  // Strategy 7: Just the town (very broad, last resort)
  if (town && town.length > 3) {
    strategies.push({ 
      query: `${town}, UK`, 
      description: 'Town only (broad search)',
      withCountry: false 
    });
  }
  
  console.log(`\nTrying ${strategies.length} search strategies...\n`);
  
  // Try each strategy
  for (let i = 0; i < strategies.length; i++) {
    const strategy = strategies[i];
    console.log(`Strategy ${i + 1}/${strategies.length}: ${strategy.description}`);
    
    try {
      const data = await tryGeocode(strategy.query, strategy.withCountry);
      
      if (data.length > 0) {
        const location = data[0];
        console.log(`\n✓✓✓ SUCCESS with strategy: ${strategy.description} ✓✓✓\n`);
        
        return {
          latitude: parseFloat(location.lat),
          longitude: parseFloat(location.lon),
          display_name: location.display_name,
          address: originalAddress,
          strategy_used: strategy.description
        };
      }
    } catch (error) {
      console.log(`  Error: ${error.message}`);
      
      // Handle rate limiting
      if (error.message?.includes('429')) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        // Retry this strategy once
        try {
          const data = await tryGeocode(strategy.query, strategy.withCountry);
          if (data.length > 0) {
            const location = data[0];
            console.log(`\n✓✓✓ SUCCESS with strategy: ${strategy.description} (after retry) ✓✓✓\n`);
            return {
              latitude: parseFloat(location.lat),
              longitude: parseFloat(location.lon),
              display_name: location.display_name,
              address: originalAddress,
              strategy_used: strategy.description
            };
          }
        } catch (retryError) {
          console.log(`  Retry failed: ${retryError.message}`);
        }
      }
    }
  }
  
  console.log(`\n✗✗✗ All strategies failed ✗✗✗\n`);
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user authentication
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.user_type !== 'internal') {
      return Response.json({ error: 'Forbidden: Internal staff only' }, { status: 403 });
    }

    // Get the address from the request
    const { address } = await req.json();
    
    if (!address || address.trim() === '') {
      return Response.json({ 
        error: 'Address is required',
        latitude: null,
        longitude: null
      }, { status: 400 });
    }

    // Check cache first
    const cacheKey = address.toLowerCase().trim();
    const cached = cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log(`Cache hit for: "${address}"`);
      return Response.json(cached.data || { 
        error: 'Location not found (cached)',
        latitude: null,
        longitude: null,
        address: address
      }, { status: cached.data ? 200 : 404 });
    }

    // Attempt geocoding with multiple strategies
    const result = await geocodeWithStrategies(address);

    if (result === null) {
      console.log(`Final result: Address not found`);
      
      // Cache the failure
      cache.set(cacheKey, {
        timestamp: Date.now(),
        data: null
      });
      
      return Response.json({ 
        error: 'Location not found',
        message: 'Could not find coordinates for this address. Please check the address format.',
        latitude: null,
        longitude: null,
        address: address
      }, { status: 404 });
    }

    console.log(`Final result: SUCCESS - ${result.display_name}`);
    
    // Cache successful result
    cache.set(cacheKey, {
      timestamp: Date.now(),
      data: result
    });

    return Response.json(result);

  } catch (error) {
    console.error('Unexpected geocoding error:', error);
    
    // Determine appropriate error response
    if (error.name === 'TimeoutError') {
      return Response.json({ 
        error: 'Request timeout',
        message: 'The geocoding service took too long to respond. Please try again.',
        latitude: null,
        longitude: null
      }, { status: 408 });
    }

    if (error.message?.includes('429')) {
      return Response.json({ 
        error: 'Rate limit exceeded',
        message: 'Too many geocoding requests. Please wait a moment and try again.',
        latitude: null,
        longitude: null
      }, { status: 429 });
    }

    if (error.message?.includes('503')) {
      return Response.json({ 
        error: 'Service temporarily unavailable',
        message: 'The geocoding service is temporarily unavailable. Please try again later.',
        latitude: null,
        longitude: null
      }, { status: 503 });
    }

    return Response.json({ 
      error: 'Geocoding failed',
      message: 'Unable to geocode address. The map will still show all bodyshops.',
      latitude: null,
      longitude: null
    }, { status: 500 });
  }
});