function startGame() {
    showLoader();
    window.location.href = 'miniweeper/index.html'; // Replace with your actual game file
  }
  
  function showLoader() {
    document.getElementById('loader').style.display = 'flex';
    document.getElementById('menu').style.display = 'none';
  }
  
  function hideLoader() {
    document.getElementById('loader').style.display = 'none';
    document.getElementById('menu').style.display = 'block';
  }
  
  window.onload = function () {
    hideLoader();
  };
  
   // Disable right-click globally
   document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
  });

   // Disable text selection
   document.addEventListener('selectstart', function (e) {
    e.preventDefault();
  });

// modal updates
  const updatesModal = document.getElementById('updatesModal');
  updatesModal.addEventListener('shown.bs.modal', () => {
    const now = new Date();
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    document.getElementById('update-time').textContent = `Last updated at: ${formattedTime}`;
  });