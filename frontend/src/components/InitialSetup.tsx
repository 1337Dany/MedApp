import { useState } from 'react';
import { useStore } from '../store/useStore';
import { generateDemoData } from '../utils/demoData';

interface InitialSetupProps {
  onComplete: () => void;
}

export function InitialSetup({ onComplete }: InitialSetupProps) {
  const { subjects, addSubject, addTopic, addActivity } = useStore();
  const [loading, setLoading] = useState(false);

  const loadDemoData = () => {
    setLoading(true);
    const { subjects: demoSubjects, topics: demoTopics, activities: demoActivities } = generateDemoData();

    demoSubjects.forEach(addSubject);
    demoTopics.forEach(addTopic);
    demoActivities.forEach(addActivity);

    setTimeout(() => {
      setLoading(false);
      onComplete();
    }, 500);
  };

  const startFresh = () => {
    onComplete();
  };

  // If already has subjects, skip setup
  if (subjects.length > 0) {
    onComplete();
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to MedStudy Planner</h1>
          <p className="text-gray-600">A sustainable approach to medical student life management</p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg">
            <h3 className="font-medium text-blue-900 mb-1">Smart Scheduling</h3>
            <p className="text-sm text-blue-700">
              Automatically plan study time based on exams, deadlines, and your available capacity
            </p>
          </div>

          <div className="border-l-4 border-purple-500 bg-purple-50 p-4 rounded-r-lg">
            <h3 className="font-medium text-purple-900 mb-1">Multiple Study Strategies</h3>
            <p className="text-sm text-purple-700">
              Choose between Manual, Traffic Light, or Active Recall methods for each subject
            </p>
          </div>

          <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded-r-lg">
            <h3 className="font-medium text-green-900 mb-1">Wellbeing Tracking</h3>
            <p className="text-sm text-green-700">
              Monitor your workload and receive warnings to prevent burnout and overload
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={loadDemoData}
            disabled={loading}
            className="w-full py-4 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading Demo Data...' : 'Start with Demo Data'}
          </button>

          <button
            onClick={startFresh}
            disabled={loading}
            className="w-full py-4 px-6 bg-white text-gray-700 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Fresh
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-6">
          Demo data includes sample subjects (Anatomy, Physiology, Biochemistry, Pharmacology),
          topics with different knowledge levels, and a weekly schedule template
        </p>
      </div>
    </div>
  );
}
