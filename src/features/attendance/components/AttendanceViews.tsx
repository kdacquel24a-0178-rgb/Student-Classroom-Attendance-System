import { useEffect, useMemo, useState } from "react"
import {
  academicYearSummary,
  adminYearAttendance,
  adminClassSchedule,
} from "@/features/shared/data"
import { AttendanceStatus } from "@/types"
import { Icon } from "@/components/Icon"
import { Button } from "@/components"
import { formatDate } from "@/lib/utils"
import { supabase } from "@/lib/supabase" // Adjust this import path to your Supabase client

export function AdminAttendanceOverview() {
  // ... (Keep existing AdminAttendanceOverview exactly as is for now)
  const [attendanceDate, setAttendanceDate] = useState("2026-10-21")
  const formattedDate = formatDate(attendanceDate, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  return (
    <>
      <section className="panel admin-monitor-heading">
        <div>
          <span className="eyebrow">Institution-wide monitoring</span>
          <h2>Attendance overview</h2>
          <p>Connected attendance summary for all uploaded year levels</p>
        </div>
        <label className="course-selector date-selector">
          <span>Monitoring date</span>
          <div>
            <Icon name="calendar" size={18} />
            <input
              onChange={(event) => setAttendanceDate(event.target.value)}
              type="date"
              value={attendanceDate}
            />
          </div>
        </label>
      </section>

      <section className="admin-attendance-metrics">
        {[
          ["Students", "66", "Uploaded registry"],
          ["Present", "41", "89.1% present"],
          ["Late", "2", "Counted attended"],
          ["Absent", "3", "Requires follow-up"],
        ].map(([label, value, detail]) => (
          <article className="panel" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{detail}</small>
          </article>
        ))}
      </section>

      <section className="panel data-panel admin-year-attendance">
        <div className="panel-heading">
          <div>
            <h3>Attendance by year level</h3>
            <p>{formattedDate} · First through fourth year</p>
          </div>
          <span className="sync-status">
            <Icon name="check" size={14} /> 66 records connected
          </span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Year level</th>
                <th>Enrollment</th>
                <th>Present</th>
                <th>Late</th>
                <th>Absent</th>
                <th>Attendance rate</th>
                <th>Handbook status</th>
              </tr>
            </thead>
            <tbody>
              {adminYearAttendance.map((attendance) => {
                const enrollment = academicYearSummary.find(
                  (item) => item.year === attendance.year,
                )
                return (
                  <tr key={attendance.year}>
                    <td>
                      <strong>Year {attendance.year}</strong>
                      <small className="course-code-label">
                        BSCS {attendance.year}A
                      </small>
                    </td>
                    <td>{enrollment?.students}</td>
                    <td>{attendance.present}</td>
                    <td>{attendance.late}</td>
                    <td>{attendance.absent}</td>
                    <td>
                      <div className="inline-rate">
                        <span>
                          <i style={{ width: `${attendance.rate}%` }} />
                        </span>
                        <strong>{attendance.rate}%</strong>
                      </div>
                    </td>
                    <td>
                      <span className="policy-mark mark-eligible">
                        Eligible
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="calendar-report-note">
          Present and Late are counted as attended. Rates are computed against
          the uploaded enrollment totals for each year level.
        </p>
      </section>
    </>
  )
}

export function AttendancePage({
  courses,
}: {
  courses: typeof adminClassSchedule
}) {
  const [courseRoster, setCourseRoster] = useState<any[]>([])
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({})
  const [saved, setSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const [attendanceSessions, setAttendanceSessions] = useState<Array<{
    courseCode: string
    courseTitle: string
    date: string
    present: number
    late: number
    absent: number
    percentage: number
  }>>([])
  
  const [selectedCourseCode, setSelectedCourseCode] = useState(courses[0]?.code || "")
  // Default to today's date instead of hardcoded 2026-10-21
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0])
  
  const selectedCourse = courses.find((course) => course.code === selectedCourseCode) || courses[0]
  
  const formattedAttendanceDate = formatDate(attendanceDate, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  // 1. Fetch Students and Existing Attendance for the selected course and date
  useEffect(() => {
    if (!selectedCourse) return

    const fetchClassData = async () => {
      setIsLoading(true)
      
      // Fetch students for this course's year and program
      // Fetch students for this course's year and program using the correct DB columns
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('year_level', selectedCourse.year) // Changed from 'year'
        .eq('program', 'BSCS')                 // Changed from 'course'

      if (studentsData) {
        // Map the database columns to the properties your front-end expects
        const mappedStudents = studentsData.map(dbStudent => ({
          id: dbStudent.id,                     // Keep UUID for the attendance table foreign key
          student_number: dbStudent.student_number, // Added for UI display
          name: dbStudent.full_name,            // Mapped from full_name
          course: dbStudent.program,            // Mapped from program
          year: dbStudent.year_level            // Mapped from year_level
        }))
        setCourseRoster(mappedStudents)
      } else {
        console.error("Error fetching students:", studentsError)
      }

      // Fetch existing attendance records for the selected date and course
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('course_code', selectedCourse.code)
        .eq('date', attendanceDate)

      if (attendanceData && attendanceData.length > 0) {
        // Map database records to the local state format
        const loadedAttendance: Record<string, AttendanceStatus> = {}
        attendanceData.forEach(record => {
          loadedAttendance[record.student_id] = record.status
        })
        setAttendance(loadedAttendance)
        setSaved(true)
      } else {
        // If no records exist for this date, default everyone to 'Present'
        const defaultAttendance: Record<string, AttendanceStatus> = {}
        studentsData?.forEach(student => {
          defaultAttendance[student.id] = "Present"
        })
        setAttendance(defaultAttendance)
        setSaved(false)
      }

      setIsLoading(false)
    }

    fetchClassData()
  }, [selectedCourse?.code, selectedCourse?.year, attendanceDate])

  // 2. Fetch all saved sessions for the calendar report
  useEffect(() => {
    const fetchSessions = async () => {
      const { data, error } = await supabase
        .from('attendance_sessions')
        .select('*')
        
      if (data) {
        // Map snake_case DB columns back to camelCase state if necessary
        const mappedSessions = data.map(session => ({
          courseCode: session.course_code,
          courseTitle: session.course_title,
          date: session.date,
          present: session.present,
          late: session.late,
          absent: session.absent,
          percentage: session.percentage
        }))
        setAttendanceSessions(mappedSessions)
      } else if (error) {
        console.error("Error fetching sessions:", error)
      }
    }
    
    fetchSessions()
  }, [])

  const counts = useMemo(
    () =>
      courseRoster.reduce<Record<string, number>>((result, student) => {
        const status = attendance[student.id] || "Present"
        result[status] = (result[status] || 0) + 1
        return result
      }, {}),
    [attendance, courseRoster],
  )

  // 3. Save attendance to Supabase
  const saveAttendanceSession = async () => {
    if (!selectedCourse) return
    setIsLoading(true)
    
    const present = counts.Present || 0
    const late = counts.Late || 0
    const absent = counts.Absent || 0
    const percentage = Number(
      (((present + late) / Math.max(1, courseRoster.length)) * 100).toFixed(1),
    )

    // Prepare individual student attendance records
    const attendanceRecords = courseRoster.map(student => ({
      student_id: student.id,
      course_code: selectedCourse.code,
      date: attendanceDate,
      status: attendance[student.id] || 'Present'
    }))

    // Upsert individual attendance
    const { error: attendanceError } = await supabase
      .from('attendance')
      .upsert(attendanceRecords, { onConflict: 'student_id, course_code, date' })

    // Prepare aggregate session record
    const sessionRecord = {
      course_code: selectedCourse.code,
      course_title: selectedCourse.title,
      date: attendanceDate,
      present,
      late,
      absent,
      percentage,
    }

    // Upsert session summary for the calendar report
    const { error: sessionError } = await supabase
      .from('attendance_sessions')
      .upsert(sessionRecord, { onConflict: 'course_code, date' })

    if (!attendanceError && !sessionError) {
      setSaved(true)
      
      // Update local sessions state immediately to reflect in UI
      setAttendanceSessions((current) => [
        ...current.filter(
          (item) =>
            item.courseCode !== selectedCourse.code ||
            item.date !== attendanceDate,
        ),
        { ...sessionRecord, courseCode: sessionRecord.course_code, courseTitle: sessionRecord.course_title },
      ])
    } else {
      console.error("Failed to save:", attendanceError, sessionError)
    }
    
    setIsLoading(false)
  }

  return (
    <>
      <section className="attendance-toolbar panel">
        <div>
          <span className="eyebrow">Attendance checking</span>
          <h3>{selectedCourse?.title}</h3>
          <p>
            {selectedCourse?.section} · {selectedCourse?.instructor}
          </p>
        </div>
        <div className="attendance-toolbar-actions">
          <label className="course-selector">
            <span>Select course</span>
            <select
              aria-label="Select course for attendance"
              onChange={(event) => {
                setSelectedCourseCode(event.target.value)
                setSaved(false)
              }}
              value={selectedCourseCode}
              disabled={isLoading}
            >
              {[1, 2, 3, 4].map((year) => {
                const yearCourses = courses.filter(
                  (course) => course.year === year,
                )
                if (!yearCourses.length) return null
                return (
                  <optgroup key={year} label={`Year ${year} · BSCS ${year}A`}>
                    {yearCourses.map((course) => (
                      <option
                        key={`${course.year}-${course.code}`}
                        value={course.code}
                      >
                        {course.code} · {course.title}
                      </option>
                    ))}
                  </optgroup>
                )
              })}
            </select>
          </label>
          <label className="course-selector date-selector">
            <span>Attendance date</span>
            <div>
              <Icon name="calendar" size={18} />
              <input
                aria-label="Select attendance date"
                onChange={(event) => {
                  setAttendanceDate(event.target.value)
                  setSaved(false)
                }}
                type="date"
                value={attendanceDate}
                disabled={isLoading}
              />
            </div>
          </label>
        </div>
      </section>
      
      <section className="panel data-panel">
        <div className="attendance-session-date">
          <Icon name="calendar" size={17} />
          Attendance session for <strong>{formattedAttendanceDate}</strong>
        </div>
        <div className="attendance-summary">
          {(["Present", "Absent", "Late"] as AttendanceStatus[]).map(
            (status) => (
              <span key={status}>
                <i className={`dot dot-${status.toLowerCase()}`} />{" "}
                {counts[status] || 0} {status}
              </span>
            ),
          )}
        </div>
        <div className="attendance-list" style={{ opacity: isLoading ? 0.6 : 1 }}>
          {courseRoster.length === 0 && !isLoading ? (
            <div className="empty-state">No students found for this course.</div>
          ) : (
            courseRoster.map((student) => (
              <div className="attendance-row" key={student.id}>
                <span className="student-cell">
                <span className="avatar">
                  {student.name.charAt(0)}
                  {student.name.split(",")[1]?.trim().charAt(0)}
                </span>
                <span>
                  <strong>{student.name}</strong>
                  <small>
                    {/* Use student_number for display instead of the UUID id */}
                    {student.student_number} · {student.course} {student.year}A
                  </small>
                </span>
              </span>
                <div className="status-options">
                  {(["Present", "Absent", "Late"] as AttendanceStatus[]).map(
                    (status) => (
                      <button
                        className={`status-button status-${status.toLowerCase()} ${
                          attendance[student.id] === status ? "selected" : ""
                        }`}
                        key={status}
                        onClick={() => {
                          setAttendance({ ...attendance, [student.id]: status })
                          setSaved(false)
                        }}
                        type="button"
                        disabled={isLoading}
                      >
                        {status}
                      </button>
                    ),
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="save-row">
          {saved && (
            <span className="saved-message">
              <Icon name="check" size={17} /> Attendance saved for{" "}
              {selectedCourse?.code} on {formattedAttendanceDate}
            </span>
          )}
          <Button 
            className="primary" 
            style={{
              backgroundColor: "#0066cc", // Vivid blue background
              color: "white",             // White text
              padding: "8px 16px",
              borderRadius: "6px",
              border: "none",
              fontWeight: 600,
              cursor: (isLoading || courseRoster.length === 0) ? "not-allowed" : "pointer",
              opacity: (isLoading || courseRoster.length === 0) ? 0.6 : 1
            }}
            onClick={saveAttendanceSession}
            disabled={isLoading || courseRoster.length === 0}
          >
            {isLoading ? "Saving..." : "Save attendance"}
          </Button>
        </div>
      </section>
      
      <section className="panel attendance-calendar-report">
        <div className="panel-heading">
          <div>
            <h3>Attendance calendar report</h3>
            <p>Saved attendance dates and handbook results for each subject</p>
          </div>
          <span className="period">
            <Icon name="calendar" size={15} /> {attendanceSessions.length} saved
          </span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Attendance date</th>
                <th>Present</th>
                <th>Late</th>
                <th>Absent</th>
                <th>Percentage</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => {
                const courseSessions = attendanceSessions
                  .filter((session) => session.courseCode === course.code)
                  .sort((a, b) => b.date.localeCompare(a.date))
                const latestSession = courseSessions[0]
                return (
                  <tr key={course.code}>
                    <td>
                      <strong>{course.title}</strong>
                      <small className="course-code-label">{course.code}</small>
                    </td>
                    <td>
                      {latestSession
                        ? formatDate(latestSession.date, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Not recorded"}
                    </td>
                    <td>{latestSession?.present ?? "—"}</td>
                    <td>{latestSession?.late ?? "—"}</td>
                    <td>{latestSession?.absent ?? "—"}</td>
                    <td>
                      {latestSession ? (
                        <strong>{latestSession.percentage}%</strong>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {latestSession ? (
                        <span
                          className={`policy-mark ${
                            latestSession.percentage >= 80
                              ? "mark-eligible"
                              : "mark-fa"
                          }`}
                        >
                          {latestSession.percentage >= 80 ? "Eligible" : "FA"}
                        </span>
                      ) : (
                        <span className="not-recorded">Pending</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="calendar-report-note">
          The latest saved date is shown for each subject. Saving the same
          subject and date again updates its calendar record.
        </p>
      </section>
    </>
  )
}