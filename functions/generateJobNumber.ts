import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user authentication
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the entity type from request
    const { entityType } = await req.json();
    
    if (!entityType || !['Claim', 'Estimate', 'Engineering', 'Part'].includes(entityType)) {
      return Response.json({ 
        error: 'Invalid entity type. Must be Claim, Estimate, Engineering, or Part',
        success: false
      }, { status: 400 });
    }

    // Define prefixes for each entity type
    const prefixes = {
      'Claim': 'CLM',
      'Estimate': 'EST',
      'Engineering': 'ENG',
      'Part': 'PRT'
    };

    const prefix = prefixes[entityType];

    // Use service role to query all entities of this type to find the highest number
    const allRecords = await base44.asServiceRole.entities[entityType].list('-created_date', 10000);

    // Find the highest existing number for this prefix
    let highestNumber = 0;
    
    for (const record of allRecords) {
      if (record.job_number && record.job_number.startsWith(prefix + '-')) {
        const numberPart = parseInt(record.job_number.split('-')[1]);
        if (!isNaN(numberPart) && numberPart > highestNumber) {
          highestNumber = numberPart;
        }
      }
    }

    // Generate next number
    const nextNumber = highestNumber + 1;
    const jobNumber = `${prefix}-${String(nextNumber).padStart(4, '0')}`;

    return Response.json({ 
      success: true,
      job_number: jobNumber
    });

  } catch (error) {
    console.error('=== Generate Job Number Error ===');
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