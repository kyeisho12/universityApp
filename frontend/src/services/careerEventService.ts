import { supabase } from '../lib/supabaseClient'

export interface CareerEvent {
  id: string
  event_type: string
  title: string
  description: string
  date: string
  time: string
  location: string
  capacity?: number
  created_at?: string
  updated_at?: string
}

export interface EventRegistration {
  event_id: string
  student_id: string
  registered_at?: string
}

export interface EventWithRegistration extends CareerEvent {
  registered?: number
  isRegistered?: boolean
}

/**
 * Get all career events
 */
export async function getAllEvents(): Promise<CareerEvent[]> {
  const { data, error } = await supabase
    .from('career_events')
    .select('*')
    .order('date', { ascending: true })
  
  if (error) throw error
  return data || []
}

/**
 * Get events with registration status for a specific student
 */
export async function getEventsForStudent(studentId: string): Promise<EventWithRegistration[]> {
  try {
    // Get all events
    const { data: events, error: eventsError } = await supabase
      .from('career_events')
      .select('*')
      .order('date', { ascending: true })
    
    if (eventsError) throw eventsError
    if (!events) return []
    
    // Get all registrations for this student
    const { data: registrations, error: regError } = await supabase
      .from('event_registrations')
      .select('event_id')
      .eq('student_id', studentId)
    
    if (regError) throw regError
    
    const registeredEventIds = new Set((registrations || []).map(r => r.event_id))
    
    // Get registration counts for each event
    const { data: regCounts, error: countError } = await supabase
      .from('event_registrations')
      .select('event_id')
    
    if (countError) throw countError
    
    // Count registrations per event
    const countMap = new Map<string, number>()
    regCounts?.forEach(reg => {
      countMap.set(reg.event_id, (countMap.get(reg.event_id) || 0) + 1)
    })
    
    // Combine data
    return events.map(event => ({
      ...event,
      registered: countMap.get(event.id) || 0,
      isRegistered: registeredEventIds.has(event.id)
    }))
  } catch (error) {
    console.error('Error fetching events for student:', error)
    throw error
  }
}

/**
 * Get a specific event by ID
 */
export async function getEventById(eventId: string): Promise<CareerEvent | null> {
  const { data, error } = await supabase
    .from('career_events')
    .select('*')
    .eq('id', eventId)
    .single()
  
  if (error) throw error
  return data
}

/**
 * Create a new career event (admin only)
 */
export async function createEvent(event: Omit<CareerEvent, 'id' | 'created_at' | 'updated_at'>): Promise<CareerEvent> {
  const { data, error } = await supabase
    .from('career_events')
    .insert(event)
    .select()
    .single()
  
  if (error) throw error
  if (!data) throw new Error('Failed to create event')
  
  return data
}

/**
 * Update an existing event (admin only)
 */
export async function updateEvent(eventId: string, updates: Partial<CareerEvent>): Promise<CareerEvent> {
  const { data, error } = await supabase
    .from('career_events')
    .update(updates)
    .eq('id', eventId)
    .select()
    .single()
  
  if (error) throw error
  if (!data) throw new Error('Failed to update event')
  
  return data
}

/**
 * Delete an event (admin only)
 */
export async function deleteEvent(eventId: string): Promise<void> {
  const { error } = await supabase
    .from('career_events')
    .delete()
    .eq('id', eventId)
  
  if (error) throw error
}

/**
 * Register a student for an event
 */
export async function registerForEvent(eventId: string, studentId: string): Promise<void> {
  const { error } = await supabase
    .from('event_registrations')
    .insert({
      event_id: eventId,
      student_id: studentId
    })
  
  if (error) {
    // Check if already registered
    if (error.code === '23505') { // Unique constraint violation
      throw new Error('Already registered for this event')
    }
    throw error
  }
}

/**
 * Unregister a student from an event
 */
export async function unregisterFromEvent(eventId: string, studentId: string): Promise<void> {
  const { error } = await supabase
    .from('event_registrations')
    .delete()
    .eq('event_id', eventId)
    .eq('student_id', studentId)
  
  if (error) throw error
}

/**
 * Get all students registered for an event
 */
export async function getEventRegistrations(eventId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('event_registrations')
    .select('student_id')
    .eq('event_id', eventId)
  
  if (error) throw error
  return (data || []).map(r => r.student_id)
}

/**
 * Check if a student is registered for an event
 */
export async function isStudentRegistered(eventId: string, studentId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('event_registrations')
    .select('event_id')
    .eq('event_id', eventId)
    .eq('student_id', studentId)
    .maybeSingle()
  
  if (error) throw error
  return data !== null
}
