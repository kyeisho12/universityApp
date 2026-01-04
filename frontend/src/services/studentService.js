import { supabase } from '../lib/supabaseClient'

export async function getStudentProfile(userId) {
	if (!userId) {
		return { data: null, error: new Error('Missing user id') }
	}

	const { data, error } = await supabase
		.from('profiles')
		.select('*')
		.eq('id', userId)
		.maybeSingle()

	return { data, error }
}

export async function upsertStudentProfile(profile) {
	if (!profile?.id) {
		return { data: null, error: new Error('Profile must include id') }
	}

	const { data, error } = await supabase
		.from('profiles')
		.upsert(profile, { onConflict: 'id' })
		.select()
		.single()

	return { data, error }
}
