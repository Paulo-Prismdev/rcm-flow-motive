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
        types: 'address',
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