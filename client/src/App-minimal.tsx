function MinimalApp() {
  return (
    <div style={{
      backgroundColor: 'green',
      color: 'white', 
      padding: '50px',
      fontSize: '24px',
      minHeight: '100vh'
    }}>
      <h1>MINIMAL APP TEST</h1>
      <p>Om du ser detta fungerar React rendering</p>
      <div style={{
        backgroundColor: 'orange',
        color: 'black',
        padding: '20px',
        margin: '20px 0'
      }}>
        Orange box - CSS fungerar
      </div>
      <button 
        onClick={() => alert('Click fungerar!')}
        style={{
          backgroundColor: 'blue',
          color: 'white',
          padding: '10px 20px',
          fontSize: '16px',
          border: 'none',
          borderRadius: '5px'
        }}
      >
        Test Click
      </button>
    </div>
  );
}

export default MinimalApp;