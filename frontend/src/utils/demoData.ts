import { Activity, Subject, Topic } from '../types';

export function generateDemoData() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Demo Subjects
  const subjects: Subject[] = [
    {
      id: 'subject-1',
      title: 'Anatomy',
      examDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      weight: 8,
      strategy: 'traffic-light',
      mode: 'determined',
      color: '#3b82f6',
    },
    {
      id: 'subject-2',
      title: 'Physiology',
      examDate: new Date(today.getTime() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
      weight: 7,
      strategy: 'active-recall',
      mode: 'relaxed',
      color: '#8b5cf6',
    },
    {
      id: 'subject-3',
      title: 'Biochemistry',
      examDate: new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      weight: 9,
      strategy: 'traffic-light',
      mode: 'emergency',
      color: '#ef4444',
    },
    {
      id: 'subject-4',
      title: 'Pharmacology',
      examDate: new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
      weight: 6,
      strategy: 'manual',
      mode: 'relaxed',
      color: '#10b981',
    },
  ];

  // Demo Topics
  const topics: Topic[] = [
    // Anatomy topics
    { id: 'topic-1', title: 'Heart Structure', subjectId: 'subject-1', knowledge: 'green', order: 0, notes: 'Four chambers, valves' },
    { id: 'topic-2', title: 'Circulatory System', subjectId: 'subject-1', knowledge: 'yellow', order: 1, notes: 'Systemic and pulmonary circulation' },
    { id: 'topic-3', title: 'Nervous System', subjectId: 'subject-1', knowledge: 'red', order: 2 },
    { id: 'topic-4', title: 'Skeletal System', subjectId: 'subject-1', knowledge: 'yellow', order: 3 },
    { id: 'topic-5', title: 'Muscular System', subjectId: 'subject-1', knowledge: 'red', order: 4 },

    // Physiology topics
    { id: 'topic-6', title: 'Cardiac Cycle', subjectId: 'subject-2', knowledge: 'green', order: 0 },
    { id: 'topic-7', title: 'Blood Pressure Regulation', subjectId: 'subject-2', knowledge: 'yellow', order: 1 },
    { id: 'topic-8', title: 'Respiratory Mechanics', subjectId: 'subject-2', knowledge: 'red', order: 2 },
    { id: 'topic-9', title: 'Renal Function', subjectId: 'subject-2', knowledge: 'yellow', order: 3 },

    // Biochemistry topics
    { id: 'topic-10', title: 'Glycolysis', subjectId: 'subject-3', knowledge: 'red', order: 0 },
    { id: 'topic-11', title: 'Krebs Cycle', subjectId: 'subject-3', knowledge: 'red', order: 1 },
    { id: 'topic-12', title: 'Electron Transport Chain', subjectId: 'subject-3', knowledge: 'yellow', order: 2 },
    { id: 'topic-13', title: 'Amino Acid Metabolism', subjectId: 'subject-3', knowledge: 'red', order: 3 },
    { id: 'topic-14', title: 'Lipid Metabolism', subjectId: 'subject-3', knowledge: 'red', order: 4 },

    // Pharmacology topics
    { id: 'topic-15', title: 'Drug Absorption', subjectId: 'subject-4', knowledge: 'green', order: 0 },
    { id: 'topic-16', title: 'Drug Distribution', subjectId: 'subject-4', knowledge: 'yellow', order: 1 },
    { id: 'topic-17', title: 'Drug Metabolism', subjectId: 'subject-4', knowledge: 'yellow', order: 2 },
  ];

  // Demo Activities for the current week
  const activities: Activity[] = [];
  const weekDays = 7;

  // Regular weekly activities
  for (let day = 0; day < weekDays; day++) {
    const date = new Date(today);
    date.setDate(today.getDate() - today.getDay() + day); // Get day of current week

    // Morning routine
    activities.push({
      id: `sleep-${day}`,
      title: 'Sleep',
      type: 'sleep',
      startTime: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0),
      duration: 480, // 8 hours
      recurring: true,
      recurrencePattern: { frequency: 'daily' },
      negotiable: false,
      priority: 5,
      status: day < today.getDay() ? 'done' : 'scheduled',
    });

    activities.push({
      id: `breakfast-${day}`,
      title: 'Breakfast',
      type: 'meal',
      startTime: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 8, 0),
      duration: 30,
      recurring: true,
      recurrencePattern: { frequency: 'daily' },
      negotiable: false,
      priority: 5,
      status: day < today.getDay() ? 'done' : 'scheduled',
    });

    // Weekday classes
    if (day >= 1 && day <= 5) {
      activities.push({
        id: `class-1-${day}`,
        title: 'Anatomy Lecture',
        type: 'class',
        startTime: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0),
        duration: 120,
        recurring: true,
        recurrencePattern: { frequency: 'weekly', daysOfWeek: [1, 3, 5] },
        negotiable: false,
        priority: 5,
        status: day < today.getDay() ? 'done' : 'scheduled',
      });

      if (day === 2 || day === 4) {
        activities.push({
          id: `class-2-${day}`,
          title: 'Physiology Lab',
          type: 'class',
          startTime: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 13, 0),
          duration: 180,
          recurring: true,
          recurrencePattern: { frequency: 'weekly', daysOfWeek: [2, 4] },
          negotiable: false,
          priority: 5,
          status: day < today.getDay() ? 'done' : 'scheduled',
        });
      }
    }

    // Lunch
    activities.push({
      id: `lunch-${day}`,
      title: 'Lunch',
      type: 'meal',
      startTime: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0),
      duration: 45,
      recurring: true,
      recurrencePattern: { frequency: 'daily' },
      negotiable: false,
      priority: 5,
      status: day < today.getDay() ? 'done' : 'scheduled',
    });

    // Study sessions
    if (day >= 1 && day <= 5) {
      activities.push({
        id: `study-1-${day}`,
        title: 'Study Biochemistry',
        type: 'studying',
        startTime: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 16, 0),
        duration: 90,
        recurring: false,
        negotiable: true,
        priority: 4,
        status: day < today.getDay() ? (Math.random() > 0.3 ? 'done' : 'partial') : 'scheduled',
        subjectId: 'subject-3',
      });
    }

    // Evening activities
    activities.push({
      id: `dinner-${day}`,
      title: 'Dinner',
      type: 'meal',
      startTime: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 18, 30),
      duration: 45,
      recurring: true,
      recurrencePattern: { frequency: 'daily' },
      negotiable: false,
      priority: 5,
      status: day < today.getDay() ? 'done' : 'scheduled',
    });

    // Exercise
    if (day === 1 || day === 3 || day === 5) {
      activities.push({
        id: `exercise-${day}`,
        title: 'Gym / Exercise',
        type: 'sport',
        startTime: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 20, 0),
        duration: 60,
        recurring: true,
        recurrencePattern: { frequency: 'weekly', daysOfWeek: [1, 3, 5] },
        negotiable: true,
        priority: 3,
        status: day < today.getDay() ? (Math.random() > 0.4 ? 'done' : 'skipped') : 'scheduled',
      });
    }

    // Weekend rest
    if (day === 0 || day === 6) {
      activities.push({
        id: `rest-${day}`,
        title: 'Hobbies & Relaxation',
        type: 'rest',
        startTime: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 14, 0),
        duration: 180,
        recurring: true,
        recurrencePattern: { frequency: 'weekly', daysOfWeek: [0, 6] },
        negotiable: true,
        priority: 2,
        status: day < today.getDay() ? 'done' : 'scheduled',
      });
    }
  }

  return { subjects, topics, activities };
}
