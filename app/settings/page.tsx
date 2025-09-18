import { SignedIn } from '@clerk/nextjs';

export default function Settings() {
  return (
    <SignedIn>
      <main className="max-w-2xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-4">Settings</h1>
        <div className="glass p-6">
          <p className="mb-4">Profile and localisation settings will live here. At the moment this section is a placeholder.</p>
          <button className="px-4 py-2 bg-secondary text-neutral-light rounded-md hover:bg-secondary/80">
            Delete Account (Coming Soon)
          </button>
        </div>
      </main>
    </SignedIn>
  );
}