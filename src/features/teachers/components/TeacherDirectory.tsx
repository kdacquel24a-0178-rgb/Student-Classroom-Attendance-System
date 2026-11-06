import { useState } from "react"
import {
  adminClassSchedule,
  adminTeacherDirectory,
} from "@/features/shared/data"
import { Icon } from "@/components/Icon"
import { StatusBadge } from "@/components"

export function AdminTeacherDirectory() {
  const [query, setQuery] = useState("")
  const filteredTeachers = adminTeacherDirectory.filter((teacher) =>
    `${teacher.name} ${teacher.subjects.join(" ")}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  )
  const initialsFor = (name: string) => {
    const parts = name.replace(/^(Prof\.|Ms\.|Mr\.)\s*/, "").split(" ")
    return `${parts[0]?.charAt(0) || ""}${parts.at(-1)?.charAt(0) || ""}`
  }

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
            <strong>{adminClassSchedule.length}</strong> classes
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
