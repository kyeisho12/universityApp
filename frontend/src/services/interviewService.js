import { supabase } from '../lib/supabaseClient'

let liveTranscribePreferredBaseUrl = null

function toTitleCase(value) {
	return value
		.split('_')
		.map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
		.join(' ')
}

function toStorageSafeName(value) {
	return (value || '')
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '_')
		.replace(/[^a-z0-9_]/g, '')
		.replace(/_+/g, '_')
		.replace(/^_+|_+$/g, '')
}

export async function getMockInterviewQuestions(limit = 5) {
	const { data, error } = await supabase
		.from('interview_question_bank')
		.select('id, question_text, category')
		.eq('is_active', true)

	if (error) {
		return { data: [], error }
	}

	const normalizedLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 5
	const shuffled = [...(data || [])].sort(() => Math.random() - 0.5)
	const selected = shuffled.slice(0, normalizedLimit)

	const questions = selected.map((item) => ({
		id: item.id,
		type: toTitleCase(item.category || 'general'),
		question: item.question_text,
		tip: 'Use the STAR method and provide one concrete example in your response.',
	}))

	return { data: questions, error: null }
}

export async function getMockInterviewQuestionsExcluding({ limit = 5, excludeIds = [] } = {}) {
	const excluded = new Set((excludeIds || []).filter(Boolean))
	const { data, error } = await supabase
		.from('interview_question_bank')
		.select('id, question_text, category')
		.eq('is_active', true)

	if (error) {
		return { data: [], error }
	}

	const normalizedLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 5
	const filtered = (data || []).filter((item) => !excluded.has(item.id))
	const shuffled = [...filtered].sort(() => Math.random() - 0.5)
	const selected = shuffled.slice(0, normalizedLimit)

	const questions = selected.map((item) => ({
		id: item.id,
		type: toTitleCase(item.category || 'general'),
		question: item.question_text,
		tip: 'Use the STAR method and provide one concrete example in your response.',
	}))

	return { data: questions, error: null }
}

export async function getQuestionById(questionId) {
	if (!questionId) {
		return { data: null, error: new Error('Missing question id') }
	}

	const { data, error } = await supabase
		.from('interview_question_bank')
		.select('id, question_text, category')
		.eq('id', questionId)
		.eq('is_active', true)
		.single()

	if (error || !data) {
		return { data: null, error: error || new Error('Question not found') }
	}

	return {
		data: {
			id: data.id,
			type: toTitleCase(data.category || 'general'),
			question: data.question_text,
			tip: 'Use the STAR method and provide one concrete example in your response.',
		},
		error: null,
	}
}

export async function startInterviewSession({ userId, userEmail, userName, totalQuestions = 5, metadata = {} }) {
	if (!userId) {
		return { data: null, error: new Error('Missing user id') }
	}

	const sessionTimestamp = new Date().toISOString().replace(/[-:.TZ]/g, '')
	const safeName = toStorageSafeName(userName) || toStorageSafeName(userEmail?.split('@')[0]) || userId
	const storagePrefix = `${userId}/${safeName}_${sessionTimestamp}`

	const payload = {
		user_id: userId,
		user_email: userEmail || null,
		user_name: userName || null,
		status: 'in_progress',
		total_questions: totalQuestions,
		current_question_index: 0,
		storage_prefix: storagePrefix,
		started_at: new Date().toISOString(),
		metadata,
	}

	const { data, error } = await supabase
		.from('interview_sessions')
		.insert(payload)
		.select('*')
		.single()

	return { data, error }
}

export async function updateInterviewSessionStatus(sessionId, status, extraFields = {}) {
	if (!sessionId) {
		return { data: null, error: new Error('Missing session id') }
	}

	const { data, error } = await supabase
		.from('interview_sessions')
		.update({
			status,
			...extraFields,
		})
		.eq('id', sessionId)
		.select('*')
		.single()

	return { data, error }
}

export async function updateInterviewSessionProgress(sessionId, currentQuestionIndex) {
	if (!sessionId) {
		return { data: null, error: new Error('Missing session id') }
	}

	const normalizedQuestionIndex = Number.isFinite(currentQuestionIndex)
		? Math.max(0, Math.floor(currentQuestionIndex))
		: 0
	const attemptedQuestionCount = normalizedQuestionIndex + 1

	const { data, error } = await supabase
		.from('interview_sessions')
		.update({
			current_question_index: normalizedQuestionIndex,
			total_questions: attemptedQuestionCount,
		})
		.eq('id', sessionId)
		.select('*')
		.single()

	return { data, error }
}

export async function voidInterviewSession({ sessionId, storagePrefix, bucket = 'interview-recordings' }) {
	if (!sessionId) {
		return { data: null, error: new Error('Missing session id') }
	}

	let storageError = null

	if (storagePrefix) {
		try {
			const { data: objects, error: listError } = await supabase
				.storage
				.from(bucket)
				.list(storagePrefix, { limit: 1000, offset: 0 })

			if (listError) {
				storageError = listError
			} else if (objects && objects.length > 0) {
				const paths = objects
					.filter((item) => item && item.name)
					.map((item) => `${storagePrefix}/${item.name}`)

				if (paths.length > 0) {
					const { error: removeError } = await supabase
						.storage
						.from(bucket)
						.remove(paths)

					if (removeError) {
						storageError = removeError
					}
				}
			}
		} catch (error) {
			storageError = error instanceof Error ? error : new Error('Failed to clean up storage files')
		}
	}

	const { data, error } = await supabase
		.from('interview_sessions')
		.delete()
		.eq('id', sessionId)
		.select('*')
		.single()

	if (error) {
		return { data: null, error }
	}

	if (storageError) {
		return { data, error: storageError }
	}

	return { data, error: null }
}

export async function uploadInterviewRecordingSegment({ bucket = 'interview-recordings', storagePath, segmentBlob, contentType = 'video/webm' }) {
	if (!storagePath || !segmentBlob) {
		return { data: null, error: new Error('Missing storage path or segment blob') }
	}

	const { data, error } = await supabase
		.storage
		.from(bucket)
		.upload(storagePath, segmentBlob, {
			cacheControl: '3600',
			upsert: false,
			contentType,
		})

	return { data, error }
}

export async function insertRecordingSegmentMetadata({
	sessionId,
	questionId,
	questionIndex,
	segmentOrder,
	storagePath,
	mimeType = 'video/webm',
	durationSeconds,
	fileSizeBytes,
	status = 'uploaded',
	whisperStatus = 'pending',
	metadata = {},
}) {
	if (!sessionId) {
		return { data: null, error: new Error('Missing session id') }
	}

	const payload = {
		session_id: sessionId,
		question_id: questionId || null,
		question_index: questionIndex,
		segment_order: segmentOrder,
		storage_path: storagePath,
		mime_type: mimeType,
		duration_seconds: durationSeconds,
		file_size_bytes: fileSizeBytes,
		status,
		whisper_status: whisperStatus,
		metadata,
	}

	const { data, error } = await supabase
		.from('interview_recording_segments')
		.insert(payload)
		.select('*')
		.single()

	return { data, error }
}

export async function getLatestQuestionTranscript({ sessionId, questionIndex }) {
	if (!sessionId) {
		return { data: null, error: new Error('Missing session id') }
	}

	let query = supabase
		.from('interview_recording_segments')
		.select('id, question_index, segment_order, transcript_text, whisper_status, updated_at')
		.eq('session_id', sessionId)

	if (typeof questionIndex === 'number') {
		query = query.eq('question_index', questionIndex)
	}

	const { data, error } = await query
		.order('segment_order', { ascending: false })
		.order('updated_at', { ascending: false })
		.limit(1)

	return { data: data?.[0] || null, error }
}

export async function triggerSegmentTranscription({ sessionId, segmentId, force = false }) {
	if (!sessionId || !segmentId) {
		return { data: null, error: new Error('Missing session id or segment id') }
	}

	const configuredBaseUrl = (import.meta.env.VITE_API_URL || '').trim()
	const normalizedConfiguredBaseUrl = configuredBaseUrl.includes('localhost:5000')
		? configuredBaseUrl.replace('localhost:5000', 'localhost:3001')
		: configuredBaseUrl
	const fallbackBaseUrls = ['http://localhost:3001/api', 'http://127.0.0.1:3001/api']
	const baseUrls = Array.from(new Set([normalizedConfiguredBaseUrl, ...fallbackBaseUrls].filter(Boolean)))

	let lastError = null

	for (const baseUrl of baseUrls) {
		try {
			const response = await fetch(`${baseUrl}/interviews/sessions/${sessionId}/segments/${segmentId}/transcribe`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ force }),
			})

			const payload = await response.json().catch(() => ({}))
			if (!response.ok || payload?.success === false) {
				lastError = new Error(payload?.error || `Transcription request failed (${response.status})`)
				break
			}

			return { data: payload?.data || payload, error: null }
		} catch (error) {
			lastError = error instanceof Error ? error : new Error('Unknown transcription error')
			continue
		}
	}

	return {
		data: null,
		error: new Error(lastError?.message || `Transcription request failed for all API URLs: ${baseUrls.join(', ')}`),
	}
}

export async function transcribeLiveAudioChunk({ audioBlob, language = 'en' }) {
	if (!audioBlob || audioBlob.size === 0) {
		return { data: null, error: new Error('Missing audio chunk') }
	}

	const configuredBaseUrl = (import.meta.env.VITE_API_URL || '').trim()
	const normalizedConfiguredBaseUrl = configuredBaseUrl.includes('localhost:5000')
		? configuredBaseUrl.replace('localhost:5000', 'localhost:3001')
		: configuredBaseUrl
	const fallbackBaseUrls = ['http://localhost:3001/api', 'http://127.0.0.1:3001/api']
	const orderedBaseUrls = [
		liveTranscribePreferredBaseUrl,
		normalizedConfiguredBaseUrl,
		...fallbackBaseUrls,
	].filter(Boolean)
	const baseUrls = Array.from(new Set(orderedBaseUrls))

	let lastError = null

	for (const baseUrl of baseUrls) {
		try {
			const formData = new FormData()
			formData.append('audio', audioBlob, 'live_chunk.webm')
			formData.append('language', language)

			const response = await fetch(`${baseUrl}/interviews/transcribe-live`, {
				method: 'POST',
				body: formData,
			})

			const payload = await response.json().catch(() => ({}))
			if (!response.ok || payload?.success === false) {
				lastError = new Error(payload?.error || `Live transcription request failed (${response.status})`)
				if (response.status === 429 || response.status === 400 || response.status === 401 || response.status === 403 || response.status === 404) {
					break
				}
				continue
			}

			liveTranscribePreferredBaseUrl = baseUrl

			return { data: payload?.data || payload, error: null }
		} catch (error) {
			lastError = error instanceof Error ? error : new Error('Unknown live transcription error')
			continue
		}
	}

	return {
		data: null,
		error: new Error(lastError?.message || `Live transcription failed for all API URLs: ${baseUrls.join(', ')}`),
	}
}

export async function decideNextQuestionStep({
	currentQuestion,
	candidateAnswer,
	category,
	idealAnswer,
	remainingBankQuestions = 0,
	followupCountForCurrent = 0,
}) {
	if (!currentQuestion || !candidateAnswer) {
		return { data: null, error: new Error('Missing currentQuestion or candidateAnswer') }
	}

	const configuredBaseUrl = (import.meta.env.VITE_API_URL || '').trim()
	const normalizedConfiguredBaseUrl = configuredBaseUrl.includes('localhost:5000')
		? configuredBaseUrl.replace('localhost:5000', 'localhost:3001')
		: configuredBaseUrl
	const fallbackBaseUrls = ['http://localhost:3001/api', 'http://127.0.0.1:3001/api']
	const baseUrls = Array.from(new Set([normalizedConfiguredBaseUrl, ...fallbackBaseUrls].filter(Boolean)))

	let lastError = null

	for (const baseUrl of baseUrls) {
		const decisionEndpoints = [
			'/interviews/next-question-decision',
			'/interviews/flow/next-question-decision',
		]

		try {
			let decisionRouteUnavailable = false

			for (const endpoint of decisionEndpoints) {
				const response = await fetch(`${baseUrl}${endpoint}`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						current_question: currentQuestion,
						candidate_answer: candidateAnswer,
						category,
						ideal_answer: idealAnswer,
						remaining_bank_questions: remainingBankQuestions,
						followup_count_for_current: followupCountForCurrent,
					}),
				})

				const payload = await response.json().catch(() => ({}))

				if (response.status === 404 || response.status === 405) {
					decisionRouteUnavailable = true
					continue
				}

				if (!response.ok || payload?.success === false) {
					lastError = new Error(payload?.error || `Next question decision failed (${response.status})`)
					break
				}

				return { data: payload?.data || payload, error: null }
			}

			if (!decisionRouteUnavailable) {
				continue
			}

			const followupFallbackResponse = await fetch(`${baseUrl}/interviews/follow-up-question`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					original_question: currentQuestion,
					candidate_answer: candidateAnswer,
					category,
					ideal_answer: idealAnswer,
				}),
			})

			const followupFallbackPayload = await followupFallbackResponse.json().catch(() => ({}))
			if (followupFallbackResponse.ok && followupFallbackPayload?.success !== false) {
				const followupQuestion = followupFallbackPayload?.data?.followup_question || ''
				if (followupQuestion) {
					return {
						data: {
							action: 'follow_up',
							followup_question: followupQuestion,
							source: followupFallbackPayload?.data?.source || 'fallback_followup_endpoint',
							reason: 'decision_route_unavailable',
						},
						error: null,
					}
				}
			}
		} catch (error) {
			lastError = error instanceof Error ? error : new Error('Unknown next question decision error')
		}
	}

	return {
		data: null,
		error: new Error(lastError?.message || `Next question decision failed for all API URLs: ${baseUrls.join(', ')}`),
	}
}

export async function triggerPendingSessionTranscriptions({ sessionId, force = false, limit = 50, includeFailed = false }) {
	if (!sessionId) {
		return { data: null, error: new Error('Missing session id') }
	}

	const targetStatuses = includeFailed ? ['pending', 'failed'] : ['pending']

	const { data: pendingSegments, error } = await supabase
		.from('interview_recording_segments')
		.select('id, whisper_status')
		.eq('session_id', sessionId)
		.in('whisper_status', targetStatuses)
		.order('created_at', { ascending: true })
		.limit(limit)

	if (error) {
		return { data: null, error }
	}

	const segments = pendingSegments || []
	if (segments.length === 0) {
		return {
			data: {
				attempted: 0,
				succeeded: 0,
				failed: 0,
				results: [],
			},
			error: null,
		}
	}

	const results = []
	for (const segment of segments) {
		const transcriptionResult = await triggerSegmentTranscription({
			sessionId,
			segmentId: segment.id,
			force,
		})
		results.push({
			segmentId: segment.id,
			success: !transcriptionResult.error,
			error: transcriptionResult.error?.message || null,
		})
	}

	const succeeded = results.filter((item) => item.success).length
	const failed = results.length - succeeded

	return {
		data: {
			attempted: results.length,
			succeeded,
			failed,
			results,
		},
		error: null,
	}
}


