import { SignIn } from '@clerk/nextjs';

export default function LoginPage() {
  return (
    <main className="flex items-center justify-center min-h-screen p-8">
      <div className="glass p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center">Sign in to ScoreEngine</h1>
        <SignIn
          appearance={{
            elements: {
              card: 'bg-transparent shadow-none',
            },
          }}
        />
      </div>
    </main>
  );
}