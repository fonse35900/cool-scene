import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { trialInfo } from '@/lib/plans';

// Trial status for the current user's company, used by the top banner.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ isTrial: false });
  const db = getDb();
  const company = await db.prepare('SELECT plan, trial_ends_at FROM companies WHERE id = ?').get(user.company_id);
  const info = trialInfo(company);
  return NextResponse.json({ ...info, plan: company?.plan || null, role: user.role });
}
