import { useState } from "react"
import { Icon } from "@/components/Icon"
import { Button } from "@/components"
import { useClassData } from "@/hooks/useClassData"

export function AdminClassSchedule() {
  const { schedule, loading, error } = useClassData()
  const [yearFilter, setYearFilter] = useState("all")
  const [query, setQuery] = useState("")

  if (loading) return <div className="panel admin-class-schedule">Loading schedule...</div>
  if (error) return <div className="panel admin-class-schedule text-red-500">Error loading data.</div>

  const yearLabel = (year: number) =>
    `${year}${year === 1 ? "st" : year === 2 ? "nd" : year === 3 ? "rd" : "th"} Year`
    
  const filteredSchedule = schedule.filter((course) => {
    const matchesYear = yearFilter === "all" || course.year === Number(yearFilter)
    const matchesQuery = `${course.code} ${course.title} ${course.instructor} ${course.room}`
        .toLowerCase()
        .includes(query.toLowerCase())
    return matchesYear && matchesQuery
  })
  
  const visibleYears = [1, 2, 3, 4].filter((year) =>
    filteredSchedule.some((course) => course.year === year),
  )

  // Dynamically calculate summary stats instead of hardcoding academicYearSummary
  const dynamicYearSummary = [1, 2, 3, 4].map(year => {
    const subjects = schedule.filter(c => c.year === year).length;
    return { year, subjects, units: subjects * 3, hours: subjects * 4 };
  })

  return (
    <section className="panel admin-class-schedule">
      <div className="schedule-hero">
        <div>
          <span className="eyebrow">First Semester · A.Y. 2026–2027</span>
          <h2>BSCS class schedule</h2>
          <p>Uploaded course offerings sorted from first through fourth year</p>
        </div>
        <span className="schedule-total">
          <strong>{schedule.length}</strong> scheduled classes
        </span>
      </div>

      <div className="schedule-year-tabs">
        <button
          className={yearFilter === "all" ? "active" : ""}
          onClick={() => setYearFilter("all")}
          type="button"
        >
          All levels <span>{schedule.length}</span>
        </button>
        {dynamicYearSummary.filter(s => s.subjects > 0).map((summary) => (
          <button
            className={yearFilter === String(summary.year) ? "active" : ""}
            key={summary.year}
            onClick={() => setYearFilter(String(summary.year))}
            type="button"
          >
            {yearLabel(summary.year)} <span>{summary.subjects}</span>
          </button>
        ))}
      </div>

      <div className="schedule-search">
        <label className="search-field">
          <Icon name="search" size={18} />
          <input
            aria-label="Search class schedule"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search course, instructor, or room..."
            value={query}
          />
        </label>
        <span>
          <Icon name="calendar" size={17} />
          Monday–Friday schedule
        </span>
      </div>

      <div className="schedule-levels">
        {visibleYears.map((year) => {
          const yearCourses = filteredSchedule.filter((course) => course.year === year)
          const summary = dynamicYearSummary.find((item) => item.year === year)
          
          return (
            <section className="schedule-level" key={year}>
              <div className="schedule-level-heading">
                <div>
                  <span>{year}</span>
                  <div>
                    <h3>{yearLabel(year)} · BSCS {year}A</h3>
                    <p>
                      {yearCourses.length} displayed subjects · {summary?.units}{" "}
                      total units · {summary?.hours} hours
                    </p>
                  </div>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Course code</th>
                      <th>Descriptive title</th>
                      <th>Section</th>
                      <th>Days</th>
                      <th>Time</th>
                      <th>Assigned to</th>
                      <th>Room</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearCourses.map((course) => (
                      <tr key={course.id}>
                        <td><span className="schedule-code">{course.code}</span></td>
                        <td><strong>{course.title}</strong></td>
                        <td>{course.section}</td>
                        <td><span className="day-pill">{course.days}</span></td>
                        <td>{course.time}</td>
                        <td>{course.instructor}</td>
                        <td><span className="room-pill">{course.room}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )
        })}
      </div>
    </section>
  )
}

export function ProfessorClasses({ professorName }: { professorName: string }) {
  const { schedule, students, loading } = useClassData()
  const [query, setQuery] = useState("")
  const [yearFilter, setYearFilter] = useState("all")

  if (loading) return <div className="panel p-4">Loading assigned classes...</div>

  // Handle the discrepancy between DB names (Ms.) and Profile names (Prof.)
  const teacherNameOverrides: Record<string, string> = {
    "Ms. Ruby Cruz": "Prof. Ruby Cruz",
    "Ms. Mary Arroyo": "Prof. Mary Arroyo",
  }

  // Filter schedule specific to this professor using the override mapping
  const professorCourses = schedule.filter((course) => {
    const normalizedInstructor = teacherNameOverrides[course.instructor] || course.instructor
    return normalizedInstructor === professorName
  })

  const assignedYears = [...new Set(professorCourses.map((course) => course.year))].sort(
    (a, b) => a - b,
  )
  
  const filteredCourses = professorCourses.filter((course) => {
    const matchesYear = yearFilter === "all" || course.year === Number(yearFilter)
    const matchesQuery =
      `${course.code} ${course.title} ${course.section} ${course.days} ${course.room}`
        .toLowerCase()
        .includes(query.toLowerCase())
    return matchesYear && matchesQuery
  })
  
  const visibleYears = assignedYears.filter((year) =>
    filteredCourses.some((course) => course.year === year),
  )
  
  const yearLabel = (year: number) =>
    `${year}${year === 1 ? "st" : year === 2 ? "nd" : year === 3 ? "rd" : "th"} Year`

  return (
    <section className="panel professor-classes">
      <div className="professor-class-hero">
        <div>
          <span className="eyebrow">Connected class assignments</span>
          <h2>Class Schedule</h2>
          <p>{professorName} · First Semester A.Y. 2026–2027</p>
        </div>
        <div className="teacher-directory-stats">
          <span>
            <strong>{professorCourses.length}</strong> classes
          </span>
          <span>
            <strong>{assignedYears.length}</strong> year levels
          </span>
        </div>
      </div>

      <div className="schedule-year-tabs">
        <button
          className={yearFilter === "all" ? "active" : ""}
          onClick={() => setYearFilter("all")}
          type="button"
        >
          All assigned classes <span>{professorCourses.length}</span>
        </button>
        {assignedYears.map((year) => {
          const count = professorCourses.filter((course) => course.year === year).length
          return (
            <button
              className={yearFilter === String(year) ? "active" : ""}
              key={year}
              onClick={() => setYearFilter(String(year))}
              type="button"
            >
              {yearLabel(year)} <span>{count}</span>
            </button>
          )
        })}
      </div>

      <div className="schedule-search">
        <label className="search-field">
          <Icon name="search" size={18} />
          <input
            aria-label="Search assigned classes"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search class, subject, day, or room..."
            value={query}
          />
        </label>
        <span>
          <Icon name="students" size={17} />
          Student rosters synced with Admin
        </span>
      </div>

      <div className="professor-class-levels">
        {visibleYears.map((year) => {
          const yearCourses = filteredCourses.filter(
            (course) => course.year === year,
          )
          // Live calculation against the 'students' table hook response
          const enrolledStudents = students.filter(
            (student) => student.year === year && student.course === "BSCS",
          ).length
          
          return (
            <section className="professor-class-level" key={year}>
              <div className="schedule-level-heading">
                <div>
                  <span>{year}</span>
                  <div>
                    <h3>
                      {yearLabel(year)} · BSCS {year}A
                    </h3>
                    <p>
                      {yearCourses.length} assigned classes · {enrolledStudents}{" "}
                      connected students
                    </p>
                  </div>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Subject</th>
                      <th>Section</th>
                      <th>Days</th>
                      <th>Time</th>
                      <th>Room</th>
                      <th>Students</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearCourses.map((course) => (
                      <tr key={course.id || `${course.year}-${course.code}`}>
                        <td>
                          <span className="schedule-code">{course.code}</span>
                        </td>
                        <td>
                          <strong>{course.title}</strong>
                        </td>
                        <td>{course.section}</td>
                        <td>
                          <span className="day-pill">{course.days}</span>
                        </td>
                        <td>{course.time}</td>
                        <td>
                          <span className="room-pill">{course.room}</span>
                        </td>
                        <td>
                          <span className="class-enrollment">
                            <Icon name="students" size={14} />
                            {enrolledStudents}
                          </span>
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
          <p className="schedule-empty">
            No assigned classes match the search.
          </p>
        )}
      </div>
      <div className="schedule-source">
        Class subjects and student counts are synchronized with Admin records
      </div>
    </section>
  )
}

export function DirectoryPage({ type }: { type: "teachers" | "classes" }) {
  const { schedule, loading } = useClassData()
  const isTeachers = type === "teachers"

  if (loading) return <div className="panel p-4">Loading directory...</div>

  // Dynamically map DB rows to the original directory grid layout
  const uniqueTeachers = Array.from(new Set(schedule.map(c => c.instructor)))
  
  const teacherRows = uniqueTeachers.map(teacher => {
    const courseCount = schedule.filter(c => c.instructor === teacher).length;
    const initials = teacher.split(" ").map(n => n[0]).join("").substring(0, 2);
    return [teacher, "Computer Science", `${courseCount} courses`, initials]
  })

  const classRows = schedule.map(course => [
    course.title,
    course.section,
    course.instructor,
    `View Roster`
  ])

  const rows = isTeachers ? teacherRows : classRows

  return (
    <section className="panel data-panel">
      <div className="toolbar">
        <p>
          {isTeachers
            ? "Manage staff accounts and class assignments."
            : "Organize subjects, classes, and teacher assignments."}
        </p>
        <Button className="primary">
          <Icon name="plus" size={18} /> Add {isTeachers ? "teacher" : "class"}
        </Button>
      </div>
      <div className="directory-grid">
        {rows.map((row, i) => (
          <article className="directory-card" key={i}>
            <span className="directory-icon">
              {isTeachers ? row[3] : <Icon name="book" />}
            </span>
            <div>
              <h3>{row[0]}</h3>
              <p>{row[1]}</p>
            </div>
            <div className="directory-meta">
              <span>{row[2]}</span>
              {!isTeachers && <span>{row[3]}</span>}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}