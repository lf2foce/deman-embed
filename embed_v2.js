/* assets/embed.js  – stays tiny */
console.log('✅ Shopify loader executed');
(function () {
  var s = document.createElement('script');
  s.src   = 'https://deman-agent.onrender.com/static/embed.js';
  s.async = true;
  s.onload  = () => console.log('✅ external widget loaded');
  s.onerror = () => console.error('❌ widget blocked (CSP/404)');
  document.head.appendChild(s);
})();