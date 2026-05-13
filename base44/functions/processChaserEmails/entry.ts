import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// Helper function to replace placeholders in templates
function replacePlaceholders(template, claim) {
  if (!template) return '';
  
  let result = template;
  
  // Replace all {{claim.field_name}} patterns
  const placeholderPattern = /\{\{claim\.(\w+)\}\}/g;
  result = result.replace(placeholderPattern, (match, fieldName) => {
    return claim[fieldName] || '';
  });
  
  return result;
}

// Helper function to calculate days in status
function getDaysInStatus(claim) {
  if (!claim.last_updated_at) {
    // If no last_updated_at, use created_date
    const createdDate = new Date(claim.created_date);
    const now = new Date();
    const diffTime = Math.abs(now - createdDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  
  const lastUpdate = new Date(claim.last_updated_at);
  const now = new Date();
  const diffTime = Math.abs(now - lastUpdate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Helper function to check if additional conditions match
function matchesAdditionalConditions(claim, conditions) {
  if (!conditions || Object.keys(conditions).length === 0) {
    return true; // No additional conditions, match by default
  }
  
  for (const [key, value] of Object.entries(conditions)) {
    if (claim[key] !== value) {
      return false;
    }
  }
  
  return true;
}

// Helper function to determine if we should send based on frequency
function shouldSendBasedOnFrequency(lastSentDate, frequency) {
  if (!lastSentDate) return true; // Never sent before
  
  const lastSent = new Date(lastSentDate);
  const now = new Date();
  const daysSinceLastSend = Math.ceil((now - lastSent) / (1000 * 60 * 60 * 24));
  
  switch (frequency) {
    case 'Once':
      return false; // Already sent once, don't send again
    case 'Daily':
      return daysSinceLastSend >= 1;
    case 'Every 3 Days':
      return daysSinceLastSend >= 3;
    case 'Weekly':
      return daysSinceLastSend >= 7;
    default:
      return false;
  }
}

// Helper function to get recipient email from claim
function getRecipientEmail(claim, recipientType, customEmail) {
  switch (recipientType) {
    case 'Client':
      return claim.client_email;
    case 'Referrer':
      return claim.referrer_email;
    case 'Bodyshop':
      return claim.bodyshop_email;
    case 'Insurer':
      // Insurers don't have a direct email field on claims in this schema
      // You might need to add this or use a different approach
      return null;
    case 'File Handler':
      // File handler is a name, not an email - might need adjustment
      return null;
    case 'Custom Email':
      return customEmail;
    default:
      return null;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    console.log('Starting chaser email processing...');
    
    // Step 1: Fetch all active chaser email rules
    const rules = await base44.asServiceRole.entities.ChaserEmailRule.filter(
      { is_active: true },
      'sort_order'
    );
    
    if (!rules || rules.length === 0) {
      return Response.json({
        success: true,
        message: 'No active chaser email rules found',
        processed: 0
      });
    }
    
    console.log(`Found ${rules.length} active rules`);
    
    let totalProcessed = 0;
    let totalSent = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    
    // Step 2: Process each rule
    for (const rule of rules) {
      console.log(`Processing rule: ${rule.rule_name}`);
      
      // Step 3: Find claims that match this rule's trigger status
      const claims = await base44.asServiceRole.entities.Claim.filter(
        { 
          job_status: rule.trigger_status,
          archived: false // Only process non-archived claims
        }
      );
      
      console.log(`Found ${claims.length} claims with status ${rule.trigger_status}`);
      
      // Step 4: For each matching claim, check if we should send
      for (const claim of claims) {
        totalProcessed++;
        
        // Check days in status
        const daysInStatus = getDaysInStatus(claim);
        if (daysInStatus < rule.days_in_status) {
          console.log(`Skipping claim ${claim.job_number}: only ${daysInStatus} days in status (needs ${rule.days_in_status})`);
          totalSkipped++;
          continue;
        }
        
        // Check additional conditions
        if (!matchesAdditionalConditions(claim, rule.additional_conditions)) {
          console.log(`Skipping claim ${claim.job_number}: doesn't match additional conditions`);
          totalSkipped++;
          continue;
        }
        
        // Step 5: Check how many times we've sent this rule for this claim
        const existingLogs = await base44.asServiceRole.entities.ChaserEmailLog.filter({
          claim_id: claim.id,
          rule_id: rule.id,
          status: 'Sent'
        });
        
        if (existingLogs.length >= rule.max_sends) {
          console.log(`Skipping claim ${claim.job_number}: already sent ${existingLogs.length} times (max: ${rule.max_sends})`);
          totalSkipped++;
          continue;
        }
        
        // Step 6: Check send frequency
        if (existingLogs.length > 0) {
          const lastLog = existingLogs.sort((a, b) => 
            new Date(b.sent_at) - new Date(a.sent_at)
          )[0];
          
          if (!shouldSendBasedOnFrequency(lastLog.sent_at, rule.send_frequency)) {
            console.log(`Skipping claim ${claim.job_number}: frequency check failed`);
            totalSkipped++;
            continue;
          }
        }
        
        // Step 7: Get recipient email
        const recipientEmail = getRecipientEmail(claim, rule.recipient_type, rule.custom_email);
        
        if (!recipientEmail) {
          console.log(`Skipping claim ${claim.job_number}: no recipient email for type ${rule.recipient_type}`);
          
          // Log as skipped
          await base44.asServiceRole.entities.ChaserEmailLog.create({
            claim_id: claim.id,
            rule_id: rule.id,
            rule_name: rule.rule_name,
            recipient_email: 'N/A',
            recipient_type: rule.recipient_type,
            email_subject: 'N/A',
            email_body: 'N/A',
            sent_at: new Date().toISOString(),
            status: 'Skipped',
            error_message: `No ${rule.recipient_type} email available`,
            claim_status_at_send: claim.job_status,
            days_in_status_at_send: daysInStatus
          });
          
          totalSkipped++;
          continue;
        }
        
        // Step 8: Generate email content
        const emailSubject = replacePlaceholders(rule.email_subject_template, claim);
        const emailBody = replacePlaceholders(rule.email_body_template, claim);
        
        // Step 9: Send the email
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: recipientEmail,
            subject: emailSubject,
            body: emailBody,
            from_name: 'Artura Claims'
          });
          
          console.log(`✅ Sent chaser email for claim ${claim.job_number} to ${recipientEmail}`);
          
          // Log success
          await base44.asServiceRole.entities.ChaserEmailLog.create({
            claim_id: claim.id,
            rule_id: rule.id,
            rule_name: rule.rule_name,
            recipient_email: recipientEmail,
            recipient_type: rule.recipient_type,
            email_subject: emailSubject,
            email_body: emailBody,
            sent_at: new Date().toISOString(),
            status: 'Sent',
            claim_status_at_send: claim.job_status,
            days_in_status_at_send: daysInStatus
          });
          
          totalSent++;
          
        } catch (emailError) {
          console.error(`❌ Failed to send email for claim ${claim.job_number}:`, emailError);
          
          // Log failure
          await base44.asServiceRole.entities.ChaserEmailLog.create({
            claim_id: claim.id,
            rule_id: rule.id,
            rule_name: rule.rule_name,
            recipient_email: recipientEmail,
            recipient_type: rule.recipient_type,
            email_subject: emailSubject,
            email_body: emailBody,
            sent_at: new Date().toISOString(),
            status: 'Failed',
            error_message: emailError.message || 'Unknown error',
            claim_status_at_send: claim.job_status,
            days_in_status_at_send: daysInStatus
          });
          
          totalFailed++;
        }
      }
    }
    
    const summary = {
      success: true,
      message: 'Chaser email processing complete',
      rules_processed: rules.length,
      claims_evaluated: totalProcessed,
      emails_sent: totalSent,
      emails_skipped: totalSkipped,
      emails_failed: totalFailed
    };
    
    console.log('Summary:', summary);
    
    return Response.json(summary);
    
  } catch (error) {
    console.error('Error processing chaser emails:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});