import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Rate limiting to respect Nominatim's 1 request per second limit
const DELAY_BETWEEN_REQUESTS = 2000; // 2 seconds to be safe

async function geocodeAddress(address) {
  try {
    const params = new URLSearchParams({
      q: address,
      format: 'json',
      limit: '1',
      countrycodes: 'gb'
    });

    const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ART-TEC-One-App/1.0'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon)
      };
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding error:', error.message);
    return null;
  }
}

function buildAddressString(bodyshop) {
  const parts = [
    bodyshop.address_line_1,
    bodyshop.address_line_2,
    bodyshop.town,
    bodyshop.county,
    bodyshop.postcode
  ].filter(Boolean);
  
  return parts.join(', ');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin user
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    // Fetch all bodyshops
    const bodyshops = await base44.asServiceRole.entities.Bodyshop.list();
    
    // Filter bodyshops that need geocoding
    const bodyshopsToGeocode = bodyshops.filter(b => 
      (!b.latitude || !b.longitude) && 
      (b.address_line_1 || b.postcode)
    );

    console.log(`Found ${bodyshopsToGeocode.length} bodyshops needing geocoding out of ${bodyshops.length} total`);

    const results = {
      total: bodyshopsToGeocode.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      details: []
    };

    // Process each bodyshop with delay
    for (let i = 0; i < bodyshopsToGeocode.length; i++) {
      const bodyshop = bodyshopsToGeocode[i];
      const address = buildAddressString(bodyshop);
      
      console.log(`Processing ${i + 1}/${bodyshopsToGeocode.length}: ${bodyshop.name} - ${address}`);

      if (!address || address.trim() === '') {
        console.log(`  Skipping - no address`);
        results.skipped++;
        results.details.push({
          name: bodyshop.name,
          status: 'skipped',
          reason: 'No address available'
        });
        continue;
      }

      // Geocode the address
      const coords = await geocodeAddress(address);

      if (coords) {
        // Update the bodyshop with coordinates
        await base44.asServiceRole.entities.Bodyshop.update(bodyshop.id, {
          latitude: coords.latitude,
          longitude: coords.longitude
        });
        
        console.log(`  ✓ Success: ${coords.latitude}, ${coords.longitude}`);
        results.successful++;
        results.details.push({
          name: bodyshop.name,
          address: address,
          status: 'success',
          latitude: coords.latitude,
          longitude: coords.longitude
        });
      } else {
        console.log(`  ✗ Failed to geocode`);
        results.failed++;
        results.details.push({
          name: bodyshop.name,
          address: address,
          status: 'failed',
          reason: 'Could not find location'
        });
      }

      // Wait before next request (except on last iteration)
      if (i < bodyshopsToGeocode.length - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
      }
    }

    console.log(`\nBatch geocoding complete:`);
    console.log(`  Successful: ${results.successful}`);
    console.log(`  Failed: ${results.failed}`);
    console.log(`  Skipped: ${results.skipped}`);

    return Response.json({
      message: 'Batch geocoding complete',
      ...results
    });

  } catch (error) {
    console.error('Batch geocoding error:', error);
    return Response.json({ 
      error: 'Batch geocoding failed',
      message: error.message 
    }, { status: 500 });
  }
});