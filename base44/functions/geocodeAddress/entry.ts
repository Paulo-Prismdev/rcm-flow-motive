const GOOGLE_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");

// Simple in-memory cache to avoid repeated requests
const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Parse Google Geocoding / Place Details address_components into our standard format.
 * Returns the same shape used across all forms:
 * { address, display_name, latitude, longitude, address_line_1, address_line_2, town, county, postcode }
 */
function parseGoogleComponents(components, formattedAddress, lat, lng) {
  const get = (type) => components?.find(c => c.types.includes(type))?.long_name || '';

  const streetNumber = get('street_number');
  const route = get('route');

  let addressLine1 = '';
  if (streetNumber && route) {
    addressLine1 = `${streetNumber} ${route}`;
  } else if (route) {
    addressLine1 = route;
  } else {
    addressLine1 = get('premise') || get('subpremise') || get('establishment') || '';
  }

  return {
    latitude: lat ?? null,
    longitude: lng ?? null,
    display_name: formattedAddress || '',
    address: formattedAddress || '',
    address_line_1: addressLine1,
    address_line_2: '',
    town: get('postal_town') || get('locality') || get('administrative_area_level_3') || '',
    county: get('administrative_area_level_2') || get('administrative_area_level_1') || '',
    postcode: get('postal_code') || ''
  };
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const action = body.action || 'geocode';

    // ── AUTOCOMPLETE: return place suggestions as the user types ──
    if (action === 'autocomplete') {
      const input = body.input;
      if (!input || input.trim().length < 3) {
        return Response.json({ suggestions: [] });
      }

      const cacheKey = `ac:${input.toLowerCase().trim()}`;
      const cached = cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        return Response.json({ suggestions: cached.data });
      }

      const params = new URLSearchParams({
        input,
        components: 'country:gb',
        key: GOOGLE_API_KEY
      });

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`,
        { signal: AbortSignal.timeout(8000) }
      );

      if (!response.ok) {
        throw new Error(`Google Autocomplete API error: ${response.status}`);
      }

      const data = await response.json();
      const suggestions = (data.predictions || []).map(p => ({
        place_id: p.place_id,
        description: p.description
      }));

      cache.set(cacheKey, { timestamp: Date.now(), data: suggestions });
      return Response.json({ suggestions });
    }

    // ── PLACE DETAILS: get full address data for a selected place ──
    if (action === 'details') {
      const placeId = body.place_id;
      if (!placeId) {
        return Response.json({ error: 'place_id is required' }, { status: 400 });
      }

      const cacheKey = `pd:${placeId}`;
      const cached = cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        return Response.json(cached.data);
      }

      const params = new URLSearchParams({
        place_id: placeId,
        fields: 'formatted_address,address_components,geometry',
        key: GOOGLE_API_KEY
      });

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?${params}`,
        { signal: AbortSignal.timeout(8000) }
      );

      if (!response.ok) {
        throw new Error(`Google Place Details API error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.result) {
        return Response.json({ error: 'Place not found' }, { status: 404 });
      }

      const result = data.result;
      const addressData = parseGoogleComponents(
        result.address_components,
        result.formatted_address,
        result.geometry?.location?.lat,
        result.geometry?.location?.lng
      );

      cache.set(cacheKey, { timestamp: Date.now(), data: addressData });
      return Response.json(addressData);
    }

    // ── DISTANCE MATRIX: calculate driving time/distance from origin to multiple destinations ──
    // Per-element cache: only fetches uncached origin→destination pairs
    if (action === 'distance_matrix') {
      const { origin, destinations } = body;
      if (!origin || !destinations || !Array.isArray(destinations) || destinations.length === 0) {
        return Response.json({ error: 'origin and destinations array are required' }, { status: 400 });
      }

      const originKey = `${Number(origin.lat).toFixed(5)},${Number(origin.lng).toFixed(5)}`;
      const results = new Array(destinations.length);
      const uncachedIndices = [];
      const uncachedDestinations = [];

      // Check cache for each origin→destination pair
      destinations.forEach((dest, idx) => {
        const destKey = `${Number(dest.lat).toFixed(5)},${Number(dest.lng).toFixed(5)}`;
        const cacheKey = `dm:${originKey}->${destKey}`;
        const cached = cache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
          results[idx] = { ...cached.data, index: idx };
        } else {
          uncachedIndices.push(idx);
          uncachedDestinations.push(dest);
        }
      });

      // Only fetch uncached destinations from Google
      if (uncachedDestinations.length > 0) {
        const BATCH_SIZE = 25;
        for (let i = 0; i < uncachedDestinations.length; i += BATCH_SIZE) {
          const batch = uncachedDestinations.slice(i, i + BATCH_SIZE);
          const batchIndices = uncachedIndices.slice(i, i + BATCH_SIZE);
          const destStr = batch.map(d => `${d.lat},${d.lng}`).join('|');

          const params = new URLSearchParams({
            origins: `${origin.lat},${origin.lng}`,
            destinations: destStr,
            mode: 'driving',
            units: 'imperial',
            key: GOOGLE_API_KEY
          });

          const response = await fetch(
            `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`,
            { signal: AbortSignal.timeout(15000) }
          );

          if (!response.ok) {
            throw new Error(`Google Distance Matrix API error: ${response.status}`);
          }

          const data = await response.json();
          const elements = data.rows?.[0]?.elements || [];
          elements.forEach((el, batchIdx) => {
            const resultIdx = batchIndices[batchIdx];
            const result = {
              index: resultIdx,
              duration_text: el.duration?.text || null,
              duration_seconds: el.duration?.value || null,
              distance_text: el.distance?.text || null,
              distance_meters: el.distance?.value || null,
              reachable: el.status === 'OK'
            };
            results[resultIdx] = result;

            // Cache this origin→destination pair
            const dest = batch[batchIdx];
            const destKey = `${Number(dest.lat).toFixed(5)},${Number(dest.lng).toFixed(5)}`;
            const cacheKey = `dm:${originKey}->${destKey}`;
            cache.set(cacheKey, { timestamp: Date.now(), data: result });
          });
        }
      }

      return Response.json({ results });
    }

    // ── DIRECTIONS: get driving route polyline between two points ──
    if (action === 'directions') {
      const { origin, destination } = body;
      if (!origin || !destination) {
        return Response.json({ error: 'origin and destination are required' }, { status: 400 });
      }

      const params = new URLSearchParams({
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
        mode: 'driving',
        key: GOOGLE_API_KEY
      });

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?${params}`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (!response.ok) {
        throw new Error(`Google Directions API error: ${response.status}`);
      }

      const data = await response.json();
      if (data.status === 'OK' && data.routes?.[0]) {
        const route = data.routes[0];
        return Response.json({
          points: route.overview_polyline?.points || null,
          duration_text: route.legs?.[0]?.duration?.text || null,
          distance_text: route.legs?.[0]?.distance?.text || null
        });
      }

      return Response.json({ points: null });
    }

    // ── GEOCODE (default): convert an address string to coordinates + components ──
    const address = body.address;
    if (!address || address.trim() === '') {
      return Response.json({
        error: 'Address is required',
        latitude: null,
        longitude: null
      }, { status: 400 });
    }

    const cacheKey = `gc:${address.toLowerCase().trim()}`;
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return Response.json(cached.data || {
        error: 'Location not found (cached)',
        latitude: null,
        longitude: null,
        address
      }, { status: cached.data ? 200 : 404 });
    }

    const params = new URLSearchParams({
      address,
      components: 'country:gb',
      key: GOOGLE_API_KEY
    });

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) {
      throw new Error(`Google Geocoding API error: ${response.status}`);
    }

    const data = await response.json();
    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0];
      const addressData = parseGoogleComponents(
        result.address_components,
        result.formatted_address,
        result.geometry?.location?.lat,
        result.geometry?.location?.lng
      );

      cache.set(cacheKey, { timestamp: Date.now(), data: addressData });
      return Response.json(addressData);
    }

    // Cache the failure
    cache.set(cacheKey, { timestamp: Date.now(), data: null });
    return Response.json({
      error: 'Location not found',
      message: 'Could not find coordinates for this address. Please check the address format.',
      latitude: null,
      longitude: null,
      address
    }, { status: 404 });

  } catch (error) {
    console.error('Geocoding error:', error);
    return Response.json({
      error: 'Geocoding failed',
      message: error.message,
      latitude: null,
      longitude: null
    }, { status: 500 });
  }
});