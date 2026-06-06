import type { Metadata } from 'next';
import { SubmitHeader } from './submit-header';
import { SubmitForm } from './submit-form';

export const metadata: Metadata = {
  title: 'Add a Minecraft Server',
  description: 'Submit your Minecraft Java or Bedrock server to MineTracker. Get your server tracked with real-time player counts and uptime monitoring.',
};

export default function SubmitPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-lg">
      <SubmitHeader />
      <SubmitForm />
    </div>
  );
}
