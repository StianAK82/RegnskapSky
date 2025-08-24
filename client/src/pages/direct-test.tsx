// Direkt component utan lazy loading
function DirectTest() {
  return (
    <div style={{
      backgroundColor: 'lime',
      color: 'black',
      padding: '50px',
      fontSize: '24px',
      minHeight: '100vh'
    }}>
      <h1>DIRECT TEST - GRÖN BAKGRUND</h1>
      <p>Om du ser denna text fungerar React rendering</p>
      <div style={{
        backgroundColor: 'red',
        color: 'white',
        padding: '20px',
        margin: '20px 0'
      }}>
        RÖD BOX - testar CSS-rendering
      </div>
      <div style={{
        backgroundColor: 'blue',
        color: 'white',
        padding: '20px'
      }}>
        BLÅ BOX - testar mer CSS
      </div>
    </div>
  );
}

export default DirectTest;