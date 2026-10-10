import { Activity, Subject, Topic } from '../types';
import { addDays, startOfDay } from './dates';

// Demo content for a new account. It is generated here and saved through the normal API, so it
// behaves like data the student entered. `key` / `subjectKey` / `topicKey` link the records before
// the server has assigned ids.
export interface DemoSubject extends Omit<Subject, 'id'> {
  key: string;
}

export interface DemoTopic extends Omit<Topic, 'id' | 'subjectId'> {
  key: string;
  subjectKey: string;
}

export interface DemoActivity extends Omit<Activity, 'id' | 'subjectId' | 'topicId'> {
  subjectKey?: string;
  topicKey?: string;
}

export function generateDemoData() {
  const today = startOfDay(new Date());
  const weekStart = addDays(today, -today.getDay()); // Sunday of the current week
  const at = (day: Date, hours: number, minutes = 0) =>
    new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes);

  const subjects: DemoSubject[] = [
    { key: 'anatomy', title: 'Anatomy', examDate: addDays(today, 30), weight: 8, strategy: 'traffic-light', mode: 'determined', color: '#3b82f6' },
    { key: 'physiology', title: 'Physiology', examDate: addDays(today, 45), weight: 7, strategy: 'active-recall', mode: 'relaxed', color: '#8b5cf6' },
    { key: 'biochemistry', title: 'Biochemistry', examDate: addDays(today, 15), weight: 9, strategy: 'traffic-light', mode: 'emergency', color: '#ef4444' },
    { key: 'pharmacology', title: 'Pharmacology', examDate: addDays(today, 60), weight: 6, strategy: 'manual', mode: 'relaxed', color: '#10b981' },
  ];

  const topic = (key: string, subjectKey: string, title: string, knowledge: Topic['knowledge'], order: number, notes?: string): DemoTopic =>
    ({ key, subjectKey, title, knowledge, order, notes });

  const topics: DemoTopic[] = [
    topic('heart', 'anatomy', 'Heart Structure', 'green', 0, 'Four chambers, valves'),
    topic('circulation', 'anatomy', 'Circulatory System', 'yellow', 1, 'Systemic and pulmonary circulation'),
    topic('nervous', 'anatomy', 'Nervous System', 'red', 2),
    topic('skeletal', 'anatomy', 'Skeletal System', 'yellow', 3),
    topic('muscular', 'anatomy', 'Muscular System', 'red', 4),

    topic('cardiac-cycle', 'physiology', 'Cardiac Cycle', 'green', 0),
    topic('blood-pressure', 'physiology', 'Blood Pressure Regulation', 'yellow', 1),
    topic('respiratory', 'physiology', 'Respiratory Mechanics', 'red', 2),
    topic('renal', 'physiology', 'Renal Function', 'yellow', 3),

    topic('glycolysis', 'biochemistry', 'Glycolysis', 'red', 0),
    topic('krebs', 'biochemistry', 'Krebs Cycle', 'red', 1),
    topic('etc', 'biochemistry', 'Electron Transport Chain', 'yellow', 2),
    topic('amino-acids', 'biochemistry', 'Amino Acid Metabolism', 'red', 3),
    topic('lipids', 'biochemistry', 'Lipid Metabolism', 'red', 4),

    topic('absorption', 'pharmacology', 'Drug Absorption', 'green', 0),
    topic('distribution', 'pharmacology', 'Drug Distribution', 'yellow', 1),
    topic('metabolism', 'pharmacology', 'Drug Metabolism', 'yellow', 2),
  ];

  const fixed = { negotiable: false, priority: 5, status: 'scheduled' as const };
  const daily = { recurring: true, recurrencePattern: { frequency: 'daily' as const } };
  const weekly = (daysOfWeek: number[]) => ({
    recurring: true,
    recurrencePattern: { frequency: 'weekly' as const, daysOfWeek },
  });

  // Weekly routine as recurring series starting this week.
  const activities: DemoActivity[] = [
    { title: 'Sleep', type: 'sleep', startTime: at(weekStart, 0), duration: 480, ...daily, ...fixed },
    { title: 'Breakfast', type: 'meal', startTime: at(weekStart, 8), duration: 30, ...daily, ...fixed },
    { title: 'Lunch', type: 'meal', startTime: at(weekStart, 12), duration: 45, ...daily, ...fixed },
    { title: 'Dinner', type: 'meal', startTime: at(weekStart, 18, 30), duration: 45, ...daily, ...fixed },
    { title: 'Anatomy Lecture', type: 'class', startTime: at(weekStart, 9), duration: 120, ...weekly([1, 3, 5]), ...fixed, subjectKey: 'anatomy' },
    { title: 'Physiology Lab', type: 'class', startTime: at(weekStart, 13), duration: 180, ...weekly([2, 4]), ...fixed, subjectKey: 'physiology' },
    { title: 'Gym / Exercise', type: 'sport', startTime: at(weekStart, 20), duration: 60, ...weekly([1, 3, 5]), negotiable: true, priority: 3, status: 'scheduled' },
    { title: 'Hobbies & Relaxation', type: 'rest', startTime: at(weekStart, 14), duration: 180, ...weekly([0, 6]), negotiable: true, priority: 2, status: 'scheduled' },
  ];

  // One-off Biochemistry sessions on this week's weekdays; past ones already have a result.
  const sessionTopics = ['glycolysis', 'krebs', 'etc', 'amino-acids', 'lipids'];
  for (let day = 1; day <= 5; day++) {
    const date = addDays(weekStart, day);
    const isPast = date < today;
    activities.push({
      title: 'Study Biochemistry',
      type: 'studying',
      startTime: at(date, 16),
      duration: 90,
      recurring: false,
      negotiable: true,
      priority: 4,
      status: isPast ? (day % 3 === 0 ? 'partial' : 'done') : 'scheduled',
      subjectKey: 'biochemistry',
      topicKey: sessionTopics[day - 1],
    });
  }

  return { subjects, topics, activities };
}
