import { SignedIn } from '@clerk/nextjs';

export default function Admin() {
  return (
    <SignedIn>
      <main className="max-w-3xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-4">Admin Console</h1>
        <div className="glass p-6">
          <p>Admin features will be implemented here. This section is reserved for listing users, adjusting credits and viewing logs.</p>
        </div>
      </main>
    </SignedIn>
  );
}