import { useAuth } from '@/hooks/use-auth';

export default function TestSimple() {
  const { user } = useAuth();

  return (
    <div style={{ padding: '20px', backgroundColor: 'lightblue', minHeight: '100vh' }}>
      <h1 style={{ color: 'black', fontSize: '24px' }}>Test Page Working!</h1>
      <p style={{ color: 'black' }}>This is a simple test page to see if rendering works.</p>
      <p style={{ color: 'black' }}>User: {user?.email || 'No user'}</p>
      <p style={{ color: 'black' }}>Role: {user?.role || 'No role'}</p>
      <div style={{ border: '2px solid red', padding: '10px', marginTop: '20px' }}>
        <p style={{ color: 'black' }}>If you can see this, the component is rendering properly.</p>
      </div>
    </div>
  );
}