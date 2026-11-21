import { useState, useMemo } from "react"
import { Icon } from "@/components/Icon"
import { StatusBadge } from "@/components"
import { useClassData, ClassSchedule } from "@/hooks/useClassData"

export function AdminTeacherDirectory() {
  const { schedule, loading, error } = useClassData()
  const [query, setQuery] = useState("")

  const adminTeacherDirectory = useMemo(() => {
    if (!schedule) return []

    const teacherNameOverrides: Record<string, string> = {
      "Ms. Ruby Cruz": "Prof. Ruby Cruz",
      "Ms. Mary Arroyo": "Prof. Mary Arroyo",
    }

    const directoryMap = schedule.reduce((directory: Map<string, string[]>, course: ClassSchedule) => {
      const name = teacherNameOverrides[course.instructor] || course.instructor
      const subjects = directory.get(name) || []
      
      if (!subjects.includes(course.title)) {
        subjects.push(course.title)
      }
      
      directory.set(name, subjects)
      return directory
    }, new Map<string, string[]>())

    // This return statement was missing! It converts the Map back into an array.
    return Array.from(directoryMap.entries())
      .map(([name, subjects]) => ({ name, subjects }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [schedule])

  // This variable was missing! It handles the search bar filtering.
  const filteredTeachers = adminTeacherDirectory.filter((teacher) =>
    `${teacher.name} ${teacher.subjects.join(" ")}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  )

  const initialsFor = (name: string) => {
    const parts = name.replace(/^(Prof\.|Ms\.|Mr\.)\s*/, "").split(" ")
    return `${parts[0]?.charAt(0) || ""}${parts.at(-1)?.charAt(0) || ""}`
  }

  if (loading) return <div className="panel p-4">Loading teacher directory...</div>
  if (error) return <div className="panel p-4 text-red-500">Error loading data.</div>

  return (
    <>
      <section className="panel teacher-directory-hero">
        <div>
          <span className="eyebrow">Faculty assignments · A.Y. 2026–2027</span>
          <h2>Teacher directory</h2>
          <p>
            Instructors and assigned subjects from the uploaded class schedule
          </p>
        </div>
        <div className="teacher-directory-stats">
          <span>
            <strong>{adminTeacherDirectory.length}</strong> teachers
          </span>
          <span>
            <strong>{schedule.length}</strong> classes
          </span>
        </div>
      </section>

      <section className="panel teacher-directory-panel">
        <div className="teacher-directory-toolbar">
          <label className="search-field">
            <Icon name="search" size={18} />
            <input
              aria-label="Search teachers or subjects"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search teacher or assigned subject..."
              value={query}
            />
          </label>
          <span>{filteredTeachers.length} faculty records</span>
        </div>
        <div className="teacher-assignment-grid">
          {filteredTeachers.map((teacher) => (
            <article className="teacher-assignment-card" key={teacher.name}>
              <div className="teacher-card-heading">
                <span className="teacher-avatar">
                  {initialsFor(teacher.name)}
                </span>
                <div>
                  <h3>{teacher.name}</h3>
                  <p>
                    {teacher.subjects.length} assigned{" "}
                    {teacher.subjects.length === 1 ? "subject" : "subjects"}
                  </p>
                </div>
                <StatusBadge>Active</StatusBadge>
              </div>
              <div className="teacher-subjects">
                <strong>Assigned subjects</strong>
                {teacher.subjects.map((subject) => (
                  <span key={subject}>
                    <Icon name="book" size={14} />
                    {subject}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
        {!filteredTeachers.length && (
          <p className="schedule-empty">
            No teacher assignments match the search.
          </p>
        )}
      </section>
    </>
  )
}