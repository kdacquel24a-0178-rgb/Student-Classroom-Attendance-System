import { useEffect, useState } from "react"
import { getStudents, type StudentRow } from "@/lib/database"
import {
  students,
  adminStudentRegistry,
  academicYearSummary,
  studentAttendanceHistory,
  summarizeStudentAttendance,
} from "@/features/shared/data"
import { AttendanceStatus } from "@/types"
import { Icon } from "@/components/Icon"
import { Button, StatusBadge } from "@/components"
import { formatDate } from "@/lib/utils"

function useSupabaseStudents() {
  const [students, setStudents] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadStudents() {
      try {
        const data = await getStudents()

        if (active) {
          setStudents(data)
          setError(null)
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to retrieve students"
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadStudents()

    return () => {
      active = false
    }
  }, [])

  return { students, loading, error }
}

function getCourseName(program: string | null) {
  const value = program?.toUpperCase() ?? ""

  if (value.includes("BSCS")) return "BSCS"
  if (value.includes("ACT")) return "ACT"

  return program || "—"
}

function getStudentInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}


export function AdminStudentRegistry() {
  const {
    students: dbStudents,
    loading,
    error,
  } = useSupabaseStudents()

  const [query, setQuery] = useState("")
  const [yearFilter, setYearFilter] = useState("all")
  const [courseFilter, setCourseFilter] = useState("all")

  const yearLabel = (year: number | null) => {
    if (!year) return "Not assigned"

    return `${year}${
      year === 1 ? "st" : year === 2 ? "nd" : year === 3 ? "rd" : "th"
    } Year`
  }

  // Generate year summaries from Supabase records
  const yearSummaries = [1, 2, 3, 4].map((year) => ({
    year,
    students: dbStudents.filter(
      (student) => student.year_level === year
    ).length,
  }))

  // Search and filter database records
  const filteredStudents = dbStudents.filter((student) => {
    const course = getCourseName(student.program)

    const matchesQuery = (
      `${student.full_name} ${student.student_number} ${course}`
    )
      .toLowerCase()
      .includes(query.toLowerCase())

    const matchesYear =
      yearFilter === "all" ||
      student.year_level === Number(yearFilter)

    const matchesCourse =
      courseFilter === "all" || course === courseFilter

    return matchesQuery && matchesYear && matchesCourse
  })

  if (loading) return <p>Loading student records...</p>

  if (error) {
    return <p role="alert">Error loading students: {error}</p>
  }

  return (
    <>
      <section className="registry-summary-grid">
        {yearSummaries.map((summary) => (
          <article
            className={`panel registry-summary-card year-${summary.year}`}
            key={summary.year}
          >
            <span>{yearLabel(summary.year)}</span>
            <strong>{summary.students}</strong>
            <small>enrolled students</small>

            <div>
              <span>
                {dbStudents.filter(
                  (s) =>
                    s.year_level === summary.year &&
                    getCourseName(s.program) === "BSCS"
                ).length} BSCS
              </span>
              <span>
                {dbStudents.filter(
                  (s) =>
                    s.year_level === summary.year &&
                    getCourseName(s.program) === "ACT"
                ).length} ACT
              </span>
            </div>
          </article>
        ))}
      </section>

      <section className="panel data-panel admin-registry">
        <div className="registry-heading">
          <div>
            <span className="eyebrow">A.Y. 2026–2027</span>
            <h3>College student registry</h3>
            <p>Student records retrieved from Supabase</p>
          </div>

          <span className="registry-total">
            <strong>{dbStudents.length}</strong> total students
          </span>
        </div>

        <div className="registry-filters">
          <label className="search-field">
            <Icon name="search" size={18} />
            <input
              aria-label="Search registry"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, ID, or course..."
              value={query}
            />
          </label>

          <label className="registry-select">
            <span>Year level</span>
            <select
              onChange={(event) => setYearFilter(event.target.value)}
              value={yearFilter}
            >
              <option value="all">All years</option>
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>
          </label>

          <label className="registry-select">
            <span>Course</span>
            <select
              onChange={(event) => setCourseFilter(event.target.value)}
              value={courseFilter}
            >
              <option value="all">All courses</option>
              <option value="BSCS">BSCS</option>
              <option value="ACT">ACT</option>
            </select>
          </label>

          <Button className="primary">
            <Icon name="plus" size={18} /> Add student
          </Button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>No.</th>
                <th>Student</th>
                <th>Student ID</th>
                <th>Year level</th>
                <th>Course</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredStudents.map((student, index) => {
                const course = getCourseName(student.program)

                return (
                  <tr key={student.id}>
                    <td>{index + 1}</td>

                    <td>
                      <span className="student-cell">
                        <span className="avatar">
                          {getStudentInitials(student.full_name)}
                        </span>
                        <strong>{student.full_name}</strong>
                      </span>
                    </td>

                    <td>{student.student_number}</td>
                    <td>{yearLabel(student.year_level)}</td>

                    <td>
                      <span
                        className={`course-pill course-${course.toLowerCase()}`}
                      >
                        {course}
                      </span>
                    </td>

                    <td>
                      <StatusBadge>{student.status}</StatusBadge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filteredStudents.length === 0 && (
            <p className="schedule-empty">
              No student records found.
            </p>
          )}
        </div>

        <div className="table-footer registry-footer">
          <span>
            Showing {filteredStudents.length} of {dbStudents.length} students
          </span>
          <span>Source: Supabase student records</span>
        </div>
      </section>
    </>
  )
}


export function ProfessorStudentDirectory() {
  const [query, setQuery] = useState("")
  const [yearFilter, setYearFilter] = useState("all")
  const yearLabel = (year: number) =>
    `${year}${
      year === 1 ? "st" : year === 2 ? "nd" : year === 3 ? "rd" : "th"
    } Year`
  const filteredStudents = adminStudentRegistry.filter((student) => {
    const matchesYear =
      yearFilter === "all" || student.year === Number(yearFilter)
    const matchesQuery = `${student.name} ${student.id} ${student.course}`
      .toLowerCase()
      .includes(query.toLowerCase())
    return matchesYear && matchesQuery
  })
  const visibleYears = [1, 2, 3, 4].filter((year) =>
    filteredStudents.some((student) => student.year === year),
  )
  const getInitials = (name: string) => {
    const [surname, given = ""] = name.split(",")
    return `${surname.trim().charAt(0)}${given.trim().charAt(0)}`
  }

  return (
    <section className="panel professor-student-directory">
      <div className="professor-student-hero">
        <div>
          <span className="eyebrow">Connected Admin registry</span>
          <h2>Student directory</h2>
          <p>Read-only enrollment records arranged by year level</p>
        </div>
        <span className="schedule-total">
          <strong>{adminStudentRegistry.length}</strong> students
        </span>
      </div>

      <div className="schedule-year-tabs">
        <button
          className={yearFilter === "all" ? "active" : ""}
          onClick={() => setYearFilter("all")}
          type="button"
        >
          All year levels <span>{adminStudentRegistry.length}</span>
        </button>
        {academicYearSummary.map((summary) => (
          <button
            className={yearFilter === String(summary.year) ? "active" : ""}
            key={summary.year}
            onClick={() => setYearFilter(String(summary.year))}
            type="button"
          >
            {yearLabel(summary.year)} <span>{summary.students}</span>
          </button>
        ))}
      </div>

      <div className="schedule-search">
        <label className="search-field">
          <Icon name="search" size={18} />
          <input
            aria-label="Search student directory"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search student name, ID, or course..."
            value={query}
          />
        </label>
        <span>
          <Icon name="students" size={17} />
          Synced with Admin
        </span>
      </div>

      <div className="professor-year-groups">
        {visibleYears.map((year) => {
          const yearStudents = filteredStudents.filter(
            (student) => student.year === year,
          )
          return (
            <section className="professor-year-group" key={year}>
              <div className="schedule-level-heading">
                <div>
                  <span>{year}</span>
                  <div>
                    <h3>{yearLabel(year)} students</h3>
                    <p>
                      {yearStudents.length} displayed enrollment records · BSCS
                      {year === 1 ? " and ACT" : ""}
                    </p>
                  </div>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Student</th>
                      <th>Student ID</th>
                      <th>Course</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearStudents.map((student) => (
                      <tr key={student.id}>
                        <td>{student.number}</td>
                        <td>
                          <span className="student-cell">
                            <span className="avatar">
                              {getInitials(student.name)}
                            </span>
                            <strong>{student.name}</strong>
                          </span>
                        </td>
                        <td>{student.id}</td>
                        <td>
                          <span
                            className={`course-pill course-${student.course.toLowerCase()}`}
                          >
                            {student.course}
                          </span>
                        </td>
                        <td>
                          <StatusBadge>Active</StatusBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )
        })}
        {!visibleYears.length && (
          <p className="schedule-empty">No student records match the search.</p>
        )}
      </div>
      <div className="schedule-source">
        Read-only faculty view · Student records are managed by Admin
      </div>
    </section>
  )
}

export function StudentsPage({
  selectedStudentId,
  setSelectedStudentId,
}: {
  selectedStudentId: string | null
  setSelectedStudentId: (studentId: string | null) => void
}) {
  const [query, setQuery] = useState("")
  const selectedStudent =
    students.find((student) => student.id === selectedStudentId) || null
  const selectedHistory = selectedStudent
    ? studentAttendanceHistory[selectedStudent.id] || []
    : []
  const selectedSummary = selectedStudent
    ? summarizeStudentAttendance(selectedHistory)
    : null
  const statusCount = (status: AttendanceStatus) =>
    selectedHistory.filter((entry) => entry.status === status).length
  const filtered = students.filter((student) =>
    `${student.name} ${student.id} ${student.class}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  )

  return (
    <section className="panel data-panel">
      <div className="toolbar">
        <label className="search-field">
          <Icon name="search" size={18} />
          <input
            aria-label="Search students"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search students..."
            value={query}
          />
        </label>
        <Button className="primary">
          <Icon name="plus" size={18} /> Add student
        </Button>
      </div>
      {selectedStudent && (
        <div className="student-attendance-profile">
          <div className="detail-profile-heading">
            <span className="student-profile-avatar">
              {selectedStudent.initials}
            </span>
            <div>
              <span>Student attendance profile</span>
              <h3>{selectedStudent.name}</h3>
              <p>
                {selectedStudent.id} ·{" "}
                {"program" in selectedStudent
                  ? selectedStudent.program
                  : selectedStudent.class}
              </p>
            </div>
            <StatusBadge>{selectedStudent.status}</StatusBadge>
            <button
              aria-label="Close student profile"
              className="profile-close"
              onClick={() => setSelectedStudentId(null)}
              type="button"
            >
              ×
            </button>
          </div>

          <div className="attendance-detail-summary">
            <span>
              <small>Present</small>
              <strong>{statusCount("Present")}</strong>
            </span>
            <span>
              <small>Late</small>
              <strong>{statusCount("Late")}</strong>
            </span>
            <span>
              <small>Absent</small>
              <strong>{statusCount("Absent")}</strong>
            </span>
            <span className="percentage-summary">
              <small>Handbook percentage</small>
              <strong>{selectedSummary?.percentage}%</strong>
              <em>{selectedSummary?.mark}</em>
            </span>
          </div>

          <div className="status-legend">
            <strong>Student status legend</strong>
            <span>
              <i className="legend-dot active" />
              <b>Active</b> — 85% or higher attendance and no handbook threshold
              violation.
            </span>
            <span>
              <i className="legend-dot risk" />
              <b>At risk</b> — below 85%, approaching the 11-hour limit, or
              already below the 80% credit requirement.
            </span>
          </div>

          <div className="attendance-ledger">
            <div className="ledger-heading">
              <div>
                <h3>Dated attendance record</h3>
                <p>
                  Present and Late count as attended under this system
                  computation.
                </p>
              </div>
              <span>{selectedHistory.length} scheduled meetings</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Course</th>
                    <th>Status</th>
                    <th>Absence hours</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedHistory.map((entry) => (
                    <tr key={`${entry.date}-${entry.course}`}>
                      <td>
                        {formatDate(entry.date, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td>{entry.course}</td>
                      <td>
                        <StatusBadge>{entry.status}</StatusBadge>
                      </td>
                      <td>{entry.hours ? `${entry.hours} hours` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="ledger-formula">
              ({statusCount("Present")} Present + {statusCount("Late")} Late) ÷{" "}
              {selectedHistory.length} scheduled meetings × 100 ={" "}
              <strong>{selectedSummary?.percentage}%</strong>. FA applies below
              80% or above 11 absence hours; NA applies when no meeting was
              attended.
            </p>
          </div>
        </div>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Student ID</th>
              <th>Class</th>
              <th>Attendance</th>
              <th>Status</th>
              <th>Profile</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((student) => (
              <tr key={student.id}>
                <td>
                  <span className="student-cell">
                    <span className="avatar">{student.initials}</span>
                    <strong>{student.name}</strong>
                  </span>
                </td>
                <td>{student.id}</td>
                <td>{student.class}</td>
                <td>
                  <strong>{student.rate}%</strong>
                </td>
                <td>
                  <StatusBadge>{student.status}</StatusBadge>
                </td>
                <td>
                  <button
                    className="view-profile-button"
                    onClick={() => setSelectedStudentId(student.id)}
                    type="button"
                  >
                    View profile <Icon name="chevron" size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-footer">
        Showing {filtered.length} of 5 students
      </div>
    </section>
  )
}
