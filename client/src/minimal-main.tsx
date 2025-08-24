import { createRoot } from "react-dom/client";

function MinimalApp() {
  return (
    <div style={{
      backgroundColor: 'red',
      color: 'white',
      padding: '50px',
      fontSize: '24px',
      minHeight: '100vh'
    }}>
      <h1>MINIMAL REACT TEST</h1>
      <p>Om du ser detta fungerar React rendering</p>
      <div style={{
        backgroundColor: 'blue',
        color: 'white',
        padding: '20px',
        margin: '20px 0'
      }}>
        Detta är en blå box
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<MinimalApp />);