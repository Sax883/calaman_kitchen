(function () {
  const fallbackFooterMarkup = [
    '<footer style="background-color: #1a1a1a; color: #888; padding: 20px 0; text-align: center; font-family: sans-serif;">',
    '  <div style="max-width: 1100px; margin: auto; border-top: 1px solid #333; padding-top: 12px;">',
    '    <p style="margin-bottom: 5px;">&copy; 2026 <strong>Calamans Kitchen Limited</strong>. All Rights Reserved.</p>',
    '    <p style="font-size: 13px; margin-bottom: 5px;">',
    '      Registration No: <span style="color: #bbb;">RC 9469278</span> |',
    '      TIN: <span style="color: #bbb;">2623211628372</span>',
    '    </p>',
    '    <a href="https://search.cac.gov.ng/" target="_blank" rel="noopener noreferrer" style="color: #ffc107; text-decoration: none; font-size: 12px; font-weight: bold;">',
    '      Verify Business Status &rarr;',
    '    </a>',
    '  </div>',
    '</footer>'
  ].join('');

  async function fetchFooterMarkup() {
    const candidates = ['/footer.html', 'footer.html', './footer.html'];

    for (const candidate of candidates) {
      try {
        const response = await fetch(candidate, { cache: 'no-cache' });
        if (response.ok) {
          return await response.text();
        }
      } catch (_) {
        // Try next candidate path.
      }
    }

    return fallbackFooterMarkup;
  }

  async function injectSharedFooter() {
    const targets = document.querySelectorAll('[data-shared-footer]');
    if (!targets.length) {
      return;
    }

    const markup = await fetchFooterMarkup();
    targets.forEach((target) => {
      target.innerHTML = markup;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectSharedFooter);
  } else {
    injectSharedFooter();
  }
})();
