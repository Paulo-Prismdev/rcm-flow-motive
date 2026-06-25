import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Admin-only: this is a maintenance task
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.user_type !== 'internal' && user.role !== 'admin' && user.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");

    // Fetch all bodyshops missing coordinates
    const allBodyshops = await base44.asServiceRole.entities.Bodyshop.list('-created_date', 500);
    const missingCoords = allBodyshops.filter(b =>
      (!b.latitude || !b.longitude) &&
      (b.address_line_1 || b.postcode || b.town)
    );

    const results = { total_missing: missingCoords.length, geocoded: 0, failed: 0, skipped: 0, details: [] };

    for (const b of missingCoords) {
      const fullAddress = [b.address_line_1, b.address_line_2, b.town, b.county, b.postcode]
        .filter(Boolean).join(', ');

      if (!fullAddress.trim()) {
        results.skipped++;
        results.details.push({ id: b.id, name: b.name, status: 'skipped — no address' });
        continue;
      }

      try {
        const params = new URLSearchParams({
          address: fullAddress,
          components: 'country:gb',
          key: GOOGLE_API_KEY
        });

        const geoResponse = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?${params}`,
          { signal: AbortSignal.timeout(10000) }
        );

        if (!geoResponse.ok) {
          throw new Error(`Google API error: ${geoResponse.status}`);
        }

        const geoData = await geoResponse.json();

        if (geoData.status === 'OK' && geoData.results.length > 0) {
          const lat = geoData.results[0].geometry?.location?.lat;
          const lng = geoData.results[0].geometry?.location?.lng;

          if (lat && lng) {
            // Save coordinates back to database
            await base44.asServiceRole.entities.Bodyshop.update(b.id, {
              latitude: lat,
              longitude: lng
            });

            results.geocoded++;
            results.details.push({ id: b.id, name: b.name, status: 'success', lat, lng });
          } else {
            results.failed++;
            results.details.push({ id: b.id, name: b.name, status: 'no coordinates in result' });
          }
        } else {
          results.failed++;
          results.details.push({ id: b.id, name: b.name, status: `geocoding failed: ${geoData.status}` });
        }

        // Small delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        results.failed++;
        results.details.push({ id: b.id, name: b.name, status: `error: ${err.message}` });
      }
    }

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});