/**
 * Knowledge System Initialization API
 * Provides endpoints to initialize and manage the knowledge system
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
// import { 
//  initializeKnowledgeSystem, 
//  getSystemStatus, 
//  reinitializeSystem, 
//  quickHealthCheck 
// } from '@/lib/knowledge/initialize-knowledge';

export async function POST(request: NextRequest) {
 return NextResponse.json({ error: 'Knowledge system temporarily disabled' }, { status: 503 });
}

export async function GET(request: NextRequest) {
 return NextResponse.json({ error: 'Knowledge system temporarily disabled' }, { status: 503 });
}