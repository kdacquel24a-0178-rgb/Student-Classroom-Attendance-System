// src/hooks/useClassData.ts
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface ClassSchedule {
  id: string
  year: number
  code: string
  title: string
  section: string
  days: string
  time: string
  instructor: string
  room: string
}

export interface Student {
  id: string
  student_id: string
  name: string
  year: number
  course: string
}

export function useClassData() {
  const [schedule, setSchedule] = useState<ClassSchedule[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [scheduleRes, studentsRes] = await Promise.all([
          supabase.from('class_schedule').select('*').order('year', { ascending: true }),
          supabase.from('students').select('*')
        ])

        if (scheduleRes.error) throw scheduleRes.error
        if (studentsRes.error) throw studentsRes.error

        setSchedule(scheduleRes.data || [])
        setStudents(studentsRes.data || [])
      } catch (err: any) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])

  return { schedule, students, loading, error }
}