import { useMemo, useState } from "react"
import {
  students,
  adminStudentRegistry,
  academicYearSummary,
  adminYearAttendance,
  adminClassSchedule,
} from "@/features/shared/data"
import { AttendanceStatus } from "@/types"
import { Icon } from "@/components/Icon"
import { Button } from "@/components"
import { formatDate } from "@/lib/utils"

export function AdminAttendanceOverview() {
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
  const [attendance, setAttendance] =
    useState<Record<string, AttendanceStatus>>(() =>
      Object.fromEntries(
        adminStudentRegistry.map((student, index) => [
          student.id,
          index % 11 === 0 ? "Absent" : index % 7 === 0 ? "Late" : "Present",
        ]),
      ),
    )
  const [saved, setSaved] = useState(false)
  const [attendanceSessions, setAttendanceSessions] = useState<Array<{
    courseCode: string
    courseTitle: string
    date: string
    present: number
    late: number
    absent: number
    percentage: number
  }>>([])
  const [selectedCourseCode, setSelectedCourseCode] = useState(
    courses[0]?.code || "",
  )
  const [attendanceDate, setAttendanceDate] = useState("2026-10-21")
  const selectedCourse =
    courses.find((course) => course.code === selectedCourseCode) || courses[0]
  const courseRoster = adminStudentRegistry.filter(
    (student) =>
      student.year === selectedCourse?.year && student.course === "BSCS",
  )
  const formattedAttendanceDate = formatDate(attendanceDate, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
  const counts = useMemo(
    () =>
      courseRoster.reduce<Record<string, number>>((result, student) => {
        const status = attendance[student.id] || "Present"
        result[status] = (result[status] || 0) + 1
        return result
      }, {}),
    [attendance, selectedCourse?.year],
  )
  const saveAttendanceSession = () => {
    if (!selectedCourse) return
    const present = counts.Present || 0
    const late = counts.Late || 0
    const absent = counts.Absent || 0
    const percentage = Number(
      (((present + late) / Math.max(1, courseRoster.length)) * 100).toFixed(1),
    )
    const session = {
      courseCode: selectedCourse.code,
      courseTitle: selectedCourse.title,
      date: attendanceDate,
      present,
      late,
      absent,
      percentage,
    }
    setAttendanceSessions((current) => [
      ...current.filter(
        (item) =>
          item.courseCode !== selectedCourse.code ||
          item.date !== attendanceDate,
      ),
      session,
    ])
    setSaved(true)
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
        <div className="attendance-list">
          {courseRoster.map((student) => (
            <div className="attendance-row" key={student.id}>
              <span className="student-cell">
                <span className="avatar">
                  {student.name.charAt(0)}
                  {student.name.split(",")[1]?.trim().charAt(0)}
                </span>
                <span>
                  <strong>{student.name}</strong>
                  <small>
                    {student.id} · {student.course} {student.year}A
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
                    >
                      {status}
                    </button>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="save-row">
          {saved && (
            <span className="saved-message">
              <Icon name="check" size={17} /> Attendance saved for{" "}
              {selectedCourse?.code} on {formattedAttendanceDate}
            </span>
          )}
          <Button className="primary" onClick={saveAttendanceSession}>
            Save attendance
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
