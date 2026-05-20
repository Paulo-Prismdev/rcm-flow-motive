import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

    // Get registration number from request
    const { registrationNumber } = await req.json();
    
    if (!registrationNumber || registrationNumber.trim() === '') {
      return Response.json({ 
        error: 'Registration number is required',
        success: false
      }, { status: 400 });
    }

    // Clean the registration number (remove spaces, convert to uppercase)
    const cleanReg = registrationNumber.replace(/\s+/g, '').toUpperCase();
    
    // Get API key
    const apiKey = Deno.env.get("DVLA_API_KEY");

    if (!apiKey) {
      console.error('DVLA API key not found in environment');
      return Response.json({ 
        error: 'DVLA API key not configured',
        message: 'The DVLA API key is not set in the environment variables. Please set DVLA_API_KEY in Dashboard → Settings → Environment Variables.',
        success: false
      }, { status: 500 });
    }

    console.log(`=== DVLA API Request ===`);
    console.log(`Registration: ${cleanReg}`);
    console.log(`User email: ${user.email}`);
    console.log(`User type: ${user.user_type}`);
    console.log(`API key configured: ${!!apiKey}`);
    console.log(`API key length: ${apiKey.length} characters`);
    console.log(`API key preview: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);

    const requestBody = {
      registrationNumber: cleanReg
    };

    console.log('Request body:', JSON.stringify(requestBody));

    // Call DVLA API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    let dvlaResponse;
    try {
      dvlaResponse = await fetch(
        'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        }
      );
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return Response.json({ 
          error: 'Request timeout',
          message: 'The DVLA API request timed out. This can happen on slower network connections. Please try again.',
          success: false
        }, { status: 504 });
      }
      throw fetchError;
    }

    console.log(`DVLA Response Status: ${dvlaResponse.status}`);
    console.log(`DVLA Response Headers:`, Object.fromEntries(dvlaResponse.headers.entries()));

    if (!dvlaResponse.ok) {
      const errorText = await dvlaResponse.text();
      console.error('=== DVLA API Error ===');
      console.error('Status:', dvlaResponse.status);
      console.error('Status Text:', dvlaResponse.statusText);
      console.error('Error Body:', errorText);
      
      if (dvlaResponse.status === 403) {
        let errorDetails = '';
        try {
          const errorJson = JSON.parse(errorText);
          errorDetails = errorJson.message || errorJson.error || errorJson.errors?.[0]?.detail || '';
          console.error('Parsed error:', errorJson);
        } catch (e) {
          errorDetails = errorText;
        }

        return Response.json({ 
          error: 'API Access Denied',
          message: `Your DVLA API key was rejected (HTTP 403).

This usually means:
1. ❌ The API key hasn't been activated yet in the DVLA portal
2. ❌ The API key was copied incorrectly (extra spaces, line breaks, etc.)
3. ❌ Your DVLA developer account needs verification
4. ❌ You're using a test key but need a production key (or vice versa)

What to do:
1. Go to https://developer-portal.driver-vehicle-licensing.api.gov.uk/
2. Log in and check your API key status - it should show as "Active"
3. Copy the API key again (make sure to select ALL of it)
4. Paste it into Dashboard → Settings → Environment Variables → DVLA_API_KEY
5. Try again

DVLA Error: ${errorDetails}`,
          success: false,
          debug: {
            statusCode: 403,
            requestedReg: cleanReg,
            apiKeyPreview: `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`,
            apiKeyLength: apiKey.length
          }
        }, { status: 403 });
      }
      
      if (dvlaResponse.status === 404) {
        let errorMessage = 'No vehicle found with this registration number.';
        try {
          const errorJson = JSON.parse(errorText);
          console.error('404 error details:', errorJson);
          errorMessage = errorJson.errors?.[0]?.detail || errorJson.message || errorMessage;
        } catch (e) {
          // Keep default message
        }

        return Response.json({ 
          error: 'Vehicle not found',
          message: `${errorMessage}

Possible reasons:
• The registration number doesn't exist in the DVLA database
• The registration number was entered incorrectly
• The vehicle is very new and not yet in the system
• The registration is from outside England, Wales, or Scotland

Registration searched: ${cleanReg}`,
          success: false,
          debug: {
            requestedReg: cleanReg,
            dvlaResponse: errorText
          }
        }, { status: 404 });
      }
      
      if (dvlaResponse.status === 400) {
        let errorDetails = '';
        try {
          const errorJson = JSON.parse(errorText);
          errorDetails = errorJson.errors?.[0]?.detail || errorJson.message || '';
        } catch (e) {
          errorDetails = errorText;
        }

        return Response.json({ 
          error: 'Invalid request',
          message: `The registration number format appears to be invalid.

Registration entered: ${cleanReg}

DVLA says: ${errorDetails}`,
          success: false
        }, { status: 400 });
      }

      if (dvlaResponse.status === 429) {
        return Response.json({ 
          error: 'Rate limit exceeded',
          message: 'Too many requests to the DVLA API. Please wait a minute and try again.',
          success: false
        }, { status: 429 });
      }

      if (dvlaResponse.status === 500 || dvlaResponse.status === 503) {
        return Response.json({ 
          error: 'DVLA service unavailable',
          message: 'The DVLA service is temporarily unavailable. This is a problem on their end. Please try again in a few minutes.',
          success: false
        }, { status: dvlaResponse.status });
      }
      
      return Response.json({ 
        error: 'DVLA API error',
        message: `Unable to fetch vehicle data. HTTP Status: ${dvlaResponse.status}`,
        details: errorText,
        success: false
      }, { status: dvlaResponse.status });
    }

    const vehicleData = await dvlaResponse.json();
    console.log('✓ Vehicle data received successfully');
    console.log('=== FULL DVLA RESPONSE ===');
    console.log(JSON.stringify(vehicleData, null, 2));
    console.log(`Vehicle: ${vehicleData.make} ${vehicleData.model || '(no model)'} (${vehicleData.yearOfManufacture})`);

    // Map DVLA response to our format
    // Note: DVLA API often doesn't provide a separate model field
    // Sometimes the make field contains both make and model
    let make = vehicleData.make || '';
    let model = vehicleData.model || '';
    
    // If no model but make exists, try to extract model from make field
    // e.g., "FORD FOCUS" -> make: "FORD", model: "FOCUS"
    if (!model && make && make.includes(' ')) {
      const parts = make.split(' ');
      if (parts.length >= 2) {
        make = parts[0];
        model = parts.slice(1).join(' ');
        console.log(`Extracted model from make field: "${make}" / "${model}"`);
      }
    }

    const result = {
      success: true,
      registration: vehicleData.registrationNumber || cleanReg,
      make: make,
      model: model,
      make_model: make && model ? `${make} ${model}` : (make || ''),
      colour: vehicleData.colour || '',
      fuel_type: vehicleData.fuelType || '',
      year_of_manufacture: vehicleData.yearOfManufacture || null,
      engine_capacity: vehicleData.engineCapacity || null,
      co2_emissions: vehicleData.co2Emissions || null,
      euro_status: vehicleData.euroStatus || '',
      marked_for_export: vehicleData.markedForExport || false,
      vehicle_status: vehicleData.taxStatus || '',
      date_of_last_v5c_issued: vehicleData.dateOfLastV5CIssued || null,
      mot_status: vehicleData.motStatus || '',
      mot_expiry_date: vehicleData.motExpiryDate || null,
      tax_status: vehicleData.taxStatus || '',
      tax_due_date: vehicleData.taxDueDate || null,
      type_approval: vehicleData.typeApproval || '',
      wheelplan: vehicleData.wheelplan || '',
      revenue_weight: vehicleData.revenueWeight || null,
      raw_data: vehicleData
    };

    return Response.json(result);

  } catch (error) {
    console.error('=== Unexpected Error ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
    
    return Response.json({ 
      error: 'Internal server error',
      message: `An unexpected error occurred: ${error.message}`,
      success: false
    }, { status: 500 });
  }
});