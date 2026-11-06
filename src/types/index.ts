export type AttendanceStatus = "Present" | "Absent" | "Late"

export type UserRole = "admin" | "professor" | "student"

export type ProfessorAccount = "ruby" | "mary"

export type StudentAccount = "marc" | "kenneth"

export type StudentRecord = {
  id: string
  name: string
  initials: string
  class: string
  program?: string
  rate: number
  status: string
}

export type CourseAttendance = {
  scheduled: number
  present: number
  late: number
  absent: number
  absenceHours: number
  classType: "Lecture" | "Laboratory" | "Research" | "NSTP" | "Practicum"
}
