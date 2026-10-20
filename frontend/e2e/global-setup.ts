import { FullConfig, request } from '@playwright/test';
import { registerAccount } from './helpers';

// Teacher analytics stay hidden below five consenting students, so the class gets six of them, each with
// a shared subject, rated topics and a finished study session from last week.
export default async function globalSetup(config: FullConfig) {
  const context = await request.newContext({ baseURL: config.projects[0].use.baseURL });
  const lastWeek = new Date(Date.now() - 6 * 86_400_000).toISOString();

  for (let i = 0; i < 6; i++) {
    const student = await registerAccount(context, { consent: true, firstName: `Class${i}` });
    const subject = await student.api.subject({ name: 'Class Physiology' });
    await student.api.topic(subject.id, { title: 'Cardiac cycle', feedback: i < 2 ? 'green' : 'red' });
    await student.api.topic(subject.id, { title: 'Renal function', feedback: 'yellow' });
    await student.api.activity({
      title: 'Physiology review',
      subjectId: subject.id,
      startTime: lastWeek,
      durationMinutes: 90,
      status: i < 4 ? 'done' : 'skipped',
    });
  }

  await context.dispose();
}
