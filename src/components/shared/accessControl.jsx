import { base44 } from '@/api/base44Client';

/**
 * Determines if a user can edit a record based on their role and the record's properties
 */
export function canEditRecord(user, record) {
  if (!user) return false;
  
  // Admins can edit everything
  if (user.role === 'admin') return true;
  
  // Internal users can edit everything
  if (user.user_type === 'internal') return true;
  
  // External users (referrers, bodyshops, clients, suppliers) cannot edit
  return false;
}

/**
 * Determines which entities a user can see based on their user_type and linked IDs
 */
export function getEntityFilter(entityName, user) {
  if (!user) return {};
  
  // Admins and internal users see everything (no filter)
  if (user.role === 'admin' || user.user_type === 'internal') {
    return null;
  }
  
  // External users get filtered based on their type
  const filters = {};
  
  // Referrer users - only see records linked to their referrer
  if (user.user_type === 'referrer' && user.linked_referrer_id) {
    if (entityName === 'Claim') {
      filters.referrer_id = user.linked_referrer_id;
    }
  }
  
  // Bodyshop users - only see records linked to their bodyshop
  if (user.user_type === 'bodyshop' && user.linked_bodyshop_id) {
    if (entityName === 'Claim') {
      filters.bodyshop_id = user.linked_bodyshop_id;
    }
    if (entityName === 'Estimate') {
      filters.repairer_id = user.linked_bodyshop_id;
    }
    if (entityName === 'Part') {
      filters.bodyshop_company_id = user.linked_bodyshop_id;
    }
  }
  
  // Client users - only see records linked to their client
  if (user.user_type === 'client' && user.linked_client_id) {
    if (entityName === 'Claim') {
      filters.client_id = user.linked_client_id;
    }
    if (entityName === 'Engineering') {
      filters.client_id = user.linked_client_id;
    }
  }
  
  // Supplier users - only see parts linked to their supplier
  if (user.user_type === 'supplier' && user.linked_supplier_id) {
    if (entityName === 'Part') {
      filters.supplier_id = user.linked_supplier_id;
    }
  }
  
  return Object.keys(filters).length > 0 ? filters : {};
}

/**
 * Fetches entities with appropriate filtering based on user permissions
 */
export async function fetchFilteredEntities(entityName, user, sortBy = '-created_date', limit = 1000) {
  if (!user) return [];
  
  const filter = getEntityFilter(entityName, user);
  
  // If filter is null (admin/internal), list all
  if (filter === null) {
    return base44.entities[entityName].list(sortBy, limit);
  }
  
  // If filter is empty object (no matching rules), return empty array
  if (Object.keys(filter).length === 0) {
    return [];
  }
  
  // Otherwise, apply the filter
  return base44.entities[entityName].filter(filter, sortBy, limit);
}