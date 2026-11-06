import type {
  AttendanceStatus,
  UserRole,
  ProfessorAccount,
  StudentAccount,
  StudentRecord,
  CourseAttendance,
} from "@/types"

export const navigation = [
  { id: "overview", label: "Overview", icon: "dashboard" },
  { id: "students", label: "Students", icon: "students" },
  { id: "teachers", label: "Teachers", icon: "teachers" },
  { id: "classes", label: "Class Schedule", icon: "book" },
  { id: "attendance", label: "Attendance", icon: "calendar" },
  { id: "reports", label: "Reports", icon: "chart" },
] as const

export type Page = typeof navigation[number]["id"]

export const studentMasterRecord = {
  id: "2023-00124",
  name: "Marc Raven K. Bañaria",
  initials: "MB",
  class: "BSCS 3A",
  program: "Bachelor of Science in Computer Science - BSCS 3",
  rate: 90,
  status: "Active",
}

export const roleProfiles: Record<UserRole, {
  title: string
  name: string
  initials: string
  email: string
  password: string
  program?: string
}> = {
  admin: {
    title: "Administrator",
    name: "Alexandra Morgan",
    initials: "AM",
    email: "alexa.morgan@olopsc.edu.ph",
    password: "admin123",
  },
  professor: {
    title: "Professor",
    name: "Prof. Ruby Cruz",
    initials: "RC",
    email: "ruby.cruz@olopsc.edu.ph",
    password: "ruby123",
  },
  student: {
    title: "Student",
    name: studentMasterRecord.name,
    initials: studentMasterRecord.initials,
    email: "student@olopsc.edu.ph",
    password: "student123",
    program: studentMasterRecord.program,
  },
}

export const professorProfiles: Record<ProfessorAccount, typeof roleProfiles["professor"]> =
  {
    ruby: roleProfiles.professor,
    mary: {
      title: "Professor",
      name: "Prof. Mary Arroyo",
      initials: "MA",
      email: "mary.arroyo@olopsc.edu.ph",
      password: "mary123",
    },
  }

export const studentProfiles: Record<StudentAccount, typeof roleProfiles["student"] & {
  studentId: string
}> = {
  marc: {
    ...roleProfiles.student,
    studentId: studentMasterRecord.id,
  },
  kenneth: {
    title: "Student",
    name: "Kenneth A. Dacquel",
    initials: "KD",
    email: "kenneth.dacquel@olopsc.edu.ph",
    password: "kenneth123",
    program: "Bachelor of Science in Computer Science - BSCS 3",
    studentId: "24A-0178",
  },
}

export function computeAttendance(record: CourseAttendance) {
  const attended = record.present + record.late
  const percentage =
    record.scheduled === 0 ? 0 : (attended / record.scheduled) * 100
  const gradeWeight =
    record.classType === "Lecture" || record.classType === "Research"
      ? 10
      : record.classType === "Laboratory"
        ? 5
        : record.classType === "NSTP"
          ? 20
          : 0
  const mark =
    attended === 0
      ? "NA"
      : record.absenceHours > 11 ||
          (record.classType !== "Practicum" && percentage < 80)
        ? "FA"
        : "Eligible"

  return {
    attended,
    percentage: Number(percentage.toFixed(1)),
    gradeWeight,
    gradePoints: Number(((percentage / 100) * gradeWeight).toFixed(2)),
    mark,
  }
}

export const courseSections = [
  {
    code: "IAS",
    title: "Information Assurance and Security",
    section: "BSCS3A",
    instructor: roleProfiles.professor.name,
    students: 5,
    attendance: {
      scheduled: 20,
      present: 18,
      late: 1,
      absent: 1,
      absenceHours: 3,
      classType: "Lecture",
    } satisfies CourseAttendance,
  },
  {
    code: "GVC-LEC",
    title: "Graphic and Visual Computing (LEC)",
    section: "BSCS3A",
    instructor: roleProfiles.professor.name,
    students: 5,
    attendance: {
      scheduled: 20,
      present: 18,
      late: 1,
      absent: 1,
      absenceHours: 3,
      classType: "Lecture",
    } satisfies CourseAttendance,
  },
  {
    code: "GVC-LAB",
    title: "Graphic and Visual Computing (LAB)",
    section: "BSCS3A",
    instructor: roleProfiles.professor.name,
    students: 5,
    attendance: {
      scheduled: 20,
      present: 17,
      late: 1,
      absent: 2,
      absenceHours: 6,
      classType: "Laboratory",
    } satisfies CourseAttendance,
  },
  {
    code: "HCI",
    title: "Human Computer Interaction",
    section: "BSCS3A",
    instructor: roleProfiles.professor.name,
    students: 5,
    attendance: {
      scheduled: 20,
      present: 16,
      late: 1,
      absent: 3,
      absenceHours: 9,
      classType: "Lecture",
    } satisfies CourseAttendance,
  },
  {
    code: "OMC",
    title: "Organization and Management Concepts",
    section: "BSCS3A",
    instructor: "Prof. Mary Arroyo",
    students: 5,
    attendance: {
      scheduled: 20,
      present: 18,
      late: 1,
      absent: 1,
      absenceHours: 3,
      classType: "Lecture",
    } satisfies CourseAttendance,
  },
  {
    code: "SE-LEC",
    title: "Software Engineering (LEC)",
    section: "BSCS3A",
    instructor: "Prof. Mary Arroyo",
    students: 5,
    attendance: {
      scheduled: 20,
      present: 18,
      late: 1,
      absent: 1,
      absenceHours: 3,
      classType: "Lecture",
    } satisfies CourseAttendance,
  },
  {
    code: "SE-LAB",
    title: "Software Engineering (LAB)",
    section: "BSCS3A",
    instructor: "Prof. Mary Arroyo",
    students: 5,
    attendance: {
      scheduled: 20,
      present: 17,
      late: 1,
      absent: 2,
      absenceHours: 6,
      classType: "Laboratory",
    } satisfies CourseAttendance,
  },
]

export const rubyCourseSections = courseSections.filter(
  (course) => course.instructor === roleProfiles.professor.name,
)

export const maryCourseSections = courseSections.filter(
  (course) => course.instructor === "Prof. Mary Arroyo",
)

export const overallCourseAttendance = Number(
  (
    (courseSections.reduce(
      (total, course) => total + computeAttendance(course.attendance).attended,
      0,
    ) /
      courseSections.reduce(
        (total, course) => total + course.attendance.scheduled,
        0,
      )) *
    100
  ).toFixed(1),
)

export const students: StudentRecord[] = [
  {
    id: "ST-1025",
    name: "Schenly Raven G. Bacani",
    initials: "SB",
    class: "BSCS3A",
    rate: 90,
    status: "Active",
  },
  {
    id: "ST-1026",
    name: "Jhoanna Marie T. Bañaria",
    initials: "JB",
    class: "BSCS3A",
    rate: 80,
    status: "At risk",
  },
  studentMasterRecord,
  {
    id: "ST-1028",
    name: "Marc Aaron S. Uneta",
    initials: "MU",
    class: "BSCS3A",
    rate: 100,
    status: "Active",
  },
  {
    id: "ST-1027",
    name: "Kenneth A. Dacquel",
    initials: "KD",
    class: "BSCS3A",
    rate: 70,
    status: "At risk",
  },
]

export const adminStudentRegistry = [
  ["ANGULO, EMMANUEL A.", 1, "BSCS"],
  ["AQUINO, JAYCEE R.", 1, "BSCS"],
  ["CABUANG, PRECIOUS MAE S.", 1, "ACT"],
  ["CALIBARA, TIMOTHY RAY L.", 1, "BSCS"],
  ["DIZON, NICOLE D.", 1, "BSCS"],
  ["EXEQUIEL, FORREST LUTHER P.", 1, "BSCS"],
  ["FADERA, JAZZLEY C.", 1, "BSCS"],
  ["FRANCISCO, KURT RALPH M.", 1, "BSCS"],
  ["IGAMA, JOHN DIMITRI I.", 1, "BSCS"],
  ["LUCINO, ANDREI P.", 1, "BSCS"],
  ["NASE, MARIAN M.", 1, "BSCS"],
  ["PY, HEIDI T.", 1, "BSCS"],
  ["TEJERERO, AKIRA HEIDI P.", 1, "ACT"],
  ["CAMPITA, KATHLEEN CASSANDRA R.", 2, "BSCS"],
  ["CASAS, JHASMIN E B.", 2, "BSCS"],
  ["ENCIO, AMBRICHIE M.", 2, "BSCS"],
  ["FARIÑAS, JOHN JED N.", 2, "BSCS"],
  ["GONZAGA, RAY VANCE B.", 2, "BSCS"],
  ["SAMSON, DAVE R.", 2, "BSCS"],
  ["SUMABAL, ISIAH LAURENCE T.", 2, "BSCS"],
  ["TABIO, DORENZ GABRIEL V.", 2, "BSCS"],
  ["TAMAYO, TIMOTHY JAMES R.", 2, "BSCS"],
  ["TAROY, JUSTINE RAINE J.", 2, "BSCS"],
  ["VERGARA, ENRIQUE E.", 2, "BSCS"],
  ["VICENTE, PETER ADRIAN J.", 2, "BSCS"],
  ["ZAFRA, JABEZ S.", 2, "BSCS"],
  ["ALCASODA, MARY ANGEL N.", 3, "BSCS"],
  ["BACANI, SCHENLY RAVEN G.", 3, "BSCS"],
  ["BAÑARIA, JHOANNA MARIE T.", 3, "BSCS"],
  ["CRUZ, GIAN CHOLO V.", 3, "BSCS"],
  ["CUEVAS, BENEDICT ANDRE Q.", 3, "BSCS"],
  ["GAVIOLA, ADRIAN A.", 3, "BSCS"],
  ["MATIBAG, MELY ANGEL A.", 3, "BSCS"],
  ["METRIO, MARK VINCENT E.", 3, "BSCS"],
  ["PINO, JOHN DAVID C.", 3, "BSCS"],
  ["TAN, ADA C.", 3, "BSCS"],
  ["UNETA, MARC AARON S.", 3, "BSCS"],
  ["VELASQUEZ, REGINE P.", 3, "BSCS"],
  ["CIELO, ARIANNE", 4, "BSCS"],
  ["CONSTANTINO, LINDELL A.", 4, "BSCS"],
  ["DULPINA, EARL JOHANN", 4, "BSCS"],
  ["INOCENTES, TERD IMOGEN S.", 4, "BSCS"],
  ["MARTINEZ, ANTOINETTE C.", 4, "BSCS"],
  ["SAMSON, MARY SHECHEM C.", 4, "BSCS"],
  ["URBANO, ANNE TRIXIE A.", 4, "BSCS"],
  ["VILLAN, CARLA S.", 4, "BSCS"],
].map(([name, year, course], index) => ({
  id: `2026-${String(index + 1).padStart(3, "0")}`,
  number: index + 1,
  name: String(name),
  year: Number(year),
  course: String(course),
}))

export const academicYearSummary = [
  { year: 1, students: 13, subjects: 9, units: 23, hours: 25 },
  { year: 2, students: 13, subjects: 10, units: 20, hours: 26 },
  { year: 3, students: 12, subjects: 10, units: 18, hours: 27 },
  { year: 4, students: 8, subjects: 6, units: 12, hours: 16 },
]

export const adminYearAttendance = [
  { year: 1, present: 12, late: 0, absent: 1, rate: 92.3 },
  { year: 2, present: 12, late: 1, absent: 0, rate: 100 },
  { year: 3, present: 10, late: 1, absent: 1, rate: 91.7 },
  { year: 4, present: 7, late: 0, absent: 1, rate: 87.5 },
]

export const adminClassSchedule = [
  [
    1,
    "CC101",
    "Introduction to Computing",
    "MON / WED",
    "9:30 AM–11:00 AM",
    "Ms. Apasra Somo",
    "304",
  ],
  [
    1,
    "CC102",
    "Computer Programming 1 – LEC",
    "TUE",
    "10:30 AM–12:30 PM",
    "Ms. Ruby Cruz",
    "303",
  ],
  [
    1,
    "CC102L",
    "Computer Programming 1 – LAB",
    "TUE",
    "1:30 PM–4:30 PM",
    "Ms. Ruby Cruz",
    "305",
  ],
  [
    1,
    "EGE2",
    "Komunikasyon sa Akademikong Filipino",
    "TUE / THU",
    "7:30 AM–9:00 AM",
    "Ms. Anabelle Nase",
    "203",
  ],
  [
    1,
    "EGE3",
    "Mathematics in the Modern World",
    "MON / WED",
    "2:30 PM–4:00 PM",
    "Ms. Fleur Rivera",
    "302",
  ],
  [
    1,
    "EGE4",
    "Art Appreciation",
    "MON / WED",
    "1:00 PM–2:30 PM",
    "Ms. Anabelle Nase",
    "203",
  ],
  [
    1,
    "EGE12",
    "Pag-unawa sa Sarili",
    "TUE / THU",
    "9:00 AM–10:30 AM",
    "Ms. Caroline Abelo",
    "202",
  ],
  [
    1,
    "NSTP1",
    "Civic Welfare Training Service 1",
    "THU",
    "1:30 PM–4:30 PM",
    "Mr. Xavier Pillas",
    "301",
  ],
  [
    1,
    "PATHFIT 1",
    "Movement Competency Training",
    "THU",
    "10:30 AM–12:30 PM",
    "Mr. Xavier Pillas",
    "404–405",
  ],
  [
    2,
    "CC104",
    "Data Structures and Algorithms – LEC",
    "THU",
    "7:00 AM–9:00 AM",
    "Mr. Rame Tiongson",
    "304",
  ],
  [
    2,
    "CC104L",
    "Data Structures and Algorithms – LAB",
    "WED",
    "8:00 AM–11:00 AM",
    "Mr. Rame Tiongson",
    "305",
  ],
  [
    2,
    "DS102",
    "Discrete Structures 2",
    "TUE / THU",
    "1:00 PM–2:30 PM",
    "Ms. Apasra Somo",
    "304",
  ],
  [
    2,
    "EGE10",
    "Science, Technology and Society",
    "TUE / THU",
    "10:30 AM–12:00 PM",
    "Ms. Fleur Rivera",
    "201",
  ],
  [
    2,
    "HMGE11",
    "Panitikan",
    "TUE / THU",
    "9:00 AM–10:30 AM",
    "Ms. Anabelle Nase",
    "203",
  ],
  [
    2,
    "IM101",
    "Fundamentals of Database Systems – LEC",
    "MON",
    "8:00 AM–10:00 AM",
    "Ms. Ruby Cruz",
    "305",
  ],
  [
    2,
    "IM101L",
    "Fundamentals of Database Systems – LAB",
    "MON",
    "10:00 AM–1:00 PM",
    "Ms. Ruby Cruz",
    "305",
  ],
  [
    2,
    "PATHFIT 3",
    "Dance",
    "TUE",
    "2:30 PM–4:30 PM",
    "Mr. Xavier Pillas",
    "404–405",
  ],
  [
    2,
    "SDF104",
    "Object-Oriented Programming – LEC",
    "WED",
    "11:00 AM–1:00 PM",
    "Mr. Rame Tiongson",
    "305",
  ],
  [
    2,
    "SDF104L",
    "Object-Oriented Programming – LAB",
    "WED",
    "1:00 PM–4:00 PM",
    "Mr. Rame Tiongson",
    "305",
  ],
  [
    3,
    "AL101",
    "Algorithms and Complexity",
    "THU",
    "1:30 PM–4:30 PM",
    "Mr. Rame Tiongson",
    "301",
  ],
  [
    3,
    "CC106",
    "Applications Development and Emerging Technologies – LEC",
    "TUE",
    "8:00 AM–10:00 AM",
    "Mr. Rame Tiongson",
    "305",
  ],
  [
    3,
    "CC106L",
    "Applications Development and Emerging Technologies – LAB",
    "TUE",
    "10:00 AM–1:00 PM",
    "Mr. Rame Tiongson",
    "305",
  ],
  [
    3,
    "DM101",
    "Organization and Management Concepts",
    "TUE",
    "2:00 PM–5:00 PM",
    "Ms. Mary Arroyo",
    "402",
  ],
  [
    3,
    "GV101",
    "Graphics and Visual Computing – LEC",
    "WED",
    "7:00 AM–9:00 AM",
    "Ms. Ruby Cruz",
    "304",
  ],
  [
    3,
    "GV101L",
    "Graphics and Visual Computing – LAB",
    "THU",
    "10:00 AM–1:00 PM",
    "Ms. Ruby Cruz",
    "305",
  ],
  [
    3,
    "HCI101",
    "Human Computer Interaction",
    "WED / FRI",
    "10:30 AM–12:00 PM",
    "Ms. Ruby Cruz",
    "303",
  ],
  [
    3,
    "IAS101",
    "Information Assurance and Security",
    "WED / FRI",
    "9:00 AM–10:30 AM",
    "Ms. Ruby Cruz",
    "303",
  ],
  [
    3,
    "SE101",
    "Software Engineering 1 – LEC",
    "WED",
    "2:00 PM–4:00 PM",
    "Ms. Mary Arroyo",
    "304",
  ],
  [
    3,
    "SE101L",
    "Software Engineering 1 – LAB",
    "FRI",
    "2:00 PM–5:00 PM",
    "Ms. Mary Arroyo",
    "305",
  ],
  [
    4,
    "AL102",
    "Automata Theory and Formal Languages",
    "THU",
    "10:00 AM–1:00 PM",
    "Ms. Apasra Somo",
    "403",
  ],
  [
    4,
    "OS101",
    "Operating Systems – LEC",
    "TUE",
    "9:00 AM–11:00 AM",
    "Mr. Rame Tiongson",
    "403",
  ],
  [
    4,
    "OS101L",
    "Operating Systems – LAB",
    "MON",
    "1:00 PM–4:00 PM",
    "Mr. Rame Tiongson",
    "305",
  ],
  [
    4,
    "SF101",
    "System Fundamentals – LEC",
    "WED",
    "4:00 PM–6:00 PM",
    "Ms. Mary Arroyo",
    "304",
  ],
  [
    4,
    "SF101L",
    "System Fundamentals – LAB",
    "THU",
    "2:00 PM–5:00 PM",
    "Ms. Mary Arroyo",
    "305",
  ],
  [
    4,
    "THS101",
    "CS Thesis Writing 1",
    "FRI",
    "1:00 PM–4:00 PM",
    "Ms. Ruby Cruz",
    "302",
  ],
].map(([year, code, title, days, time, instructor, room]) => ({
  year: Number(year),
  code: String(code),
  title: String(title),
  section: `BSCS${year}A`,
  days: String(days),
  time: String(time),
  instructor: String(instructor),
  room: String(room),
}))

export const teacherNameOverrides: Record<string, string> = {
  "Ms. Ruby Cruz": "Prof. Ruby Cruz",
  "Ms. Mary Arroyo": "Prof. Mary Arroyo",
}

export const adminTeacherDirectory = Array.from(
  adminClassSchedule.reduce<Map<string, string[]>>((directory, course) => {
    const name = teacherNameOverrides[course.instructor] || course.instructor
    const subjects = directory.get(name) || []
    if (!subjects.includes(course.title)) subjects.push(course.title)
    directory.set(name, subjects)
    return directory
  }, new Map()),
)
  .map(([name, subjects]) => ({ name, subjects }))
  .sort((a, b) => a.name.localeCompare(b.name))

export function calculateSubjectStanding(
  studentSeed: number,
  subjectSeed: number,
  classType: "Lecture" | "Laboratory" = "Lecture",
) {
  const scheduled = 20
  const noAttendance = (studentSeed * 7 + subjectSeed * 3) % 43 === 0
  const absent = noAttendance ? scheduled : (studentSeed * 3 + subjectSeed) % 7
  const late = noAttendance
    ? 0
    : Math.min((studentSeed + subjectSeed * 2) % 3, scheduled - absent)
  const present = Math.max(0, scheduled - absent - late)
  const hoursPerAbsence = classType === "Laboratory" ? 3 : 2
  const summary = computeAttendance({
    scheduled,
    present,
    late,
    absent,
    absenceHours: absent * hoursPerAbsence,
    classType,
  })
  return { scheduled, present, late, absent, ...summary }
}

export const attendanceAlerts = [
  {
    studentId: "ST-1027",
    studentName: "Kenneth A. Dacquel",
    initials: "KD",
    courseCode: "GVC-LAB",
    subject: "Graphic and Visual Computing (LAB)",
    percentage: 70,
    status: "FA",
  },
  {
    studentId: "ST-1026",
    studentName: "Jhoanna Marie T. Bañaria",
    initials: "JB",
    courseCode: "HCI",
    subject: "Human Computer Interaction",
    percentage: 80,
    status: "At risk",
  },
  {
    studentId: "ST-1027",
    studentName: "Kenneth A. Dacquel",
    initials: "KD",
    courseCode: "SE-LAB",
    subject: "Software Engineering (LAB)",
    percentage: 75,
    status: "FA",
  },
]

export const defaultAttendance: Record<string, AttendanceStatus> = {
  [studentMasterRecord.id]: "Present",
  "ST-1025": "Present",
  "ST-1026": "Absent",
  "ST-1027": "Late",
  "ST-1028": "Present",
}

export const attendanceDates = [
  "2026-09-07",
  "2026-09-10",
  "2026-09-14",
  "2026-09-17",
  "2026-09-21",
  "2026-09-24",
  "2026-09-28",
  "2026-10-01",
  "2026-10-05",
  "2026-10-08",
]

export const attendanceCourses = [
  "Information Assurance and Security",
  "Graphic and Visual Computing",
  "Human Computer Interaction",
]

export function createAttendanceHistory(statuses: AttendanceStatus[]) {
  return statuses.map((status, index) => ({
    date: attendanceDates[index],
    course: attendanceCourses[index % attendanceCourses.length],
    status,
    hours: status === "Absent" ? 3 : 0,
  }))
}

export const studentAttendanceHistory: Record<string, ReturnType<typeof createAttendanceHistory>> =
  {
    [studentMasterRecord.id]: createAttendanceHistory([
      "Present",
      "Present",
      "Late",
      "Present",
      "Present",
      "Present",
      "Absent",
      "Present",
      "Present",
      "Present",
    ]),
    "ST-1025": createAttendanceHistory([
      "Present",
      "Late",
      "Present",
      "Present",
      "Present",
      "Present",
      "Present",
      "Absent",
      "Present",
      "Present",
    ]),
    "ST-1026": createAttendanceHistory([
      "Present",
      "Present",
      "Absent",
      "Present",
      "Late",
      "Present",
      "Absent",
      "Present",
      "Present",
      "Present",
    ]),
    "ST-1027": createAttendanceHistory([
      "Absent",
      "Present",
      "Late",
      "Present",
      "Absent",
      "Present",
      "Present",
      "Absent",
      "Present",
      "Present",
    ]),
    "ST-1028": createAttendanceHistory([
      "Present",
      "Present",
      "Late",
      "Present",
      "Present",
      "Present",
      "Present",
      "Present",
      "Present",
      "Present",
    ]),
  }

export function summarizeStudentAttendance(
  history: ReturnType<typeof createAttendanceHistory>,
) {
  const count = (status: AttendanceStatus) =>
    history.filter((entry) => entry.status === status).length
  return computeAttendance({
    scheduled: history.length,
    present: count("Present"),
    late: count("Late"),
    absent: count("Absent"),
    absenceHours: history.reduce((total, entry) => total + entry.hours, 0),
    classType: "Lecture",
  })
}
