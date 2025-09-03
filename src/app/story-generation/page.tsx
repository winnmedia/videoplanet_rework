'use client';

import { Provider } from 'react-redux';
import { store } from '@/shared/lib/redux';
import { StoryGenerationForm } from '@/features/story-generation/ui/StoryGenerationForm';

export default function StoryGenerationPage() {
  return (
    <Provider store={store}>
      <div className="min-h-screen bg-gray-100">
        <div className="container mx-auto py-8">
          <StoryGenerationForm />
        </div>
      </div>
    </Provider>
  );
}