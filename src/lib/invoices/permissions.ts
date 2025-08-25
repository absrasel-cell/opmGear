import { User } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase';

interface Session {
  user: User;
  access_token?: string;
}

export class InvoicePermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvoicePermissionError';
  }
}

export async function assertAdmin(session: Session | null): Promise<void> {
  if (!session?.user) {
    throw new InvoicePermissionError('Authentication required');
  }

  const supabase = supabaseAdmin;
  
  const { data: user, error } = await supabase
    .from('User')
    .select('accessRole')
    .eq('email', session.user.email)
    .single();

  if (error || !user) {
    throw new InvoicePermissionError('User not found');
  }

  const adminRoles = ['STAFF', 'SUPER_ADMIN', 'MASTER_ADMIN'];
  if (!adminRoles.includes(user.accessRole)) {
    throw new InvoicePermissionError('Admin access required');
  }
}

export async function assertOwnerOrAdmin(
  session: Session | null, 
  resourceUserId: string
): Promise<void> {
  if (!session?.user) {
    throw new InvoicePermissionError('Authentication required');
  }

  const supabase = supabaseAdmin;
  
  const { data: user, error } = await supabase
    .from('User')
    .select('id, accessRole')
    .eq('email', session.user.email)
    .single();

  if (error || !user) {
    throw new InvoicePermissionError('User not found');
  }

  // Allow if user owns the resource
  if (user.id === resourceUserId) {
    return;
  }

  // Allow if user is admin
  const adminRoles = ['STAFF', 'SUPER_ADMIN', 'MASTER_ADMIN'];
  if (adminRoles.includes(user.accessRole)) {
    return;
  }

  throw new InvoicePermissionError('Access denied');
}