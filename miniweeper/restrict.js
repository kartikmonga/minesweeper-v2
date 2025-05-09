// Disable right-click
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
  });
  
  // Disable text selection
  document.addEventListener('selectstart', function(e) {
    e.preventDefault();
  });
  
  // Set cursor style to default for the whole page
  document.body.style.cursor = 'default'; // or 'pointer', 'not-allowed', etc.
  
  // Optional: prevent drag events (e.g. dragging images or text)
  document.addEventListener('dragstart', function(e) {
    e.preventDefault();
  });
  