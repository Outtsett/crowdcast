import { PollForm } from './poll-form';

export default function CreatePollPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Create a Poll</h1>
      <PollForm />
    </div>
  );
}
