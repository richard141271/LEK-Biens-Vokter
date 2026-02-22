import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getBeekeeperByAuthUser } from '@/app/actions/user-management'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const apiaryName = body?.apiaryName as string | undefined

    if (!apiaryName) {
      return NextResponse.json({ error: 'Mangler apiaryName' }, { status: 400 })
    }

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Ikke logget inn' }, { status: 401 })
    }

    const beekeeperResult = await getBeekeeperByAuthUser(user.id)

    if ('error' in beekeeperResult) {
      return NextResponse.json({ error: beekeeperResult.error }, { status: 400 })
    }

    const admin = createAdminClient()

    const { error } = await admin.from('lek_core_apiaries').insert({
      beekeeper_id: beekeeperResult.beekeeper_id,
      name: apiaryName,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Ukjent LEK Core-feil ved opprettelse av bigård' },
      { status: 500 }
    )
  }
}

